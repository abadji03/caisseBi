
// controllers/panierController.js
const db = require('../models');
const { verifierAppartenanceStructure } = require('../services/verification.service');
const Panier = db.Panier;
const ArticlePanier = db.ArticlePanier;
const fs = require('fs');
const path = require('path');
const HistoriqueService = require('../services/historique.service');

exports.createPanier = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const panier = await Panier.create(req.body);

     // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un nouveau panier (ID: ${panier.id})`,
      clientIp,
      { 
        action: 'CREATE_PANIER',
        panierId: panier.id,
        panierData: {
          totalHT: panier.totalHT,
          totalTTC: panier.totalTTC,
          statut: panier.statut,
          magasinId: panier.magasinId,
          code_structure: panier.code_structure
        }
      }
    );
    return res.status(201).json(panier);
  } catch (error) {
    console.error('Erreur création panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Lister les paniers d'une structure
exports.getPaniersByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;
    const { magasinId } = req.query; // Ajout du paramètre magasinId depuis les query params

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({ message: "Accès interdit : structure non autorisée" });
    }

    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    let whereCondition = { code_structure };
    
    // Construire la condition where
    //const whereCondition = { code_structure };
    
    // Ajouter la condition magasinId si elle est fournie
    // if (magasinId) {
    //   whereCondition.magasinId = magasinId;
    // }
    // ==========================
    // 🔹 SCOPE SELON ROLE
    // ==========================

    if (isAdmin) {
      // Admin -> tout dans la structure
      // (optionnel) filtre magasin si query donnée
      if (magasinId) whereCondition.magasinId = magasinId;
    }

    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({ message: "Ce gérant n’est associé à aucun magasin" });
      }

      whereCondition.magasinId = authUser.magasinId;
    }

    else if (isCaissier || isEmploye) {
      // Caissier/Employé -> uniquement ses ventes
      whereCondition.agentId = authUser.id;

      // (Optionnel) si tu veux aussi limiter au magasin
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    }

    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }
    
    const paniers = await Panier.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
    });
    return res.json(paniers);
  } catch (error) {
    console.error('Erreur récupération paniers par structure:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des paniers' });
  }
};

