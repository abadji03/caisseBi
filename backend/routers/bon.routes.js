// routes/bon.routes.js
const express = require('express');
const router = express.Router();
const bonController = require('../controllers/bon.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission, requireStructureAccess } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Bons
 *   description: Gestion des bons (commandes, ventes, livraisons, retours)
 */

/**
 * @swagger
 * /bons:
 *   post:
 *     summary: Créer un bon
 *     tags: [Bons]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [numero, type, typeEntite, montantTotal]
 *             properties:
 *               numero: { type: string }
 *               type:
 *                 type: string
 *                 enum: [commande, livraison, retour, avoir, vente]
 *               typeEntite:
 *                 type: string
 *                 enum: [client, fournisseur]
 *               montantTotal: { type: number }
 *               remise: { type: number }
 *               avance: { type: number }
 *               clientId: { type: integer }
 *               fournisseurId: { type: integer }
 *               fichier:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Bon créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bon'
 *   get:
 *     summary: Lister tous les bons
 *     tags: [Bons]
 *     responses:
 *       200:
 *         description: Liste des bons
 */
router.post('/', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), upload.single('fichier'), bonController.createBon);
router.get('/', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getAllBons);

/**
 * @swagger
 * /bons/structure/{code_structure}/clients:
 *   get:
 *     summary: Bons clients d'une structure
 *     tags: [Bons]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des bons clients
 */
router.get('/structure/:code_structure', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsByStructure);
router.get('/structure/:code_structure/clients', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsClientsByStructure);
router.get('/structure/bis/:code_structure/clients', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsClientsByStructureBis);
router.get('/structure/bis/:code_structure/fournisseurs', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsFournisseursByStructureBis);
router.get('/structure/:code_structure/fournisseurs', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsFournisseursByStructure);

/**
 * @swagger
 * /bons/{id}:
 *   get:
 *     summary: Récupérer un bon par ID
 *     tags: [Bons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Bon trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bon'
 *       404:
 *         description: Bon introuvable
 *   put:
 *     summary: Mettre à jour un bon
 *     tags: [Bons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Bon mis à jour
 *   delete:
 *     summary: Supprimer un bon (cascade)
 *     tags: [Bons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Bon et éléments associés supprimés
 */
router.get('/:id', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonById);
router.put('/:id', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), upload.single('fichier'), bonController.updateBon);
router.delete('/:id', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.deleteBon);

/**
 * @swagger
 * /bons/{id}/statut:
 *   patch:
 *     summary: Mettre à jour le statut d'un bon
 *     tags: [Bons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               statutBon:
 *                 type: string
 *                 enum: [brouillon, validé, livré, retourné, facturé, annulé]
 *     responses:
 *       200:
 *         description: Statut mis à jour
 */
router.patch('/:id/statut', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.updateStatutBon);

/**
 * @swagger
 * /bons/{id}/resteAPayer:
 *   patch:
 *     summary: Déduire un montant du reste à payer
 *     tags: [Bons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               montant: { type: number }
 *     responses:
 *       200:
 *         description: Reste à payer mis à jour
 */
router.patch('/:id/resteAPayer', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.updateResteAPayer);
router.patch('/:id/netAPayer', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.updateNetAPayer);
router.patch('/:id/type', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.updateTypeBon);
router.patch('/:id/fichier', upload.single('fichier'), authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.updateFichier);
router.patch('/:id/motifsRetour', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.updateMotifsRetour);
router.get('/:code_structure/fournisseur/:fournisseurId', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsByFournisseur);
router.get('/:code_structure/client/:clientId', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsByClient);
router.post('/upload-fichier', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), upload.single('fichier'), bonController.uploadFichier);
router.delete('/:bonId/fichier', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.supprimerFichier);
router.get('/brouillons/:code_structure', authenticateToken, requireStructureAccess, requirePermission('sales.manage', 'cash.access'), bonController.getBonsBrouillons);

module.exports = router;
