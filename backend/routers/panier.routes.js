// routes/panierRoutes.js
const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panier.controller');
const panierCompletController = require('../controllers/panierComplet.controller');


router.post('/', panierController.createPanier);
router.get('/', panierController.getAllPaniers);
router.get('/:id', panierController.getPanierById);
router.put('/:id', panierController.updatePanier);
router.delete('/:id', panierController.deletePanier);
router.get('/bon/:bonId', panierController.getPanierByBonId);

router.get('/structure/:code_structure/magasin/:magasinId', panierController.getPaniersByStructure);

router.get('/structure/:code_structure/magasin/:magasinId/brouillon', panierController.getPaniersBrouillons);

router.post('/panier-complet', panierCompletController.createOrUpdatePanierComplet);

router.get('/structure/:code_structure/journalier', panierController.getPaniersByStructureBis);
router.get('/par-date/:date', panierController.getPaniersParDate);
router.get('/structure/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui', panierController.getPaniersAujourdhui);


module.exports = router;
