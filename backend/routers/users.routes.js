const express = require('express');
const router = express.Router();
const users = require('../controllers/users.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Utilisateurs
 *   description: Gestion des utilisateurs
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Créer un utilisateur
 *     tags: [Utilisateurs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, email, password, code_structure]
 *             properties:
 *               nom: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               telephone: { type: string }
 *               magasinId: { type: integer }
 *               code_structure: { type: string }
 *     responses:
 *       201:
 *         description: Utilisateur créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *   get:
 *     summary: Lister tous les utilisateurs
 *     tags: [Utilisateurs]
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.post('/', authenticateToken, users.create);
router.get('/', authenticateToken, users.findAll);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par ID
 *     tags: [Utilisateurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Utilisateur introuvable
 *   put:
 *     summary: Mettre à jour un utilisateur
 *     tags: [Utilisateurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags: [Utilisateurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Supprimé avec succès
 */
router.get('/:id', authenticateToken, users.findOne);
router.put('/:id', authenticateToken, users.update);
router.delete('/:id', authenticateToken, users.delete);

/**
 * @swagger
 * /users/{id}/status:
 *   patch:
 *     summary: Activer / désactiver un utilisateur
 *     tags: [Utilisateurs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: boolean }
 *     responses:
 *       200:
 *         description: Statut mis à jour
 */
router.patch('/:id/status', authenticateToken, users.updateUserStatus);

/**
 * @swagger
 * /users/{code_structure}/users:
 *   get:
 *     summary: Lister les utilisateurs d'une structure
 *     tags: [Utilisateurs]
 *     parameters:
 *       - in: path
 *         name: code_structure
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des utilisateurs de la structure
 */
router.get('/:code_structure/users', authenticateToken, users.findByStructure);
router.get('/:code_structure/bis/users', authenticateToken, users.findByStructureBis);

module.exports = router;
