// controllers/auth.controller.js
const db = require("../models");
const User = db.users;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Secret JWT
const JWT_SECRET = process.env.JWT_SECRET; 

// Connexion utilisateur
exports.connexion = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Mot de passe incorrect" });

    // Générer un token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        typeUser: user.typeUser,
        structureId: user.structureId
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Optionnel : enregistrer la dernière connexion
    user.derniereConnexion = new Date();
    await user.save();

    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        typeUser: user.typeUser
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
