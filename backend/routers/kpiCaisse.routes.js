const express = require('express');
const router = express.Router();
const kpiCaisseCTR = require('../controllers/kpiCaisse.controller');

// API unifiées qui supportent à la fois les KPI journaliers et par période
router.get('/stats/caisse/kpi', kpiCaisseCTR.getKpiCaisseJour); // Pour le jour courant
router.get('/stats/caisse/kpi-periode', kpiCaisseCTR.getStatsCaissePeriode); // Pour une période spécifique
router.get('/stats/caisse/kpi-structure', kpiCaisseCTR.getKpiCaisse); // Pour une structure (nécessite code_structure)

// Paiements par mode (supporte jour et période)
router.get('/stats/caisse/paiements', kpiCaisseCTR.getEncaissementsParMode);

// Remises (supporte jour et période)
router.get('/stats/caisse/remises', kpiCaisseCTR.getStatsRemises);

// Avoirs (supporte jour et période)
router.get('/stats/caisse/avoirs', kpiCaisseCTR.getAvoirs);

// Caisse théorique (supporte jour et période)
router.get('/stats/caisse/caisse-theorique', kpiCaisseCTR.getCaisseTheorique);

// Statistiques comparatives
router.get('/stats/caisse/comparatif', kpiCaisseCTR.getStatsComparatives);
router.get('/stats/caisse/comparatif-magasin', kpiCaisseCTR.compareMagasinVsStructure);

// CA par jour
router.get('/stats/caisse/ca-par-jour', kpiCaisseCTR.getCAParJour);

// Statistiques par magasin
router.get('/stats/caisse/structure-par-magasin', kpiCaisseCTR.getStatsStructureParMagasin);

// Statistiques pour les ventes à crédits et ceux annulé
router.get('/stats/caisse/ventes-credit', kpiCaisseCTR.getVentesCredit);
router.get('/stats/caisse/avances', kpiCaisseCTR.getAvances);
router.get('/stats/caisse/ventes-credit-annulees', kpiCaisseCTR.getVentesCreditAnnulees);
router.get('/stats/caisse/ventes-caisse-annulees', kpiCaisseCTR.getVentesCaisseAnnulees);
router.get('/stats/caisse/toutes-statistiques-speciales', kpiCaisseCTR.getToutesStatistiquesSpeciales);

//Statistiques pour les commandes clients
router.get('/stats/caisse/toutes-statistiques-commandes', kpiCaisseCTR.getStatistiquesCommandes);

module.exports = router;