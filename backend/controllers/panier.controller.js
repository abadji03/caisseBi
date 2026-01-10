
// controllers/panierController.js
const db = require('../models');
const Panier = db.Panier;
const ArticlePanier = db.ArticlePanier;
const fs = require('fs');
const path = require('path');

exports.createPanier = async (req, res) => {
  try {
    const panier = await Panier.create(req.body);
    return res.status(201).json(panier);
  } catch (error) {
    console.error('Erreur création panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Lister les paniers d'une structure
exports.getPaniersByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const { magasinId } = req.query; // Ajout du paramètre magasinId depuis les query params
    
    // Construire la condition where
    const whereCondition = { code_structure };
    
    // Ajouter la condition magasinId si elle est fournie
    if (magasinId) {
      whereCondition.magasinId = magasinId;
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
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    return res.json(panier);
  } catch (error) {
    console.error('Erreur récupération panier par ID:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Mettre à jour un panier
exports.updatePanier = async (req, res) => {
  try {
    req.body.dateMiseAJour = new Date(); // maj auto de la date
    const [updated] = await Panier.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Panier non trouvé' });
    const panier = await Panier.findByPk(req.params.id);
    return res.json(panier);
  } catch (error) {
    console.error('Erreur update panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Supprimer un panier avec cascade
exports.deletePanier = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
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
    return res.status(200).json({ message: 'Panier, articles et bon associé supprimés avec succès' });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur suppression panier avec cascade:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStatutPanier = async (req, res) => {
  try {
    const { statut } = req.body;
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.statut = statut;
    panier.dateMiseAJour = new Date();
    await panier.save();

    return res.json(panier);
  } catch (error) {
    console.error('Erreur update statut panier:', error);
    return res.status(500).json({ error: error.message });
  }
};


exports.updateTotauxPanier = async (req, res) => {
  try {
    const { totalHT, tva } = req.body;
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.totalHT = parseFloat(totalHT);
    panier.tva = parseFloat(tva);
    panier.totalTTC = panier.totalHT + panier.tva;
    panier.dateMiseAJour = new Date();

    await panier.save();
    return res.json(panier);
  } catch (error) {
    console.error('Erreur update totaux panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateDetailsVisible = async (req, res) => {
  try {
    const { visible } = req.body; // true ou false
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.detailsVisible = visible;
    panier.dateMiseAJour = new Date();
    await panier.save();

    return res.json(panier);
  } catch (error) {
    console.error('Erreur update detailsVisible panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.resetPanier = async (req, res) => {
  try {
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.totalHT = 0;
    panier.tva = 0;
    panier.totalTTC = 0;
    panier.statut = 'EN_COURS';
    panier.dateMiseAJour = new Date();

    await panier.save();
    return res.json(panier);
  } catch (error) {
    console.error('Erreur reset panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getPanierByBonId = async (req, res) => {
  try {
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
exports.getPaniersParDate = async (req, res) => {
  try {
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
};

// Lister les paniers d'une structure avec filtre par magasin
exports.getPaniersByStructureBis = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const { magasinId, dateDebut, dateFin, statut } = req.query;
    
    // Construire la condition where
    const whereCondition = { code_structure };
    
    // Filtre par magasin
    if (magasinId) {
      whereCondition.magasinId = magasinId;
    }
    
    // Filtre par statut
    if (statut) {
      whereCondition.statut = statut;
    }
    
    // Filtre par date
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
        }
      ],
      order: [['dateCreation', 'DESC']],
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
    const { code_structure,magasinId } = req.params;
    const paniers = await db.Panier.findAll({
      where: { 
        code_structure, 
        magasinId,
        statut: 'en_cours',
        typeEntite: 'autre'
      },
      include: [db.Panier]
    });
    res.json(paniers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Récupérer uniquement les paniers d'aujourd'hui
exports.getPaniersAujourdhui = async (req, res) => {
  try {
    const { code_structure, magasinId,bonId } = req.query;
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
};

