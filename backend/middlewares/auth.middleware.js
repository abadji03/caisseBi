/* const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // accessible dans les routes suivantes
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide ou expiré', error: err.message });
  }
};
 */

const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.Users;

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Optionnel : récupérer l'utilisateur complet depuis la base
    //const user = await User.findByPk(decoded.id);
    const user = await User.findByPk(decoded.id, {
    include: [{
        model: db.role,
        through: { attributes: [] }, // ignore les colonnes de la table pivot
         include: [
            {
              model: db.permission,
              through: { attributes: [] }, // ignore la table role_permissions
            },
          ],
      }]
    });

    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    req.user = user; // injecte l'utilisateur dans la requête
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide', error: err.message });
  }
};

module.exports = authenticateToken;
