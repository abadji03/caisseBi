/**
 * notification.scheduler.js
 * Planificateur de vérifications automatiques pour générer des notifications.
 *
 * Fréquences :
 *   - Stocks (ruptures, alertes, réappro, péremptions) : toutes les 2h
 *   - Bons en attente > 24h                           : toutes les 4h
 *   - Crédits clients impayés > 7j                    : 1x/jour à 08h00
 *   - Réconciliations en retard > 7j                  : 1x/jour à 09h00
 *   - Purge auto des notifications lues > 30j         : 1x/jour à 02h00
 */

const db         = require('../models');
const logger     = require('./logger.js');
const notifSvc   = require('./notification.service');
const { Op }     = require('sequelize');

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────
const JOURS_RETARD_CLIENT   = 7;   // jours sans paiement avant notification
const JOURS_RECONCILIATION  = 7;   // jours sans réconciliation avant notification
const HEURES_BON_ATTENTE    = 24;  // heures avant de signaler un bon en attente
const JOURS_PEREMPTION      = 7;   // jours avant péremption pour alerter

function msJusqua(heure, minutes = 0) {
  const maintenant = new Date();
  const cible = new Date();
  cible.setHours(heure, minutes, 0, 0);
  if (cible <= maintenant) cible.setDate(cible.getDate() + 1);
  return cible - maintenant;
}

