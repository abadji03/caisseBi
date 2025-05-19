const express = require("express");
const router = express.Router();
const produitCtrl = require("../controllers/produit.controller");

router.post("/", produitCtrl.createProduit);
router.put("/:id", produitCtrl.updateProduit);
router.delete("/:id", produitCtrl.deleteProduit);
router.get("/structure/:code_structure", produitCtrl.getProduitsByStructure);

module.exports = router;
