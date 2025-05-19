// routes/articlePanierRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlePanier.controller');

router.post('/', controller.create);
router.get('/', controller.findAll);
router.get('/:id', controller.findById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