// Lister tous les paniers avec associations
exports.getAllPaniers = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const paniers = await Panier.findAll({
      include: [
        { model: db.Client, as: 'Client' },
        { model: db.Bon, as: 'Bon' },
        { model: db.Magasin, as: 'Magasin' },
        { model: db.Users, as: 'User' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json(paniers);
  } catch (error) {
    console.error('Erreur récupération tous les paniers:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Récupérer un panier par ID
exports.getPanierById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    const verifStructure = verifierAppartenanceStructure(panier, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });
    return res.json(panier);
  } catch (error) {
    console.error('Erreur récupération panier par ID:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Mettre à jour un panier
exports.updatePanier = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Récupérer l'ancien panier pour comparer
    const oldPanier = await Panier.findByPk(req.params.id);
    if (!oldPanier) {
      return res.status(404).json({ message: 'Panier non trouvé' });
    }
    const verifStructure = verifierAppartenanceStructure(oldPanier, req.user);
    if (!verifStructure.ok) {
      return res.status(verifStructure.statut).json({ message: verifStructure.message });
    }

    req.body.dateMiseAJour = new Date(); // maj auto de la date
    const [updated] = await Panier.update(req.body, {
      where: { id: req.params.id, code_structure: authUser.code_structure },
    });
    if (!updated) return res.status(404).json({ message: 'Panier non trouvé' });
    const panier = await Panier.findByPk(req.params.id);

    // Préparer les changements
    const changes = {};
    if (oldPanier.totalHT !== panier.totalHT) changes.totalHT = { old: oldPanier.totalHT, new: panier.totalHT };
    if (oldPanier.totalTTC !== panier.totalTTC) changes.totalTTC = { old: oldPanier.totalTTC, new: panier.totalTTC };
    if (oldPanier.statut !== panier.statut) changes.statut = { old: oldPanier.statut, new: panier.statut };
    
    // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du panier (ID: ${panier.id})`,
      clientIp,
      { 
        action: 'UPDATE_PANIER',
        panierId: panier.id,
        changes: changes
      }
    );
    return res.json(panier);
  } catch (error) {
    console.error('Erreur update panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteOnlyPanier = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    // Récupérer le panier avant suppression
    const panier = await Panier.findByPk(id);
    if (!panier) {
      return res.status(404).json({ message: 'Panier non trouvé' });
    }

    const deleted = await Panier.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Panier non trouvée' });

     // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression du panier (ID: ${id})`,
      clientIp,
      { 
        action: 'DELETE_PANIER_ONLY',
        panierId: id,
        panierData: {
          totalHT: panier.totalHT,
          totalTTC: panier.totalTTC,
          statut: panier.statut
        }
      }
    );

    res.json({ message: 'Panier supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};
// Supprimer un panier avec cascade
exports.deletePanier = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const panierId = req.params.id;
    
    // Trouver le panier avec ses articles et le bon associé
    const panier = await Panier.findByPk(panierId, {
      include: [
        {
          model: db.ArticlePanier,
          as: 'ArticlePaniers'
        },
        {
          model: db.Bon,
          as: 'Bon'
        }
      ],
      transaction
    });
    
    if (!panier) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Panier non trouvé' });
    }

    // Sauvegarder les informations pour l'historique
    const panierData = {
      id: panier.id,
      totalHT: panier.totalHT,
      totalTTC: panier.totalTTC,
      statut: panier.statut,
      articlesCount: panier.ArticlePaniers?.length || 0,
      hasBon: !!panier.Bon
    };

    // Supprimer en cascade dans l'ordre
    // 1. Supprimer les articles du panier
    await ArticlePanier.destroy({ 
      where: { panierId: panierId }, 
      transaction 
    });

    // 2. Supprimer les éventuels paiements associés
    if (panier.bonId) {
      await db.Paiement.destroy({ 
        where: { panierId: panierId }, 
        transaction 
      });
    }

    // 3. Supprimer le panier
    await Panier.destroy({ 
      where: { id: panierId }, 
      transaction 
    });

    // 4. Si le panier était lié à un bon, supprimer aussi le bon
    if (panier.Bon) {
      // Supprimer le fichier du bon s'il existe
      if (panier.Bon.fichier) {
        const nomFichier = path.basename(panier.Bon.fichier);
        const cheminFichier = path.join('uploads', nomFichier);
        
        if (fs.existsSync(cheminFichier)) {
          fs.unlinkSync(cheminFichier);
        }
      }

      // Supprimer les historiques de statut du bon
      await db.HistoriqueStatut.destroy({ 
        where: { bonId: panier.Bon.id }, 
        transaction 
      });

      // Supprimer le bon
      await db.Bon.destroy({ 
        where: { id: panier.Bon.id }, 
        transaction 
      });
    }

    await transaction.commit();

    // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression complète du panier (ID: ${panierId}) avec ses articles et son bon associé`,
      clientIp,
      { 
        action: 'DELETE_PANIER_CASCADE',
        panierId: panierId,
        panierData: panierData
      }
    );

    return res.status(200).json({ message: 'Panier, articles et bon associé supprimés avec succès' });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur suppression panier avec cascade:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStatutPanier = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { statut } = req.body;
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    const verifStructure = verifierAppartenanceStructure(panier, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

     const oldStatut = panier.statut;
    panier.statut = statut;
    panier.dateMiseAJour = new Date();
    await panier.save();

    // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut du panier (ID: ${panier.id}) : ${oldStatut} → ${statut}`,
      clientIp,
      { 
        action: 'UPDATE_PANIER_STATUS',
        panierId: panier.id,
        oldStatut: oldStatut,
        newStatut: statut
      }
    );

    return res.json(panier);
  } catch (error) {
    console.error('Erreur update statut panier:', error);
    return res.status(500).json({ error: error.message });
  }
};


exports.updateTotauxPanier = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { totalHT, tva } = req.body;
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    const verifStructure = verifierAppartenanceStructure(panier, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    const oldTotaux = {
      totalHT: panier.totalHT,
      tva: panier.tva,
      totalTTC: panier.totalTTC
    };

    panier.totalHT = parseFloat(totalHT);
    panier.tva = parseFloat(tva);
    panier.totalTTC = panier.totalHT + panier.tva;
    panier.dateMiseAJour = new Date();

    await panier.save();
     // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour des totaux du panier (ID: ${panier.id})`,
      clientIp,
      { 
        action: 'UPDATE_PANIER_TOTALS',
        panierId: panier.id,
        oldTotals: oldTotaux,
        newTotals: {
          totalHT: panier.totalHT,
          tva: panier.tva,
          totalTTC: panier.totalTTC
        }
      }
    );
    return res.json(panier);
  } catch (error) {
    console.error('Erreur update totaux panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateDetailsVisible = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { visible } = req.body; // true ou false
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    const verifStructure = verifierAppartenanceStructure(panier, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    const oldVisible = panier.detailsVisible;
    panier.detailsVisible = visible;
    panier.dateMiseAJour = new Date();
    await panier.save();

     // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification de la visibilité des détails du panier (ID: ${panier.id}) : ${oldVisible} → ${visible}`,
      clientIp,
      { 
        action: 'UPDATE_PANIER_VISIBILITY',
        panierId: panier.id,
        oldVisibility: oldVisible,
        newVisibility: visible
      }
    );

    return res.json(panier);
  } catch (error) {
    console.error('Erreur update detailsVisible panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.resetPanier = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    const verifStructure = verifierAppartenanceStructure(panier, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    const oldValues = {
      totalHT: panier.totalHT,
      tva: panier.tva,
      totalTTC: panier.totalTTC,
      statut: panier.statut
    };

    panier.totalHT = 0;
    panier.tva = 0;
    panier.totalTTC = 0;
    panier.statut = 'EN_COURS';
    panier.dateMiseAJour = new Date();

    await panier.save();

    // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Réinitialisation du panier (ID: ${panier.id})`,
      clientIp,
      { 
        action: 'RESET_PANIER',
        panierId: panier.id,
        oldValues: oldValues,
        newValues: {
          totalHT: 0,
          tva: 0,
          totalTTC: 0,
          statut: 'EN_COURS'
        }
      }
    );
    
    return res.json(panier);
  } catch (error) {
    console.error('Erreur reset panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getPanierByBonId = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { bonId } = req.params;

    const panier = await Panier.findOne({
      where: { bonId }, 
      include: [
        {
          model: db.ArticlePanier,
          include: [
            {
              model: db.Produit,
            },
          ],
        },
        {
          model: db.Bon,
        },
        {
          model: db.Client,
        },
      ],
    });

    if (!panier) {
      return res.status(404).json({ message: 'Aucun panier trouvé pour ce bon.' });
    }

    return res.status(200).json(panier);
  } catch (error) {
    console.error('Erreur récupération panier par bon ID:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Récupérer les paniers pour une journée spécifique (par date)
/* exports.getPaniersParDate = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { date } = req.params; // Format: YYYY-MM-DD
    const { code_structure, magasinId } = req.query;
    
    // Vérifier le format de la date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ 
        message: 'Format de date invalide. Utilisez YYYY-MM-DD' 
      });
    }
    
    // Calculer début et fin de la journée spécifiée
    const dateSpecifique = new Date(date);
    const debutJournee = new Date(dateSpecifique.setHours(0, 0, 0, 0));
    const finJournee = new Date(dateSpecifique.setHours(23, 59, 59, 999));
    
    // Construire la condition where
    const whereCondition = {
      dateCreation: {
        [db.Sequelize.Op.between]: [debutJournee, finJournee]
      }
    };
    
    // Ajouter les filtres optionnels
    if (code_structure) {
      whereCondition.code_structure = code_structure;
    }
    
    if (magasinId) {
      whereCondition.magasinId = magasinId;
    }
    
    const paniers = await Panier.findAll({
      where: whereCondition,
      include: [
        { 
          model: db.Client, 
          as: 'Client' 
        },
        { 
          model: db.Bon, 
          as: 'Bon' 
        },
        { 
          model: db.Magasin, 
          as: 'Magasin' 
        },
        { 
          model: db.Users, 
          as: 'User' 
        },
        {
          model: db.ArticlePanier,
          as: 'ArticlePaniers',
          include: [{
            model: db.Produit,
            as: 'Produit'
          }]
        }
      ],
      order: [['dateCreation', 'DESC']],
    });
    
    // Calcul des statistiques
    const stats = {
      totalVentes: paniers.length,
      totalHT: paniers.reduce((sum, panier) => sum + parseFloat(panier.totalHT || 0), 0),
      totalTTC: paniers.reduce((sum, panier) => sum + parseFloat(panier.totalTTC || 0), 0),
      parStatut: {
        validé: paniers.filter(p => p.statut === 'validé').length,
        annulé: paniers.filter(p => p.statut === 'annulé').length,
        retourné: paniers.filter(p => p.statut === 'retourné').length,
        en_cours: paniers.filter(p => p.statut === 'en_cours').length,
      }
    };
    
    return res.json({
      date: date,
      paniers: paniers,
      statistiques: stats
    });
  } catch (error) {
    console.error('Erreur récupération paniers par date:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}; */

exports.getPaniersParDate = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { date } = req.params; // YYYY-MM-DD
    const { magasinId } = req.query; // accepté seulement pour admin
    const { Op } = db.Sequelize;

    // 🔥 code_structure vient du token, pas du query
    const code_structure = authUser.code_structure;

    // Vérifier le format de la date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "Format de date invalide. Utilisez YYYY-MM-DD"
      });
    }

    // Calculer début et fin de la journée spécifiée
    const dateSpecifique = new Date(date);

    const debutJournee = new Date(dateSpecifique);
    debutJournee.setHours(0, 0, 0, 0);

    const finJournee = new Date(dateSpecifique);
    finJournee.setHours(23, 59, 59, 999);

    // Vérifier rôle
    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    // ==========================
    // 🔹 BASE WHERE
    // ==========================
    const whereCondition = {
      code_structure,
      dateCreation: {
        [Op.between]: [debutJournee, finJournee]
      }
    };

    // ==========================
    // 🔹 SCOPE SELON ROLE
    // ==========================
    if (isAdmin) {
      // Admin -> tout structure
      if (magasinId) {
        whereCondition.magasinId = magasinId;
      }
    }

    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }

      whereCondition.magasinId = authUser.magasinId;
    }

    else if (isCaissier || isEmploye) {
      // Caissier/Employé -> uniquement ses paniers
      whereCondition.agentId = authUser.id;

      // Optionnel : renforcer aussi par magasin
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    }

    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // ==========================
    // 🔹 QUERY
    // ==========================
    const paniers = await Panier.findAll({
      where: whereCondition,
      include: [
        { model: db.Client, as: "Client" },
        { model: db.Bon, as: "Bon" },
        { model: db.Magasin, as: "Magasin" },
        { model: db.Users, as: "User" },
        {
          model: db.ArticlePanier,
          as: "ArticlePaniers",
          include: [{ model: db.Produit, as: "Produit" }]
        }
      ],
      order: [["dateCreation", "DESC"]],
    });

    // ==========================
    // 🔹 STATS
    // ==========================
    const stats = {
      totalVentes: paniers.length,
      totalHT: paniers.reduce((sum, panier) => sum + parseFloat(panier.totalHT || 0), 0),
      totalTTC: paniers.reduce((sum, panier) => sum + parseFloat(panier.totalTTC || 0), 0),
      parStatut: {
        validé: paniers.filter(p => p.statut === "validé").length,
        annulé: paniers.filter(p => p.statut === "annulé").length,
        retourné: paniers.filter(p => p.statut === "retourné").length,
        en_cours: paniers.filter(p => p.statut === "en_cours").length,
      }
    };

    return res.json({
      date,
      paniers,
      statistiques: stats
    });

  } catch (error) {
    console.error("Erreur récupération paniers par date:", error);
    return res.status(500).json({
      error: error.message
    });
  }
};