function planifierQuotidien(heure, minutes, fn) {
  const delai = msJusqua(heure, minutes);
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, delai);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. VÉRIFICATION DES STOCKS
// ─────────────────────────────────────────────────────────────────────────────
async function verifierStocks() {
  try {
    if (!db.Notification) return;

    const structures = await db.Structure.findAll({ attributes: ['code_structure', 'id'] });

    for (const structure of structures) {
      const code_structure = structure.code_structure;

      const stocks = await db.Stock.findAll({
        where: { code_structure },
        include: [
          { model: db.Produit, attributes: ['id', 'designation', 'perissable'] },
          { model: db.Magasin, attributes: ['id', 'nom'] },
        ],
        raw: true,
        nest: true,
      });

      for (const stock of stocks) {
        const qte       = parseFloat(stock.quantiteTotale || 0);
        const seuil     = parseFloat(stock.seuilAlerte || 5);
        const seuilR    = parseFloat(stock.seuilReapprovisionnement || 10);
        const produit   = stock.Produit;
        const magasin   = stock.Magasin;

        if (!produit?.id) continue;

        if (qte <= 0) {
          await notifSvc.notifierRuptureStock(code_structure, produit, magasin);
        } else if (qte <= seuil) {
          await notifSvc.notifierAlerteStock(code_structure, produit, qte, seuil, magasin);
        } else if (qte <= seuilR) {
          await notifSvc.notifierReappro(code_structure, produit, qte, seuilR, magasin);
        }

        // Péremption imminente
        if (stock.datePeremption) {
          const jours = Math.ceil((new Date(stock.datePeremption) - new Date()) / 86400000);
          if (jours >= 0 && jours <= JOURS_PEREMPTION) {
            await notifSvc.notifierPeremption(
              code_structure, produit, stock.datePeremption, jours, magasin
            );
          }
        }
      }
    }

    logger.log('notification.scheduler', '✅ Vérification stocks terminée');
  } catch (error) {
    logger.error('notification.scheduler', '❌ verifierStocks:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BONS EN ATTENTE > 24h
// ─────────────────────────────────────────────────────────────────────────────
async function verifierBonsEnAttente() {
  try {
    if (!db.Notification) return;

    const seuil = new Date(Date.now() - HEURES_BON_ATTENTE * 3600000);

    const bons = await db.Bon.findAll({
      where: {
        statutBon: 'en_cours',
        createdAt: { [Op.lt]: seuil },
      },
      attributes: ['id', 'numero', 'type', 'code_structure', 'createdAt'],
    });

    for (const bon of bons) {
      await notifSvc.notifierBonEnAttente(bon.code_structure, bon);
    }

    if (bons.length > 0) {
      logger.log('notification.scheduler', `📋 ${bons.length} bon(s) en attente signalé(s)`);
    }
  } catch (error) {
    logger.error('notification.scheduler', '❌ verifierBonsEnAttente:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CRÉDITS CLIENTS IMPAYÉS
// ─────────────────────────────────────────────────────────────────────────────
async function verifierCreditsClients() {
  try {
    if (!db.Notification) return;

    const seuilDate = new Date(Date.now() - JOURS_RETARD_CLIENT * 86400000);

    // Chercher les bons livrés avec reste à payer > 0 et depuis > N jours
    const bons = await db.Bon.findAll({
      where: {
        statutBon: 'livré',
        resteAPayer: { [Op.gt]: 0 },
        updatedAt: { [Op.lt]: seuilDate },
      },
      include: [
        { model: db.Client, attributes: ['id', 'nomComplet', 'telephone'] },
      ],
      attributes: ['id', 'numero', 'resteAPayer', 'code_structure', 'updatedAt'],
    });

    for (const bon of bons) {
      if (!bon.Client) continue;
      const jours = Math.ceil((Date.now() - new Date(bon.updatedAt)) / 86400000);
      await notifSvc.notifierPaiementRetard(
        bon.code_structure,
        bon.Client,
        parseFloat(bon.resteAPayer),
        jours
      );
    }

    if (bons.length > 0) {
      logger.log('notification.scheduler', `💳 ${bons.length} crédit(s) en retard signalé(s)`);
    }
  } catch (error) {
    logger.error('notification.scheduler', '❌ verifierCreditsClients:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RÉCONCILIATIONS EN RETARD
// ─────────────────────────────────────────────────────────────────────────────
async function verifierReconciliations() {
  try {
    if (!db.Notification) return;

    const seuilDate = new Date(Date.now() - JOURS_RECONCILIATION * 86400000);

    const magasins = await db.Magasin.findAll({
      attributes: ['id', 'nom', 'code_structure'],
    });

    for (const magasin of magasins) {
      const derniereReconciliation = await db.Reconciliation.findOne({
        where: { magasinId: magasin.id },
        order: [['dateReconciliation', 'DESC']],
        attributes: ['dateReconciliation'],
      });

      const derniereDate = derniereReconciliation?.dateReconciliation;
      const jours = derniereDate
        ? Math.ceil((Date.now() - new Date(derniereDate)) / 86400000)
        : 999; // jamais réconcilié

      if (jours > JOURS_RECONCILIATION) {
        const derniereDateStr = derniereDate
          ? new Date(derniereDate).toLocaleDateString('fr-FR')
          : 'jamais';

        await notifSvc.notifierReconciliationAttente(
          magasin.code_structure,
          magasin,
          derniereDateStr,
          jours === 999 ? '> 7' : jours
        );
      }
    }

    logger.log('notification.scheduler', '🔄 Vérification réconciliations terminée');
  } catch (error) {
    logger.error('notification.scheduler', '❌ verifierReconciliations:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PURGE AUTOMATIQUE (notifications lues > 30j)
// ─────────────────────────────────────────────────────────────────────────────
async function purgerAnciennesNotifications() {
  try {
    if (!db.Notification) return;

    const seuil = new Date(Date.now() - 30 * 86400000);
    const nb = await db.Notification.destroy({
      where: { lu: true, luAt: { [Op.lt]: seuil } },
    });

    if (nb > 0) {
      logger.log('notification.scheduler', `🗑️  ${nb} notification(s) ancienne(s) supprimée(s)`);
    }
  } catch (error) {
    logger.error('notification.scheduler', '❌ purgerAnciennesNotifications:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DÉMARRAGE DU PLANIFICATEUR
// ─────────────────────────────────────────────────────────────────────────────
function demarrerPlanificateur() {
  logger.log('notification.scheduler', '🔔 Démarrage du planificateur de notifications');

  // Premier lancement après 10s (laisser le temps à Sequelize de se synchroniser)
  setTimeout(() => {
    verifierStocks();
    verifierBonsEnAttente();
  }, 10_000);

  // Stocks : toutes les 2h
  setInterval(verifierStocks, 2 * 60 * 60 * 1000);

  // Bons en attente : toutes les 4h
  setInterval(verifierBonsEnAttente, 4 * 60 * 60 * 1000);

  // Crédits clients : tous les jours à 08h00
  planifierQuotidien(8, 0, verifierCreditsClients);

  // Réconciliations : tous les jours à 09h00
  planifierQuotidien(9, 0, verifierReconciliations);

  // Purge : tous les jours à 02h00
  planifierQuotidien(2, 0, purgerAnciennesNotifications);
}

module.exports = { demarrerPlanificateur };
