const express = require('express');
const router = express.Router();
const loggerController = require('../controllers/logger.controller');

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