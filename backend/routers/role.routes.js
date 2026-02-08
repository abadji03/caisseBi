const express = require('express');
const router = express.Router();
const role = require('../controllers/role.controller');
const authenticateToken = require('../middlewares/auth.middleware');



router.post('/', authenticateToken, role.create);
router.get('/', authenticateToken, role.findAll);
router.get('/:id', authenticateToken, role.getRoleById);
router.put('/:id', authenticateToken, role.updateRole);
router.delete('/:id', authenticateToken, role.deleteRole);
router.post('/:id/permissions', authenticateToken, role.assignPermissions); // assigner permissions

module.exports = router;
