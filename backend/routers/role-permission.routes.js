const express = require("express");
const router = express.Router();
const controller = require("../controllers/role-permission.controller");

router.post("/:roleId/permissions", controller.assignPermissionsToRole);
router.get("/:roleId/permissions", controller.getRolePermissions);

module.exports = router;
