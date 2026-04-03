const express = require('express');
const router = express.Router();
const clientCtrl = require('../controllers/client.controller');
const authenticateToken = require('../middlewares/auth.middleware');


/* router.post("/", clientCtrl.createClient);
router.put("/:id", clientCtrl.updateClient);
router.delete("/:id", clientCtrl.deleteClient);
router.get("/structure/:code_structure", clientCtrl.getClientsByStructure); */

router.get('/:id', authenticateToken, clientCtrl.getClientById);
router.get('/structure/:code_structure', authenticateToken, clientCtrl.getClientsByStructure);
router.get('/structure/bis/:code_structure', authenticateToken, clientCtrl.getClientsByStructureBis);
router.post('/', authenticateToken, clientCtrl.createClient);
router.put('/:id', authenticateToken, clientCtrl.updateClient);
router.delete('/:id', authenticateToken, clientCtrl.deleteClient);      
// Routes spécifiques
router.patch('/:id/statut', authenticateToken, clientCtrl.updateClientStatut);
router.patch('/:id/solde', authenticateToken, clientCtrl.updateClientSolde);
router.patch('/:id/plafond', authenticateToken, clientCtrl.updateClientPlafond);
router.patch('/:id/montant-a-payer', authenticateToken, clientCtrl.updateMontantANousPayer);

router.get('/export/excel',authenticateToken, clientCtrl.exportClientsExcel);

module.exports = router;
