const logger = require('../services/logger.js');
// controllers/paiementController.js
const db = require('../models');
const Paiement = db.Paiement;
const User = db.Users;
const Magasin = db.Magasin;
const Client = db.Client;
const Fournisseur = db.Fournisseur;
const fs = require('fs');
const path = require('path');
const operationController = require('./operation.controller');
const { statutManager } = require('./bonComplet');
const { Op,literal} = db.Sequelize;
const HistoriqueService = require('../services/historique.service');


const BASE_URL = 'http://localhost:5000/uploads/';

exports.create = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      await transaction.rollback();
      return res.status(401).json({ message: "Non authentifié" });
    }
    const paie = req.body;

    let fichier = null;
    if (req.file) {
      fichier = BASE_URL + req.file.filename;
    }

    const paiement = await Paiement.create({
      ...paie,
      // Identifiants dérivés de l'utilisateur authentifié — jamais du client
      agentId: authUser.id,
      code_structure: authUser.code_structure ?? paie.code_structure,
      magasinId: authUser.magasinId ?? paie.magasinId,
      date: new Date(),
      fichier
    }, { transaction });

    // Créer l'opération associée
    await operationController.createFromPaiement(paiement, transaction);

    let cible = '';
    if (paiement.typePaiement === 'fournisseur') {
      await statutManager.mettreAJourFournisseurApresVersement(paiement, paiement.fournisseurId, transaction);
      cible = `fournisseur ID: ${paiement.fournisseurId}`;
    }
    if (paiement.typePaiement === 'client') {
      await statutManager.mettreAJourClientApresRegelement(paiement, paiement.clientId, transaction);
      cible = `client ID: ${paiement.clientId}`;
    }

    await transaction.commit();

    // ENREGISTRER L'HISTORIQUE (hors transaction — opération non critique)
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un paiement: ${paiement.montant} FCFA - ${paiement.typePaiement} (${cible})`,
      clientIp,
      {
        action: 'CREATE_PAIEMENT',
        paiementId: paiement.id,
        montant: paiement.montant,
        typePaiement: paiement.typePaiement,
        methodePaiement: paiement.methodePaiement,
        magasinId: paiement.magasinId,
        fournisseurId: paiement.fournisseurId,
        clientId: paiement.clientId,
        description: paiement.description
      }
    );

    res.status(201).json(paiement);
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }logger.error('paiement.controller', 'Erreur création paiement:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const paiements = await Paiement.findAll({
      include: ['Client', 'Fournisseur', 'Bon', 'Panier', 'Magasin'],
    });
    res.json(paiements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const { verifierAppartenanceStructure } = require('../services/verification.service');

/**
 * Contrôle d'accès unitaire d'un paiement (anti-IDOR) :
 *  - la structure du paiement doit être celle de l'utilisateur ;
 *  - un Caissier/Employé ne peut accéder qu'à SES propres paiements (agentId).
 * Admin structure / Gérant : tout leur périmètre. Admin général : tout.
 */
const verifierAccesPaiement = (paiement, authUser) => {
  const verifStructure = verifierAppartenanceStructure(paiement, authUser);
  if (!verifStructure.ok) return verifStructure;

  const nomRoles = (authUser.roles || []).map(r => r.nom);
  const isPrivilege =
    nomRoles.includes('Administrateur') ||
    nomRoles.includes('Administrateur secondaire') ||
    nomRoles.includes('Gérant');
  const isRestreint =
    nomRoles.includes('Caissier') || nomRoles.includes('Employé');

  if (isRestreint && !isPrivilege && paiement.agentId != null &&
      Number(paiement.agentId) !== Number(authUser.id)) {
    return { ok: false, statut: 403, message: 'Accès interdit : ce paiement ne vous appartient pas' };
  }
  return { ok: true };
};

exports.findById = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const paiement = await Paiement.findByPk(req.params.id);
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const acces = verifierAccesPaiement(paiement, authUser);
    if (!acces.ok) return res.status(acces.statut).json({ message: acces.message });

    const paiementData = paiement.toJSON();
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    paiementData.fichierUrl = paiementData.fichier ? baseUrl + paiementData.fichier : null;

    res.status(200).json(paiementData);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du paiement', error });
  }
};

exports.update = async (req, res) => {
try {
  const authUser = req.user;
  const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
  const paiement = await Paiement.findByPk(req.params.id);
  if (!paiement) {
    return res.status(404).json({ message: 'Paiement non trouvé' });
  }
  // Anti-IDOR : structure + propriété (caissier/employé)
  const accesUpdate = verifierAccesPaiement(paiement, authUser);
  if (!accesUpdate.ok) return res.status(accesUpdate.statut).json({ message: accesUpdate.message });
  // Sauvegarder les anciennes valeurs pour l'historique
  const oldValues = {
    montant: paiement.montant,
    methodePaiement: paiement.methodePaiement,
    description: paiement.description,
    typePaiement: paiement.typePaiement,
    fichier: paiement.fichier
  };
  const updatedData = { ...req.body };
  
      // Si un nouveau fichier est envoyé
      if (req.file) {
        // Supprimer l'ancien fichier si il existe
        if (paiement.fichier) {
          const oldPath = path.join('uploads', path.basename(paiement.fichier)); // attention à ne pas concaténer l'URL complète
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
  
        // Mettre à jour le champ fichier avec la nouvelle URL
        updatedData.fichier = BASE_URL + req.file.filename;
      } else {
        // Sinon, conserver le fichier existant
        updatedData.fichier = paiement.fichier;
      }
  
      await paiement.update(updatedData);

      // Préparer les changements pour l'historique
      const changes = {};
      if (oldValues.montant !== paiement.montant) changes.montant = { old: oldValues.montant, new: paiement.montant };
      if (oldValues.methodePaiement !== paiement.methodePaiement) changes.methodePaiement = { old: oldValues.methodePaiement, new: paiement.methodePaiement };
      if (oldValues.description !== paiement.description) changes.description = { old: oldValues.description, new: paiement.description };
      if (oldValues.typePaiement !== paiement.typePaiement) changes.typePaiement = { old: oldValues.typePaiement, new: paiement.typePaiement };
      if (req.file) changes.fichier = 'modifié';
      
      // ENREGISTRER L'HISTORIQUE
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Mise à jour du paiement #${paiement.id} - ${paiement.montant} FCFA`,
        clientIp,
        {
          action: 'UPDATE_PAIEMENT',
          paiementId: paiement.id,
          changes: changes
        }
      );logger.log('paiement.controller', 'Paiement mis à jour avec:', updatedData);
      res.json({ message: 'Paiement mis à jour', paiement });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
    }
};

