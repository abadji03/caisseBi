const express = require('express');
const router = express.Router();
const controller = require('../controllers/user-role.controller');
const authenticateToken = require('../middlewares/auth.middleware');

router.post('/:userId/roles', authenticateToken, controller.assignRolesToUser);
router.get('/:userId/roles', authenticateToken, controller.getUserRoles);
router.put('/:userId', authenticateToken, controller.updateUserRoles);
router.delete('/:userId', authenticateToken, controller.removeUserRoles);

module.exports = router;
