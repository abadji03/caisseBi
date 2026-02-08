const db = require('../models');
const Depense = db.Depense;
const Magasin = db.Magasin;
const User = db.Users;
const Categorie = db.Categorie;
const fs = require('fs');
const path = require('path');
const BASE_URL = 'http://localhost:5000/uploads/';

exports.createDepense = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const {
      categoryId,
      code_structure,
      montant,
      type,
      description,
      paymentMode,
      magasinId,
      agentId,
      date,
    } = req.body;

     let receipt = null;
    if (req.file) {
      receipt = BASE_URL + req.file.filename;
    }
    const depense = await Depense.create({
      categoryId,
      code_structure,
      montant,
      type,
      description,
      paymentMode,
      receipt,
      magasinId,
      agentId,
      date,
      
    });

    res.status(201).json(depense);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de création de dépense', error });
  }
};

exports.getAllByMagasin = async (req, res) => {
  try {
    const { magasinId } = req.params;
    const depenses = await Depense.findAll({
      where: { magasinId },
      include: ['Categorie', 'User'],
      order: [['date', 'DESC']],
    });

    res.json(depenses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de récupération des dépenses', error });
  }
};

exports.deleteDepense = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    const deleted = await Depense.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Dépense non trouvée' });

    res.json({ message: 'Dépense supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};
exports.updateDepense = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    const depense = await Depense.findByPk(id);
    if (!depense) {
      return res.status(404).json({ message: 'Dépense introuvable' });
    }

    const updatedData = { ...req.body };

    // Si un nouveau fichier est envoyé
    if (req.file) {
      // Supprimer l'ancien fichier si il existe
      if (depense.receipt) {
        const oldPath = path.join('uploads', path.basename(depense.receipt)); // attention à ne pas concaténer l'URL complète
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Mettre à jour le champ fichier avec la nouvelle URL
      updatedData.receipt = BASE_URL + req.file.filename;
    } else {
      // Sinon, conserver le fichier existant
      updatedData.receipt = depense.receipt;
    }
    await depense.update(updatedData);

    res.json(depense);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error });
  }
};

/* exports.getAllByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;

    const depenses = await Depense.findAll({
      where: { code_structure: code_structure},
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

    res.json(depenses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de récupération des dépenses', error });
  }
}; */
exports.getAllByStructure = async (req, res) => {
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

    const depenses = await Depense.findAll({
      where: whereClause,
      include: [
        { model: Magasin,attributes: ["id", "nom","telephone", "email"] },
        { model: Categorie },
        { model: User, attributes: ["id", "nom", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.json(depenses);
  } catch (error) {
    console.error("Erreur récupération dépenses:", error);
    res.status(500).json({
      message: "Erreur de récupération des dépenses",
      error: error.message
    });
  }
};

