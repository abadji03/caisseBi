/* const db = require("../models");
const Fournisseur = db.Fournisseur;

exports.createFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.create(req.body);
    res.status(201).json(fournisseur);
  } catch (error) {
    res.status(500).json({ message: "Erreur création fournisseur", error });
  }
};

exports.updateFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });

    await fournisseur.update(req.body);
    res.json({ message: "Fournisseur mis à jour", fournisseur });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
};

exports.deleteFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });

    await fournisseur.destroy();
    res.json({ message: "Fournisseur supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error });
  }
};

exports.getFournisseursByStructure = async (req, res) => {
  try {
    const fournisseurs = await Fournisseur.findAll({
      where: { code_structure: req.params.code_structure }
    });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération", error });
  }
};
 */

const db = require('../models');
const Fournisseur = db.Fournisseur;
const Bon = db.Bon;
const Panier = db.Panier;
const ArticlePanier = db.ArticlePanier;
const Produit = db.Produit;

// Créer un nouveau fournisseur
/* exports.createFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.create(req.body);
    res.status(201).json(fournisseur);
  } catch (error) {
    res.status(500).json({ message: "Erreur création fournisseur", error });
  }
}; */
// Créer un nouveau fournisseur avec vérification de l'email et du téléphone
exports.createFournisseur = async (req, res) => {
  try {
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
    res.status(201).json(fournisseur);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la création du fournisseur' + error,
      error: error.message,
    });
  }
};

// Récupérer tous les fournisseurs
exports.getAllFournisseurs = async (req, res) => {
  try {
    const fournisseurs = await Fournisseur.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération des fournisseurs', error });
  }
};

// Récupérer un fournisseur par son ID
exports.getFournisseurById = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }
    res.json(fournisseur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération du fournisseur', error });
  }
};

// Mettre à jour un fournisseur
exports.updateFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });

    await fournisseur.update(req.body);
    res.json({ message: 'Fournisseur mis à jour', fournisseur });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
};

// Mettre à jour uniquement le statut d'un fournisseur
/* exports.updateFournisseurStatus = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });

    const { statut } = req.body;
    if (!statut) return res.status(400).json({ message: "Le statut est requis" });

    await fournisseur.update({ statut });
    res.json({ message: "Statut du fournisseur mis à jour", fournisseur });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour du statut", error });
  }
}; */

// Mettre à jour uniquement le statut d'un fournisseur
exports.updateFournisseurStatus = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });

    const { statut } = req.body;
    if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' });

    await fournisseur.update({ statut });
    res.json({ message: 'Statut du fournisseur mis à jour', fournisseur });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};

// Supprimer un fournisseur
exports.deleteFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });

    await fournisseur.destroy();
    res.json({ message: 'Fournisseur supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur suppression', error });
  }
};

// Récupérer les fournisseurs par structure
exports.getFournisseursByStructure = async (req, res) => {
  try {
    const fournisseurs = await Fournisseur.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['createdAt', 'DESC']],
    });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération', error });
  }
};

// Rechercher des fournisseurs selon différents critères
exports.searchFournisseurs = async (req, res) => {
  try {
    const whereClause = {};

    // Filtres possibles
    if (req.query.nom) whereClause.nom = { [db.Sequelize.Op.like]: `%${req.query.nom}%` };
    if (req.query.statut) whereClause.statut = req.query.statut;
    if (req.query.code_structure) whereClause.code_structure = req.query.code_structure;

    const fournisseurs = await Fournisseur.findAll({ where: whereClause });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur recherche', error });
  }
};

// Compter le nombre total de fournisseurs
exports.countFournisseurs = async (req, res) => {
  try {
    const count = await Fournisseur.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur comptage', error });
  }
};

// Récupérer les fournisseurs avec pagination
exports.getFournisseursPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Fournisseur.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      fournisseurs: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur pagination', error });
  }
};

exports.getBonsWithPaniersAndProduits = async (req, res) => {
  try {
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
