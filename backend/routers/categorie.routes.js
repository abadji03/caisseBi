const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categorie.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Catégories
 *   description: Catégories de dépenses et recettes
 *
 * /categories:
 *   post:
 *     summary: Créer une catégorie
 *     tags: [Catégories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, type, code_structure]
 *             properties:
 *               nom: { type: string }
 *               type: { type: string, enum: [DEPENSE, RECETTE] }
 *               code: { type: string }
 *               code_structure: { type: string }
 *     responses:
 *       201:
 *         description: Catégorie créée
 *
 * /categories/structure/{code_structure}:
 *   get:
 *     summary: Catégories d'une structure
 *     tags: [Catégories]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des catégories
 */    

router.post('/', authenticateToken, requirePermission('Gérer les produits'), ctrl.createCategorie);
router.get('/structure/:code_structure',authenticateToken, requirePermission('Gérer les produits'), ctrl.getAllByStructure);
router.get('/structure/bis/:code_structure',authenticateToken, requirePermission('Gérer les produits'), ctrl.getAllByStructureBis);
router.put('/:id', authenticateToken, requirePermission('Gérer les produits'), ctrl.updateCategorie);
router.patch('/toggle/:id', authenticateToken, requirePermission('Gérer les produits'), ctrl.toggleActive);
router.delete('/:id', authenticateToken, requirePermission('Gérer les produits'), ctrl.deleteCategorie);

router.get('/export/excel',authenticateToken, requirePermission('Gérer les produits'), ctrl.exportCategoriesExcel);

// routes/categorie.routes.js
router.get('/code/:code', authenticateToken, requirePermission('Gérer les produits'), ctrl.getByCode);
module.exports = router;
