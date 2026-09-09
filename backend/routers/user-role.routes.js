const express = require('express');
const router = express.Router();
const controller = require('../controllers/user-role.controller');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');

router.post('/:userId/roles', authenticateToken, requirePermission('roles.manage'), controller.assignRolesToUser);
router.get('/:userId/roles', authenticateToken, controller.getUserRoles);
router.put('/:userId', authenticateToken, requirePermission('roles.manage'), controller.updateUserRoles);
router.delete('/:userId', authenticateToken, requirePermission('roles.manage'), controller.removeUserRoles);

module.exports = router;
