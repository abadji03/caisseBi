// routes/bonRoutes.js
const express = require('express');
const router = express.Router();
const bonController = require('../controllers/bon.controller');
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/auth.middleware');


/* router.post('/', bonController.createBon);
router.get('/', bonController.getAllBons);
router.get('/:id', bonController.getBonById);
router.put('/:id', bonController.updateBon);
router.delete('/:id', bonController.deleteBon);
 */

//Créer un bon (avec fichier optionnel)
router.post('/',authenticateToken, upload.single('fichier'), bonController.createBon);

//Récupérer tous les bons
router.get('/', bonController.getAllBons);

//Récupérer les bons d’une structure
router.get('/structure/:code_structure',authenticateToken, bonController.getBonsByStructure);

//Récupérer les bons d’une structure pour les clients
router.get('/structure/:code_structure/clients',authenticateToken, bonController.getBonsClientsByStructure);

//Récupérer les bons d’une structure pour les fournisseur
router.get('/structure/:code_structure/fournisseurs',authenticateToken, bonController.getBonsFournisseursByStructure);

//Récupérer un bon par ID
router.get('/:id',authenticateToken, bonController.getBonById);

//Mettre à jour un bon (avec fichier optionnel)
router.put('/:id',authenticateToken, upload.single('fichier'), bonController.updateBon);

//Supprimer un bon
router.delete('/:id',authenticateToken, bonController.deleteBon);

//Mettre à jour le statut du bon
router.patch('/:id/statut',authenticateToken, bonController.updateStatutBon);

//Mettre à jour le type du bon
router.patch('/:id/type',authenticateToken, bonController.updateTypeBon);

//Mettre à jour le reste à payer
router.patch('/:id/resteAPayer',authenticateToken, bonController.updateResteAPayer);

//Mettre à jour le net à payer (après remise)
router.patch('/:id/netAPayer',authenticateToken, bonController.updateNetAPayer);

//Mettre à jour uniquement le fichier du bon
router.patch('/:id/fichier', upload.single('fichier'),authenticateToken, bonController.updateFichier);

//Mettre à jour les motifs de retour
router.patch('/:id/motifsRetour',authenticateToken, bonController.updateMotifsRetour);

// Récupérer les bons d'une structure par fournisseur
router.get('/:code_structure/fournisseur/:fournisseurId',authenticateToken, bonController.getBonsByFournisseur);

// Récupérer les bons d'une structure par client
router.get('/:code_structure/client/:clientId',authenticateToken, bonController.getBonsByClient);

// Upload d'un fichier pour un bon
router.post('/upload-fichier', upload.single('fichier'), bonController.uploadFichier);

// Supprimer un fichier
router.delete('/:bonId/fichier',authenticateToken, bonController.supprimerFichier);

router.post('/brouillon',authenticateToken, bonController.createBonComplet);
router.get('/brouillons/:code_structure', authenticateToken, bonController.getBonsBrouillons);
router.post('/panier/statut', authenticateToken, bonController.changerStatutPanier);
router.delete('/complet/:bonId', authenticateToken, bonController.supprimerBonComplet);

module.exports = router;
