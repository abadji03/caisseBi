const logger = require('../services/logger.js');
// controllers/bonController.js
const { Op } = require('sequelize');
const db = require('../models');
const { verifierAppartenanceStructure } = require('../services/verification.service');
const Bon = db.Bon;
const fs = require('fs');
const path = require('path');
const Panier = db.Panier;
const ArticlePanier = db.ArticlePanier;
const Produit = db.Produit;
const User = db.Users;
const Fournisseur = db.Fournisseur;
const Client = db.Client;
const Magasin = db.Magasin;


const BASE_URL = 'http://localhost:5000/uploads/'; //url de l'emplacement des fichier à stocker

exports.createBon = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bon = req.body;
    let fichier = null;
    if (req.file) {
      fichier = BASE_URL + req.file.filename;
    }

    const bonEnd = await Bon.create({
      ...bon,
      // Identifiants dérivés de l'utilisateur authentifié — jamais du client
      agentId: authUser.id,
      code_structure: authUser.code_structure ?? bon.code_structure,
      magasinId: authUser.magasinId ?? bon.magasinId,
      fichier,
    });
    
    res.status(201).json(bonEnd);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les bons d'une structure
exports.getBonsByStructure = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bons = await Bon.findAll({
      where: { code_structure: req.params.code_structure },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model:Produit} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = bons.map((paiement) => {
      const bn = paiement.toJSON(); // Convertit Sequelize instance en objet pur
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      return bn;
    });

    res.status(200).json(bonsWithFichierUrl);

    //res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des bons', error:error.message });
  }
};
// Lister uniquement les bons clients d'une structure
exports.getBonsClientsByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

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
        typeEntite: 'client'

    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;
    }
    const bons = await Bon.findAll({
      where: { 
        ...whereClause
      },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model: Produit,attributes: ['id', 'designation', 'unite']} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] },
        {model: Client, attributes: ['id', 'nomComplet'] },
        {model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = bons.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      // Ajouter le client directement dans l'objet pour faciliter l'accès
      bn.client = bn.Client;
      delete bn.Client;
      return bn;
    });

    res.status(200).json(bonsWithFichierUrl);

  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons clients', 
      error: error.message 
    });
  }
};

// Lister uniquement les bons clients d'une structure AVEC PAGINATION
exports.getBonsClientsByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      type = '',
      statut = ''
    } = req.query;

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
      typeEntite: 'client'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;
    }

    // 🔍 FILTRE DE RECHERCHE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { numero: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        //{ '$Client.nomComplet$': { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { montantTotal: { [Op.eq]: parseFloat(search) } },
          { avance: { [Op.eq]: parseFloat(search) } },
          { resteAPayer: { [Op.eq]: parseFloat(search) } }
        );
      }
    }

    // 🔹 FILTRE PAR TYPE
    if (type && type !== 'tous') {
      whereClause.type = type;
    }

    // 🔹 FILTRE PAR STATUT
    if (statut && statut !== 'tous') {
      whereClause.statutBon = statut;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Bon.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: { model: Produit, attributes: ['id', 'designation', 'unite'] }
            }
          ],
        },
        { model: User, attributes: ['id', 'nom', 'email'] },
        { model: Client, attributes: ['id', 'nomComplet'] },
        { model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = rows.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      bn.client = bn.Client;
      delete bn.Client;
      return bn;
    });logger.log('bon.controller', `📦 Bons clients: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: bonsWithFichierUrl,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {logger.error('bon.controller', "Erreur récupération bons clients:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons clients', 
      error: error.message 
    });
  }
};

// Lister uniquement les bons clients d'une structure AVEC PAGINATION
exports.getBonsFournisseursByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      type = '',
      statut = ''
    } = req.query;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => (r.nom === "Administrateur" || r.nom === "Administrateur secondaire" ) );
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
      typeEntite: 'fournisseur'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;
    }

    // 🔍 FILTRE DE RECHERCHE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { numero: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        //{ '$Client.nomComplet$': { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { montantTotal: { [Op.eq]: parseFloat(search) } },
          { avance: { [Op.eq]: parseFloat(search) } },
          { resteAPayer: { [Op.eq]: parseFloat(search) } }
        );
      }
    }

    // 🔹 FILTRE PAR TYPE
    if (type && type !== 'tous') {
      whereClause.type = type;
    }

    // 🔹 FILTRE PAR STATUT
    if (statut && statut !== 'tous') {
      whereClause.statutBon = statut;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Bon.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: { model: Produit, attributes: ['id', 'designation', 'unite'] }
            }
          ],
        },
        { model: User, attributes: ['id', 'nom', 'email'] },
        { model: Fournisseur, attributes: ['id', 'nomComplet'] },
        { model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = rows.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      bn.fournisseur = bn.Fournisseur;
      delete bn.Fournisseur;
      return bn;
    });logger.log('bon.controller', `📦 Bons clients: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: bonsWithFichierUrl,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {logger.error('bon.controller', "Erreur récupération bons clients:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons clients', 
      error: error.message 
    });
  }
};

