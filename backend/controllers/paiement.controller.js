// controllers/paiementController.js
const db = require('../models');
const Paiement = db.Paiement;

exports.create = async (req, res) => {
  try {
    const paiement = await Paiement.create(req.body);
    res.status(201).json(paiement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const paiements = await Paiement.findAll({
      include: ['Client', 'Fournisseur', 'Bon', 'Panier', 'Magasin']
    });
    res.json(paiements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findById = async (req, res) => {
  try {
    const paiement = await Paiement.findByPk(req.params.id);
    if (!paiement) return res.status(404).json({ message: "Paiement non trouvé" });
    res.json(paiement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const [updated] = await Paiement.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: "Paiement non trouvé" });
    const paiement = await Paiement.findByPk(req.params.id);
    res.json(paiement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await Paiement.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ message: "Paiement non trouvé" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
