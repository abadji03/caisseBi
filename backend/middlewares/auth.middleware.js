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

/**
 * Vérifie que l'utilisateur authentifié possède UNE des permissions demandées
 * (sémantique ANY-of). Les permissions proviennent du payload JWT
 * (req.user.roles[].permissions[].nom — libellés identiques à la table
 * Permissions et aux constantes frontend).
 *
 * Utilisation :
 *   router.post('/', authenticateToken, requirePermission('Gérer les produits'), ctrl.create);
 *   router.delete('/:id', authenticateToken, requirePermission('Gérer les produits', 'Accès total'), ctrl.delete);
 *
 * ⚠️ Ne remplace pas authenticateToken : il s'appuie sur req.user.
 */
const requirePermission = (...permissionsRequises) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Non authentifié' });
  }

  if (!permissionsRequises || permissionsRequises.length === 0) {
    return next();
  }

  const permissionsUtilisateur = (req.user.roles || []).flatMap(
    role => role.permissions || []
  );
  const nomsPermissions = new Set(
    permissionsUtilisateur.map(p => p.nom).filter(Boolean)
  );

  // "Accès total" court-circuite tous les autres contrôles
  if (nomsPermissions.has('Accès total')) {
    return next();
  }

  const autorise = permissionsRequises.some(p => nomsPermissions.has(p));
  if (!autorise) {
    return res.status(403).json({
      message: 'Droits insuffisants pour cette opération',
      required: permissionsRequises,
    });
  }

  next();
};

// Compatibilité : le module reste appelable directement comme
// authenticateToken (utilisé par ~36 routers), et expose aussi
// requirePermission en propriété.
module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.requirePermission = requirePermission;

