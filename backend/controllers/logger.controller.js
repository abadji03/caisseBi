const logFileService = require('../services/logFile.service');
const logger = require('../services/logger.js');
const path = require('path');

// POST /api/logs - Créer un nouveau log
const createLog = async (req, res) => {
  try {
    const { level, message, additional } = req.body;

    // Validation
    if (!level || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Les champs level et message sont requis' 
      });
    }

    // Écrire le log dans le fichier
    const logInfo = await logFileService.writeLog(level, message, additional);

    // Réponse avec succès
    res.status(200).json({ 
      success: true,
      message: 'Log enregistré avec succès',
      logInfo: {
        date: logInfo.date,
        file: path.basename(logInfo.filePath)
      }
    });
  } catch (err) {logger.error('logger.controller', 'Erreur serveur lors de l\'écriture du log:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de l\'écriture du log' 
    });
  }
};

// GET /api/logs - Récupérer les logs d'une date spécifique
const getLogsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Le paramètre date est requis (format: YYYY-MM-DD)'
      });
    }
    
    // Validation du format de date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Format de date invalide. Utilisez YYYY-MM-DD'
      });
    }
    
    const logs = await logFileService.readLogsByDate(date);
    
    res.status(200).json({
      success: true,
      date,
      count: logs.length,
      logs
    });
  } catch (error) {logger.error('logger.controller', 'Erreur lors de la récupération des logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur serveur lors de la lecture des logs'
    });
  }
};

// GET /api/logs/files - Lister tous les fichiers de logs
const getLogFiles = async (req, res) => {
  try {
    const files = await logFileService.listLogFiles();
    
    res.status(200).json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {logger.error('logger.controller', 'Erreur lors de la liste des fichiers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur serveur'
    });
  }
};

module.exports = {
  createLog,
  getLogsByDate,
  getLogFiles
};