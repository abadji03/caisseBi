const express = require('express');
const router = express.Router();
const historiqueStatutController = require('../controllers/historiqueStatut.controller');

// Créer un historique
router.post('/', historiqueStatutController.create);

// Tous les historiques d’une structure
router.get('/structure/:code_structure', historiqueStatutController.findAllByStructure);

// Tous les historiques d’un bon
router.get('/bon/:bonId', historiqueStatutController.findByBon);

// Supprimer un historique (optionnel)
router.delete('/:id', historiqueStatutController.delete);

module.exports = router;
