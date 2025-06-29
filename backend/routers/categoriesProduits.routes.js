const express = require("express");
const router = express.Router();
const categorieCtrl = require("../controllers/categorieProduit.controller");

router.post("/", categorieCtrl.createCategorie);
router.put("/:id", categorieCtrl.updateCategorie);
router.delete("/:id", categorieCtrl.deleteCategorie); 
router.get("/:id", categorieCtrl.getCategoriesById); 
router.get("/structure/:code_structure", categorieCtrl.getCategoriesByStructure);
router.patch("/:id/statut", categorieCtrl.updateStatutCategorie);

module.exports = router;