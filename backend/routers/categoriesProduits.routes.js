const express = require('express');
const router = express.Router();
const categorieCtrl = require('../controllers/categorieProduit.controller');
const authenticateToken = require('../middlewares/auth.middleware');    

router.post('/', authenticateToken, categorieCtrl.createCategorie);
router.put('/:id', authenticateToken, categorieCtrl.updateCategorie);
router.delete('/:id', authenticateToken, categorieCtrl.deleteCategorie);
router.get('/:id', authenticateToken, categorieCtrl.getCategoriesById);
router.get('/structure/:code_structure', authenticateToken, categorieCtrl.getCategoriesByStructure);
router.patch('/:id/statut', authenticateToken, categorieCtrl.updateStatutCategorie);

module.exports = router;
