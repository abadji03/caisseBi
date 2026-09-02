// fichier: routes/financeRoutes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/rapportFinancier.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Rapport Financier
 *   description: Indicateurs et rapports financiers
 *
 * /rapport-financier/indicateurs:
 *   get:
 *     summary: Indicateurs financiers principaux
 *     tags: [Rapport Financier]
 *     parameters:
 *       - in: query
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: dateDebut
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateFin
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Indicateurs financiers (CA, dépenses, bénéfice, etc.)
 *
 * /rapport-financier/evolution:
 *   get:
 *     summary: Données d'évolution pour graphiques
 *     tags: [Rapport Financier]
 *     parameters:
 *       - in: query
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Données temporelles
 *
 * /rapport-financier/pdf:
 *   get:
 *     summary: Générer le rapport financier en PDF
 *     tags: [Rapport Financier]
 *     responses:
 *       200:
 *         description: Fichier PDF
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *
 * /rapport-financier/excel:
 *   get:
 *     summary: Exporter le rapport financier en Excel
 *     tags: [Rapport Financier]
 *     responses:
 *       200:
 *         description: Fichier Excel
 */


// Indicateurs financiers principaux
router.get('/indicateurs',authenticateToken, financeController.getIndicateursFinanciers);

// Répartition des données
router.get('/depenses/repartition',authenticateToken, financeController.getRepartitionDepenses);
router.get('/recettes/repartition',authenticateToken, financeController.getRepartitionRecettes);
router.get('/modes-paiement/stats',authenticateToken, financeController.getStatistiquesModesPaiement);

// Données détaillées
router.get('/depenses',authenticateToken, financeController.getDepensesDetaillees);
router.get('/recettes',authenticateToken, financeController.getRecettesDetaillees);

// Données pour graphiques
router.get('/evolution',authenticateToken, financeController.getDonneesEvolutives);
router.get('/comparatives',authenticateToken, financeController.getDonneesComparatives);

// Route pour générer PDF
router.get('/pdf', authenticateToken, financeController.genererRapportPDF);

//Route pour exporter les données vers excel
router.get('/excel', authenticateToken, financeController.exportRapportExcel);


module.exports = router;