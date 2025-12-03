const db = require('../models');
const Recette = db.Recette;
const Magasin = db.Magasin;
const User = db.Users;
const Categorie = db.Categorie;
const fs = require('fs');
const path = require('path');
const BASE_URL = 'http://localhost:5000/uploads/';


exports.createRecette = async (req, res) => {
  try {
    const {
      categoryId,
      montant,
      description,
      paymentMode,
      magasinId,
      agentId,
      code_structure,
      date,
    } = req.body;
    let receipt = null;
    if (req.file) {
      receipt = BASE_URL + req.file.filename;
    }
    const recette = await Recette.create({
      categoryId,
      montant,
      description,
      paymentMode,
      receipt,
      magasinId,
      agentId,
      code_structure,
      date,
    });

    res.status(201).json(recette);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de la recette', error });
  }
};

exports.getByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;

    const recettes = await Recette.findAll({
      where: { code_structure },
      include: [
        {
          model: Magasin
        },
        {
          model: Categorie
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(recettes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error });
  }
};

exports.deleteRecette = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Recette.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Recette non trouvée' });

    res.json({ message: 'Recette supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};

exports.updateRecette = async (req, res) => {
  try {
    const { id } = req.params;


    // Vérifier si la recette existe
    const recette = await Recette.findByPk(id);
    if (!recette) {
      return res.status(404).json({ message: 'Recette non trouvée' });
    }

    const updatedData = { ...req.body }
    // Si un nouveau fichier est envoyé
        if (req.file) {
          // Supprimer l'ancien fichier si il existe
          if (recette.receipt) {
            const oldPath = path.join('uploads', path.basename(recette.receipt)); // attention à ne pas concaténer l'URL complète
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
    
          // Mettre à jour le champ fichier avec la nouvelle URL
          updatedData.receipt = BASE_URL + req.file.filename;
        } else {
          // Sinon, conserver le fichier existant
          updatedData.receipt = recette.receipt;
        }
        await recette.update(updatedData);

    res.json(recette);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error });
  }
};

