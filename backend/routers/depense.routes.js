const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/depense.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');


router.post('/',authenticateToken,upload.single('receipt'), ctrl.createDepense);
router.get('/magasin/:magasinId', ctrl.getAllByMagasin);
router.delete('/:id',authenticateToken, ctrl.deleteDepense);
router.put('/:id',authenticateToken,upload.single('receipt'), ctrl.updateDepense);
router.get('/structure/:code_structure', authenticateToken, ctrl.getAllByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, ctrl.getAllByStructureBis);
router.patch('/:id/statutDepense', authenticateToken, ctrl.updateStatut);

module.exports = router;
