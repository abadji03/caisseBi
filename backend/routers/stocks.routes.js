const express = require("express");
const router = express.Router();
const stockCtrl = require("../controllers/stock.controller");

router.post("/", stockCtrl.createStock);
router.put("/:id", stockCtrl.updateStock);
router.get("/structure/:code_structure", stockCtrl.getStocksByStructure);
// Supprimer un stock
router.delete('/:id', stockCtrl.deleteStock);

// Récupérer tous les stocks d'une structure
router.get('/structure/:code_structure', stockCtrl.getStocksByStructure);

// Récupérer le stock d'un produit
router.get('/produit/:produitId', stockCtrl.getStockByProduitId);

// Récupérer le stock d'un produit avec calcul du statut
//router.get('/produit/:produitId/statut', stockCtrl.getStockWithStatut);

// Recalculer et mettre à jour le statut stock
//router.put('/:id/recalcul-statut', stockCtrl.recalculerStatutStock);



module.exports = router; 
