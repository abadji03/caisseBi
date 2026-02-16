// fichier: routes/financeRoutes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/rapportFinancier.controller');
const authenticateToken = require('../middlewares/auth.middleware');


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

module.exports = router;