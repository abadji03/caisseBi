// controllers/paiementController.js
const db = require('../models');
const Paiement = db.Paiement;
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/uploads/';

exports.create = async (req, res) => {
  try {

    const paie = req.body;

    let fichier = null;
    if (req.file) {
      fichier = BASE_URL + req.file.filename;
    }

    const paiement = await Paiement.create(
      ... paie,
      fichier
    );
    
    res.status(201).json(paiement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const paiements = await Paiement.findAll({
      include: ['Client', 'Fournisseur', 'Bon', 'Panier', 'Magasin'],
    });
    res.json(paiements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findById = async (req, res) => {

  try {
    const paiement = await Paiement.findByPk(req.params.id);
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

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
  const paiement = await Paiement.findByPk(req.params.id);
  if (!paiement) {
    return res.status(404).json({ message: 'Paiement non trouvé' });
  }
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
      console.log('Paiement mis à jour avec:', updatedData);
      res.json({ message: 'Paiement mis à jour', paiement });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
    }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await Paiement.destroy({
      where: { id: req.params.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Paiement non trouvé' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les paiements d'une structure
exports.getPaiementsByStructure = async (req, res) => {
  try {
    const paiements = await Paiement.findAll({
      where: { code_structure: req.params.code_structure },
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
    res.status(500).json({ message: 'Erreur lors de la récupération des produits', error });
  }
};