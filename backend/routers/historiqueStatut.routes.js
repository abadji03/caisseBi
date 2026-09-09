const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth.middleware');
const { requireStructureAccess } = require('../middlewares/auth.middleware');
const historiqueStatutController = require('../controllers/historiqueStatut.controller');

/**
 * @swagger
 * tags:
 *   name: Historique Statuts
 *   description: Suivi des changements de statut des bons
 *
 * /historique-status/bon/{bonId}:
 *   get:
 *     summary: Historique des statuts d'un bon
 *     tags: [Historique Statuts]
 *     parameters:
 *       - in: path
 *         name: bonId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Historique des changements de statut
 *
 * /historique-status/structure/{code_structure}:
 *   get:
 *     summary: Tous les changements de statut d'une structure
 *     tags: [Historique Statuts]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des historiques
 */

// Créer un historique
router.post('/', historiqueStatutController.create);

// Tous les historiques d’une structure
router.get('/structure/:code_structure', authenticateToken, requireStructureAccess, historiqueStatutController.findAllByStructure);

// Tous les historiques d’un bon
router.get('/bon/:bonId', historiqueStatutController.findByBon);

// Supprimer un historique (optionnel)
router.delete('/:id', historiqueStatutController.delete);

module.exports = router;
