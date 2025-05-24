// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// Route de connexion
router.post("/connexion", authController.connexion);

module.exports = router;
