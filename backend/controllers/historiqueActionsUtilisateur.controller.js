const db = require("../models");
const Historique = db.HistoriqueActionsUtilisateur;

exports.create = async (req, res) => {
  try {
    const { userId, action } = req.body;

    const historique = await Historique.create({ userId, action });
    res.status(201).json(historique);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'enregistrement de l'action", error });
  }
};

exports.findByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await Historique.findAll({
      where: { userId },
      order: [["date", "DESC"]]
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des actions", error });
  }
};