// Lister les paniers d'une structure avec filtre par magasin
exports.getPaniersByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;
    const { magasinId, dateDebut, dateFin, statut } = req.query;
    
   // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({ message: "Accès interdit : structure non autorisée" });
    }

    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    // ==========================
    // 🔹 BASE WHERE (structure)
    // ==========================
    const whereCondition = { code_structure };

    // ==========================
    // 🔹 SCOPE SELON ROLE
    // ==========================
    if (isAdmin) {
      // Admin -> tout dans la structure
      // (il peut filtrer magasinId via query)
      if (magasinId) whereCondition.magasinId = magasinId;
    }

    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({ message: "Ce gérant n’est associé à aucun magasin" });
      }
      whereCondition.magasinId = authUser.magasinId;
    }

    else if (isCaissier || isEmploye) {
      // Caissier/Employé -> uniquement ses paniers
      whereCondition.agentId = authUser.id;

      // Optionnel : renforcer aussi par magasin
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    }

    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }
    

    // ==========================
    // 🔹 FILTRES QUERY PARAMS
    // ==========================

    // Filtre statut
    if (statut) {
      whereCondition.statut = statut;
    }

    // Filtre magasinId (uniquement si Admin)
    if (magasinId && isAdmin) {
      whereCondition.magasinId = magasinId;
    }

    // Filtre date
    if (dateDebut || dateFin) {
      whereCondition.dateCreation = {};

      if (dateDebut) {
        const debut = new Date(dateDebut);
        debut.setHours(0, 0, 0, 0);
        whereCondition.dateCreation[db.Sequelize.Op.gte] = debut;
      }

      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setHours(23, 59, 59, 999);
        whereCondition.dateCreation[db.Sequelize.Op.lte] = fin;
      }
    }
    
    const paniers = await Panier.findAll({
      where: whereCondition,
      include: [
        { 
          model: db.Client, attributes: ['id', 'nomComplet'] 
        },
        { 
          model: db.Bon, attributes: ['id', 'numero', 'type', 'netAPayer'],
        },
        { 
          model: db.Magasin, attributes: ['id', 'nom','telephone', 'email'],
        },
        { 
          model: db.Users, attributes: ['id', 'nom'],
        }
      ],
      order: [['date_creation', 'DESC']],
    });
    
    return res.json(paniers);
  } catch (error) {
    console.error('Erreur récupération paniers par structure:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des paniers' 
    });
  }
};


