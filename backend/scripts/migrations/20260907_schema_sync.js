// scripts/migrations/20260907_schema_sync.js
//
// Migration idempotente : synchronise la base avec les modèles Sequelize.
//  1. Ajoute les colonnes Paniers.remise_mode et Paniers.tva_mode si absentes
//     (le modèle les déclare NOT NULL — leur absence fait échouer TOUTE
//     écriture de panier avec "Champ 'Panier.remise_mode' inconnu").
//  2. Corrige les statuts 'EN_COURS' (casse) → 'en_cours', invisibles pour
//     toutes les requêtes qui filtrent sur 'en_cours'.
//
// Usage (depuis backend/) :
//   node scripts/migrations/20260907_schema_sync.js            -> AUDIT seul
//   node scripts/migrations/20260907_schema_sync.js --apply    -> applique

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
if (!process.env.DB_NAME) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const db = require('../../models');
const logger = require('../../services/logger');

const APPLY = process.argv.includes('--apply');

const TABLE = '`Panier`';

async function columnExists(tableName, columnName) {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );
  return rows.length > 0;
}

async function main() {
  await db.sequelize.authenticate();
  logger.log('schema_sync', 'Connexion DB OK. Mode: ' + (APPLY ? 'APPLY' : 'AUDIT'));

  // ── 1. Colonnes manquantes remise_mode / tva_mode ──
  const colonnes = [
    {
      nom: 'remise_mode',
      sql: `ALTER TABLE ${TABLE} ADD COLUMN \`remise_mode\` ENUM('article','globale') NOT NULL DEFAULT 'globale'`,
    },
    {
      nom: 'tva_mode',
      sql: `ALTER TABLE ${TABLE} ADD COLUMN \`tva_mode\` ENUM('article','globale') NOT NULL DEFAULT 'globale'`,
    },
  ];

  for (const col of colonnes) {
    const existe = await columnExists('Panier', col.nom);
    if (existe) {
      logger.log('schema_sync', `✔ Colonne Paniers.${col.nom} déjà présente`);
    } else if (APPLY) {
      await db.sequelize.query(col.sql);
      logger.log('schema_sync', `✅ Colonne Paniers.${col.nom} ajoutée`);
    } else {
      logger.warn('schema_sync', `Colonne Paniers.${col.nom} MANQUANTE (serait ajoutée en mode --apply)`);
    }
  }

  // ── 2. Backfill des statuts 'EN_COURS' ──
  const [paniersEnCoursMalCase] = await db.sequelize.query(
    `SELECT COUNT(*) AS n FROM ${TABLE} WHERE \`statut\` = 'EN_COURS'`
  );
  const nb = paniersEnCoursMalCase[0].n;

  if (nb === 0) {
    logger.log('schema_sync', '✔ Aucun statut "EN_COURS" à corriger');
  } else if (APPLY) {
    await db.sequelize.query(
      `UPDATE ${TABLE} SET \`statut\` = 'en_cours' WHERE \`statut\` = 'EN_COURS'`
    );
    logger.log('schema_sync', `✅ ${nb} panier(s) 'EN_COURS' → 'en_cours'`);
  } else {
    logger.warn('schema_sync', `${nb} panier(s) avec statut "EN_COURS" (seraient corrigés en mode --apply)`);
  }

  // ── 3. Colonne manquante Facture.agent_id ──
  // Utilisée par le filtre "Caissier/Employé -> uniquement ses ventes" de
  // getFactures (sinon : "Champ 'Facture.agentId' inconnu dans where clause").
  const existeAgent = await columnExists('Facture', 'agent_id');
  if (existeAgent) {
    logger.log('schema_sync', '✔ Colonne Facture.agent_id déjà présente');
  } else if (APPLY) {
    await db.sequelize.query(
      "ALTER TABLE `Facture` ADD COLUMN `agent_id` INT NULL AFTER `magasin_id`, ADD INDEX `facture_agent_id_idx` (`agent_id`)"
    );
    logger.log('schema_sync', '✅ Colonne Facture.agent_id ajoutée');
  } else {
    logger.warn('schema_sync', 'Colonne Facture.agent_id MANQUANTE (serait ajoutée en mode --apply)');
  }

  // ── 4. Backfill : agent_id depuis le bon lié ──
  const [aBackfiller] = await db.sequelize.query(
    'SELECT COUNT(*) AS n FROM `Facture` f JOIN `Bon` b ON f.`bon_id` = b.`id` WHERE f.`agent_id` IS NULL AND b.`agent_id` IS NOT NULL'
  );
  const nbFactures = aBackfiller[0].n;
  if (nbFactures === 0) {
    logger.log('schema_sync', '✔ Aucune facture sans agent à backfiller');
  } else if (APPLY) {
    await db.sequelize.query(
      'UPDATE `Facture` f JOIN `Bon` b ON f.`bon_id` = b.`id` SET f.`agent_id` = b.`agent_id` WHERE f.`agent_id` IS NULL AND b.`agent_id` IS NOT NULL'
    );
    logger.log('schema_sync', `✅ ${nbFactures} facture(s) backfillée(s) avec l'agent du bon lié`);
  } else {
    logger.warn('schema_sync', `${nbFactures} facture(s) sans agent (backfill en mode --apply)`);
  }

  if (!APPLY) {
    logger.log('schema_sync', '--- AUDIT SEUL. Relancez avec --apply pour appliquer.');
  } else {
    logger.log('schema_sync', '--- Migration terminée.');
  }
  await db.sequelize.close();
}

main().catch(err => {
  logger.error('schema_sync', err.message);
  process.exit(1);
});