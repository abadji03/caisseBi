const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categorie.controller');
const authenticateToken = require('../middlewares/auth.middleware');    

router.post('/', authenticateToken, ctrl.createCategorie);
router.get('/structure/:code_structure',authenticateToken, ctrl.getAllByStructure);
router.put('/:id', authenticateToken, ctrl.updateCategorie);
router.patch('/toggle/:id', authenticateToken, ctrl.toggleActive);
router.delete('/:id', authenticateToken, ctrl.deleteCategorie);
module.exports = router;
