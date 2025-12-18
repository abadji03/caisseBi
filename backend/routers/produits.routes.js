const express = require('express');
const router = express.Router();
const produitCtrl = require('../controllers/produit.controller');
const upload = require('../middlewares/uploadMiddleware');

router.post('/', upload.single('image'), produitCtrl.createProduit);
router.put('/:id', upload.single('image'), produitCtrl.updateProduit);
router.delete('/:id', produitCtrl.deleteProduit);
router.get('/structure/:code_structure', produitCtrl.getProduitsByStructure);
router.get('/:id', produitCtrl.getProduitById);
router.get('/', produitCtrl.getAllProduits);
router.patch('/:id/statut', produitCtrl.updateStatusProduit);
router.patch('/:id/tauxTVA', produitCtrl.updateTauxTVAProduit);
router.patch('/:id/image', upload.single('image'), produitCtrl.updateImageProduit);
router.put('/:id/code-barre', produitCtrl.updateCodeBarreProduit);

module.exports = router;
