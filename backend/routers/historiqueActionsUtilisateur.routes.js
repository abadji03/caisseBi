const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/historiqueActionsUtilisateur.controller");

router.post("/", ctrl.create);
router.get("/user/:userId", ctrl.findByUser);

module.exports = router;
