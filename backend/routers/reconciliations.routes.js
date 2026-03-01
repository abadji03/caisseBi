const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reconciliation.controller');
const authenticateToken = require('../middlewares/auth.middleware');


//router.post("/", ctrl.createReconciliation);
//router.get("/structure/:code_structure", ctrl.getReconciliationsByStructure);

router.post('/',authenticateToken, ctrl.createReconciliation);
router.get('/structure/:code_structure',authenticateToken, ctrl.getReconciliationsByStructure); // Par structure

//router.get('/',authenticateToken, ctrl.getAllReconciliations); // Tous
router.get('/:id',authenticateToken, ctrl.getReconciliationById); // Par ID
router.put('/:id',authenticateToken, ctrl.updateReconciliation); // MAJ
router.delete('/:id',authenticateToken, ctrl.deleteReconciliation); // Suppression

router.get('/produit/:produitId',authenticateToken, ctrl.getReconciliationsByProduit); // Par produit

module.exports = router;
