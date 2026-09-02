// routes/mouvementStock.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/mouvementStock.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Mouvements de stock
 *   description: Entrées et sorties de stock
 *
 * /mouvements-stock:
 *   post:
 *     summary: Créer un mouvement de stock manuel
 *     tags: [Mouvements de stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, magasinId, typeMouvement, quantite, prixUnitaire]
 *             properties:
 *               produitId: { type: integer }
 *               magasinId: { type: integer }
 *               typeMouvement: { type: string, enum: [Entrée, Sortie] }
 *               quantite: { type: number }
 *               prixUnitaire: { type: number }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Mouvement créé
 *
 * /mouvements-stock/structure/{code_structure}:
 *   get:
 *     summary: Mouvements de stock d'une structure
 *     tags: [Mouvements de stock]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: magasinId
 *         schema: { type: integer }
 *       - in: query
 *         name: dateDebut
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateFin
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Liste des mouvements
 */


router.post('/',authenticateToken, requirePermission('Gérer le stock'), controller.createMouvementStock);
router.get('/structure/:code_structure', authenticateToken, requirePermission('Gérer le stock'), controller.getMouvementsByStructure);
//router.get('/',authenticateToken, requirePermission('Gérer le stock'), controller.getAllMouvementsStock);
router.get('/:id',authenticateToken, requirePermission('Gérer le stock'), controller.getMouvementStockById);
router.put('/:id',authenticateToken, requirePermission('Gérer le stock'), controller.updateMouvementStock);
router.delete('/:id',authenticateToken, requirePermission('Gérer le stock'), controller.deleteMouvementStock);


router.patch('/:id/statut', authenticateToken, requirePermission('Gérer le stock'), controller.updateStatut);

module.exports = router;
