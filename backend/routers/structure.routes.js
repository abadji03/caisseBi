// routers/structure.routes.js
const express = require('express');
const router = express.Router();
const structureController = require('../controllers/structure.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');


//POST: Création d’une structure avec logo
router.post('/',authenticateToken, upload.single('logo'), structureController.createStructure);

//PUT: Modification d’une structure (logo en option)
router.put('/:id',authenticateToken, upload.single('logo'), structureController.updateStructure);

//DELETE: Suppression d’une structure
router.delete('/:id',authenticateToken, structureController.deleteStructure);

// GET: Récupération d'une et de plusieurs structures
router.get('/',authenticateToken, structureController.getAllStructures);
router.get('/:id',authenticateToken, structureController.getStructureById);
router.get('/code/:code_structure',authenticateToken, structureController.getStructureByCodeStructure);

// PATCH: Mise à jour du statut uniquement
router.patch('/:id/status',authenticateToken, structureController.updateStructureStatus);

module.exports = router;
