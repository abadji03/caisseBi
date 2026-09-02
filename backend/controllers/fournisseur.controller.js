const db = require('../models');
const { verifierAppartenanceStructure } = require('../services/verification.service');
const Fournisseur = db.Fournisseur;
const Bon = db.Bon;
const Panier = db.Panier;
const ArticlePanier = db.ArticlePanier;
const Produit = db.Produit;
const {Op} = db.Sequelize;
const HistoriqueService = require('../services/historique.service');


// Créer un nouveau fournisseur avec vérification de l'email et du téléphone
/* exports.createFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { email, telephone } = req.body;

    // Vérifier si un fournisseur existe déjà avec cet email ou ce téléphone
    const existingFournisseur = await Fournisseur.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ email: email }, { telephone: telephone }],
      },
    });

    if (existingFournisseur) {
      let message = '';
      if (existingFournisseur.email === email && existingFournisseur.telephone === telephone) {
        message = 'Un fournisseur existe déjà avec cet email et ce numéro de téléphone';
      } else if (existingFournisseur.email === email) {
        message = 'Un fournisseur existe déjà avec cet email';
      } else {
        message = 'Un fournisseur existe déjà avec ce numéro de téléphone';
      }

      return res.status(400).json({ message });
    }

    // Si aucun fournisseur existant n'est trouvé, créer le nouveau fournisseur
    const fournisseur = await Fournisseur.create(req.body);

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un nouveau fournisseur: ${fournisseur.nomComplet || fournisseur.nom || fournisseur.email}`,
      clientIp,
      {
        action: 'CREATE_FOURNISSEUR',
        fournisseurId: fournisseur.id,
        fournisseurData: {
          nomComplet: fournisseur.nomComplet,
          email: fournisseur.email,
          telephone: fournisseur.telephone,
          code_structure: fournisseur.code_structure,
          magasinId: fournisseur.magasinId
        }
      }
    );

    res.status(201).json(fournisseur);
  } catch (error) {

    // Enregistrer l'erreur dans l'historique
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la création d'un fournisseur`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_CREATE_FOURNISSEUR',
          error: error.message,
          data: req.body
        }
      );
    }
    res.status(500).json({
      message: 'Erreur lors de la création du fournisseur' + error,
      error: error.message,
    });
  }
}; */
// Créer un nouveau fournisseur avec association aux magasins
exports.createFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const { magasinIds, ...fournisseurData } = req.body; // Extraire les magasins

    console.log('Données magasins et fournisseurs reçues : ', fournisseurData,magasinIds);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { email, telephone } = fournisseurData;

    // Vérifier si un fournisseur existe déjà avec cet email ou ce téléphone
    const existingFournisseur = await Fournisseur.findOne({
      where: {
        [Op.or]: [{ email: email }, { telephone: telephone }],
      },
    });

    if (existingFournisseur) {
      let message = '';
      if (existingFournisseur.email === email && existingFournisseur.telephone === telephone) {
        message = 'Un fournisseur existe déjà avec cet email et ce numéro de téléphone';
      } else if (existingFournisseur.email === email) {
        message = 'Un fournisseur existe déjà avec cet email';
      } else {
        message = 'Un fournisseur existe déjà avec ce numéro de téléphone';
      }
      return res.status(400).json({ message });
    }

    console.log('Avant création fournisseur');
    // Créer le fournisseur
    const fournisseur = await Fournisseur.create(fournisseurData);

    console.log('Fournisseur créé:', fournisseur.id);

    // Associer les magasins si fournis
    if (magasinIds && magasinIds.length > 0) {
      await fournisseur.setMagasins(magasinIds);
      
      // Optionnel: Initialiser les soldes dans la table de liaison
      /* for (const magasinId of magasinIds) {
        await db.MagasinFournisseur.create({
          magasinId: magasinId,
          fournisseurId: fournisseur.id,
          solde: 0
        });
      } */
    }

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un nouveau fournisseur: ${fournisseur.nomComplet || fournisseur.email}`,
      clientIp,
      {
        action: 'CREATE_FOURNISSEUR',
        fournisseurId: fournisseur.id,
        fournisseurData: {
          nomComplet: fournisseur.nomComplet,
          email: fournisseur.email,
          telephone: fournisseur.telephone,
          code_structure: fournisseur.code_structure,
          magasins: magasinIds
        }
      }
    );

    // Recharger avec les associations
    const fournisseurAvecMagasins = await Fournisseur.findByPk(fournisseur.id, {
      include: [{ model: db.Magasin, through: { attributes: ['solde'] } }]
    });

    res.status(201).json(fournisseurAvecMagasins);
  } catch (error) {
    console.error('ERREUR COMPLETE:', error);
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la création d'un fournisseur`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_CREATE_FOURNISSEUR',
          error: error.message,
          data: req.body
        }
      );
    }
   res.status(500).json({
      message: 'Erreur lors de la création du fournisseur',
      error: error.message,
      stack: error.stack,
      details: error.errors // 🔥 important pour Sequelize
    });
  }
};

