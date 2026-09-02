const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/depense.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Dépenses
 *   description: Gestion des dépenses
 *
 * /depenses:
 *   post:
 *     summary: Enregistrer une dépense
 *     tags: [Dépenses]
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
 *         description: Dépense créée
 *
 * /depenses/structure/{code_structure}:
 *   get:
 *     summary: Dépenses d'une structure
 *     tags: [Dépenses]
 *     parameters:
 *       - in: path
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
 *         description: Liste des dépenses
 */


router.post('/',authenticateToken, requirePermission('Gérer les finances'), upload.single('receipt'), ctrl.createDepense);
router.get('/magasin/:magasinId', ctrl.getAllByMagasin);
router.delete('/:id',authenticateToken, requirePermission('Gérer les finances'), ctrl.deleteDepense);
router.put('/:id',authenticateToken, requirePermission('Gérer les finances'), upload.single('receipt'), ctrl.updateDepense);
router.get('/structure/:code_structure', authenticateToken, requirePermission('Gérer les finances'), ctrl.getAllByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, requirePermission('Gérer les finances'), ctrl.getAllByStructureBis);
router.patch('/:id/statutDepense', authenticateToken, requirePermission('Gérer les finances'), ctrl.updateStatut);

router.get('/export/excel',authenticateToken, requirePermission('Gérer les finances'), ctrl.exportDepensesExcel);

module.exports = router;

