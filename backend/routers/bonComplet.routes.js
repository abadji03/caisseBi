// routes/bonCompletRoutes.js
const express = require('express');
const router = express.Router();
const bonCompletController = require('../controllers/bonComplet.controller');
const upload = require('../middlewares/uploadMiddleware');


// Route pour la création complète d'un bon
router.post('/complet',upload.single('fichier'), bonCompletController.createBonComplet);

module.exports = router;