// Récupérer un fournisseur par son ID
exports.getFournisseurById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id, {
      include: [
        { 
          model: db.Magasin,
          through: { attributes: ['solde'] },
          attributes: ["id", "nom", "telephone", "email"]
        }
      ]
    });
    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    // Calculer le montant total à payer
    const fournisseurJson = fournisseur.toJSON();
    fournisseurJson.montantAPayer = fournisseurJson.magasins?.reduce((total, magasin) => {
      return total + (magasin.MagasinFournisseur?.solde || 0);
    }, 0) || 0;
    res.json(fournisseurJson);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération du fournisseur', error });
  }
};

exports.getFournisseurWithMagasins = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const fournisseur = await Fournisseur.findByPk(req.params.id, {
      include: [{ 
        model: db.Magasin, 
        through: { attributes: ['solde'] },
        attributes: ["id", "nom", "telephone", "email", "adresse"]
      }]
    });
    
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });

    // Ajouter les soldes par magasin
    const fournisseurJson = fournisseur.toJSON();
    if (fournisseurJson.Magasins) {
      fournisseurJson.Magasins.forEach(magasin => {
        magasin.solde = magasin.MagasinFournisseur?.solde || 0;
      });
    }

    res.json(fournisseurJson);
  } catch (error) {
    console.error('Erreur getFournisseurWithMagasins:', error);
    res.status(500).json({ message: 'Erreur récupération', error: error.message });
  }
};

// Mettre à jour un fournisseur
/* exports.updateFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });
    const verifStructure = verifierAppartenanceStructure(fournisseur, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    // Récupérer les anciennes valeurs pour comparer
    const oldValues = {
      nomComplet: fournisseur.nomComplet,
      email: fournisseur.email,
      telephone: fournisseur.telephone,
      adresse: fournisseur.adresse,
      statut: fournisseur.statut
    };

    await fournisseur.update(req.body);

    // Identifier les changements
    const changes = {};
    if (oldValues.nomComplet !== fournisseur.nomComplet) changes.nomComplet = { old: oldValues.nomComplet, new: fournisseur.nomComplet };
    if (oldValues.email !== fournisseur.email) changes.email = { old: oldValues.email, new: fournisseur.email };
    if (oldValues.telephone !== fournisseur.telephone) changes.telephone = { old: oldValues.telephone, new: fournisseur.telephone };
    if (oldValues.adresse !== fournisseur.adresse) changes.adresse = { old: oldValues.adresse, new: fournisseur.adresse };
    if (oldValues.statut !== fournisseur.statut) changes.statut = { old: oldValues.statut, new: fournisseur.statut };
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du fournisseur: ${fournisseur.nomComplet || fournisseur.email}`,
      clientIp,
      {
        action: 'UPDATE_FOURNISSEUR',
        fournisseurId: fournisseur.id,
        changes: changes,
        updatedData: req.body
      }
    );
    res.json({ message: 'Fournisseur mis à jour', fournisseur });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la mise à jour du fournisseur ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_FOURNISSEUR',
          fournisseurId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
}; */

