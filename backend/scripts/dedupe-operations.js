// scripts/dedupe-operations.js
//
// Supprime les opérations dupliquées dans le modèle contable "Operation".
//
// Deux sources de doublons sont traitées :
//   1. Plusieurs opérations pour le même paiement (REGELEMENT / VERSEMENT) :
//      on garde la plus ancienne (id le plus petit).
//   2. Plusieurs opérations "bon" pour le même bon SANS paiement associé :
//      (paiementId IS NULL). Les opérations de paiement partagent légitimement
//      le bonId du bon (createFromPaiement copie bonId), elles sont donc exclues.
//
// Usage (depuis le dossier backend/) :
//   node scripts/dedupe-operations.js              → analyse (simulation, aucun changement)
//   node scripts/dedupe-operations.js --apply      → applique réellement la suppression
//
// À exécuter AVANT d'ajouter la contrainte unique (voir scripts/migrations/).
//
// La logique de détection (detecterDoublons) est une fonction pure, testée dans
// tests/dedupe-operations.test.js.

// Groupe les ids par valeur d'une colonne (ignore les null).
function grouper(rows, colonne) {
  const map = new Map();
  for (const row of rows) {
    const cle = row[colonne];
    if (cle == null) continue;
    if (!map.has(cle)) map.set(cle, []);
    map.get(cle).push(row.id);
  }
  return map;
}

/**
 * Détecte les opérations dupliquées. Retourne un ensemble d'ids à supprimer
 * (garde la plus ancienne → id le plus petit) et les compteurs par famille.
 * @param {{id:number, bonId?:number, paiementId?:number}[]} operations
 */
function detecterDoublons(operations) {
  const idsASupprimer = new Set();
  let doublonsPaiement = 0;
  let doublonsBon = 0;

  // 1) Une opération par paiement.
  const parPaiement = grouper(operations, 'paiementId');
  for (const ids of parPaiement.values()) {
    if (ids.length > 1) {
      doublonsPaiement += ids.length - 1;
      ids.slice(1).forEach((id) => idsASupprimer.add(id));
    }
  }

  // 2) Une opération "bon" par bon (hors opérations de paiement).
  const operationsBon = operations.filter((o) => o.paiementId == null && o.bonId != null);
  const parBon = grouper(operationsBon, 'bonId');
  for (const ids of parBon.values()) {
    if (ids.length > 1) {
      doublonsBon += ids.length - 1;
      ids.slice(1).forEach((id) => idsASupprimer.add(id));
    }
  }

  return { idsASupprimer, doublonsPaiement, doublonsBon };
}

async function main() {
  const path = require('path');
  const dotenv = require('dotenv');
  dotenv.config();
  if (!process.env.DB_NAME) {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  }
  const { Op } = require('sequelize');
  const db = require('../models');
  const APPLY = process.argv.includes('--apply');

  try {
    await db.sequelize.authenticate();
    console.log('🔌 Connecté à la base de données.');

    const operations = await db.Operation.findAll({
      attributes: ['id', 'code_structure', 'bonId', 'paiementId'],
      order: [['id', 'ASC']],
    });

    const { idsASupprimer, doublonsPaiement, doublonsBon } = detecterDoublons(operations);

    console.log(`\n📊 Analyse des opérations (${operations.length} au total).`);
    console.log(`   Doublons par paiement        : ${doublonsPaiement}`);
    console.log(`   Doublons d'opérations "bon"   : ${doublonsBon}`);
    console.log(`   Total à supprimer            : ${idsASupprimer.size}\n`);

    if (idsASupprimer.size === 0) {
      console.log('✅ Aucun doublon détecté.');
    } else if (!APPLY) {
      const idsArray = [...idsASupprimer].sort((a, b) => a - b);
      console.log(`   Ids à supprimer : ${idsArray.join(', ')}`);
      console.log(`\n⚠️ Mode simulation : rien n'a été modifié.`);
      console.log(`   Relancez avec --apply pour appliquer la suppression.`);
    } else {
      const tx = await db.sequelize.transaction();
      try {
        const deleted = await db.Operation.destroy({
          where: { id: { [Op.in]: [...idsASupprimer] } },
          transaction: tx,
        });
        await tx.commit();
        console.log(`✅ ${deleted} opération(s) dupliquée(s) supprimée(s).`);
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    }

    console.log(`\n💡 Étape suivante : une fois dédoublonné, appliquer la contrainte unique\n   (voir scripts/migrations/2026_add_operation_unique_constraints.sql).`);

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { grouper, detecterDoublons };