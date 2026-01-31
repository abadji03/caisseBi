// fichier: routes/financeRoutes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/rapportFinancier.controller');

// Indicateurs financiers principaux
router.get('/indicateurs', financeController.getIndicateursFinanciers);

// Répartition des données
router.get('/depenses/repartition', financeController.getRepartitionDepenses);
router.get('/recettes/repartition', financeController.getRepartitionRecettes);
router.get('/modes-paiement/stats', financeController.getStatistiquesModesPaiement);

// Données détaillées
router.get('/depenses', financeController.getDepensesDetaillees);
router.get('/recettes', financeController.getRecettesDetaillees);

// Données pour graphiques
router.get('/evolution', financeController.getDonneesEvolutives);
router.get('/comparatives', financeController.getDonneesComparatives);

module.exports = router;