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

//Mettre à jour le type du bon
router.patch('/:id/type', bonController.updateTypeBon);

//Mettre à jour le reste à payer
router.patch('/:id/resteAPayer', bonController.updateResteAPayer);

//Mettre à jour le net à payer (après remise)
router.patch('/:id/netAPayer', bonController.updateNetAPayer);

//Mettre à jour uniquement le fichier du bon
router.patch('/:id/fichier', upload.single('fichier'), bonController.updateFichier);

//Mettre à jour les motifs de retour
router.patch('/:id/motifsRetour', bonController.updateMotifsRetour);

// Récupérer les bons d'une structure par fournisseur
router.get('/:code_structure/fournisseur/:fournisseurId', bonController.getBonsByFournisseur);

// Récupérer les bons d'une structure par client
router.get('/:code_structure/client/:clientId', bonController.getBonsByClient);

// Upload d'un fichier pour un bon
router.post('/upload-fichier', upload.single('fichier'), bonController.uploadFichier);

// Supprimer un fichier
router.delete('/:bonId/fichier', bonController.supprimerFichier);

router.post('/brouillon', bonController.createBonComplet);
router.get('/brouillons/:code_structure', bonController.getBonsBrouillons);
router.post('/panier/statut', bonController.changerStatutPanier);
router.delete('/complet/:bonId', bonController.supprimerBonComplet);

module.exports = router;
