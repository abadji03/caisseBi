const express = require('express');
const router = express.Router();
const loggerController = require('../controllers/logger.controller');

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Consultation des logs applicatifs
 *
 * /logs:
 *   post:
 *     summary: Écrire un log
 *     tags: [Logs]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level: { type: string, enum: [info, warn, error] }
 *               message: { type: string }
 *               additional: { type: object }
 *     responses:
 *       201:
 *         description: Log enregistré
 *   get:
 *     summary: Récupérer les logs d'une date
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: Format YYYY-MM-DD (défaut aujourd'hui)
 *     responses:
 *       200:
 *         description: Liste des entrées de log
 *
 * /logs/files:
 *   get:
 *     summary: Lister les fichiers de logs disponibles
 *     tags: [Logs]
 *     responses:
 *       200:
 *         description: Liste des fichiers de logs
 */

// POST /api/logs - Créer un log
router.post('/', loggerController.createLog);

// GET /api/logs - Récupérer les logs par date
router.get('/', loggerController.getLogsByDate);

// GET /api/logs/files - Lister les fichiers de logs
router.get('/files', loggerController.getLogFiles);

// GET /api/logs/:date - Alternative avec paramètre URL
router.get('/:date', async (req, res) => {
  // Réutiliser la même logique avec un paramètre URL
  req.query.date = req.params.date;
  await loggerController.getLogsByDate(req, res);
});

module.exports = router;