// Mettre à jour un fournisseur
exports.updateFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const { magasinIds, ...updateData } = req.body;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });
    const verifStructure = verifierAppartenanceStructure(fournisseur, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    // Récupérer les anciennes valeurs
    const oldValues = {
      nomComplet: fournisseur.nomComplet,
      email: fournisseur.email,
      telephone: fournisseur.telephone,
      adresse: fournisseur.adresse,
      statut: fournisseur.statut
    };

    // Mettre à jour le fournisseur
    await fournisseur.update(updateData);

    // Mettre à jour les associations de magasins si fournies
    let magasinChanges = null;
    if (magasinIds && Array.isArray(magasinIds)) {
      const oldMagasins = await fournisseur.getMagasins();
      const oldMagasinIds = oldMagasins.map(m => m.id);
      magasinChanges = {
        old: oldMagasinIds,
        new: magasinIds,
        added: magasinIds.filter(id => !oldMagasinIds.includes(id)),
        removed: oldMagasinIds.filter(id => !magasinIds.includes(id))
      };
      await fournisseur.setMagasins(magasinIds);
    }

    // Identifier les changements
    const changes = {};
    if (oldValues.nomComplet !== fournisseur.nomComplet) changes.nomComplet = { old: oldValues.nomComplet, new: fournisseur.nomComplet };
    if (oldValues.email !== fournisseur.email) changes.email = { old: oldValues.email, new: fournisseur.email };
    if (oldValues.telephone !== fournisseur.telephone) changes.telephone = { old: oldValues.telephone, new: fournisseur.telephone };
    if (oldValues.adresse !== fournisseur.adresse) changes.adresse = { old: oldValues.adresse, new: fournisseur.adresse };
    if (oldValues.statut !== fournisseur.statut) changes.statut = { old: oldValues.statut, new: fournisseur.statut };
    if (magasinChanges) changes.magasins = magasinChanges;
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du fournisseur: ${fournisseur.nomComplet || fournisseur.email}`,
      clientIp,
      {
        action: 'UPDATE_FOURNISSEUR',
        fournisseurId: fournisseur.id,
        changes: changes,
        updatedData: updateData
      }
    );

    // Recharger avec les magasins
    const fournisseurMisAJour = await Fournisseur.findByPk(fournisseur.id, {
      include: [{ model: db.Magasin, as: 'magasins', through: { attributes: ['solde'] } }]
    });

    res.json({ message: 'Fournisseur mis à jour', fournisseur: fournisseurMisAJour });
  } catch (error) {
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la mise à jour du fournisseur ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_FOURNISSEUR',
          fournisseurId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour', error: error.message });
  }
};


// Mettre à jour le solde d'un fournisseur pour un magasin spécifique
exports.updateFournisseurSoldeByMagasin = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const { fournisseurId, magasinId } = req.params;
    const { solde } = req.body;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Vérifier si la relation existe
    const relation = await db.MagasinFournisseur.findOne({
      where: {
        fournisseurId: fournisseurId,
        magasinId: magasinId
      }
    });

    if (!relation) {
      return res.status(404).json({ 
        message: 'Ce fournisseur n\'est pas associé à ce magasin' 
      });
    }

    const oldSolde = relation.solde;
    await relation.update({ solde });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du solde fournisseur pour le magasin ${magasinId}`,
      clientIp,
      {
        action: 'UPDATE_FOURNISSEUR_SOLDE',
        fournisseurId: fournisseurId,
        magasinId: magasinId,
        oldSolde: oldSolde,
        newSolde: solde
      }
    );

    res.json({ 
      message: 'Solde mis à jour avec succès', 
      magasinId, 
      fournisseurId, 
      solde 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour du solde', 
      error: error.message 
    });
  }
};

