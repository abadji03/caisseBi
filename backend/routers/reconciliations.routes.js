const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reconciliation.controller");

router.post("/", ctrl.createReconciliation);
router.get("/structure/:code_structure", ctrl.getReconciliationsByStructure);

module.exports = router;
