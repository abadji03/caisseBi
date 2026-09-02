// routers/structure.routes.js
const express = require('express');
const router = express.Router();
const structureController = require('../controllers/structure.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/auth.middleware');


//POST: Création d’une structure avec logo
router.post('/',authenticateToken, requirePermission('Accès aux configurations'), upload.single('logo'), structureController.createStructure);

//PUT: Modification d’une structure (logo en option)
router.put('/:id',authenticateToken, requirePermission('Accès aux configurations'), upload.single('logo'), structureController.updateStructure);

//DELETE: Suppression d’une structure
router.delete('/:id',authenticateToken, requirePermission('Accès aux configurations'), structureController.deleteStructure);

// GET: Récupération d'une et de plusieurs structures
router.get('/',authenticateToken, structureController.getAllStructures);
router.get('/bis',authenticateToken, structureController.getAllStructuresBis);
router.get('/:id',authenticateToken, structureController.getStructureById);
router.get('/code/:code_structure',authenticateToken, structureController.getStructureByCodeStructure);

router.get('/structures/without-admin',authenticateToken, structureController.getStructuresWithoutAdmin);
// PATCH: Mise à jour du statut uniquement
router.patch('/:id/status',authenticateToken, requirePermission('Accès aux configurations'), structureController.updateStructureStatus);

module.exports = router;
