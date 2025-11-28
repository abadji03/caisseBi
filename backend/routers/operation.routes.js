// routes/operationRoutes.js
const express = require('express');
const router = express.Router();
const operationController = require('../controllers/operation.controller');

// router.post('/', controller.create);
// router.get('/', controller.findAll);
// router.get('/:id', controller.findById);
// router.put('/:id', controller.update);
// router.delete('/:id', controller.delete);
// Routes principales
router.post('/', operationController.create);
router.get('/', operationController.findAll);
router.get('/stats', operationController.getStats);
router.get('/:id', operationController.findById);
router.put('/:id', operationController.update);
router.delete('/:id', operationController.delete);

// Routes spécifiques
router.get('/fournisseur/:code_structure/:fournisseurId', operationController.findByFournisseur);
router.get('/client/:code_structure/:clientId', operationController.findByClient);

module.exports = router;
