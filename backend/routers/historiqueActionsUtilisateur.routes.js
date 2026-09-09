const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/historiqueActionsUtilisateur.controller');

/**
 * @swagger
 * tags:
 *   name: Historique Actions
 *   description: Journal des actions utilisateurs
 *
 * /historique-actions-utilisateur/user/{userId}:
 *   get:
 *     summary: Actions d'un utilisateur
 *     tags: [Historique Actions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liste des actions de l'utilisateur
 */

router.post('/', authenticateToken, ctrl.create);
router.get('/user/:userId', authenticateToken, ctrl.findByUser);

module.exports = router;
