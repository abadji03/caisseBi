// routes/operationRoutes.js
const express = require('express');
const router = express.Router();
const operationController = require('../controllers/operation.controller');
const authenticateToken = require('../middlewares/auth.middleware');


// router.post('/', controller.create);
// router.get('/', controller.findAll);
// router.get('/:id', controller.findById);
// router.put('/:id', controller.update);
// router.delete('/:id', controller.delete);
// Routes principales
router.post('/',authenticateToken, operationController.create);
router.get('/',authenticateToken, operationController.findAll);
router.get('/stats', operationController.getStats);
router.get('/:id', authenticateToken, operationController.findById);
router.put('/:id', authenticateToken, operationController.update);
router.delete('/:id', authenticateToken, operationController.delete);

// Routes spécifiques
router.get('/fournisseur/:code_structure/:fournisseurId',authenticateToken, operationController.findByFournisseur);
router.get('/client/:code_structure/:clientId',authenticateToken, operationController.findByClient);

module.exports = router;