// Mettre à jour uniquement le statut d'un fournisseur
exports.updateFournisseurStatus = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });
    const verifStructure = verifierAppartenanceStructure(fournisseur, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    const { statut } = req.body;
    if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' });

    const oldStatut = fournisseur.statut;
    await fournisseur.update({ statut });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut du fournisseur ${fournisseur.nomComplet || fournisseur.email}: ${oldStatut ? 'actif' : 'inactif'} → ${statut ? 'actif' : 'inactif'}`,
      clientIp,
      {
        action: 'UPDATE_FOURNISSEUR_STATUS',
        fournisseurId: fournisseur.id,
        oldStatut: oldStatut,
        newStatut: statut
      }
    );

    res.json({ message: 'Statut du fournisseur mis à jour', fournisseur });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors du changement de statut du fournisseur ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_FOURNISSEUR_STATUS',
          fournisseurId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};

// Supprimer un fournisseur
exports.deleteFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });
    const verifStructure = verifierAppartenanceStructure(fournisseur, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    // Sauvegarder les infos avant suppression
    const fournisseurInfo = {
      id: fournisseur.id,
      nomComplet: fournisseur.nomComplet,
      email: fournisseur.email,
      telephone: fournisseur.telephone,
      code_structure: fournisseur.code_structure
    };

     // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression du fournisseur: ${fournisseurInfo.nomComplet || fournisseurInfo.email}`,
      clientIp,
      {
        action: 'DELETE_FOURNISSEUR',
        fournisseurInfo: fournisseurInfo
      }
    );
    await fournisseur.destroy();
    res.json({ message: 'Fournisseur supprimé' });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la suppression du fournisseur ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_DELETE_FOURNISSEUR',
          fournisseurId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur suppression', error });
  }
};


exports.getFournisseursByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // Vérification : l'utilisateur doit appartenir à la structure demandée
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

    let whereClause = { code_structure: code_structure };
    let includeConfig = [
      { 
        model: db.Magasin,
        through: { attributes: ['solde'] },
        attributes: ["id", "nom", "telephone", "email"]
      }
    ];

    // Si gérant : filtrer par son magasin
    if (!isAdminStructure && isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n'est associé à aucun magasin"
        });
      }
      includeConfig[0].where = { id: authUser.magasinId };
      includeConfig[0].required = true;
    }

    const fournisseurs = await Fournisseur.findAll({
      where: whereClause,
      include: includeConfig,
      order: [['created_at', 'DESC']]
    });

    // Transformer les résultats
    const fournisseursAvecMontant = fournisseurs.map(fournisseur => {
      const fournisseurJson = fournisseur.toJSON();
      
      if (!isAdminStructure && isGerant && authUser.magasinId) {
        const magasinAssocie = fournisseurJson.magasins?.find(m => m.id === authUser.magasinId);
        fournisseurJson.montantAPayer = magasinAssocie?.MagasinFournisseur?.solde || 0;
      } else {
        fournisseurJson.montantAPayer = fournisseurJson.magasins?.reduce((total, magasin) => {
          return total + (magasin.MagasinFournisseur?.solde || 0);
        }, 0) || 0;
      }
      
      return fournisseurJson;
    });

    res.json(fournisseursAvecMontant);
  } catch (error) {
    console.error("Erreur récupération fournisseurs:", error);
    res.status(500).json({ message: 'Erreur récupération', error: error.message });
  }
};

