const express = require('express');
const router = express.Router();
const controller = require('../controllers/user-role.controller');

router.post('/:userId/roles', controller.assignRolesToUser);
router.get('/:userId/roles', controller.getUserRoles);
router.put('/:userId', controller.updateUserRoles);
router.delete('/:userId', controller.removeUserRoles);

module.exports = router;
