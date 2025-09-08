const express = require('express');
const router = express.Router();
const role = require('../controllers/role.controller');

router.post('/', role.create);
router.get('/', role.findAll);
router.get('/:id', role.getRoleById);
router.put('/:id', role.updateRole);
router.delete('/:id', role.deleteRole);
router.post('/:id/permissions', role.assignPermissions); // assigner permissions

module.exports = router;
