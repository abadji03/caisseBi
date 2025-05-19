const db = require("../models");
const HistoriqueConnexions = db.HistoriqueConnexions;

exports.create = async (req, res) => {
  try {
    const { userId, ip } = req.body;
    const record = await HistoriqueConnexions.create({ userId, ip });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la connexion", error });
  }
};

exports.findByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await HistoriqueConnexions.findAll({
      where: { userId },
      order: [["date", "DESC"]]
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des connexions", error });
  }
};
