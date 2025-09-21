// routes/bonRoutes.js
const express = require('express');
const router = express.Router();
const bonController = require('../controllers/bon.controller');
const upload = require('../middlewares/uploadMiddleware');

/* router.post('/', bonController.createBon);
router.get('/', bonController.getAllBons);
router.get('/:id', bonController.getBonById);
router.put('/:id', bonController.updateBon);
router.delete('/:id', bonController.deleteBon);
 */

//Créer un bon (avec fichier optionnel)
router.post('/', upload.single('fichier'), bonController.createBon);

//Récupérer tous les bons
router.get('/', bonController.getAllBons);

//Récupérer les bons d’une structure
router.get('/structure/:code_structure', bonController.getBonsByStructure);

//Récupérer un bon par ID
router.get('/:id', bonController.getBonById);

//Mettre à jour un bon (avec fichier optionnel)
router.put('/:id', upload.single('fichier'), bonController.updateBon);

//Supprimer un bon
router.delete('/:id', bonController.deleteBon);

//Mettre à jour le statut du bon
router.patch('/:id/statut', bonController.updateStatutBon);

//Mettre à jour le reste à payer
router.patch('/:id/resteAPayer', bonController.updateResteAPayer);

//Mettre à jour le net à payer (après remise)
router.patch('/:id/netAPayer', bonController.updateNetAPayer);

//Mettre à jour uniquement le fichier du bon
router.patch('/:id/fichier', upload.single('fichier'), bonController.updateFichier);

//Mettre à jour les motifs de retour
router.patch('/:id/motifsRetour', bonController.updateMotifsRetour);

module.exports = router;
