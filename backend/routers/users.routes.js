const express = require('express');
const router = express.Router();
const users = require('../controllers/users.controller');
const authenticateToken = require('../middlewares/auth.middleware');


// Routes CRUD
router.post('/',authenticateToken, users.create);
router.get('/',authenticateToken, users.findAll);
router.get('/:id', authenticateToken, users.findOne);
router.put('/:id', authenticateToken, users.update);
router.delete('/:id', authenticateToken, users.delete);
router.patch('/:id/status', authenticateToken, users.updateUserStatus);
router.get('/:code_structure/users', authenticateToken, users.findByStructure);

module.exports = router;
