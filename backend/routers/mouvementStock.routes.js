// routes/mouvementStock.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/mouvementStock.controller');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/',authenticateToken, controller.createMouvementStock);
router.get('/',authenticateToken, controller.getAllMouvementsStock);
router.get('/:id',authenticateToken, controller.getMouvementStockById);
router.put('/:id',authenticateToken, controller.updateMouvementStock);
router.delete('/:id',authenticateToken, controller.deleteMouvementStock);
router.get('/structure/:code_structure', authenticateToken, controller.getMouvementsByStructure);

module.exports = router;
