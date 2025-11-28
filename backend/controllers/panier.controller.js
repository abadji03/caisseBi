
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
    const paniers = await Panier.findAll({
      where: { code_structure },
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

// Supprimer un panier
/* exports.deletePanier = async (req, res) => {
  try {
    const deleted = await Panier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Panier non trouvé' });
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression panier:', error);
    return res.status(500).json({ error: error.message });
  }
}; */

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


