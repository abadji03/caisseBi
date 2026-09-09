// scripts/assignMagasin.js
//
// Audit et assignation du magasin aux utilisateurs qui n'en ont pas.
// Utilisé pour résoudre le 400 sur POST /paniers/panier-complet
// (le contrôleur exige magasinId).
//
// Usage (depuis backend/) :
//   node scripts/assignMagasin.js            -> AUDIT seul
//   node scripts/assignMagasin.js --apply    -> assigne le premier magasin de la structure

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
if (!process.env.DB_NAME) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const db = require('../models');
const logger = require('../services/logger');

const APPLY = process.argv.includes('--apply');

async function main() {
  await db.sequelize.authenticate();
  logger.log('assignMagasin', 'Connexion DB OK. Mode: ' + (APPLY ? 'APPLY' : 'AUDIT'));

  const users = await db.Users.findAll({
    include: [{ model: db.Role }],
  });
  const magasins = await db.Magasin.findAll();

  const magasinsParStructure = {};
  magasins.forEach(m => {
    if (!magasinsParStructure[m.code_structure]) {
      magasinsParStructure[m.code_structure] = [];
    }
    magasinsParStructure[m.code_structure].push(m);
  });

  let aAssigner = [];

  for (const user of users) {
    if (user.magasinId) continue;
    if (!user.code_structure) {
      logger.warn('assignMagasin', `User ${user.email} sans code_structure — ignoré`);
      continue;
    }
    const magasinsStructure = magasinsParStructure[user.code_structure] || [];
    if (magasinsStructure.length === 0) {
      logger.warn('assignMagasin', `Aucun magasin pour la structure ${user.code_structure} — user ${user.email} ignoré`);
      continue;
    }
    const magasin = magasinsStructure[0];
    const roles = (user.roles || []).map(r => r.nom).join(', ');
    aAssigner.push({ userId: user.id, email: user.email, magasinId: magasin.id, magasinNom: magasin.nom, roles });
  }

  logger.log('assignMagasin', `--- ${aAssigner.length} utilisateur(s) sans magasin à assigner ---`);
  aAssigner.forEach(a => logger.log('assignMagasin', `  - ${a.email} (${a.roles}) -> magasin ${a.magasinNom} (id=${a.magasinId})`));

  if (!APPLY) {
    logger.log('assignMagasin', '--- AUDIT SEUL. Relancez avec --apply pour appliquer.');
    await db.sequelize.close();
    return;
  }

  for (const a of aAssigner) {
    // Requête directe pour bypasser le hook beforeValidate qui pose problème
    // quand code_structure est null (utilisateur orphelin)
    await db.sequelize.query(
      'UPDATE users SET magasin_id = :magasinId, updated_at = NOW() WHERE id = :id',
      { replacements: { magasinId: a.magasinId, id: a.userId } }
    );
    logger.log('assignMagasin', `  ✅ ${a.email} assigné au magasin ${a.magasinNom} (id=${a.magasinId})`);
  }

  logger.log('assignMagasin', '--- Terminé. Les utilisateurs doivent se déconnecter/reconnecter pour mettre à jour le JWT.');
  await db.sequelize.close();
}

main().catch(err => {
  logger.error('assignMagasin', err.message);
  process.exit(1);
});
