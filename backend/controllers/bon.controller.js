// controllers/bonController.js
const db = require('../models');
const Bon = db.Bon;
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/uploads/'; //url de l'emplacement des fichier à stocker


exports.createBon = async (req, res) => {

  try {
    const bon = req.body;
    let fichier = null;
    if (req.file) {
      fichier = BASE_URL + req.file.filename;
    }

    const bonEnd = await Bon.create(
      ... bon,
      fichier
    );
    
    res.status(201).json(bonEnd);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les bons d'une structure
exports.getBonsByStructure = async (req, res) => {

  try {
    const bons = await Bon.findAll({
      where: { code_structure: req.params.code_structure },
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

// Lister tous les bons avec associations
exports.getAllBons = async (req, res) => {
  try {
    const bons = await Bon.findAll({
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
    console.error('Erreur récupération tous les bons:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Récupérer un bon par ID
exports.getBonById = async (req, res) => {
  try {
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

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
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) {
      return res.status(404).json({ message: 'Bon non trouvé' });
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
    
        await bon.update(updatedData);
        console.log('Bon mis à jour avec:', updatedData);
        res.json({ message: 'Bon mis à jour', bon });
      } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
      }
};

// Supprimer un bon
exports.deleteBon = async (req, res) => {
  try {
    const deleted = await Bon.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Bon non trouvé' });
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression bon:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStatutBon = async (req, res) => {
  try {
    const { statutBon } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.statutBon = statutBon;
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update statutBon:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateResteAPayer = async (req, res) => {
  try {
    const { montant } = req.body; // montant payé
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.resteAPayer = parseFloat(bon.resteAPayer) - parseFloat(montant);

    // Auto-ajustement du statut si payé
    if (bon.resteAPayer <= 0) {
      bon.resteAPayer = 0;
      bon.statutBon = 'payé';
    }

    await bon.save();
    return res.json(bon);
  } catch (error) {
    console.error('Erreur update resteAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateNetAPayer = async (req, res) => {
  try {
    const { remise } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.remise = remise;
    bon.netAPayer = parseFloat(bon.montantTotal) - parseFloat(remise);
    bon.resteAPayer = bon.netAPayer; // réinitialiser le reste dû

    await bon.save();
    return res.json(bon);
  } catch (error) {
    console.error('Erreur update netAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateFichier = async (req, res) => {

  try {
      const bon = await Bon.findByPk(req.params.id);
      if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
  
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

    bon.fichier = fichier;
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update fichier:', error);
    return res.status(500).json({ error: error.message });
  } */
};
exports.updateMotifsRetour = async (req, res) => {
  try {
    const { motifsRetour } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.motifsRetour = motifsRetour;
    bon.statutBon = 'retourné';
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update motifsRetour:', error);
    return res.status(500).json({ error: error.message });
  }
};
