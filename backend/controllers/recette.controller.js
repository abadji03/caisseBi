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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const {
      categoryId,
      montant,
      description,
      paymentMode,
      magasinId,
      agentId,
      paiementId,
      statutRecette,
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
      paiementId,
      statutRecette,
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

/* exports.getByStructure = async (req, res) => {
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
 */
exports.getByStructure = async (req, res) => {
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
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");
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

    const recettes = await Recette.findAll({
      where: whereClause,
      include: [
        { model: Magasin,attributes: ["id", "nom","telephone", "email"] },
        { model: Categorie },
        { model: User, attributes: ["id", "nom", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.json(recettes);
  } catch (error) {
    console.error("Erreur récupération recettes:", error);
    res.status(500).json({
      message: "Erreur de récupération des recettes",
      error: error.message
    });
  }
};

exports.deleteRecette = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    const deleted = await Recette.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Recette non trouvée' });

    res.json({ message: 'Recette supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};

exports.findByPaiementId = async(req, res) => {
  try {
    const { paiementId } = req.params;

    const recette = await Recette.findOne({
      where: { paiementId },
    });

    res.json(recette);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la recette par paiementId', error });
  }
};

exports.updateRecette = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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

