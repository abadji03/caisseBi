const express = require('express');
const router = express.Router();
const stockCtrl = require('../controllers/stock.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Stocks
 *   description: Gestion des stocks par magasin
 */

/**
 * @swagger
 * /stocks:
 *   post:
 *     summary: Créer un stock
 *     tags: [Stocks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, magasinId, quantiteTotale, code_structure]
 *             properties:
 *               produitId: { type: integer }
 *               magasinId: { type: integer }
 *               quantiteTotale: { type: number }
 *               seuilAlerte: { type: number }
 *               seuilReapprovisionnement: { type: number }
 *               prixVenteUnitaire: { type: number }
 *               code_structure: { type: string }
 *     responses:
 *       201:
 *         description: Stock créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stock'
 */
router.post('/', authenticateToken, stockCtrl.createStock);

/**
 * @swagger
 * /stocks/{id}:
 *   put:
 *     summary: Mettre à jour un stock
 *     tags: [Stocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Stock mis à jour
 *   delete:
 *     summary: Supprimer un stock
 *     tags: [Stocks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Stock supprimé
 */
router.put('/:id', authenticateToken, stockCtrl.updateStock);
router.delete('/:id', authenticateToken, stockCtrl.deleteStock);

/**
 * @swagger
 * /stocks/structure/{code_structure}:
 *   get:
 *     summary: Stocks d'une structure
 *     tags: [Stocks]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: magasinId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liste des stocks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Stock'
 */
router.get('/structure/:code_structure', authenticateToken, stockCtrl.getStocksByStructure);
router.get('/structure/complet/:code_structure', authenticateToken, stockCtrl.getStocksByStructureBis);

/**
 * @swagger
 * /stocks/produit/{produitId}:
 *   get:
 *     summary: Stock d'un produit (tous magasins)
 *     tags: [Stocks]
 *     parameters:
 *       - in: path
 *         name: produitId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Stock du produit
 */
router.get('/produit/:produitId', authenticateToken, stockCtrl.getStockByProduitId);

/**
 * @swagger
 * /stocks/{id}/adjust-quantite:
 *   patch:
 *     summary: Ajuster la quantité totale d'un stock
 *     tags: [Stocks]
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
 *               quantite: { type: number }
 *               motif: { type: string }
 *     responses:
 *       200:
 *         description: Quantité ajustée
 */
router.patch('/:id/adjust-quantite', authenticateToken, stockCtrl.adjustQuantiteTotale);
router.patch('/:id/adjust-reservee', authenticateToken, stockCtrl.adjustQuantiteReservee);

module.exports = router;
