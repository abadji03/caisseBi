const db = require("../models");
const Permission = db.permission;

exports.create = async (req, res) => {
  try {
    const data = await Permission.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const data = await Permission.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const data = await Permission.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: "Permission non trouvée" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const [updated] = await Permission.update(req.body, {
      where: { id: req.params.id }
    });
    if (!updated) return res.status(404).json({ message: "Permission non trouvée" });
    res.json({ message: "Permission mise à jour" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await Permission.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Permission non trouvée" });
    res.json({ message: "Permission supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
