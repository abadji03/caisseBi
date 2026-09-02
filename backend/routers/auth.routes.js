// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification et session utilisateur
 */

/**
 * @swagger
 * /auth/connexion:
 *   post:
 *     summary: Connexion utilisateur
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie — retourne le token JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Mot de passe incorrect
 *       404:
 *         description: Utilisateur introuvable
 */
router.post('/connexion', authController.connexion);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Récupérer l'utilisateur connecté
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Données de l'utilisateur connecté avec ses rôles et permissions
 *       401:
 *         description: Token manquant ou invalide
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * @swagger
 * /auth/deconnexion:
 *   post:
 *     summary: Déconnexion utilisateur
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
router.post('/deconnexion', authenticateToken, authController.deconnexion);

module.exports = router;
