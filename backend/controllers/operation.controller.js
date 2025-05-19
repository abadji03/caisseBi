// controllers/operationController.js
const db = require('../models');
const Operation = db.Operation;

exports.create = async (req, res) => {
  try {
    const operation = await Operation.create(req.body);
    res.status(201).json(operation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const operations = await Operation.findAll({
      include: ['Client', 'Fournisseur', 'User', 'Bon', 'Paiement', 'Magasin']
    });
    res.json(operations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findById = async (req, res) => {
  try {
    const operation = await Operation.findByPk(req.params.id);
    if (!operation) return res.status(404).json({ message: "Opération non trouvée" });
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const [updated] = await Operation.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: "Opération non trouvée" });
    const operation = await Operation.findByPk(req.params.id);
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await Operation.destroy({
      where: { id: req.params.id }
    });
    if (!deleted) return res.status(404).json({ message: "Opération non trouvée" });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
