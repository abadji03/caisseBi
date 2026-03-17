// routes/panierRoutes.js
const express = require('express');
const router = express.Router();
const panierController = require('../controllers/panier.controller');
const panierCompletController = require('../controllers/panierComplet.controller');
const authenticateToken = require('../middlewares/auth.middleware');



router.post('/',authenticateToken, panierController.createPanier);
router.get('/',authenticateToken, panierController.getAllPaniers);
router.get('/:id',authenticateToken, panierController.getPanierById);
router.put('/:id',authenticateToken, panierController.updatePanier);
router.delete('/:id',authenticateToken, panierController.deletePanier);
router.delete('/onlyPanier/:id',authenticateToken, panierController.deleteOnlyPanier);
router.get('/bon/:bonId',authenticateToken, panierController.getPanierByBonId);

router.get('/structure/:code_structure/magasin/:magasinId',authenticateToken, panierController.getPaniersByStructure);

router.get('/structure/:code_structure/magasin/:magasinId/brouillon',authenticateToken, panierController.getPaniersBrouillons);

router.post('/panier-complet',authenticateToken, panierCompletController.createOrUpdatePanierComplet);

router.get('/structure/:code_structure/journalier',authenticateToken, panierController.getPaniersByStructureBis);
router.get('/par-date/:date',authenticateToken, panierController.getPaniersParDate);
router.get('/structure/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, panierController.getPaniersAujourdhui);
router.get('/structure/bis/:code_structure/magasin/:magasinId/bons/:bonId/aujourdhui',authenticateToken, panierController.getPaniersAujourdhuiBis);


module.exports = router;