// Récupérer les fournisseurs par structure avec pagination et recherche
exports.getFournisseursByStructureBis = async (req, res) => {
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
      statut = 'tous'
    } = req.query;

    // Vérification : l'utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

    if (!isAdminStructure && !isGerant) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Clause where par défaut (structure) - PAS de magasinId ici
    let whereClause = {
      code_structure: code_structure
    };

    // Configuration de l'include pour les magasins
    let includeConfig = [
      { 
        model: db.Magasin,
        through: { attributes: ['solde'] },
        attributes: ["id", "nom", "telephone", "email"]
      }
    ];

    // 🔹 Si gérant : filtrer par son magasin via la table de liaison
    if (!isAdminStructure && isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n'est associé à aucun magasin"
        });
      }
      // Filtrer via la table de liaison - ne montrer que les fournisseurs associés à ce magasin
      includeConfig[0].where = { id: authUser.magasinId };
      includeConfig[0].required = true; // INNER JOIN pour ne garder que ceux avec ce magasin
    }

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nomComplet: { [Op.like]: `%${search}%` } },
        { adresse: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        { banque: { [Op.like]: `%${search}%` } },
        { numeroCompte: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // 🔹 FILTRE PAR STATUT
    if (statut !== 'tous') {
      whereClause.statut = statut === 'actif' ? true : false;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Fournisseur.findAndCountAll({
      where: whereClause,
      include: includeConfig,
      order: [['nom_complet', 'ASC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Transformer les résultats pour inclure le montantAPayer par magasin si nécessaire
    const rowsAvecMontant = rows.map(fournisseur => {
      const fournisseurJson = fournisseur.toJSON();
      
      // Si l'utilisateur est gérant, montrer le montant pour son magasin spécifique
      if (!isAdminStructure && isGerant && authUser.magasinId) {
        const magasinAssocie = fournisseurJson.magasins?.find(m => m.id === authUser.magasinId);
        fournisseurJson.montantAPayer = magasinAssocie?.MagasinFournisseur?.solde || 0;
      } 
      // Si admin, calculer le total de tous les magasins
      else {
        fournisseurJson.montantAPayer = fournisseurJson.magasins?.reduce((total, magasin) => {
          return total + (magasin.MagasinFournisseur?.solde || 0);
        }, 0) || 0;
      }
      
      return fournisseurJson;
    });

    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Fournisseurs: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: rowsAvecMontant,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error("Erreur récupération fournisseurs:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des fournisseurs', 
      error: error.message 
    });
  }
};



exports.getBonsWithPaniersAndProduits = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id, code_structure } = req.params;

    const fournisseur = await Fournisseur.findOne({
      where: { id, code_structure: code_structure },
      include: [
        {
          model: Bon,
          include: [
            {
              model: Panier,
              include: [
                {
                  model: ArticlePanier,
                  include: [Produit]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    res.json(fournisseur);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NOUVEAU : Exporter les fournisseurs vers Excel
exports.exportFournisseursExcel = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const ExcelJS = require('exceljs');

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, magasinId, search, statut } = req.query;
    
    // Construction de la clause WHERE
    let whereClause = {};
    
    if (code_structure) {
      whereClause.code_structure = code_structure;
    }
    
    if (magasinId) {
      whereClause.magasinId = parseInt(magasinId);
    }
    
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nomComplet: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        { adresse: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (statut && statut !== 'tous') {
      whereClause.statut = statut === 'actif' ? true : false;
    }
    
    const fournisseurs = await Fournisseur.findAll({
      where: whereClause,
      include: [
        { model: db.Magasin, attributes: ["id", "nom"] }
      ],
      order: [['nomComplet', 'ASC']]
    });
    
    // Création du workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = authUser.nom || 'Application';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Fournisseurs');
    
    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      }
    };
    
    // En-têtes
    const headers = [
      'ID', 'Nom complet', 'Email', 'Téléphone', 'Adresse', 
      'Banque', 'N° Compte', 'Montant à payer', 'Statut', 
      'Magasin', 'Date création'
    ];
    
    sheet.addRow(headers).eachCell(cell => {
      cell.style = headerStyle;
    });
    
    // Remplir les données
    fournisseurs.forEach(fournisseur => {
      sheet.addRow([
        fournisseur.id,
        fournisseur.nomComplet || '-',
        fournisseur.email || '-',
        fournisseur.telephone || '-',
        fournisseur.adresse || '-',
        fournisseur.banque || '-',
        fournisseur.numeroCompte || '-',
        fournisseur.montantAPayer ? `${fournisseur.montantAPayer.toLocaleString('fr-FR')} F CFA` : '0 F CFA',
        fournisseur.statut ? 'Actif' : 'Inactif',
        fournisseur.Magasin?.nom || '-',
        fournisseur.createdAt ? new Date(fournisseur.createdAt).toLocaleDateString('fr-FR') : '-'
      ]);
    });
    
    // Ajuster les largeurs
    sheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Export Excel de ${fournisseurs.length} fournisseurs`,
      clientIp,
      {
        action: 'EXPORT_FOURNISSEURS_EXCEL',
        nombreFournisseurs: fournisseurs.length,
        filtres: { code_structure, magasinId, search, statut }
      }
    );
    
    // Générer et envoyer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=fournisseurs-${Date.now()}.xlsx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Erreur export Excel fournisseurs:', error);
    
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de l'export Excel des fournisseurs`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_EXPORT_FOURNISSEURS',
          error: error.message
        }
      );
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de l\'export Excel',
      error: error.message 
    });
  }
};
