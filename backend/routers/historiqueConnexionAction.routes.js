// routes/historique.routes.js
const express = require('express');
const router = express.Router();
const historiqueController = require('../controllers/historiqueConnexionAction.controller');
const authenticateToken = require('../middlewares/auth.middleware');

// Protéger toutes les routes avec authentification
router.use(authenticateToken);

// Routes pour consulter l'historique
router.get('/connexions/user/:userId', historiqueController.getConnexionsByUser);
router.get('/actions/user/:userId', historiqueController.getActionsByUser);
router.get('/actions/recent', historiqueController.getAllRecentActions);

module.exports = router;