exports.delete = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Récupérer le paiement avant suppression
    const paiement = await Paiement.findByPk(req.params.id);
    if (!paiement) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }
    // Anti-IDOR : structure + propriété (caissier/employé)
    const accesDelete = verifierAccesPaiement(paiement, authUser);
    if (!accesDelete.ok) return res.status(accesDelete.statut).json({ message: accesDelete.message });

    const deleted = await Paiement.destroy({
      where: { id: req.params.id },
    });
    //if (!deleted) return res.status(404).json({ message: 'Paiement non trouvé' });
    //res.status(204).send();
    if (deleted) {
      // ENREGISTRER L'HISTORIQUE
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Suppression du paiement #${paiement.id} - ${paiement.montant} FCFA (${paiement.typePaiement})`,
        clientIp,
        {
          action: 'DELETE_PAIEMENT',
          paiementId: paiement.id,
          deletedData: {
            montant: paiement.montant,
            typePaiement: paiement.typePaiement,
            methodePaiement: paiement.methodePaiement,
            date: paiement.date,
            fournisseurId: paiement.fournisseurId,
            clientId: paiement.clientId
          }
        }
      );
      res.status(204).send();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les paiements d'une structure
exports.getPaiementsByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    //const { code_structure } = req.params;
    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

    if (!isAdminStructure && !isGerant) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;
    }
    const paiements = await Paiement.findAll({
      where: whereClause ,
      include: [
        { model: Magasin,attributes: ["id", "nom","telephone", "email"] },
        { model: User, attributes: ["id", "nom", "email"] }
      ], 
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const paiementsWithFichierUrl = paiements.map((paiement) => {
      const paie = paiement.toJSON(); // Convertit Sequelize instance en objet pur
      paie.fichierUrl = paie.fichier ? baseUrl + paie.fichier : null;
      return paie;
    });

    res.status(200).json(paiementsWithFichierUrl);

    //res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des paiements', error });
  }
};

