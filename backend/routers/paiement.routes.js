// routes/paiementRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/paiement.controller');
const upload = require('../middlewares/uploadMiddleware');


router.post('/',upload.single('fichier'), controller.create);
router.get('/', controller.findAll);
router.get('/structure/:code_structure', controller.getPaiementsByStructure);
router.get('/:id', controller.findById);
router.put('/:id',upload.single('fichier'), controller.update);
router.delete('/:id', controller.delete);

// Récupérer les paiements d'une structure par fournisseur
router.get('/:code_structure/fournisseur/:fournisseurId', controller.getPaiementsByFournisseur);

// Récupérer les paiements d'une structure par client
router.get('/:code_structure/client/:clientId', controller.getPaiementsByClient);

module.exports = router;
