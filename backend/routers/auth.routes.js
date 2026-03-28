// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticateToken = require('../middlewares/auth.middleware');


// Route de connexion
router.post('/connexion', authController.connexion);
// Route pour récupérer l'utilisateur connecté
router.get('/me', authenticateToken, authController.getMe);
// Route de déconnexion
router.post('/deconnexion', authenticateToken, authController.deconnexion);

module.exports = router;
