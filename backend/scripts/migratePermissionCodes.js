// scripts/migratePermissionCodes.js
//
// Migration : ajoute la colonne `code` à la table Permissions et remplit
// chaque permission avec son code stable (voir constants/permissions.js).
//
// Usage (depuis backend/) :
//   node scripts/migratePermissionCodes.js           -> AUDIT seul
//   node scripts/migratePermissionCodes.js --apply   -> applique (écriture)
//
// IDEMPOTENT : peut être relancé sans risque.

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
if (!process.env.DB_NAME) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const db = require('../models');
const { LABEL_TO_CODE, CODE_TO_LABEL } = require('../constants/permissions');
const logger = require('../services/logger');

const APPLY = process.argv.includes('--apply');

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table);
  return Object.prototype.hasOwnProperty.call(desc, column);
}

async function main() {
  try {
    await db.sequelize.authenticate();
    logger.log('migratePermissionCodes', 'Connexion DB OK. Mode: ' + (APPLY ? 'APPLY (écriture)' : 'AUDIT (lecture seule)'));

    const qi = db.sequelize.getQueryInterface();

    // 1. Ajouter la colonne code si absente
    if (!(await columnExists(qi, 'Permissions', 'code'))) {
      if (!APPLY) {
        logger.warn('migratePermissionCodes', 'Colonne `code` ABSENTE de la table Permissions (relancez avec --apply)');
      } else {
        await qi.addColumn('Permissions', 'code', {
          type: db.Sequelize.STRING(50),
          allowNull: true,
          unique: true,
        });
        logger.log('migratePermissionCodes', 'Colonne `code` ajoutée à Permissions');
      }
    } else {
      logger.log('migratePermissionCodes', 'Colonne `code` déjà présente');
    }

    // 2. Remplir les codes manquants à partir des libellés connus
    const permissions = await db.Permission.findAll();
    const inconnues = [];

    for (const perm of permissions) {
      if (perm.code) continue; // déjà migrée
      const code = LABEL_TO_CODE[perm.nom];
      if (!code) {
        inconnues.push(perm.nom);
        continue;
      }
      if (APPLY) {
        await perm.update({ code });
        logger.log('migratePermissionCodes', `  [OK] "${perm.nom}" -> ${code}`);
      } else {
        logger.log('migratePermissionCodes', `  [TODO] "${perm.nom}" -> ${code}`);
      }
    }

    // 3. Permissions sans code connu : signaler (décision métier requise)
    if (inconnues.length > 0) {
      logger.warn('migratePermissionCodes', 'Permissions SANS code connu (à mapper manuellement dans constants/permissions.js) : ' + inconnues.join(', '));
    }

    // 4. Vérifier que tous les codes attendus existent en base
    const parCode = new Set(permissions.map(p => p.code).filter(Boolean));
    const manquants = Object.keys(CODE_TO_LABEL).filter(code => !parCode.has(code) && !permissions.some(p => LABEL_TO_CODE[p.nom] === code));
    if (manquants.length > 0) {
      logger.warn('migratePermissionCodes', 'Codes attendus par les routes mais ABSENTS de la base : ' + manquants.join(', '));
    }

    logger.log('migratePermissionCodes', APPLY ? 'Migration terminée.' : 'AUDIT seul. Relancez avec --apply pour appliquer.');
    process.exit(0);
  } catch (err) {
    logger.error('migratePermissionCodes', 'Erreur:', err);
    process.exit(1);
  }
}

main();
