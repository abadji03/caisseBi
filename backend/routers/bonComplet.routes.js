// routes/bonCompletRoutes.js
const express = require('express');
const router = express.Router();
const bonCompletController = require('../controllers/bonComplet.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');
const { validateBonComplet } = require('../middlewares/validateBonComplet.middleware');

/**
 * @swagger
 * tags:
 *   name: Bon Complet
 *   description: Création complète d'un bon avec panier, articles et paiement en une seule requête
 *
 * /bons-complet/complet:
 *   post:
 *     summary: Créer ou mettre à jour un bon complet (bon + panier + articles + paiement)
 *     tags: [Bon Complet]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [bon, panier, articles, typeEntite]
 *             properties:
 *               bon:
 *                 type: string
 *                 description: Objet JSON du bon (stringifié)
 *               panier:
 *                 type: string
 *                 description: Objet JSON du panier (stringifié)
 *               articles:
 *                 type: string
 *                 description: Tableau JSON des articles (stringifié)
 *               typeEntite:
 *                 type: string
 *                 enum: [client, fournisseur]
 *               clientId:
 *                 type: integer
 *               fournisseurId:
 *                 type: integer
 *               paiement:
 *                 type: string
 *                 description: Objet JSON du paiement d'avance (optionnel)
 *               fichier:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Bon complet créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bon: { $ref: '#/components/schemas/Bon' }
 *                 panier: { type: object }
 *                 articles: { type: array, items: { type: object } }
 *                 paiement: { $ref: '#/components/schemas/Paiement' }
 *       400:
 *         description: Données incomplètes ou invalides
 */

// Route pour la création complète d'un bon
router.post('/complet', upload.single('fichier'), authenticateToken, requirePermission('Gérer les ventes', 'Accéder à la caisse'), validateBonComplet, bonCompletController.createBonComplet);

// Note : les routes changer-statut, transitions et historique ont été retirées
// car statut.controller.js dépendait de BonWorkflow/traiterChangementStatut
// qui ne sont pas implémentés dans bonComplet.controller.js.
// L'historique des statuts reste accessible via GET /api/historique-status.

module.exports = router;
