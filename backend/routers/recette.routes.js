const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recette.controller');

router.post('/', ctrl.createRecette);
router.get('/structure/:code_structure', ctrl.getByStructure);
router.delete('/:id', ctrl.deleteRecette);

module.exports = router;
