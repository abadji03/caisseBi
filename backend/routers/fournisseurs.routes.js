const express = require("express");
const router = express.Router();
const fournisseurCtrl = require("../controllers/fournisseur.controller");

router.post("/", fournisseurCtrl.createFournisseur);
router.put("/:id", fournisseurCtrl.updateFournisseur);
router.delete("/:id", fournisseurCtrl.deleteFournisseur);
router.get("/structure/:code_structure", fournisseurCtrl.getFournisseursByStructure);

module.exports = router;
