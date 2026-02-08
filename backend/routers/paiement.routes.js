// routes/paiementRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/paiement.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');



router.post('/',authenticateToken,upload.single('fichier'), controller.create);
router.get('/',authenticateToken, controller.findAll);
router.get('/structure/:code_structure',authenticateToken, controller.getPaiementsByStructure);
router.get('/:id', authenticateToken, controller.findById);
router.put('/:id',authenticateToken,upload.single('fichier'), controller.update);
router.delete('/:id', authenticateToken, controller.delete);    
// Récupérer les paiements d'une structure par fournisseur
router.get('/:code_structure/fournisseur/:fournisseurId',authenticateToken, controller.getPaiementsByFournisseur);

// Récupérer les paiements d'une structure par client
router.get('/:code_structure/client/:clientId',authenticateToken, controller.getPaiementsByClient);

module.exports = router;
