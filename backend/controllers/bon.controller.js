// controllers/bonController.js
const db = require('../models');
const Bon = db.Bon;

exports.createBon = async (req, res) => {
  try {
    const bon = await Bon.create(req.body);
    res.status(201).json(bon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllBons = async (req, res) => {
  try {
    const bons = await Bon.findAll({
      include: ['Fournisseur', 'Client', 'User', 'Magasin'],
    });
    res.json(bons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBonById = async (req, res) => {
  try {
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
    res.json(bon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBon = async (req, res) => {
  try {
    const [updated] = await Bon.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Bon non trouvé' });
    const bon = await Bon.findByPk(req.params.id);
    res.json(bon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBon = async (req, res) => {
  try {
    const deleted = await Bon.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Bon non trouvé' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
