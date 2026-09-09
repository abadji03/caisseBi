const express = require('express');
const router = express.Router();
const produitCtrl = require('../controllers/produit.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission, requireStructureAccess } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Produits
 *   description: Gestion du catalogue produits
 */

/**
 * @swagger
 * /produits:
 *   post:
 *     summary: Créer un produit
 *     tags: [Produits]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [designation, prixVenteUnitaire, unite, code_structure]
 *             properties:
 *               designation: { type: string }
 *               prixVenteUnitaire: { type: number }
 *               prixAchatUnitaire: { type: number }
 *               unite: { type: string }
 *               tauxTVA: { type: number }
 *               categorieId: { type: integer }
 *               code_structure: { type: string }
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Produit créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produit'
 */
router.post('/', authenticateToken, requireStructureAccess, requirePermission('products.manage'), upload.single('image'), produitCtrl.createProduit);

/**
 * @swagger
 * /produits/{id}:
 *   put:
 *     summary: Mettre à jour un produit
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Produit'
 *     responses:
 *       200:
 *         description: Produit mis à jour
 *   delete:
 *     summary: Supprimer un produit
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Produit supprimé
 *   get:
 *     summary: Récupérer un produit par ID
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Produit trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produit'
 */
router.put('/:id', authenticateToken, requireStructureAccess, requirePermission('products.manage'), upload.single('image'), produitCtrl.updateProduit);
router.delete('/:id', authenticateToken, requireStructureAccess, requirePermission('products.manage'), produitCtrl.deleteProduit);
router.get('/:id', authenticateToken, produitCtrl.getProduitById);

/**
 * @swagger
 * /produits/structure/{code_structure}:
 *   get:
 *     summary: Lister les produits d'une structure
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche par désignation ou référence
 *       - in: query
 *         name: categorieId
 *         schema: { type: integer }
 *       - in: query
 *         name: statut
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Liste des produits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Produit'
 */
router.get('/structure/:code_structure', authenticateToken, requireStructureAccess, produitCtrl.getProduitsByStructure);
router.get('/structure/:code_structure/produits-disponibles', authenticateToken, requireStructureAccess, produitCtrl.getProduitsDisponibles);

/**
 * @swagger
 * /produits/{id}/statut:
 *   patch:
 *     summary: Activer / désactiver un produit
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statut: { type: boolean }
 *     responses:
 *       200:
 *         description: Statut mis à jour
 */
router.patch('/:id/statut', authenticateToken, requireStructureAccess, requirePermission('products.manage'), produitCtrl.updateStatusProduit);
router.patch('/:id/tauxTVA', authenticateToken, requireStructureAccess, requirePermission('products.manage'), produitCtrl.updateTauxTVAProduit);
router.patch('/:id/image', authenticateToken, requireStructureAccess, requirePermission('products.manage'), upload.single('image'), produitCtrl.updateImageProduit);
router.put('/:id/code-barre', authenticateToken, requireStructureAccess, requirePermission('products.manage'), produitCtrl.updateCodeBarreProduit);

/**
 * @swagger
 * /produits/export/excel/structure/{code_structure}:
 *   get:
 *     summary: Exporter les produits en Excel
 *     tags: [Produits]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Fichier Excel généré
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/excel/structure/:code_structure', authenticateToken, requireStructureAccess, produitCtrl.exportProduitsToExcel);
router.get('/export-pdf/structure/:code_structure', authenticateToken, requireStructureAccess, produitCtrl.exportProduitsToPDF);

module.exports = router;
