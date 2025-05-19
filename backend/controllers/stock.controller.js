const db = require("../models");
const Stock = db.Stock;

exports.createStock = async (req, res) => {
  try {
    const stock = await Stock.create(req.body);
    res.status(201).json(stock);
  } catch (error) {
    res.status(500).json({ message: "Erreur création stock", error });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: "Stock non trouvé" });

    await stock.update(req.body);
    res.json({ message: "Stock mis à jour", stock });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
};

exports.getStocksByStructure = async (req, res) => {
  try {
    const stocks = await Stock.findAll({
      where: { code_structure: req.params.code_structure }
    });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération stocks", error });
  }
};
