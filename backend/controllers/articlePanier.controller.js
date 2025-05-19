// controllers/articlePanierController.js
const db = require('../models');
const ArticlePanier = db.ArticlePanier;

exports.create = async (req, res) => {
  try {
    const article = await ArticlePanier.create(req.body);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const articles = await ArticlePanier.findAll({
      include: ['Panier', 'Produit', 'Stock']
    });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findById = async (req, res) => {
  try {
    const article = await ArticlePanier.findByPk(req.params.id);
    if (!article) return res.status(404).json({ message: "Article non trouvé" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const [updated] = await ArticlePanier.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: "Article non trouvé" });
    const article = await ArticlePanier.findByPk(req.params.id);
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await ArticlePanier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Article non trouvé" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