exports.getPaniersBrouillons = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure,magasinId } = req.params;

    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    /* if (authUser.magasinId !== magasinId) {
      return res.status(403).json({
        message: "Action interdite : utilisateur non autorisée"
      });
    } */
    
    const paniers = await db.Panier.findAll({
      where: { 
        code_structure, 
        magasinId,
        statut: 'en_cours',
        typeEntite: 'autre'
      },
      include: [
        {
          model: db.ArticlePanier,
          include: [
            {
              model: db.Produit,attributes:['id','designation','unite']
            },
          ],
        },

      ]
    });
    res.json(paniers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Récupérer uniquement les paniers d'aujourd'hui
/* exports.getPaniersAujourdhui = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    // 🔥 Vérification structure (obligatoire)
    const code_structure = authUser.code_structure;

    const { magasinId,bonId } = req.query;
    const { Op } = db.Sequelize;
    
    // Date d'aujourd'hui
    const aujourdhui = new Date();
    const debutJournee = new Date(aujourdhui.setHours(0, 0, 0, 0));
    const finJournee = new Date(aujourdhui.setHours(23, 59, 59, 999));
    
    // Construire la condition where
    const whereCondition = {
      statut: { [Op.ne]: 'en_cours' },
      dateCreation: {
        [db.Sequelize.Op.between]: [debutJournee, finJournee]
      },
      [Op.or]: [
        { typeEntite: 'autre' },
        { typeEntite: { [Op.notIn]: ['client', 'fournisseur'] } },
        
      ]
    };
    
    // Filtres optionnels
    if (code_structure) {
      whereCondition.code_structure = code_structure;
    }
    
    if (magasinId) {
      whereCondition.magasinId = magasinId;
    }
    // Filtrer par bonId si spécifié
    if (bonId === 'null' || bonId === '') {
      // Ventes directes (sans bon)
      whereCondition.bonId = null;
    } 
    
    const paniers = await Panier.findAll({
      where: whereCondition,
      include: [
        { 
          model: db.Magasin, 
          attributes: ['id', 'nom']
        },
        { 
          model: db.Users, 
          attributes: ['id', 'nom']
        },
        { 
          model: db.Paiement, 
        },
        {
          model: db.ArticlePanier,
          include: [{
            model: db.Produit,
          }]
        }
      ],
      order: [['dateCreation', 'DESC']],
    });
    
    // ============================
    // Calcul du total global
    // ============================
    const whereTotalGlobal = {
      ...whereCondition,
      statut: {
        [Op.notIn]: ['annulé', 'retourné', 'en_cours']
      }
    };
    const totalGlobal = await Panier.sum('totalTTC', {
      where: whereTotalGlobal
    });

    return res.json({
      totalGlobal: totalGlobal || 0,
      nombrePaniers: paniers.length,
      paniers
    });
    //return res.json(paniers);
  } catch (error) {
    console.error('Erreur récupération paniers du jour:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}; */
exports.getPaniersAujourdhui = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { Op } = db.Sequelize;
    const { bonId, magasinId } = req.query; // magasinId sera autorisé seulement pour admin

    // 🔥 Vérification structure (obligatoire)
    const code_structure = authUser.code_structure;

    // Date d'aujourd'hui
    const aujourdhui = new Date();
    const debutJournee = new Date(aujourdhui);
    debutJournee.setHours(0, 0, 0, 0);

    const finJournee = new Date(aujourdhui);
    finJournee.setHours(23, 59, 59, 999);

    // Vérifier rôle
    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    // ==========================
    // 🔹 BASE WHERE
    // ==========================
    const whereCondition = {
      code_structure,
      statut: { [Op.ne]: "en_cours" },
      dateCreation: {
        [Op.between]: [debutJournee, finJournee],
      },
      [Op.or]: [
        { typeEntite: "autre" },
        { typeEntite: { [Op.notIn]: ["client", "fournisseur"] } },
      ],
    };

    // ==========================
    // 🔹 SCOPE SELON ROLE
    // ==========================
    if (isAdmin) {
      // Admin -> tout structure
      // Filtre magasinId optionnel (query)
      if (magasinId) {
        whereCondition.magasinId = magasinId;
      }
    } 
    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }

      whereCondition.magasinId = authUser.magasinId;
    } 
    else if (isCaissier || isEmploye) {
      // Caissier/Employé -> uniquement ses paniers
      whereCondition.agentId = authUser.id;

      // Optionnel : renforcer par magasin
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    } 
    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // ==========================
    // 🔹 FILTRE bonId
    // ==========================
    if (bonId === "null" || bonId === "") {
      // Ventes directes (sans bon)
      whereCondition.bonId = null;
    } else if (bonId) {
      // si bonId est un vrai ID
      whereCondition.bonId = bonId;
    }

    // ==========================
    // 🔹 QUERY PANIERS
    // ==========================
    const paniers = await Panier.findAll({
      where: whereCondition,
      include: [
        {
          model: db.Magasin,
          attributes: ["id", "nom"],
        },
        {
          model: db.Users,
          attributes: ["id", "nom"],
        },
        {
          model: db.Paiement,
        },
        {
          model: db.ArticlePanier,
          include: [
            {
              model: db.Produit,
            },
          ],
        },
      ],
      order: [["date_creation", "DESC"]],
    });

    // ==========================
    // 🔹 TOTAL GLOBAL
    // ==========================
    const whereTotalGlobal = {
      ...whereCondition,
      statut: {
        [Op.notIn]: ["annulé", "retourné", "en_cours"],
      },
    };

    const totalGlobal = await Panier.sum("totalTTC", {
      where: whereTotalGlobal,
    });

    return res.json({
      totalGlobal: totalGlobal || 0,
      nombrePaniers: paniers.length,
      paniers,
    });
  } catch (error) {
    console.error("Erreur récupération paniers du jour:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
};

// Récupérer les paniers du jour avec pagination et recherche
/* exports.getPaniersAujourdhuiBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { Op } = db.Sequelize;
    const { bonId, magasinId } = req.query;
    
    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = ''
    } = req.query;

    // 🔍 LOGS DE DÉBOGAGE
    console.log('🔍 Paramètres reçus:', {
      page,
      limit,
      search: search || '(vide)',
      statut: statut || '(vide)',
      bonId: bonId || '(vide)',
      magasinId: magasinId || '(vide)'
    });
    // 🔥 Vérification structure (obligatoire)
    const code_structure = authUser.code_structure;

    // Date d'aujourd'hui
    const aujourdhui = new Date();
    const debutJournee = new Date(aujourdhui);
    debutJournee.setHours(0, 0, 0, 0);

    const finJournee = new Date(aujourdhui);
    finJournee.setHours(23, 59, 59, 999);

    // Vérifier rôle
    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    // ==========================
    // 🔹 BASE WHERE
    // ==========================
    const whereCondition = {
      code_structure,
      statut: { [Op.ne]: "en_cours" },
      dateCreation: {
        [Op.between]: [debutJournee, finJournee],
      },
      [Op.or]: [
        { typeEntite: "autre" },
        { typeEntite: { [Op.notIn]: ["client", "fournisseur"] } },
      ],
    };

    // ==========================
    // 🔹 FILTRE DE RECHERCHE
    // ==========================
    if (search && search.trim() !== '') {
      console.log('🔍 Recherche avec terme:', search);
      whereCondition[Op.or] = whereCondition[Op.or] || [];
      whereCondition[Op.or].push(
        { id: { [Op.like]: `%${search}%` } },
        //{ '$user.nom$': { [Op.like]: `%${search}%` } },
        { typePanier: { [Op.like]: `%${search}%` } }
      );
      
      // Recherche par montant
      if (!isNaN(search)) {
        whereCondition[Op.or].push(
          { totalTTC: { [Op.eq]: parseFloat(search) } },
          { totalHT: { [Op.eq]: parseFloat(search) } }
        );
      }
    }

    // ==========================
    // 🔹 FILTRE PAR STATUT
    // ==========================
    if (statut && statut !== 'tous') {
      whereCondition.statut = statut;
    }

    // ==========================
    // 🔹 SCOPE SELON ROLE
    // ==========================
    if (isAdmin) {
      // Admin -> tout structure
      if (magasinId) {
        whereCondition.magasinId = magasinId;
      }
    } 
    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }
      whereCondition.magasinId = authUser.magasinId;
    } 
    else if (isCaissier || isEmploye) {
      // Caissier/Employé -> uniquement ses paniers
      whereCondition.agentId = authUser.id;
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    } 
    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // ==========================
    // 🔹 FILTRE bonId
    // ==========================
    if (bonId === "null" || bonId === "") {
      whereCondition.bonId = null;
    } else if (bonId) {
      whereCondition.bonId = bonId;
    }

    // ==========================
    // 🔹 CALCUL OFFSET PAGINATION
    // ==========================
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // ==========================
    // 🔹 TOTAL GLOBAL (pour les stats)
    // ==========================
    const whereTotalGlobal = {
      ...whereCondition,
      statut: {
        [Op.notIn]: ["annulé", "retourné", "en_cours"],
      },
    };

    const totalGlobal = await Panier.sum("totalTTC", {
      where: whereTotalGlobal,
    });

    // ==========================
    // 🔹 QUERY AVEC PAGINATION
    // ==========================
    const { count, rows } = await Panier.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: db.Magasin,
          attributes: ["id", "nom"],
        },
        {
          model: db.Users,
          as: 'user',
          attributes: ["id", "nom"],
        },
        {
          model: db.Paiement,
        },
        {
          model: db.ArticlePanier,
          include: [
            {
              model: db.Produit,
            },
          ],
        },
      ],
      order: [["dateCreation", "DESC"]],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Transactions: ${count} trouvées, page ${page}/${totalPages}`);

    return res.json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      statistiques: {
        totalGlobal: totalGlobal || 0,
        nombreTransactions: count
      },
      filtres: {
        search: search || null,
        statut: statut || null
      }
    });
  } catch (error) {
    console.error("Erreur récupération paniers du jour:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
};

 */
exports.getPaniersAujourdhuiBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { Op } = db.Sequelize;
    const { bonId, magasinId } = req.query;
    
    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = ''
    } = req.query;

    // 🔍 LOGS DE DÉBOGAGE
    console.log('🔍 Paramètres reçus:', {
      page,
      limit,
      search: search || '(vide)',
      statut: statut || '(vide)',
      bonId: bonId || '(vide)',
      magasinId: magasinId || '(vide)'
    });
    
    // 🔥 Vérification structure (obligatoire)
    const code_structure = authUser.code_structure;

    // Date d'aujourd'hui
    const aujourdhui = new Date();
    const debutJournee = new Date(aujourdhui);
    debutJournee.setHours(0, 0, 0, 0);
    const finJournee = new Date(aujourdhui);
    finJournee.setHours(23, 59, 59, 999);

    // Vérifier rôle
    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    // ==========================
    // 🔹 BASE WHERE
    // ==========================
    const whereCondition = {
      code_structure,
      statut: { [Op.ne]: "en_cours" },
      dateCreation: {
        [Op.between]: [debutJournee, finJournee],
      }
    };

    // ==========================
    // 🔹 FILTRE DE RECHERCHE
    // ==========================
    if (search && search.trim() !== '') {
      console.log('🔍 Recherche avec terme:', search);
      
      const orConditions = [];
      
      // Recherche sur les champs du panier
      orConditions.push(
        { id: { [Op.like]: `%${search}%` } },
        { typePanier: { [Op.like]: `%${search}%` } }
      );
      
      // Recherche par montant
      if (!isNaN(search)) {
        orConditions.push(
          { totalTTC: { [Op.eq]: parseFloat(search) } },
          { totalHT: { [Op.eq]: parseFloat(search) } }
        );
      }
      
      whereCondition[Op.or] = orConditions;
    }

    // ==========================
    // 🔹 FILTRE PAR STATUT
    // ==========================
    if (statut && statut !== 'tous') {
      whereCondition.statut = statut;
    }

    // ==========================
    // 🔹 SCOPE SELON ROLE
    // ==========================
    if (isAdmin) {
      if (magasinId) {
        whereCondition.magasinId = magasinId;
      }
    } 
    else if (isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }
      whereCondition.magasinId = authUser.magasinId;
    } 
    else if (isCaissier || isEmploye) {
      whereCondition.agentId = authUser.id;
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    } 
    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // ==========================
    // 🔹 FILTRE bonId
    // ==========================
    if (bonId === "null" || bonId === "") {
      whereCondition.bonId = null;
    } else if (bonId) {
      whereCondition.bonId = bonId;
    }

    // ==========================
    // 🔹 CALCUL OFFSET PAGINATION
    // ==========================
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // ==========================
    // 🔹 INCLUDE pour la recherche sur le nom d'utilisateur
    // ==========================
    const include = [
      {
        model: db.Magasin,
        attributes: ["id", "nom"],
      },
      {
        model: db.Users,
        as: 'user',
        attributes: ["id", "nom"],
      },
      {
        model: db.Paiement,
      },
      {
        model: db.ArticlePanier,
        include: [
          {
            model: db.Produit,
          },
        ],
      },
    ];

    // Si on a une recherche, on peut ajouter une condition sur le nom d'utilisateur
    // Note: Pour une recherche plus avancée, il faudrait utiliser une sous-requête
    // ou faire deux requêtes séparées

    // ==========================
    // 🔹 QUERY AVEC PAGINATION
    // ==========================
    console.log('📋 Where condition:', JSON.stringify(whereCondition, null, 2));
    
    const { count, rows } = await Panier.findAndCountAll({
      where: whereCondition,
      include: include,
      order: [["dateCreation", "DESC"]],
      offset,
      limit: limitInt,
      distinct: true
    });

    // ==========================
    // 🔹 TOTAL GLOBAL (pour les stats)
    // ==========================
    const whereTotalGlobal = {
      ...whereCondition,
      statut: {
        [Op.notIn]: ["annulé", "retourné", "en_cours"],
      },
    };
    // Enlever l'Op.or pour le total global car il fausserait la somme
    delete whereTotalGlobal[Op.or];

    const totalGlobal = await Panier.sum("totalTTC", {
      where: whereTotalGlobal,
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Transactions: ${count} trouvées, page ${page}/${totalPages}`);

    return res.json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      statistiques: {
        totalGlobal: totalGlobal || 0,
        nombreTransactions: count
      },
      filtres: {
        search: search || null,
        statut: statut || null
      }
    });
  } catch (error) {
    console.error("Erreur récupération paniers du jour:", error);
    return res.status(500).json({
      error: error.message,
    });
  }
};