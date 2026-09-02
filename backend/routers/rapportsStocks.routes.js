const express = require('express');
const router = express.Router();
const rapportsStocksController = require('../controllers/rapportStock.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Rapport Stock
 *   description: Rapports et statistiques des stocks
 *
 * /rapport-stock/indicateurs:
 *   get:
 *     summary: Indicateurs globaux des stocks
 *     tags: [Rapport Stock]
 *     parameters:
 *       - in: query
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: magasinId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Indicateurs (valeur totale, ruptures, alertes, etc.)
 *
 * /rapport-stock/produits-specifiques:
 *   get:
 *     summary: Produits en rupture, en alerte ou en surstock
 *     tags: [Rapport Stock]
 *     parameters:
 *       - in: query
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Produits en situation particulière
 *
 * /rapport-stock/pdf:
 *   get:
 *     summary: Générer le rapport stock en PDF
 *     tags: [Rapport Stock]
 *     responses:
 *       200:
 *         description: Fichier PDF
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 */

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

// Route pour la génération PDF
router.get('/pdf', 
    authenticateToken, 
    rapportsStocksController.genererRapportStockPDF
);

// Route pour l'export Excel
router.get('/excel', 
    authenticateToken, 
    rapportsStocksController.exportRapportStockExcel
);

module.exports = router;