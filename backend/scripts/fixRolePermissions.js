// scripts/fixRolePermissions.js
//
// Audit et synchronisation des permissions par rôle (chantier 9 — permissions/roles).
//
// Problème résolu : certaines routes exigent des permissions (requirePermission)
// que les rôles n'ont pas en base -> 403 "Droits insuffisants pour cette opération"
// (ex. le gérant sur la caisse : GET /stocks/structure/... exige 'Gérer le stock').
//
// Usage (depuis backend/) :
//   node scripts/fixRolePermissions.js            -> AUDIT seul (aucune écriture)
//   node scripts/fixRolePermissions.js --apply    -> applique les ajouts manquants
//
// Le script est IDEMPOTENT : il crée les permissions manquantes dans la table
// Permissions (type 'edit' par défaut) et les associe aux rôles ciblés.
// NB : depuis que authenticateToken recharge les permissions depuis la base
// à chaque requête, les changements sont effectifs IMMÉDIATEMENT pour les
// utilisateurs connectés (plus besoin de se déconnecter/reconnecter).

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
if (!process.env.DB_NAME) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const db = require('../models');
const logger = require('../services/logger');

const APPLY = process.argv.includes('--apply');

// Permissions exigées par les routes (codes EXACTS des requirePermission,
// voir constants/permissions.js — les libellés ne servent qu'à l'affichage).
const { PERMISSIONS, LABEL_TO_CODE, CODE_TO_LABEL } = require('../constants/permissions');

const CODES_ROUTES = Object.values(PERMISSIONS).filter(code => code !== PERMISSIONS.ALL_ACCESS);

// Matrice métier : codes attendus par rôle.
const MATRICE = {
  'Administrateur Général': [PERMISSIONS.ALL_ACCESS, ...CODES_ROUTES],
  'Administrateur': [...CODES_ROUTES],
  'Administrateur secondaire': [...CODES_ROUTES],
  'Gérant': [
    PERMISSIONS.SALES_MANAGE,
    PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.CLIENTS_MANAGE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.CONFIG_ACCESS,
  ],
  'Caissier': [
    PERMISSIONS.SALES_MANAGE,
    PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.CLIENTS_MANAGE,
  ],
  'Employé': [
    PERMISSIONS.SALES_MANAGE,
    PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.PRODUCTS_MANAGE,
    PERMISSIONS.CLIENTS_MANAGE,
  ],
};

async function main() {
  try {
    await db.sequelize.authenticate();
    logger.log('fixRolePermissions', 'Connexion DB OK. Mode: ' + (APPLY ? 'APPLY (écriture)' : 'AUDIT (lecture seule)'));

    // 1. Charger rôles + permissions
    const roles = await db.Role.findAll({ include: [{ model: db.Permission }] });
    const permissionsExistantes = await db.Permission.findAll();

    // 2. Audit : permissions existantes vs codes exigés par les routes
    const codeDe = p => p.code || LABEL_TO_CODE[p.nom];
    const codesEnBase = new Set(permissionsExistantes.map(codeDe).filter(Boolean));
    const permissionsManquantesTable = CODES_ROUTES.filter(c => !codesEnBase.has(c));
    logger.log('fixRolePermissions', '--- Permissions définies en base ---');
    permissionsExistantes.forEach(p => logger.log('fixRolePermissions', '  - ' + (p.code || '(sans code)') + ' (' + p.nom + ')'));

    if (permissionsManquantesTable.length > 0) {
      logger.warn('fixRolePermissions', 'Permissions REQUISES par les routes mais ABSENTES de la table: ' + permissionsManquantesTable.join(', '));
    }

    // 3. Audit par rôle + calcul des ajouts
    const creationsPermissions = [];
    const associationsAAjouter = [];

    for (const [nomRole, permissionsAttendues] of Object.entries(MATRICE)) {
      const role = roles.find(r => r.nom === nomRole);
      if (!role) {
        logger.warn('fixRolePermissions', 'Rôle introuvable en base: "' + nomRole + '" (ignoré)');
        continue;
      }
      // NB : la propriété Sequelize est 'permissions' (nom du modèle en minuscule pluriel),
      // cohérent avec auth.controller.js (r.permissions).
      const actuelles = new Set((role.permissions || []).map(codeDe).filter(Boolean));
      logger.log('fixRolePermissions', '--- ' + nomRole + ' : ' + actuelles.size + ' permission(s) actuelle(s)');
      (role.permissions || []).forEach(p => logger.log('fixRolePermissions', '    [x] ' + (p.code || LABEL_TO_CODE[p.nom] || '?') + ' (' + p.nom + ')'));

      for (const code of permissionsAttendues) {
        if (!actuelles.has(code)) {
          associationsAAjouter.push({ nomRole, code });
          logger.warn('fixRolePermissions', '    [MANQUANT] ' + code);
        }
        if (!codesEnBase.has(code) && !creationsPermissions.some(c => c.code === code)) {
          creationsPermissions.push({ code, nom: CODE_TO_LABEL[code] });
        }
      }
    }

    // 4. Application (si --apply)
    if (!APPLY) {
      logger.log('fixRolePermissions', '--- AUDIT SEUL. Relancez avec --apply pour appliquer: ' +
        creationsPermissions.length + ' permission(s) à créer, ' + associationsAAjouter.length + ' association(s) à ajouter.');
      process.exit(0);
    }

    // 4a. Créer les permissions manquantes dans la table
    for (const c of creationsPermissions) {
      const [perm, created] = await db.Permission.findOrCreate({
        where: { code: c.code },
        defaults: { nom: c.nom, code: c.code, type: 'edit', niveau: 1 },
      });
      if (created) logger.log('fixRolePermissions', 'Permission créée: ' + c.code + ' (' + c.nom + ')');
      codesEnBase.add(c.code);
    }

    // 4b. Associer les permissions aux rôles
    for (const { nomRole, code } of associationsAAjouter) {
      const role = roles.find(r => r.nom === nomRole);
      const permission = await db.Permission.findOne({ where: { code } })
        || await db.Permission.findOne({ where: { nom: CODE_TO_LABEL[code] } });
      if (role && permission) {
        await role.addPermission(permission);
        logger.log('fixRolePermissions', '  [+ ' + nomRole + '] ' + code);
      }
    }

    logger.log('fixRolePermissions', '--- SYNCHRONISATION TERMINÉE ---');
    logger.log('fixRolePermissions', 'NB : les changements sont effectifs immédiatement (permissions rechargées depuis la base à chaque requête).');
    process.exit(0);
  } catch (error) {
    logger.error('fixRolePermissions', 'Erreur:', error);
    process.exit(1);
  }
}

main();