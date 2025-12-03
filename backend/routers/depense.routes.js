const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/depense.controller');
const upload = require('../middlewares/uploadMiddleware');


router.post('/',upload.single('receipt'), ctrl.createDepense);
router.get('/magasin/:magasinId', ctrl.getAllByMagasin);
router.delete('/:id', ctrl.deleteDepense);
router.put('/:id',upload.single('receipt'), ctrl.updateDepense);
router.get('/structure/:code_structure', ctrl.getAllByStructure);
module.exports = router;
