// routes/import.routes.js
const router = require('express').Router();
const importController = require('../controllers/import.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Import
 *   description: Import de données depuis fichiers CSV, Excel ou JSON
 *
 * /imports/detecter:
 *   post:
 *     summary: Détecter la structure d'un fichier avant import
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Structure détectée (colonnes, mapping suggéré)
 *
 * /imports:
 *   post:
 *     summary: Importer des données
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, typeImport]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               typeImport:
 *                 type: string
 *                 enum: [structures, magasins, clients, fournisseurs, categories, produits, stocks, bons, paiements, factures, complet]
 *               updateExisting:
 *                 type: boolean
 *                 description: Mettre à jour les enregistrements existants
 *     responses:
 *       200:
 *         description: Import terminé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 importes: { type: integer }
 *                 erreurs: { type: integer }
 */

router.use(authenticateToken);

router.post('/detecter', authenticateToken, requirePermission('Accès aux configurations'), importController.uploadMiddleware, importController.detecterStructure);
router.post('/', authenticateToken, requirePermission('Accès aux configurations'), importController.uploadMiddleware, importController.importer);

module.exports = router;