// Lister uniquement les bons fournisseurs d'une structure
exports.getBonsFournisseursByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

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
      code_structure: code_structure,
        typeEntite: 'fournisseur'

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
    const bons = await Bon.findAll({
      where: whereClause,
        include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model: Produit, attributes: ['id', 'designation', 'unite']} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] },
        {model: Fournisseur, attributes: ['id', 'nomComplet'] },
        {model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = bons.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      // Ajouter le fournisseur directement dans l'objet pour faciliter l'accès
      bn.fournisseur = bn.Fournisseur;
      delete bn.Fournisseur;
      return bn;
    });

    res.status(200).json(bonsWithFichierUrl);

  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons fournisseurs', 
      error: error.message 
    });
  }
};
// Lister les bons selon le périmètre de l'utilisateur (multi-tenant) :
//  - Administrateur général : toutes les structures ;
//  - Administrateur / secondaire : toute leur structure ;
//  - Gérant : son magasin ;
//  - Caissier / Employé : uniquement SES propres bons (agentId).
exports.getAllBons = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const nomRoles = (authUser.roles || []).map(r => r.nom);
    const isAdminStructure =
      nomRoles.includes('Administrateur') || nomRoles.includes('Administrateur secondaire');
    const isGerant = nomRoles.includes('Gérant');
    const isRestreint = nomRoles.includes('Caissier') || nomRoles.includes('Employé');

    let whereClause;
    if (!authUser.code_structure) {
      // Administrateur général
      whereClause = {};
    } else if (isAdminStructure) {
      whereClause = { code_structure: authUser.code_structure };
    } else if (isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({ message: "Ce gérant n'est associé à aucun magasin" });
      }
      whereClause = {
        code_structure: authUser.code_structure,
        magasinId: authUser.magasinId,
      };
    } else if (isRestreint) {
      whereClause = {
        code_structure: authUser.code_structure,
        agentId: authUser.id,
      };
      if (authUser.magasinId) whereClause.magasinId = authUser.magasinId;
    } else {
      return res.status(403).json({ message: 'Accès interdit : rôle insuffisant' });
    }

    const bons = await Bon.findAll({
      where: whereClause,
      include: [
        { model: db.Fournisseur, as: 'Fournisseur' },
        { model: db.Client, as: 'Client' },
        { model: db.User, as: 'User' },
        { model: db.Magasin, as: 'Magasin' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json(bons);
  } catch (error) {
    logger.error('bon.controller', 'Erreur récupération tous les bons:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Récupérer un bon par ID
exports.getBonById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    // Anti-IDOR : un Caissier/Employé ne peut consulter que SES propres bons
    const nomRoles = (authUser.roles || []).map(r => r.nom);
    const isPrivilege =
      nomRoles.includes('Administrateur') ||
      nomRoles.includes('Administrateur secondaire') ||
      nomRoles.includes('Gérant');
    const isRestreint = nomRoles.includes('Caissier') || nomRoles.includes('Employé');
    if (isRestreint && !isPrivilege && bon.agentId != null &&
        Number(bon.agentId) !== Number(authUser.id)) {
      return res.status(403).json({ message: 'Accès interdit : ce bon ne vous appartient pas' });
    }

    const bonData = bon.toJSON();
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    bonData.fichierUrl = bonData.fichier ? baseUrl + bonData.fichier : null;

    res.status(200).json(bonData);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du bon', error });
  }
};

// Mettre à jour un bon
exports.updateBon = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bon = await Bon.findByPk(req.params.id);
    if (!bon) {
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) {
      return res.status(verifStructure.statut).json({ message: verifStructure.message });
    }
    const updatedData = { ...req.body };
    
        // Si un nouveau fichier est envoyé
        if (req.file) {
          // Supprimer l'ancien fichier si il existe
          if (bon.fichier) {
            const oldPath = path.join('uploads', path.basename(bon.fichier)); // attention à ne pas concaténer l'URL complète
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
    
          // Mettre à jour le champ fichier avec la nouvelle URL
          updatedData.fichier = BASE_URL + req.file.filename;
        } else {
          // Sinon, conserver le fichier existant
          updatedData.fichier = bon.fichier;
        }
    
        await bon.update(updatedData);logger.log('bon.controller', 'Bon mis à jour avec:', updatedData);
        res.json({ message: 'Bon mis à jour', bon });
      } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
      }
};

// Supprimer un bon
/* exports.deleteBon = async (req, res) => {
  try {
    const deleted = await Bon.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Bon non trouvé' });
    return res.status(204).send();
  } catch (error) {logger.error('bon.controller', 'Erreur suppression bon:', error);
    return res.status(500).json({ error: error.message });
  }
}; */

// Supprimer un bon avec cascade
exports.deleteBon = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const bonId = req.params.id;
    
    // Trouver le bon avec son panier associé
    const bon = await Bon.findByPk(bonId, {
      include: [{
        model: Panier,
        as: 'Panier'
      }],
      transaction
    });
    
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) {
      await transaction.rollback();
      return res.status(verifStructure.statut).json({ message: verifStructure.message });
    }

    // Si le bon a un fichier, le supprimer physiquement
    if (bon.fichier) {
      const nomFichier = path.basename(bon.fichier);
      const cheminFichier = path.join('uploads', nomFichier);
      
      if (fs.existsSync(cheminFichier)) {
        fs.unlinkSync(cheminFichier);
      }
    }

    // Supprimer en cascade dans l'ordre
    if (bon.Panier) {
      // 1. Supprimer les articles du panier
      await ArticlePanier.destroy({ 
        where: { panierId: bon.Panier.id }, 
        transaction 
      });
      
      // 2. Supprimer le panier
      await Panier.destroy({ 
        where: { id: bon.Panier.id }, 
        transaction 
      });
    }

    // 3. Supprimer les éventuels paiements associés
    await db.Paiement.destroy({ 
      where: { bonId: bonId }, 
      transaction 
    });

    // 4. Supprimer les historiques de statut
    await db.HistoriqueStatut.destroy({ 
      where: { bonId: bonId }, 
      transaction 
    });

    // 5. Supprimer le bon
    await Bon.destroy({ 
      where: { id: bonId }, 
      transaction 
    });

    await transaction.commit();
    return res.status(200).json({ message: 'Bon, panier et éléments associés supprimés avec succès' });
    
  } catch (error) {
    await transaction.rollback();logger.error('bon.controller', 'Erreur suppression bon avec cascade:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStatutBon = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { statutBon } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    bon.statutBon = statutBon;
    await bon.save();

    return res.json(bon);
  } catch (error) {logger.error('bon.controller', 'Erreur update statutBon:', error);
    return res.status(500).json({ error: error.message });
  }
};


