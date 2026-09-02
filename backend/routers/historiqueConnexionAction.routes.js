// routes/historique.routes.js
const express = require('express');
const router = express.Router();
const historiqueController = require('../controllers/historiqueConnexionAction.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Historique Connexions & Actions
 *   description: Audit des connexions et actions récentes
 *
 * /historiques-connexions-actions/actions/recent:
 *   get:
 *     summary: Actions récentes de tous les utilisateurs
 *     tags: [Historique Connexions & Actions]
 *     responses:
 *       200:
 *         description: Liste des actions récentes
 *
 * /historiques-connexions-actions/stats:
 *   get:
 *     summary: Statistiques d'activité
 *     tags: [Historique Connexions & Actions]
 *     responses:
 *       200:
 *         description: Statistiques (nb connexions, actions par type, etc.)
 */

// Protéger toutes les routes avec authentification
router.use(authenticateToken);

// Routes pour consulter l'historique
router.get('/connexions/user/:userId', historiqueController.getConnexionsByUser);
router.get('/actions/user/:userId', historiqueController.getActionsByUser);
router.get('/actions/recent', historiqueController.getAllRecentActions);
router.get('/stats', historiqueController.getHistoriqueStats); 

module.exports = router;