const express = require('express');
const router = express.Router();
const permission = require('../controllers/permission.controller');

router.post('/', permission.create);
router.get('/', permission.findAll);
router.get('/:id', permission.findOne);
router.put('/:id', permission.update);
router.delete('/:id', permission.delete);

module.exports = router;
