const express = require('express');
const router = express.Router();
const categorieCtrl = require('../controllers/categorieProduit.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Catégories Produits
 *   description: Catégories du catalogue produits
 *
 * /categories-produits:
 *   post:
 *     summary: Créer une catégorie produit
 *     tags: [Catégories Produits]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, code_structure]
 *             properties:
 *               nom: { type: string }
 *               description: { type: string }
 *               code_structure: { type: string }
 *     responses:
 *       201:
 *         description: Catégorie créée
 *
 * /categories-produits/structure/{code_structure}:
 *   get:
 *     summary: Catégories produits d'une structure
 *     tags: [Catégories Produits]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des catégories
 */    

router.post('/', authenticateToken, requirePermission('Gérer les produits'), categorieCtrl.createCategorie);
router.put('/:id', authenticateToken, requirePermission('Gérer les produits'), categorieCtrl.updateCategorie);
router.delete('/:id', authenticateToken, requirePermission('Gérer les produits'), categorieCtrl.deleteCategorie);
router.get('/:id', authenticateToken, requirePermission('Gérer les produits'), categorieCtrl.getCategoriesById);
router.get('/structure/:code_structure', authenticateToken, requirePermission('Gérer les produits'), categorieCtrl.getCategoriesByStructure);
router.patch('/:id/statut', authenticateToken, requirePermission('Gérer les produits'), categorieCtrl.updateStatutCategorie);

router.get('/export/excel',authenticateToken, requirePermission('Gérer les produits'), categorieCtrl.exportCategoriesExcel);

module.exports = router;
