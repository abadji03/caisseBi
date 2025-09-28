// routes/bonCompletRoutes.js
const express = require('express');
const router = express.Router();
const bonCompletController = require('../controllers/bonComplet.controller');

// Route pour la création complète d'un bon
router.post('/complet', bonCompletController.createBonComplet);

module.exports = router;