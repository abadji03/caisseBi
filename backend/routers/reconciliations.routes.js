const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reconciliation.controller');

//router.post("/", ctrl.createReconciliation);
//router.get("/structure/:code_structure", ctrl.getReconciliationsByStructure);

router.post('/', ctrl.createReconciliation);
router.get('/', ctrl.getAllReconciliations); // Tous
router.get('/:id', ctrl.getReconciliationById); // Par ID
router.put('/:id', ctrl.updateReconciliation); // MAJ
router.delete('/:id', ctrl.deleteReconciliation); // Suppression

router.get('/structure/:code_structure', ctrl.getReconciliationsByStructure); // Par structure
router.get('/produit/:produitId', ctrl.getReconciliationsByProduit); // Par produit

module.exports = router;
