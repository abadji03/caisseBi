const express = require('express');
const router = express.Router();
const controller = require('../controllers/role-permission.controller');

router.post('/:roleId/permissions', controller.assignPermissionsToRole);
router.get('/:roleId/permissions', controller.getRolePermissions);
router.put('/:roleId', controller.updateRolePermissions);
router.delete('/:roleId', controller.removeRolePermissions);
module.exports = router;
