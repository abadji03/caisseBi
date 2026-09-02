const express = require('express');
const router = express.Router();
const controller = require('../controllers/role-permission.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

router.post('/:roleId/permissions', authenticateToken, requirePermission('Gérer les rôles'), controller.assignPermissionsToRole);
router.get('/:roleId/permissions', authenticateToken, controller.getRolePermissions);
router.put('/:roleId', authenticateToken, requirePermission('Gérer les rôles'), controller.updateRolePermissions);
router.delete('/:roleId', authenticateToken, requirePermission('Gérer les rôles'), controller.removeRolePermissions);

router.get('/', authenticateToken, controller.getAllRoles);
router.get('/:id/permissions', authenticateToken, controller.getRolePermissions);
router.post('/:id/permissions', authenticateToken, requirePermission('Gérer les rôles'), controller.setRolePermissions);
router.get('/permissions/grouped', authenticateToken, controller.getPermissionsGroupedByRole);

module.exports = router;
