// routes/facture.routes.js
const router = require('express').Router();
const factureController = require('../controllers/facture.controller');
const authenticateToken = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent authentification
router.use(authenticateToken);

// CRUD
router.post('/from-bon', factureController.createFactureFromBon);
// Factures de commande
router.post('/commande', factureController.createFactureCommande);
// Factures d'achat
router.post('/achat', factureController.createFactureAchat);
// Factures d'acompte
//router.post('/acompte', factureController.createFactureAcompte);
router.post('/avoir', factureController.createAvoir);
router.post('/regularisation', factureController.createFactureRegularisation);

router.get('/:code_structure', factureController.getFactures);
router.get('/:id', factureController.getFactureById);
router.delete('/:id', factureController.annulerFacture);
router.get('/:id/pdf', factureController.downloadFacturePDF);

module.exports = router;