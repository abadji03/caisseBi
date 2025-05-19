// routes/bonRoutes.js
const express = require('express');
const router = express.Router();
const bonController = require('../controllers/bon.controller');

router.post('/', bonController.createBon);
router.get('/', bonController.getAllBons);
router.get('/:id', bonController.getBonById);
router.put('/:id', bonController.updateBon);
router.delete('/:id', bonController.deleteBon);

module.exports = router;
