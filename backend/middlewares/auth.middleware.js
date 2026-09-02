const jwt = require('jsonwebtoken');
const db = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware d'authentification.
 *
 * Stratégie : les données essentielles (id, nom, code_structure, magasinId, roles)
 * sont embarquées dans le JWT à la connexion. On évite ainsi une requête DB lourde
 * (users → roles → permissions) sur chaque appel API.
 *
 * Une requête DB légère (SELECT id, status) est faite uniquement pour vérifier
 * que le compte est toujours actif (non désactivé depuis l'émission du token).
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Vérification légère : l'utilisateur existe-t-il encore et est-il actif ?
    const user = await db.Users.findByPk(decoded.id, {
      attributes: ['id', 'status'],
    });

    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (!user.status) return res.status(403).json({ message: 'Compte désactivé' });

    // Injecter les données du token dans req.user (roles et permissions inclus)
    req.user = decoded;

    next();
  } catch {
    return res.status(403).json({ message: 'Token invalide' });
  }
};

module.exports = authenticateToken;
