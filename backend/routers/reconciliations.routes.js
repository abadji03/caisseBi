const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reconciliation.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Réconciliations
 *   description: Inventaire et réconciliation des stocks
 *
 * /reconciliations:
 *   post:
 *     summary: Créer une réconciliation (inventaire)
 *     tags: [Réconciliations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, magasinId, quantiteReelle]
 *             properties:
 *               produitId: { type: integer }
 *               magasinId: { type: integer }
 *               quantiteReelle: { type: number }
 *               commentaire: { type: string }
 *     responses:
 *       201:
 *         description: Réconciliation créée
 *
 * /reconciliations/structure/{code_structure}:
 *   get:
 *     summary: Réconciliations d'une structure
 *     tags: [Réconciliations]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des réconciliations
 *
 * /reconciliations/structure/{code_structure}/analyse-ecart:
 *   get:
 *     summary: Analyse des écarts de stock
 *     tags: [Réconciliations]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rapport d'écarts
 */


//router.post("/", ctrl.createReconciliation);
//router.get("/structure/:code_structure", ctrl.getReconciliationsByStructure);

router.post('/',authenticateToken, ctrl.createReconciliation);
router.get('/structure/:code_structure',authenticateToken, ctrl.getReconciliationsByStructure); // Par structure

//router.get('/',authenticateToken, ctrl.getAllReconciliations); // Tous
router.get('/:id',authenticateToken, ctrl.getReconciliationById); // Par ID
router.put('/:id',authenticateToken, ctrl.updateReconciliation); // MAJ
router.delete('/:id',authenticateToken, ctrl.deleteReconciliation); // Suppression

router.patch('/:id/statut', authenticateToken, ctrl.updateStatut);

router.get(
  '/structure/:code_structure/analyse-ecart',
  authenticateToken,
  ctrl.getAnalyseEcarts
);

router.get(
  '/structure/:code_structure/produit/:produitId',
  authenticateToken,
  ctrl.getAnalyseProduit
);


router.get('/produit/:produitId',authenticateToken, ctrl.getReconciliationsByProduit); // Par produit

module.exports = router;
