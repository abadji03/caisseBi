const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recette.controller');
const upload = require('../middlewares/uploadMiddleware');


router.post('/',upload.single('receipt'), ctrl.createRecette);
router.get('/structure/:code_structure', ctrl.getByStructure);
router.delete('/:id', ctrl.deleteRecette);
router.put('/:id',upload.single('receipt'), ctrl.updateRecette);

module.exports = router;
