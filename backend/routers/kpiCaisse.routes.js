const express = require('express');
const router = express.Router();
const kpiCaisseCTR = require('../controllers/kpiCaisse.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: KPI Caisse
 *   description: Indicateurs clés de performance de la caisse
 *
 * /kpi-caisse/stats/caisse/kpi:
 *   get:
 *     summary: KPI du jour courant
 *     tags: [KPI Caisse]
 *     parameters:
 *       - in: query
 *         name: magasinId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: KPI journaliers (CA, nb ventes, panier moyen, etc.)
 *
 * /kpi-caisse/stats/caisse/kpi-periode:
 *   get:
 *     summary: KPI sur une période
 *     tags: [KPI Caisse]
 *     parameters:
 *       - in: query
 *         name: dateDebut
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateFin
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: magasinId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: KPI de la période
 *
 * /kpi-caisse/rapport-vente:
 *   get:
 *     summary: Rapport de vente détaillé par vendeur
 *     tags: [KPI Caisse]
 *     parameters:
 *       - in: query
 *         name: dateDebut
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateFin
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Rapport de vente
 *
 * /kpi-caisse/pdf:
 *   get:
 *     summary: Générer le rapport caisse en PDF
 *     tags: [KPI Caisse]
 *     responses:
 *       200:
 *         description: Fichier PDF
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 */


// API unifiées qui supportent à la fois les KPI journaliers et par période
router.get('/stats/caisse/kpi', authenticateToken, kpiCaisseCTR.getKpiCaisseJour); // Pour le jour courant
router.get('/stats/caisse/kpi-periode', authenticateToken, kpiCaisseCTR.getStatsCaissePeriode); // Pour une période spécifique
router.get('/stats/caisse/kpi-structure', authenticateToken, kpiCaisseCTR.getKpiCaisse); // Pour une structure (nécessite code_structure)

// Paiements par mode (supporte jour et période)
router.get('/stats/caisse/paiements', authenticateToken, kpiCaisseCTR.getEncaissementsParMode);

// Remises (supporte jour et période)
router.get('/stats/caisse/remises', authenticateToken, kpiCaisseCTR.getStatsRemises);

// Avoirs (supporte jour et période)
router.get('/stats/caisse/avoirs', authenticateToken, kpiCaisseCTR.getAvoirs);

// Caisse théorique (supporte jour et période)
router.get('/stats/caisse/caisse-theorique', authenticateToken, kpiCaisseCTR.getCaisseTheorique);

// Statistiques comparatives
router.get('/stats/caisse/comparatif', authenticateToken, kpiCaisseCTR.getStatsComparatives);
router.get('/stats/caisse/comparatif-magasin', authenticateToken, kpiCaisseCTR.compareMagasinVsStructure);

// CA par jour
router.get('/stats/caisse/ca-par-jour', authenticateToken, kpiCaisseCTR.getCAParJour);

// Statistiques par magasin
router.get('/stats/caisse/structure-par-magasin', authenticateToken, kpiCaisseCTR.getStatsStructureParMagasin);

// Statistiques pour les ventes à crédits et ceux annulé
router.get('/stats/caisse/ventes-credit', authenticateToken, kpiCaisseCTR.getVentesCredit);
router.get('/stats/caisse/avances', authenticateToken, kpiCaisseCTR.getAvances);
router.get('/stats/caisse/ventes-credit-annulees', authenticateToken, kpiCaisseCTR.getVentesCreditAnnulees);
router.get('/stats/caisse/ventes-caisse-annulees', authenticateToken, kpiCaisseCTR.getVentesCaisseAnnulees);
router.get('/stats/caisse/toutes-statistiques-speciales', authenticateToken, kpiCaisseCTR.getToutesStatistiquesSpeciales);

//Statistiques pour les commandes clients
router.get('/stats/caisse/toutes-statistiques-commandes', authenticateToken,kpiCaisseCTR.getStatistiquesCommandes);

// Routes pour le rapport de vente
router.get('/rapport-vente', 
    authenticateToken, 
    kpiCaisseCTR.getRapportVente
);

router.get('/rapport-vente/vendeur/:vendeurId/details', 
    authenticateToken, 
    kpiCaisseCTR.getDetailsVendeur
);

router.get('/rapport-vente/comparaison/options', 
    authenticateToken, 
    kpiCaisseCTR.getOptionsComparaison
);

router.post('/rapport-vente/comparaison', 
    authenticateToken, 
    kpiCaisseCTR.getComparaison
);

// Route pour tester le rendu HTML
router.get('/test-html', 
    authenticateToken, 
    kpiCaisseCTR.testRapportHTML
);

// Route pour générer le PDF
router.get('/pdf', 
    authenticateToken, 
    kpiCaisseCTR.genererRapportPDF
);

// Dans votre fichier de routes
router.get('/rapport-vente/excel', 
    authenticateToken, 
    kpiCaisseCTR.exportRapportExcel
);

module.exports = router;