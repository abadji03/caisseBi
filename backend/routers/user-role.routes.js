const express = require("express");
const router = express.Router();
const controller = require("../controllers/user-role.controller");

router.post("/:userId/roles", controller.assignRolesToUser);
router.get("/:userId/roles", controller.getUserRoles);

module.exports = router;
