const express = require('express');
const router = express.Router();
const controller = require('../controllers/role-permission.controller');

router.post('/:roleId/permissions', controller.assignPermissionsToRole);
router.get('/:roleId/permissions', controller.getRolePermissions);
router.put('/:roleId', controller.updateRolePermissions);
router.delete('/:roleId', controller.removeRolePermissions);


router.get('/', controller.getAllRoles);
router.get('/:id/permissions', controller.getRolePermissions);
router.post('/:id/permissions', controller.setRolePermissions);
router.get('/permissions/grouped', controller.getPermissionsGroupedByRole);


module.exports = router;
