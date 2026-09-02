const express = require('express');
const router = express.Router();
const categorieCtrl = require('../controllers/categorieProduit.controller');
const authenticateToken = require('../middlewares/auth.middleware');

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

router.post('/', authenticateToken, categorieCtrl.createCategorie);
router.put('/:id', authenticateToken, categorieCtrl.updateCategorie);
router.delete('/:id', authenticateToken, categorieCtrl.deleteCategorie);
router.get('/:id', authenticateToken, categorieCtrl.getCategoriesById);
router.get('/structure/:code_structure', authenticateToken, categorieCtrl.getCategoriesByStructure);
router.patch('/:id/statut', authenticateToken, categorieCtrl.updateStatutCategorie);

router.get('/export/excel',authenticateToken, categorieCtrl.exportCategoriesExcel);

module.exports = router;
