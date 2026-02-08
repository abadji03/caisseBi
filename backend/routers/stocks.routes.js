const express = require('express');
const router = express.Router();
const stockCtrl = require('../controllers/stock.controller');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/',authenticateToken, stockCtrl.createStock);
router.put('/:id',authenticateToken, stockCtrl.updateStock);
router.get('/structure/:code_structure',authenticateToken, stockCtrl.getStocksByStructure);
// Supprimer un stock
router.delete('/:id',authenticateToken, stockCtrl.deleteStock);

// Récupérer tous les stocks d'une structure
router.get('/structure/:code_structure', authenticateToken, stockCtrl.getStocksByStructure);

// Récupérer le stock d'un produit
router.get('/produit/:produitId',authenticateToken, stockCtrl.getStockByProduitId);

// Récupérer le stock d'un produit avec calcul du statut
//router.get('/produit/:produitId/statut', stockCtrl.getStockWithStatut);

// Recalculer et mettre à jour le statut stock
//router.put('/:id/recalcul-statut', stockCtrl.recalculerStatutStock);

router.patch('/:id/adjust-quantite',authenticateToken, stockCtrl.adjustQuantiteTotale);
router.patch('/:id/adjust-reservee',authenticateToken, stockCtrl.adjustQuantiteReservee);

module.exports = router;
