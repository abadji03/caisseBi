const express = require("express");
const router = express.Router();
const clientCtrl = require("../controllers/client.controller");

/* router.post("/", clientCtrl.createClient);
router.put("/:id", clientCtrl.updateClient);
router.delete("/:id", clientCtrl.deleteClient);
router.get("/structure/:code_structure", clientCtrl.getClientsByStructure); */

router.get("/:id", clientCtrl.getClientById);
router.get("/structure/:code_structure", clientCtrl.getClientsByStructure);
router.post("/", clientCtrl.createClient);
router.put("/:id", clientCtrl.updateClient);
router.delete("/:id", clientCtrl.deleteClient);

// Routes spécifiques
router.patch("/:id/statut", clientCtrl.updateClientStatut);
router.patch("/:id/solde", clientCtrl.updateClientSolde);
router.patch("/:id/plafond", clientCtrl.updateClientPlafond);
router.patch("/:id/montant-a-payer", clientCtrl.updateMontantANousPayer);

module.exports = router;
