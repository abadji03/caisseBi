const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/categorie.controller");

router.post("/", ctrl.createCategorie);
router.get("/structure/:code_structure", ctrl.getAllByStructure);
router.put("/:id", ctrl.updateCategorie);
router.patch("/toggle/:id", ctrl.toggleActive);
router.delete("/:id", ctrl.deleteCategorie);

module.exports = router;
