const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transfert.controller');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/',authenticateToken, ctrl.createTransfert);
router.put('/valider/:id',authenticateToken, ctrl.validerTransfert);
router.get('/structure/:code_structure', authenticateToken, ctrl.listerParStructure);
router.get(
  '/produit/:produitId/magasin/:magasinId',
  authenticateToken,
  ctrl.getStockByProduitAndMagasin
);
router.put('/refuser/:id', authenticateToken, ctrl.refuserTransfert);

module.exports = router;
