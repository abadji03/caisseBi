const express = require('express');
const router = express.Router();
const fournisseurCtrl = require('../controllers/fournisseur.controller');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/', authenticateToken, fournisseurCtrl.createFournisseur);
router.put('/:id', authenticateToken, fournisseurCtrl.updateFournisseur);
router.delete('/:id', authenticateToken, fournisseurCtrl.deleteFournisseur);
router.get('/structure/:code_structure', authenticateToken, fournisseurCtrl.getFournisseursByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, fournisseurCtrl.getFournisseursByStructureBis);
router.patch('/:id/statut', authenticateToken, fournisseurCtrl.updateFournisseurStatus);
router.get('/:id', authenticateToken, fournisseurCtrl.getFournisseurById);
router.get('/:code_structure/:id/bons', authenticateToken, fournisseurCtrl.getBonsWithPaniersAndProduits);

router.get('/:id/with-magasins',authenticateToken, fournisseurCtrl.getFournisseurWithMagasins);

// Routes pour fournisseurs
router.put('/fournisseurs/:fournisseurId/magasins/:magasinId/solde', fournisseurCtrl.updateFournisseurSoldeByMagasin);

router.get('/export/excel',authenticateToken, fournisseurCtrl.exportFournisseursExcel);
module.exports = router;