exports.getPaiementsClientByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    //const { code_structure } = req.params;
    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      	typePaiement: 'client'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;

    

    // 🔒 Règle métier : un caissier ne voit que SES propres paiements

    if (isCaissier) {

      whereClause.agentId = authUser.id;

    }

    }
    const paiements = await Paiement.findAll({
      where: whereClause ,
      include: [
        { model: Magasin,attributes: ["id", "nom"] },
        { model: User, attributes: ["id", "nom", "email"] },
        {model: Client, attributes: ['id', 'nomComplet'] }
      ], 
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const paiementsWithFichierUrl = paiements.map((paiement) => {
      const paie = paiement.toJSON(); // Convertit Sequelize instance en objet pur
      paie.fichierUrl = paie.fichier ? baseUrl + paie.fichier : null;
      return paie;
    });

    res.status(200).json(paiementsWithFichierUrl);

    //res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des paiements', error });
  }
};

exports.getPaiementsFournisseurByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    //const { code_structure } = req.params;
    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur"|| r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      	typePaiement: 'fournisseur'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;

    

    // 🔒 Règle métier : un caissier ne voit que SES propres paiements

    if (isCaissier) {

      whereClause.agentId = authUser.id;

    }

    }
    const paiements = await Paiement.findAll({
      where: whereClause ,
      include: [
        { model: Magasin,attributes: ["id", "nom"] },
        { model: User, attributes: ["id", "nom", "email"] },
        {model: Fournisseur, attributes: ['id', 'nomComplet'] }
      ], 
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const paiementsWithFichierUrl = paiements.map((paiement) => {
      const paie = paiement.toJSON(); // Convertit Sequelize instance en objet pur
      paie.fichierUrl = paie.fichier ? baseUrl + paie.fichier : null;
      return paie;
    });

    res.status(200).json(paiementsWithFichierUrl);

    //res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des paiements', error });
  }
};

