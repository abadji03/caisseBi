const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recette.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');

router.post('/', authenticateToken, upload.single('receipt'), ctrl.createRecette);
router.get('/structure/:code_structure', authenticateToken, ctrl.getByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, ctrl.getByStructureBis);
router.get('/paiement/:paiementId', ctrl.findByPaiementId);
router.delete('/:id', authenticateToken, ctrl.deleteRecette);
router.put('/:id', authenticateToken, upload.single('receipt'), ctrl.updateRecette);
router.patch('/:id/statutRecette', authenticateToken, ctrl.updateStatut);

module.exports = router;
