// routes/panierRoutes.js
const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panier.controller');
const panierCompletController = require('../controllers/panierComplet.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

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



router.post('/',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.createPanier);
router.get('/',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getAllPaniers);
router.get('/:id',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPanierById);
router.put('/:id',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.updatePanier);
router.delete('/:id',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.deletePanier);
router.delete('/onlyPanier/:id',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.deleteOnlyPanier);
router.get('/bon/:bonId',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPanierByBonId);

router.get('/structure/:code_structure/magasin/:magasinId',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPaniersByStructure);

router.get('/structure/:code_structure/magasin/:magasinId/brouillon',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPaniersBrouillons);

router.post('/panier-complet',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierCompletController.createOrUpdatePanierComplet);

router.get('/structure/:code_structure/journalier',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPaniersByStructureBis);
router.get('/par-date/:date',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPaniersParDate);
router.get('/structure/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPaniersAujourdhui);
router.get('/structure/bis/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), panierController.getPaniersAujourdhuiBis);


module.exports = router;