// Récupérer les paiements clients d'une structure avec pagination
exports.getPaiementsClientByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    
    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      methodePaiement = '',
      /* dateDebut = '',
      dateFin = '' */
    } = req.query;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      typePaiement: 'client'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;

    

    // 🔒 Règle métier : un caissier ne voit que SES propres paiements

    if (isCaissier) {

      whereClause.agentId = authUser.id;

    }

    }

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { methodePaiement: { [Op.like]: `%${search}%` } },
        { '$Client.nomComplet$': { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { montant: { [Op.eq]: parseFloat(search) } }
        );
      }

      // Recherche par date
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (datePattern.test(search)) {
        const [day, month, year] = search.split('/');
        const searchDate = new Date(`${year}-${month}-${day}`);
        if (!isNaN(searchDate)) {
          whereClause[Op.or].push(
            literal(`DATE(date) = '${year}-${month}-${day}'`)
          );
        }
      }
    }

    // 📅 FILTRE PAR PÉRIODE
    /* if (dateDebut && dateFin) {
      whereClause.date = {
        [Op.between]: [new Date(dateDebut), new Date(dateFin)]
      };
    } else if (dateDebut) {
      whereClause.date = { [Op.gte]: new Date(dateDebut) };
    } else if (dateFin) {
      whereClause.date = { [Op.lte]: new Date(dateFin) };
    } */

    // 💳 FILTRE PAR MODE DE PAIEMENT
    if (methodePaiement && methodePaiement !== 'tous') {
      whereClause.methodePaiement = methodePaiement;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Paiement.findAndCountAll({
      where: whereClause,
      include: [
        { model: Magasin, attributes: ["id", "nom"] },
        { model: User, attributes: ["id", "nom", "email"] },
        { model: Client, attributes: ['id', 'nomComplet'] }
      ],
      order: [['date', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const paiementsWithFichierUrl = rows.map((paiement) => {
      const paie = paiement.toJSON();
      paie.fichierUrl = paie.fichier ? baseUrl + paie.fichier : null;
      return paie;
    });logger.log('paiement.controller', `📦 Paiements: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: paiementsWithFichierUrl,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {logger.error('paiement.controller', "Erreur récupération paiements:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des paiements', 
      error: error.message 
    });
  }
};

// Version fournisseur avec pagination
exports.getPaiementsFournisseurByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    
    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      methodePaiement = '',
      /* dateDebut = '',
      dateFin = '' */
    } = req.query;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      typePaiement: 'fournisseur'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;

    

    // 🔒 Règle métier : un caissier ne voit que SES propres paiements

    if (isCaissier) {

      whereClause.agentId = authUser.id;

    }

    }

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { description: { [Op.like]: `%${search}%` } },
        { methodePaiement: { [Op.like]: `%${search}%` } },
        { '$Fournisseur.nomComplet$': { [Op.like]: `%${search}%` } }
      ];
      
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { montant: { [Op.eq]: parseFloat(search) } }
        );
      }
    }

    // 📅 FILTRE PAR PÉRIODE
    /* if (dateDebut && dateFin) {
      whereClause.date = {
        [Op.between]: [new Date(dateDebut), new Date(dateFin)]
      };
    } else if (dateDebut) {
      whereClause.date = { [Op.gte]: new Date(dateDebut) };
    } else if (dateFin) {
      whereClause.date = { [Op.lte]: new Date(dateFin) };
    } */

    // 💳 FILTRE PAR MODE DE PAIEMENT
    if (methodePaiement && methodePaiement !== 'tous') {
      whereClause.methodePaiement = methodePaiement;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    const { count, rows } = await Paiement.findAndCountAll({
      where: whereClause,
      include: [
        { model: Magasin, attributes: ["id", "nom"] },
        { model: User, attributes: ["id", "nom", "email"] },
        { model: Fournisseur, attributes: ['id', 'nomComplet'] }
      ],
      order: [['date', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    const totalPages = Math.ceil(count / limitInt);

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const paiementsWithFichierUrl = rows.map((paiement) => {
      const paie = paiement.toJSON();
      paie.fichierUrl = paie.fichier ? baseUrl + paie.fichier : null;
      return paie;
    });logger.log('paiement.controller', `📦 Paiements fournisseurs: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: paiementsWithFichierUrl,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {logger.error('paiement.controller', "Erreur récupération paiements fournisseurs:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des paiements', 
      error: error.message 
    });
  }
};
// Récupérer les paiements d'une structure par fournisseur
exports.getPaiementsByFournisseur = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { fournisseurId } = req.params;

    const code_structure = authUser.code_structure;

    const paiements = await Paiement.findAll({
      where: {
        code_structure: code_structure,
        fournisseurId: fournisseurId
      },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(paiements);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des paiements du fournisseur',
      error: error.message
    });
  }
};

// Récupérer les paiements d'une structure par client
exports.getPaiementsByClient = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { clientId } = req.params;

    const code_structure = authUser.code_structure;

    const paiements = await Paiement.findAll({
      where: {
        code_structure: code_structure,
        clientId: clientId
      },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(paiements);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des paiements du client',
      error: error.message
    });
  }
};
