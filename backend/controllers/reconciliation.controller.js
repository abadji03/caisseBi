const db = require("../models");
const Reconciliation = db.Reconciliation;

exports.createReconciliation = async (req, res) => {
  try {
    const { code_structure, produitId, stockTheorique, stockPhysique, responsable, note } = req.body;

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);

    const reconciliation = await Reconciliation.create({
      code_structure,
      produitId,
      stockTheorique,
      stockPhysique,
      ecart,
      responsable,
      note
    });

    res.status(201).json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la réconciliation", error: err });
  }
};

exports.getReconciliationsByStructure = async (req, res) => {
  try {
    const reconciliations = await Reconciliation.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['dateReconciliation', 'DESC']],
      include: [{ model: db.Produit }]
    });

    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: err });
  }
};
