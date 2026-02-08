const express = require('express');
const router = express.Router();
const fournisseurCtrl = require('../controllers/fournisseur.controller');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/', authenticateToken, fournisseurCtrl.createFournisseur);
router.put('/:id', authenticateToken, fournisseurCtrl.updateFournisseur);
router.delete('/:id', authenticateToken, fournisseurCtrl.deleteFournisseur);
router.get('/structure/:code_structure', authenticateToken, fournisseurCtrl.getFournisseursByStructure);
router.patch('/:id/statut', authenticateToken, fournisseurCtrl.updateFournisseurStatus);
router.get('/:id', authenticateToken, fournisseurCtrl.getFournisseurById);
router.get('/:code_structure/:id/bons', authenticateToken, fournisseurCtrl.getBonsWithPaniersAndProduits);

module.exports = router;
