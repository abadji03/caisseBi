// routes/articlePanierRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlePanier.controller');

/**
 * @swagger
 * tags:
 *   name: Articles Panier
 *   description: Lignes d'articles dans les paniers
 *
 * /articles-panier:
 *   post:
 *     summary: Ajouter un article à un panier
 *     tags: [Articles Panier]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [panierId, produitId, quantite, prixVenteUnitaire]
 *             properties:
 *               panierId: { type: integer }
 *               produitId: { type: integer }
 *               quantite: { type: number }
 *               prixVenteUnitaire: { type: number }
 *               prixAchatUnitaire: { type: number }
 *               remise: { type: number }
 *     responses:
 *       201:
 *         description: Article ajouté
 *
 * /articles-panier/batch:
 *   post:
 *     summary: Ajouter plusieurs articles en une seule requête
 *     tags: [Articles Panier]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 panierId: { type: integer }
 *                 produitId: { type: integer }
 *                 quantite: { type: number }
 *     responses:
 *       201:
 *         description: Articles ajoutés
 *
 * /articles-panier/{id}:
 *   put:
 *     summary: Mettre à jour un article
 *     tags: [Articles Panier]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Article mis à jour
 *   delete:
 *     summary: Supprimer un article
 *     tags: [Articles Panier]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Article supprimé
 */

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
//Récupérer les aticles de panier d’une structure
router.get('/structure/:code_structure', controller.getArticlesPanierByStructure);
router.post('/batch', controller.createBatch);
// Supprimer un article d’un panier donné
router.delete('/panier/:panierId/produit/:id', controller.deleteArticleFromPanier);



module.exports = router;
