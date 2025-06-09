/* const db = require("../models");
const Produit = db.Produit;

exports.createProduit = async (req, res) => {
  try {
    const produit = await Produit.create(req.body);
    res.status(201).json(produit);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du produit", error });
  }
};

exports.updateProduit = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    await produit.update(req.body);
    res.json({ message: "Produit mis à jour", produit });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
};

exports.deleteProduit = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    await produit.destroy();
    res.json({ message: "Produit supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
};

exports.getProduitsByStructure = async (req, res) => {
  try {
    const produits = await Produit.findAll({ where: { code_structure: req.params.code_structure } });
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des produits", error });
  }
};
 */

const db = require("../models");
const Produit = db.Produit;

//Créer un produit
exports.createProduit = async (req, res) => {
  try {
    const produit = await Produit.create(req.body);
    res.status(201).json(produit);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du produit", error });
  }
};

//Mettre à jour un produit
exports.updateProduit = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    await produit.update(req.body);
    res.json({ message: "Produit mis à jour", produit });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
};

//Supprimer un produit (physiquement)
exports.deleteProduit = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    await produit.destroy();
    res.json({ message: "Produit supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
};

//Obtenir un produit spécifique par ID
exports.getProduitById = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    res.json(produit);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du produit", error });
  }
};

//Récupérer les produits par structure
exports.getProduitsByStructure = async (req, res) => {
  try {
    const produits = await Produit.findAll({ where: { code_structure: req.params.code_structure } });
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des produits", error });
  }
};

//Mettre à jour le statut d’un produit (actif/inactif, disponible/épuisé, etc.)
exports.updateStatusProduit = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    const { status } = req.body;
    produit.status = status;
    await produit.save();

    res.json({ message: "Statut du produit mis à jour", produit });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut", error });
  }
};

//Récupérer tous les produits
exports.getAllProduits = async (req, res) => {
  try {
    const produits = await Produit.findAll();
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de tous les produits", error });
  }
};

//Rechercher des produits par désignation ou code-barres
/* exports.searchProduits = async (req, res) => {
  try {
    const keyword = req.query.q;
    const produits = await Produit.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { designation: { [db.Sequelize.Op.like]: `%${keyword}%` } },
          { codeBarre: { [db.Sequelize.Op.like]: `%${keyword}%` } },
        ],
      },
    });
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la recherche", error });
  }
}; */

//Marquer un produit comme archivé (au lieu de suppression définitive)
/* exports.archiveProduit = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    produit.archived = true; // suppose que tu as un champ `archived` (boolean) dans le modèle
    await produit.save();

    res.json({ message: "Produit archivé avec succès", produit });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'archivage", error });
  }
}; */
