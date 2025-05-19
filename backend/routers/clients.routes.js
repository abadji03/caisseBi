const express = require("express");
const router = express.Router();
const clientCtrl = require("../controllers/client.controller");

router.post("/", clientCtrl.createClient);
router.put("/:id", clientCtrl.updateClient);
router.delete("/:id", clientCtrl.deleteClient);
router.get("/structure/:code_structure", clientCtrl.getClientsByStructure);

module.exports = router;
