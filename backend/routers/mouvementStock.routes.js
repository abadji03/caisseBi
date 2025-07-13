// routes/mouvementStock.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/mouvementStock.controller');

router.post('/', controller.createMouvementStock);
router.get('/', controller.getAllMouvementsStock);
router.get('/:id', controller.getMouvementStockById);
router.put('/:id', controller.updateMouvementStock);
router.delete('/:id', controller.deleteMouvementStock);
router.get('/structure/:code_structure', controller.getMouvementsByStructure);

module.exports = router;
