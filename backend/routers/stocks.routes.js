const express = require("express");
const router = express.Router();
const stockCtrl = require("../controllers/stock.controller");

router.post("/", stockCtrl.createStock);
router.put("/:id", stockCtrl.updateStock);
router.get("/structure/:code_structure", stockCtrl.getStocksByStructure);

module.exports = router;
