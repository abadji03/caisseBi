const express = require('express');
const router = express.Router();
const magasinCtrl = require('../controllers/magasin.controller');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/', authenticateToken, magasinCtrl.createMagasin);
router.put('/:id', authenticateToken, magasinCtrl.updateMagasin);
router.delete('/:id', authenticateToken, magasinCtrl.deleteMagasin);
router.get('/structure/:code_structure', authenticateToken, magasinCtrl.getMagasinsByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, magasinCtrl.getMagasinsByStructureBis);
router.get('/', authenticateToken, magasinCtrl.getAllMagasins);
router.patch('/:id/statut', authenticateToken, magasinCtrl.updateStatutMagasin);
router.get('/:id', authenticateToken, magasinCtrl.getMagasinById);

module.exports = router;
