const express = require("express");
const router = express.Router();
const role = require("../controllers/role.controller");

router.post("/", role.create);
router.get("/", role.findAll);
router.post("/:id/permissions", role.assignPermissions); // assigner permissions

module.exports = router;
