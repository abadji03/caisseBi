const express = require('express');
const router = express.Router();
const permission = require('../controllers/permission.controller');
const authenticateToken = require('../middlewares/auth.middleware');

router.post('/', authenticateToken, permission.create);
router.get('/', authenticateToken, permission.findAll);
router.get('/:id', authenticateToken, permission.findOne);
router.put('/:id', authenticateToken, permission.update);
router.delete('/:id', authenticateToken, permission.delete);

module.exports = router;
