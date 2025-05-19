const db = require("../models");
const Historique = db.HistoriqueReconciliation;

exports.create = async (req, res) => {
  try {
    const { reconciliationId, ecart, note } = req.body;

    const historique = await Historique.create({ reconciliationId, ecart, note });
    res.status(201).json(historique);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de l'historique", error });
  }
};

exports.findByReconciliation = async (req, res) => {
  try {
    const { reconciliationId } = req.params;
    const data = await Historique.findAll({
      where: { reconciliationId },
      order: [["date", "DESC"]]
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération", error });
  }
};
