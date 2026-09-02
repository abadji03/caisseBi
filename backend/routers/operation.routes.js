// routes/operationRoutes.js
const express = require('express');
const router = express.Router();
const operationController = require('../controllers/operation.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Opérations
 *   description: Opérations comptables générées automatiquement par les bons et paiements
 *
 * /operations:
 *   get:
 *     summary: Lister toutes les opérations
 *     tags: [Opérations]
 *     responses:
 *       200:
 *         description: Liste des opérations
 *
 * /operations/stats:
 *   get:
 *     summary: Statistiques des opérations
 *     tags: [Opérations]
 *     parameters:
 *       - in: query
 *         name: code_structure
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statistiques (totaux, répartition par type, etc.)
 *
 * /operations/client/{code_structure}/{clientId}:
 *   get:
 *     summary: Opérations d'un client
 *     tags: [Opérations]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Opérations du client
 *
 * /operations/fournisseur/{code_structure}/{fournisseurId}:
 *   get:
 *     summary: Opérations d'un fournisseur
 *     tags: [Opérations]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: fournisseurId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Opérations du fournisseur
 */


// Routes spécifiques — doivent être AVANT /:id pour ne pas être avalées par ce pattern
router.get('/stats', operationController.getStats);
router.get('/fournisseur/:code_structure/:fournisseurId', authenticateToken, requirePermission('Gérer les finances'), operationController.findByFournisseur);
router.get('/client/:code_structure/:clientId', authenticateToken, requirePermission('Gérer les finances'), operationController.findByClient);

// Routes génériques — après les routes spécifiques
router.post('/', authenticateToken, requirePermission('Gérer les finances'), operationController.create);
router.get('/', authenticateToken, requirePermission('Gérer les finances'), operationController.findAll);
router.get('/:id', authenticateToken, requirePermission('Gérer les finances'), operationController.findById);
router.put('/:id', authenticateToken, requirePermission('Gérer les finances'), operationController.update);
router.delete('/:id', authenticateToken, requirePermission('Gérer les finances'), operationController.delete);

module.exports = router;
