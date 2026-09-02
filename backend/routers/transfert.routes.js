const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transfert.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Transferts
 *   description: Transferts de stock entre magasins
 *
 * /transferts:
 *   post:
 *     summary: Créer un transfert (statut En attente)
 *     tags: [Transferts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produitId, quantite, magasinSource, magasinDestination]
 *             properties:
 *               produitId: { type: integer }
 *               quantite: { type: number }
 *               magasinSource: { type: integer }
 *               magasinDestination: { type: integer }
 *               motif: { type: string }
 *     responses:
 *       201:
 *         description: Transfert créé
 *
 * /transferts/valider/{id}:
 *   put:
 *     summary: Valider un transfert (met à jour les stocks)
 *     tags: [Transferts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Transfert validé, stocks mis à jour
 *
 * /transferts/refuser/{id}:
 *   put:
 *     summary: Refuser un transfert
 *     tags: [Transferts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Transfert refusé
 *
 * /transferts/structure/{code_structure}:
 *   get:
 *     summary: Lister les transferts d'une structure
 *     tags: [Transferts]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: statut
 *         schema: { type: string, enum: [En attente, Validé, Refusé] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liste paginée des transferts
 */


router.post('/',authenticateToken, ctrl.createTransfert);
router.put('/valider/:id',authenticateToken, ctrl.validerTransfert);
router.get('/structure/:code_structure', authenticateToken, ctrl.listerParStructure);
router.get(
  '/produit/:produitId/magasin/:magasinId',
  authenticateToken,
  ctrl.getStockByProduitAndMagasin
);
router.put('/refuser/:id', authenticateToken, ctrl.refuserTransfert);

module.exports = router;
