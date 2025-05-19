const db = require("../models");
const Depense = db.Depense;

exports.createDepense = async (req, res) => {
  try {
    const { categoryId, montant, type, description, paymentMode, receipt, magasinId, agentId, date } = req.body;

    const depense = await Depense.create({
      categoryId,
      montant,
      type,
      description,
      paymentMode,
      receipt,
      magasinId,
      agentId,
      date
    });

    res.status(201).json(depense);
  } catch (error) {
    res.status(500).json({ message: "Erreur de création de dépense", error });
  }
};

exports.getAllByMagasin = async (req, res) => {
  try {
    const { magasinId } = req.params;
    const depenses = await Depense.findAll({
      where: { magasinId },
      include: ["Categorie", "User"],
      order: [["date", "DESC"]]
    });

    res.json(depenses);
  } catch (error) {
    res.status(500).json({ message: "Erreur de récupération des dépenses", error });
  }
};

exports.deleteDepense = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Depense.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Dépense non trouvée" });

    res.json({ message: "Dépense supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
};
