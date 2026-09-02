const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recette.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Recettes
 *   description: Gestion des recettes (encaissements hors ventes)
 *
 * /recettes:
 *   post:
 *     summary: Enregistrer une recette
 *     tags: [Recettes]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [montant, categoryId, magasinId]
 *             properties:
 *               montant: { type: number }
 *               description: { type: string }
 *               categoryId: { type: integer }
 *               magasinId: { type: integer }
 *               receipt: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Recette créée
 *
 * /recettes/structure/{code_structure}:
 *   get:
 *     summary: Recettes d'une structure
 *     tags: [Recettes]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des recettes
 */

router.post('/', authenticateToken, upload.single('receipt'), ctrl.createRecette);
router.get('/structure/:code_structure', authenticateToken, ctrl.getByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, ctrl.getByStructureBis);
router.get('/paiement/:paiementId', authenticateToken, ctrl.findByPaiementId);
router.delete('/:id', authenticateToken, ctrl.deleteRecette);
router.put('/:id', authenticateToken, upload.single('receipt'), ctrl.updateRecette);
router.patch('/:id/statutRecette', authenticateToken, ctrl.updateStatut);

module.exports = router;
