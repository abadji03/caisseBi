const express = require('express');
const router = express.Router();
const role = require('../controllers/role.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Rôles
 *   description: Gestion des rôles et permissions
 *
 * /roles:
 *   post:
 *     summary: Créer un rôle
 *     tags: [Rôles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom]
 *             properties:
 *               nom: { type: string }
 *     responses:
 *       201:
 *         description: Rôle créé
 *   get:
 *     summary: Lister tous les rôles
 *     tags: [Rôles]
 *     responses:
 *       200:
 *         description: Liste des rôles
 *
 * /roles/{id}/permissions:
 *   post:
 *     summary: Assigner des permissions à un rôle
 *     tags: [Rôles]
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
 *               permissionIds:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200:
 *         description: Permissions assignées
 */



router.post('/', authenticateToken, requirePermission('roles.manage'), role.create);
router.get('/', authenticateToken, role.findAll);
router.get('/:id', authenticateToken, role.getRoleById);
router.put('/:id', authenticateToken, requirePermission('roles.manage'), role.updateRole);
router.delete('/:id', authenticateToken, requirePermission('roles.manage'), role.deleteRole);
router.post('/:id/permissions', authenticateToken, requirePermission('roles.manage'), role.assignPermissions); // assigner permissions

module.exports = router;
