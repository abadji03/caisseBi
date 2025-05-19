const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/historiqueReconciliation.controller");

router.post("/", ctrl.create);
router.get("/reconciliation/:reconciliationId", ctrl.findByReconciliation);

module.exports = router;
