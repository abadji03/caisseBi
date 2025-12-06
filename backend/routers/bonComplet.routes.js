// routes/bonCompletRoutes.js
const express = require('express');
const router = express.Router();
const bonCompletController = require('../controllers/bonComplet.controller');
const upload = require('../middlewares/uploadMiddleware');
const statutController = require('../controllers/statut.controller');


// Route pour la création complète d'un bon
router.post('/complet',upload.single('fichier'), bonCompletController.createBonComplet);
// Gestion des statuts
router.post('/:id/changer-statut', statutController.changerStatutBon);
router.get('/:id/transitions', statutController.getTransitionsPossibles);
router.get('/:id/historique', statutController.getHistoriqueStatuts);

module.exports = router;