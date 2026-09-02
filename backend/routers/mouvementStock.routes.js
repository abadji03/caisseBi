// routes/mouvementStock.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/mouvementStock.controller');
const authenticateToken = require('../middlewares/auth.middleware');

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


router.post('/',authenticateToken, controller.createMouvementStock);
router.get('/structure/:code_structure', authenticateToken, controller.getMouvementsByStructure);
//router.get('/',authenticateToken, controller.getAllMouvementsStock);
router.get('/:id',authenticateToken, controller.getMouvementStockById);
router.put('/:id',authenticateToken, controller.updateMouvementStock);
router.delete('/:id',authenticateToken, controller.deleteMouvementStock);


router.patch('/:id/statut', authenticateToken, controller.updateStatut);

module.exports = router;
