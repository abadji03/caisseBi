// routes/paiementRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/paiement.controller');
const upload = require('../middlewares/uploadMiddleware');


router.post('/',upload.single('fichier'), controller.create);
router.get('/', controller.findAll);
router.get('/structure/:code_structure', controller.getPaiementsByStructure);
router.get('/:id', controller.findById);
router.put('/:id',upload.single('fichier'), controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
