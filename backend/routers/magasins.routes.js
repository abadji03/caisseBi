const express = require('express');
const router = express.Router();
const magasinCtrl = require('../controllers/magasin.controller');

router.post('/', magasinCtrl.createMagasin);
router.put('/:id', magasinCtrl.updateMagasin);
router.delete('/:id', magasinCtrl.deleteMagasin);
router.get('/structure/:code_structure', magasinCtrl.getMagasinsByStructure);

module.exports = router;
