// routes/facture.routes.js
const router = require('express').Router();
const factureController = require('../controllers/facture.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requireStructureAccess } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Factures
 *   description: Génération et gestion des factures
 *
 * /factures/from-bon:
 *   post:
 *     summary: Générer une facture depuis un bon existant
 *     tags: [Factures]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bonId]
 *             properties:
 *               bonId: { type: integer }
 *     responses:
 *       201:
 *         description: Facture générée
 *
 * /factures/{code_structure}:
 *   get:
 *     summary: Lister les factures d'une structure
 *     tags: [Factures]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des factures
 *
 * /factures/{id}/pdf:
 *   get:
 *     summary: Télécharger une facture en PDF
 *     tags: [Factures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Fichier PDF
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *
 * /factures/{id}:
 *   delete:
 *     summary: Annuler une facture
 *     tags: [Factures]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Facture annulée
 */

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

// CRUD
router.post('/from-bon', factureController.createFactureFromBon);
// Factures de commande
router.post('/commande', factureController.createFactureCommande);
// Factures d'achat
router.post('/achat', factureController.createFactureAchat);
// Factures d'acompte
//router.post('/acompte', factureController.createFactureAcompte);
router.post('/avoir', factureController.createAvoir);
router.post('/regularisation', factureController.createFactureRegularisation);

router.get('/:code_structure', authenticateToken, requireStructureAccess, factureController.getFactures);
router.get('/:id', factureController.getFactureById);
router.delete('/:id', authenticateToken, factureController.annulerFacture);
router.get('/:id/pdf', factureController.downloadFacturePDF);

module.exports = router;
