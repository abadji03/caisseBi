const express = require('express');
const router = express.Router();
const permission = require('../controllers/permission.controller');
const authenticateToken = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Gestion des permissions système
 *
 * /permissions:
 *   post:
 *     summary: Créer une permission
 *     tags: [Permissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom, type]
 *             properties:
 *               nom: { type: string }
 *               type: { type: string }
 *               niveau: { type: integer }
 *     responses:
 *       201:
 *         description: Permission créée
 *   get:
 *     summary: Lister toutes les permissions
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Liste des permissions
 */

router.post('/', authenticateToken, permission.create);
router.get('/', authenticateToken, permission.findAll);
router.get('/:id', authenticateToken, permission.findOne);
router.put('/:id', authenticateToken, permission.update);
router.delete('/:id', authenticateToken, permission.delete);

module.exports = router;
