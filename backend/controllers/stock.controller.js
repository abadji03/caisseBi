const db = require("../models");
const Stock = db.Stock;
//const Produit = db.Produit;  // (si tu as besoin d'inclure les produits dans les requêtes)

// Fonction utilitaire de calcul du statut
function calculerStatut(stock) {
  if (stock.quantiteTotale <= stock.seuilAlerte) {
    return "Critique";
  } 
  else if (stock.quantiteTotale <= stock.seuilReapprovisionnement) {
    return "À réapprovisionner";
  } 
  else if (stock.quantiteTotale === 0) {
    return "En rupture";
  } 
  else {
    return "En stock";
  }
}


// 1. Créer un stock
/* exports.createStock = async (req, res) => {
  try {
    const stock = await Stock.create(req.body);
    res.status(201).json(stock);
  } catch (error) {
    res.status(500).json({ message: "Erreur création stock", error });
  }
}; */
exports.createStock = async (req, res) => {
  try {
    // Calcul du statut avant la création
    const statutStock = calculerStatut(req.body);

    const stock = await Stock.create({
      ...req.body,
      statutStock
    });

    res.status(201).json(stock);
  } catch (error) {
    res.status(500).json({ message: "Erreur création stock", error });
  }
};


// 2. Mettre à jour un stock
/* exports.updateStock = async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: "Stock non trouvé" });

    await stock.update(req.body);
    res.json({ message: "Stock mis à jour", stock });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
}; */

exports.updateStock = async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: "Stock non trouvé" });

    // On met à jour les valeurs
    await stock.update(req.body);

    // On recalcule le statut après la mise à jour
    const statutStock = calculerStatut(stock);

    await stock.update({ statutStock });

    res.json({ message: "Stock mis à jour", stock });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
};


// 3. Récupérer tous les stocks d'une structure
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

// 4. Récupérer le stock d'un produit (très demandé)
exports.getStockByProduitId = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      where: { produitId: req.params.produitId }
    });
    if (!stock) return res.status(404).json({ message: "Aucun stock trouvé pour ce produit" });

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération stock produit", error });
  }
};

// 5. Supprimer un stock (optionnel)
exports.deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: "Stock non trouvé" });

    await stock.destroy();
    res.json({ message: "Stock supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error });
  }
};

// 6. Méthode calculée : retourner le statut dynamique
/* exports.getStockWithStatut = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      where: { produitId: req.params.produitId }
    });

    if (!stock) return res.status(404).json({ message: "Aucun stock trouvé pour ce produit" });

    // Calcul dynamique du statut
    let statut = "En stock";
    if (stock.quantiteTotale <= stock.seuilAlerte) {
      statut = "Critique";
    } else if (stock.quantiteTotale <= stock.seuilReapprovisionnement) {
      statut = "À réapprovisionner";
    }

    res.json({ stock, statut });
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération statut stock", error });
  }
}; */

// Recalcul et mise à jour du statut stock
/* exports.recalculerStatutStock = async (req, res) => {
  try {
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) {
      return res.status(404).json({ message: "Stock non trouvé" });
    }

    // Calcul du statut
    let statut = "En stock";

    if (stock.quantiteTotale <= stock.seuilAlerte) {
      statut = "Critique";
    } 
    else if (stock.quantiteTotale <= stock.seuilReapprovisionnement) {
      statut = "À réapprovisionner";
    } // sinon reste "En stock"

    // Mettre à jour le statut en base
    await stock.update({ statutStock: statut });

    res.json({ message: "Statut mis à jour", stock });
  } catch (error) {
    res.status(500).json({ message: "Erreur recalcul statut", error });
  }
};
 */