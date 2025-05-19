// routes/panierRoutes.js
const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panier.controller');

router.post('/', panierController.createPanier);
router.get('/', panierController.getAllPaniers);
router.get('/:id', panierController.getPanierById);
router.put('/:id', panierController.updatePanier);
router.delete('/:id', panierController.deletePanier);

module.exports = router;
