const express = require('express');
const router = express.Router();
const rapportsStocksController = require('../controllers/rapportStock.controller');
const authenticateToken = require('../middlewares/auth.middleware');

// ============================================
// 🟢 ROUTES RAPPORTS STOCKS
// ============================================

// API 1: Indicateurs globaux des stocks
router.get('/indicateurs', authenticateToken, rapportsStocksController.getIndicateursStocks);

// API 2: Statistiques détaillées par produit
router.get('/produits', authenticateToken, rapportsStocksController.getStatsProduits);

// API 3: Mouvements de la période
router.get('/mouvements', authenticateToken, rapportsStocksController.getMouvementsPeriode);

// API 4: Statistiques pour graphiques
router.get('/graphiques', authenticateToken, rapportsStocksController.getStatsGraphiques);

// API 5: Produits en situations particulières
router.get('/produits-specifiques', authenticateToken, rapportsStocksController.getProduitsSpecifiques);

// API 6: Rapport complet des stocks
router.get('/rapport-complet', authenticateToken, rapportsStocksController.getRapportCompletStocks);

// API 7: Export des données
router.get('/export', authenticateToken, rapportsStocksController.exportDonneesStocks);

module.exports = router;