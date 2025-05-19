const db = require("../models");
const Recette = db.Recette;

exports.createRecette = async (req, res) => {
  try {
    const { categoryId, montant, description, paymentMode, receipt, magasinId, agentId, code_structure, date } = req.body;

    const recette = await Recette.create({
      categoryId,
      montant,
      description,
      paymentMode,
      receipt,
      magasinId,
      agentId,
      code_structure,
      date
    });

    res.status(201).json(recette);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de la recette", error });
  }
};

exports.getByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;

    const recettes = await Recette.findAll({
      where: { code_structure },
      include: ["Categorie", "User"],
      order: [["date", "DESC"]]
    });

    res.json(recettes);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération", error });
  }
};

exports.deleteRecette = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Recette.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Recette non trouvée" });

    res.json({ message: "Recette supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
};
