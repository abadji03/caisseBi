const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/historiqueConnexions.controller');

/**
 * @swagger
 * tags:
 *   name: Historique Connexions
 *   description: Journal des connexions utilisateurs
 *
 * /historiques-connexions/user/{userId}:
 *   get:
 *     summary: Connexions d'un utilisateur
 *     tags: [Historique Connexions]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liste des connexions
 */

router.post('/', authenticateToken, ctrl.create);
router.get('/user/:userId', authenticateToken, ctrl.findByUser);

module.exports = router;
