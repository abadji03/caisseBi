// controllers/panierController.js
const db = require('../models');
const Panier = db.Panier;

exports.createPanier = async (req, res) => {
  try {
    const panier = await Panier.create(req.body);
    res.status(201).json(panier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllPaniers = async (req, res) => {
  try {
    const paniers = await Panier.findAll({
      include: ['Client', 'Bon', 'Magasin', 'User']
    });
    res.json(paniers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPanierById = async (req, res) => {
  try {
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: "Panier non trouvé" });
    res.json(panier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePanier = async (req, res) => {
  try {
    const [updated] = await Panier.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: "Panier non trouvé" });
    const panier = await Panier.findByPk(req.params.id);
    res.json(panier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePanier = async (req, res) => {
  try {
    const deleted = await Panier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Panier non trouvé" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