exports.updateTypeBon = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { type } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    bon.type = type;
    await bon.save();

    return res.json(bon);
  } catch (error) {logger.error('bon.controller', 'Erreur update type:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateResteAPayer = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;

    if (!authUser) {
      await transaction.rollback();
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { montant } = req.body; // montant payé
    const bon = await Bon.findByPk(req.params.id, { transaction });
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) {
      await transaction.rollback();
      return res.status(verifStructure.statut).json({ message: verifStructure.message });
    }

    const nouveauReste = parseFloat(bon.resteAPayer) - parseFloat(montant);
    const updates = { resteAPayer: Math.max(0, nouveauReste) };

    // Auto-ajustement du statut si payé
    if (nouveauReste <= 0) {
      updates.statutBon = 'payé';
    }

    await bon.update(updates, { transaction });
    await transaction.commit();
    return res.json(bon);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();logger.error('bon.controller', 'Erreur update resteAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateNetAPayer = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;

    if (!authUser) {
      await transaction.rollback();
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { remise } = req.body;
    const bon = await Bon.findByPk(req.params.id, { transaction });
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) {
      await transaction.rollback();
      return res.status(verifStructure.statut).json({ message: verifStructure.message });
    }

    const netAPayer = parseFloat(bon.montantTotal) - parseFloat(remise);
    await bon.update({
      remise,
      netAPayer,
      resteAPayer: netAPayer // réinitialiser le reste dû
    }, { transaction });

    await transaction.commit();
    return res.json(bon);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();logger.error('bon.controller', 'Erreur update netAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateFichier = async (req, res) => {

  try {
      const authUser = req.user;

      if (!authUser) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const bon = await Bon.findByPk(req.params.id);
      if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
      const verifStructure = verifierAppartenanceStructure(bon, req.user);
      if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });
  
      if (!req.file) return res.status(400).json({ message: 'Aucune fichier fournie' });
  
      // Supprimer l'ancienne image si elle existe
      if (bon.fichier) {
        const oldPath = path.join('uploads', path.basename(bon.fichier));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
  
      // Mettre à jour le fichier
      const nouvelleImageUrl = BASE_URL + req.file.filename;
      await bon.update({ fichier: nouvelleImageUrl });
  
      res.json({ message: 'Fichier du bon mis à jour', bon });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la mise à jour de l'image", error: error.message });
    }
  /* try {
    const { fichier } = req.body; // chemin ou base64
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    bon.fichier = fichier;
    await bon.save();

    return res.json(bon);
  } catch (error) {logger.error('bon.controller', 'Erreur update fichier:', error);
    return res.status(500).json({ error: error.message });
  } */
};
exports.updateMotifsRetour = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;

    if (!authUser) {
      await transaction.rollback();
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { motifsRetour } = req.body;
    const bon = await Bon.findByPk(req.params.id, { transaction });
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    const verifStructure = verifierAppartenanceStructure(bon, req.user);
    if (!verifStructure.ok) {
      await transaction.rollback();
      return res.status(verifStructure.statut).json({ message: verifStructure.message });
    }

    await bon.update({ motifsRetour, statutBon: 'retourné' }, { transaction });
    await transaction.commit();
    return res.json(bon);
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();logger.error('bon.controller', 'Erreur update motifsRetour:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ==========================================
// Lister les bons d'une structure par fournisseur
// ==========================================
exports.getBonsByFournisseur = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, fournisseurId } = req.params;

    const bons = await Bon.findAll({
      where: {
        code_structure: code_structure,
        fournisseurId: fournisseurId,
        statutBon: { [Op.ne]: 'brouillon' } //Exclut les bons dont le statut est "brouillon"

      },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model:Produit} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ]
        
      ,
      order: [['created_at', 'DESC']],
    });

    res.status(200).json(bons);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des bons du fournisseur',
      error: error.message
    });
  }
};

