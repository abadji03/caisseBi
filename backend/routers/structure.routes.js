// routers/structure.routes.js
const express = require('express');
const router = express.Router();
const structureController = require('../controllers/structure.controller');
const upload = require('../middlewares/uploadMiddleware');

//POST: Création d’une structure avec logo
router.post('/', upload.single('logo'), structureController.createStructure);

//PUT: Modification d’une structure (logo en option)
router.put('/:id', upload.single('logo'), structureController.updateStructure);

//DELETE: Suppression d’une structure
router.delete('/:id', structureController.deleteStructure);

router.get('/', structureController.getAllStructures);
router.get('/:id', structureController.getStructureById);

module.exports = router;
