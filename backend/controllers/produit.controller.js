const db = require("../models");
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