// ==========================================
// Lister les bons d'une structure par client
// ==========================================
exports.getBonsByClient = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, clientId } = req.params;

    const bons = await Bon.findAll({
      where: {
        code_structure: code_structure,
        clientId: clientId,
        statutBon: { [Op.ne]: 'brouillon' } //Exclut les bons dont le statut est "brouillon"

      },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model:Produit}
            }
          ]
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ]
      ,
      order: [['created_at', 'DESC']],
    });

    res.status(200).json(bons);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des bons du client',
      error: error.message
    });
  }
};

exports.uploadFichier = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { bonId } = req.body;

    if (!bonId) {
      // Supprimer le fichier uploadé car pas de bonId
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'ID du bon requis' });
    }

    // Vérifier que le bon existe
    const bon = await db.Bon.findByPk(bonId);
    if (!bon) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Bon non trouvé' });
    }

    // Construire l'URL du fichier
    const fichierUrl = BASE_URL + req.file.filename;

    // Mettre à jour le bon avec le chemin du fichier
    await bon.update({ fichier: fichierUrl });

    res.status(200).json({
      message: 'Fichier uploadé avec succès',
      fichier: {
        nom: req.file.originalname,
        url: fichierUrl,
        taille: req.file.size,
        type: req.file.mimetype
      },
      bon: {
        id: bon.id,
        numero: bon.numero
      }
    });

  } catch (error) {
    // En cas d'erreur, supprimer le fichier uploadé
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }logger.error('bon.controller', 'Erreur upload fichier:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'upload du fichier',
      details: error.message 
    });
  }
};

// Supprimer un fichier
exports.supprimerFichier = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { bonId } = req.params;

    const bon = await db.Bon.findByPk(bonId);
    if (!bon || !bon.fichier) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Supprimer le fichier physique
    const nomFichier = path.basename(bon.fichier);
    const cheminFichier = path.join('uploads', nomFichier);
    
    if (fs.existsSync(cheminFichier)) {
      fs.unlinkSync(cheminFichier);
    }

    // Mettre à jour le bon
    await bon.update({ fichier: null });

    res.json({ message: 'Fichier supprimé avec succès' });

  } catch (error) {logger.error('bon.controller', 'Erreur suppression fichier:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
};


// Dans le contrôleur
exports.getBonsBrouillons = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    const bons = await db.Bon.findAll({
      where: { 
        code_structure, 
        statutBon: 'brouillon' 
      },
      include: [db.Panier]
    });
    res.json(bons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

