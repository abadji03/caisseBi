const express = require('express');
const router = express.Router();
const controller = require('../controllers/role-permission.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

// NB : les routes statiques DOIVENT être déclarées avant les routes
// paramétrées, sinon '/permissions/grouped' est avalé par
// '/:roleId/permissions' (roleId = 'permissions').
router.get('/permissions/grouped', authenticateToken, controller.getPermissionsGroupedByRole);

// Routes canoniques (paramètre :roleId)
router.post('/:roleId/permissions', authenticateToken, requirePermission('roles.manage'), controller.setRolePermissions);
router.get('/:roleId/permissions', authenticateToken, controller.getRolePermissions);
router.put('/:roleId', authenticateToken, requirePermission('roles.manage'), controller.updateRolePermissions);
router.delete('/:roleId', authenticateToken, requirePermission('roles.manage'), controller.removeRolePermissions);

router.get('/', authenticateToken, controller.getAllRoles);

module.exports = router;
