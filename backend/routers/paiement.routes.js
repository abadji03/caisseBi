// routes/paiement.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/paiement.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Paiements
 *   description: Gestion des paiements clients et fournisseurs
 */

/**
 * @swagger
 * /paiements:
 *   post:
 *     summary: Enregistrer un paiement
 *     tags: [Paiements]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [montant, typePaiement, methodePaiement]
 *             properties:
 *               montant: { type: number }
 *               typePaiement:
 *                 type: string
 *                 enum: [client, fournisseur, autre]
 *               methodePaiement:
 *                 type: string
 *                 enum: [Espèce, Carte, Orange Money, Wave, Chèque, Virement, Autre]
 *               clientId: { type: integer }
 *               fournisseurId: { type: integer }
 *               bonId: { type: integer }
 *               description: { type: string }
 *               fichier:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Paiement enregistré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paiement'
 *   get:
 *     summary: Lister tous les paiements
 *     tags: [Paiements]
 *     responses:
 *       200:
 *         description: Liste des paiements
 */
router.post('/', authenticateToken, requirePermission('Gérer les finances'), upload.single('fichier'), controller.create);
router.get('/', authenticateToken, requirePermission('Gérer les finances'), controller.findAll);

/**
 * @swagger
 * /paiements/structure/{code_structure}:
 *   get:
 *     summary: Paiements d'une structure
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des paiements de la structure
 */
router.get('/structure/:code_structure', authenticateToken, requirePermission('Gérer les finances'), controller.getPaiementsByStructure);
router.get('/structure/:code_structure/clients', authenticateToken, requirePermission('Gérer les finances'), controller.getPaiementsClientByStructure);
router.get('/structure/:code_structure/fournisseurs', authenticateToken, requirePermission('Gérer les finances'), controller.getPaiementsFournisseurByStructure);
router.get('/structure/bis/:code_structure/clients', authenticateToken, requirePermission('Gérer les finances'), controller.getPaiementsClientByStructureBis);
router.get('/structure/bis/:code_structure/fournisseurs', authenticateToken, requirePermission('Gérer les finances'), controller.getPaiementsFournisseurByStructureBis);

/**
 * @swagger
 * /paiements/{id}:
 *   get:
 *     summary: Récupérer un paiement par ID
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paiement trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Paiement'
 *   put:
 *     summary: Mettre à jour un paiement
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paiement mis à jour
 *   delete:
 *     summary: Supprimer un paiement
 *     tags: [Paiements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Supprimé
 */
router.get('/:id', authenticateToken, requirePermission('Gérer les finances'), controller.findById);
router.put('/:id', authenticateToken, requirePermission('Gérer les finances'), upload.single('fichier'), controller.update);
router.delete('/:id', authenticateToken, requirePermission('Gérer les finances'), controller.delete);
router.get('/:code_structure/fournisseur/:fournisseurId', authenticateToken, requirePermission('Gérer les finances'), controller.getPaiementsByFournisseur);
router.get('/:code_structure/client/:clientId', authenticateToken, requirePermission('Gérer les finances'), controller.getPaiementsByClient);

module.exports = router;
