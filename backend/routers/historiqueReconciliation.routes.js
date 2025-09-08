/* const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/historiqueReconciliation.controller");

router.post("/", ctrl.create);
router.get("/reconciliation/:reconciliationId", ctrl.findByReconciliation);

module.exports = router;
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/historiqueReconciliation.controller');

router.post('/', ctrl.create);
router.get('/reconciliation/:reconciliationId', ctrl.findByReconciliation);
router.get('/structure/:code_structure', ctrl.findByStructure);
router.get('/:id', ctrl.findById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
