const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/transfert.controller");

router.post("/", ctrl.createTransfert);
router.put("/valider/:id", ctrl.validerTransfert);
router.get("/structure/:code_structure", ctrl.listerParStructure);

module.exports = router;
