// routes/panierRoutes.js
const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panier.controller');
const panierCompletController = require('../controllers/panierComplet.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Paniers
 *   description: Gestion des paniers de vente caisse
 *
 * /paniers:
 *   post:
 *     summary: Créer un panier
 *     tags: [Paniers]
 *     responses:
 *       201:
 *         description: Panier créé
 *
 * /paniers/panier-complet:
 *   post:
 *     summary: Créer ou mettre à jour un panier complet (panier + articles + paiement)
 *     tags: [Paniers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [panier, articles, typeEntite]
 *             properties:
 *               panier: { type: object }
 *               articles: { type: array, items: { type: object } }
 *               typeEntite: { type: string, enum: [client, fournisseur, autre] }
 *               clientId: { type: integer }
 *               paiement: { type: object }
 *     responses:
 *       201:
 *         description: Panier traité avec succès
 *
 * /paniers/par-date/{date}:
 *   get:
 *     summary: Paniers d'une date spécifique
 *     tags: [Paniers]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *         description: Format YYYY-MM-DD
 *       - in: query
 *         name: magasinId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paniers du jour avec statistiques
 */



router.post('/',authenticateToken, panierController.createPanier);
router.get('/',authenticateToken, panierController.getAllPaniers);
router.get('/:id',authenticateToken, panierController.getPanierById);
router.put('/:id',authenticateToken, panierController.updatePanier);
router.delete('/:id',authenticateToken, panierController.deletePanier);
router.delete('/onlyPanier/:id',authenticateToken, panierController.deleteOnlyPanier);
router.get('/bon/:bonId',authenticateToken, panierController.getPanierByBonId);

router.get('/structure/:code_structure/magasin/:magasinId',authenticateToken, panierController.getPaniersByStructure);

router.get('/structure/:code_structure/magasin/:magasinId/brouillon',authenticateToken, panierController.getPaniersBrouillons);

router.post('/panier-complet',authenticateToken, panierCompletController.createOrUpdatePanierComplet);

router.get('/structure/:code_structure/journalier',authenticateToken, panierController.getPaniersByStructureBis);
router.get('/par-date/:date',authenticateToken, panierController.getPaniersParDate);
router.get('/structure/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, panierController.getPaniersAujourdhui);
router.get('/structure/bis/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, panierController.getPaniersAujourdhuiBis);


module.exports = router;
