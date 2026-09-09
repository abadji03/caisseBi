// routes/panierRoutes.js
const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panier.controller');
const panierCompletController = require('../controllers/panierComplet.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { validatePanier } = require('../middlewares/validatePanier.middleware');
const { validateBrouillon } = require('../middlewares/validateBrouillon.middleware');
const { requirePermission, requireStructureAccess } = require('../middlewares/auth.middleware');

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



router.post('/',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.createPanier);
router.get('/',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getAllPaniers);
router.get('/:id',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPanierById);
router.put('/:id',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.updatePanier);
router.delete('/:id',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.deletePanier);
router.delete('/onlyPanier/:id',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.deleteOnlyPanier);
router.get('/bon/:bonId',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPanierByBonId);

router.get('/structure/:code_structure/magasin/:magasinId',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPaniersByStructure);

router.get('/structure/:code_structure/magasin/:magasinId/brouillon',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPaniersBrouillons);

// Nettoyage manuel des brouillons abandonnés (POST { joursInactivite?: number })
router.post('/nettoyage-brouillons',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.nettoyerBrouillons);

// Brouillon de caisse : 0 article autorisé, aucun effet stock/paiement
router.post('/brouillon',authenticateToken, validateBrouillon, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierCompletController.createOrUpdateBrouillon);

router.post('/panier-complet',authenticateToken, validatePanier, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierCompletController.createOrUpdatePanierComplet);

router.get('/structure/:code_structure/journalier',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPaniersByStructureBis);
router.get('/par-date/:date',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPaniersParDate);
router.get('/structure/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPaniersAujourdhui);
router.get('/structure/bis/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), panierController.getPaniersAujourdhuiBis);


module.exports = router;
