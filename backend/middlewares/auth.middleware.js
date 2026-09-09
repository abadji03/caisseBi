const jwt = require('jsonwebtoken');
const db = require('../models');
const logger = require('../services/logger');
const { LABEL_TO_CODE, PERMISSIONS } = require('../constants/permissions');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Cache TTL du rechargement users→roles→permissions. Réduit la charge DB
 * tout en gardant l'effet quasi immédiat des modifications de droits :
 * toute écriture sur rôles/permissions/utilisateurs invalide le cache
 * (invalidateAllPermissions / invalidateUserPermissions).
 */
const PERMISSION_CACHE_TTL_MS = Number(process.env.PERMISSION_CACHE_TTL_MS || 30_000);
const userPermissionsCache = new Map(); // userId -> { data, expiresAt }

const invalidateUserPermissions = (userId) => {
  userPermissionsCache.delete(userId);
};

const invalidateAllPermissions = () => {
  userPermissionsCache.clear();
};

// Avertissement unique par libellé déprécié (préparation du retrait des libellés)
const warnedLabels = new Set();
const warnDeprecatedLabel = (label, contexte) => {
  if (!label || warnedLabels.has(label)) return;
  warnedLabels.add(label);
  logger.warn('auth.middleware', `Libellé de permission déprécié "${label}" (${contexte}). Utilisez le code stable correspondant (constants/permissions.js).`);
};

/**
 * Middleware d'authentification.
 *
 * Stratégie : le JWT ne sert qu'à AUTHENTIFIER (qui êtes-vous ?).
 * Les rôles et permissions sont RECHARGÉS DEPUIS LA BASE à chaque requête.
 * Ainsi, toute modification de rôle/permission par un administrateur est
 * effective immédiatement, sans attendre l'expiration du token (12h).
 *
 * La requête DB (users → roles → permissions) reste raisonnable : elle
 * remplace l'ancien payload figé dans le JWT et supprime tout risque de
 * désynchronisation entre le token et les droits réels.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Cache TTL : évite la requête users→roles→permissions sur chaque appel.
    // Invalidé par les contrôleurs dès qu'un rôle/permission/utilisateur change.
    const cached = userPermissionsCache.get(decoded.id);
    if (cached && cached.expiresAt > Date.now()) {
      req.user = cached.data;
      return next();
    }

    // Recharger l'utilisateur avec ses rôles/permissions ACTUELS depuis la base
    const user = await db.Users.findByPk(decoded.id, {
      attributes: ['id', 'email', 'nom', 'code_structure', 'structure_id', 'magasinId', 'status'],
      include: [
        {
          model: db.Role,
          through: { attributes: [] },
          include: [
            {
              model: db.Permission,
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    if (!user.status) return res.status(403).json({ message: 'Compte désactivé' });

    // req.user conserve EXACTEMENT la même forme que l'ancien payload JWT
    // (id, email, nom, code_structure, structure_id, magasinId, roles[].permissions[])
    // afin que requirePermission et les contrôleurs restent inchangés.
    const payload = {
      id: user.id,
      email: user.email,
      nom: user.nom,
      code_structure: user.code_structure,
      structure_id: user.structure_id,
      magasinId: user.magasinId,
      roles: (user.roles || []).map(role => ({
        id: role.id,
        nom: role.nom,
        permissions: (role.permissions || []).map(p => ({
          id: p.id,
          code: p.code,
          nom: p.nom,
          type: p.type,
        })),
      })),
    };

    // Alerte migration : permissions sans code stable en base
    for (const role of payload.roles) {
      for (const p of role.permissions) {
        if (!p.code) warnDeprecatedLabel(p.nom, 'permission sans code en base — lancez scripts/migratePermissionCodes.js --apply');
      }
    }

    userPermissionsCache.set(user.id, {
      data: payload,
      expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS,
    });

    req.user = payload;

    next();
  } catch {
    return res.status(403).json({ message: 'Token invalide' });
  }
};

/**
 * Vérifie que l'utilisateur authentifié possède UNE des permissions demandées
 * (sémantique ANY-of). Les permissions proviennent de la base de données,
 * rechargée à chaque requête par authenticateToken (jamais du JWT).
 *
 * Les arguments sont des CODES stables (constants/permissions.js), ex. :
 *   requirePermission(P.SALES_MANAGE, P.CASH_ACCESS)
 * Les libellés français historiques restent acceptés (transitoire) via
 * LABEL_TO_CODE, le temps de la migration.
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

  // Normaliser les arguments : libellé -> code si besoin (déprécié)
  const codesRequis = permissionsRequises.map(p => {
    const code = LABEL_TO_CODE[p];
    if (code && code !== p) warnDeprecatedLabel(p, 'argument de requirePermission');
    return code || p;
  });

  const permissionsUtilisateur = (req.user.roles || []).flatMap(
    role => role.permissions || []
  );
  const codesUtilisateur = new Set(
    permissionsUtilisateur
      .map(p => {
        if (p.code) return p.code;
        const code = LABEL_TO_CODE[p.nom];
        if (code) warnDeprecatedLabel(p.nom, 'permission en base sans code');
        return code;
      })
      .filter(Boolean)
  );

  // "Accès total" court-circuite tous les autres contrôles
  if (codesUtilisateur.has(PERMISSIONS.ALL_ACCESS)) {
    return next();
  }

  const autorise = codesRequis.some(code => codesUtilisateur.has(code));
  if (!autorise) {
    return res.status(403).json({
      message: 'Droits insuffisants pour cette opération',
      required: codesRequis,
    });
  }

  next();
};

/**
 * Vérifie que l'utilisateur n'accède qu'aux données de SA structure.
 * À placer après authenticateToken sur les routes contenant
 * :code_structure (dans le path, le body ou la query).
 * Les utilisateurs disposant de all.access (Accès total) bypassent le contrôle.
 */
const requireStructureAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Non authentifié' });
  }

  const codesUtilisateur = new Set(
    (req.user.roles || []).flatMap(role => role.permissions || [])
      .map(p => {
        if (p.code) return p.code;
        const code = LABEL_TO_CODE[p.nom];
        if (code) warnDeprecatedLabel(p.nom, 'permission en base sans code');
        return code;
      })
      .filter(Boolean)
  );
  if (codesUtilisateur.has(PERMISSIONS.ALL_ACCESS)) {
    return next();
  }

  const codeStructureUtilisateur = req.user.code_structure;
  const codeStructureDemande =
    req.params.code_structure ||
    req.body?.code_structure ||
    req.query?.code_structure;

  // Pas de structure demandée explicitement : rien à vérifier ici.
  if (!codeStructureDemande) return next();

  if (!codeStructureUtilisateur || codeStructureDemande !== codeStructureUtilisateur) {
    return res.status(403).json({
      message: "Accès refusé : cette ressource n'appartient pas à votre structure",
    });
  }

  next();
};

// Compatibilité : le module reste appelable directement comme
// authenticateToken (utilisé par ~36 routers), et expose aussi
// requirePermission / requireStructureAccess en propriétés.
module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.requirePermission = requirePermission;
module.exports.requireStructureAccess = requireStructureAccess;
module.exports.invalidateUserPermissions = invalidateUserPermissions;
module.exports.invalidateAllPermissions = invalidateAllPermissions;
module.exports.PERMISSION_CACHE_TTL_MS = PERMISSION_CACHE_TTL_MS;

