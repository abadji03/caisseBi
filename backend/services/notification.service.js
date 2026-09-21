/**
 * notification.service.js
 * Service centralisé pour la création et la gestion des notifications.
 * Utilisé par : planificateur, contrôleurs métier (stock, bon, transfert, etc.)
 */

const db = require('../models');
const logger = require('./logger.js');

// ─────────────────────────────────────────────
// Priorités par type
// ─────────────────────────────────────────────
const PRIORITE_PAR_TYPE = {
  STOCK_RUPTURE:          'critique',
  STOCK_ALERTE:           'critique',
  STOCK_REAPPRO:          'importante',
  STOCK_PEREMPTION:       'critique',
  BON_EN_ATTENTE:         'importante',
  PAIEMENT_RETARD:        'importante',
  RECONCILIATION_ATTENTE: 'importante',
  VENTE_IMPORTANTE:       'informative',
  OBJECTIF_ATTEINT:       'informative',
  RETOUR_MARCHANDISE:     'informative',
  UTILISATEUR_CREE:       'informative',
  CONNEXION_SUSPECTE:     'importante',
  TRANSFERT_RECU:         'informative',
  REMISE_EXCEPTIONNELLE:  'importante',
  IMPORT_TERMINE:         'informative',
  ERREUR_SYSTEME:         'critique',
};

// ─────────────────────────────────────────────
// Routes de navigation cibles
// ─────────────────────────────────────────────
const LIEN_PAR_TYPE = {
  STOCK_RUPTURE:          '/caisse-bi/stocks',
  STOCK_ALERTE:           '/caisse-bi/stocks',
  STOCK_REAPPRO:          '/caisse-bi/stocks',
  STOCK_PEREMPTION:       '/caisse-bi/stocks',
  BON_EN_ATTENTE:         '/caisse-bi/bons',
  PAIEMENT_RETARD:        '/caisse-bi/clients',
  RECONCILIATION_ATTENTE: '/caisse-bi/reconciliation',
  VENTE_IMPORTANTE:       '/caisse-bi/caisse',
  OBJECTIF_ATTEINT:       '/caisse-bi/rapports-ventes',
  RETOUR_MARCHANDISE:     '/caisse-bi/caisse',
  UTILISATEUR_CREE:       '/caisse-bi/utilisateurs',
  CONNEXION_SUSPECTE:     '/caisse-bi/utilisateurs',
  TRANSFERT_RECU:         '/caisse-bi/transferts',
  REMISE_EXCEPTIONNELLE:  '/caisse-bi/caisse',
  IMPORT_TERMINE:         '/caisse-bi/imports',
  ERREUR_SYSTEME:         '/caisse-bi/parametres',
};

/**
 * Crée une notification en base.
 * Évite les doublons sur une même entité + type dans la fenêtre donnée.
 *
 * @param {object} params
 * @param {string}  params.code_structure
 * @param {string}  params.type
 * @param {string}  params.titre
 * @param {string}  params.message
 * @param {number|null} [params.userId]       - null = tous admins/gérants
 * @param {string|null} [params.entiteType]
 * @param {number|null} [params.entiteId]
 * @param {object|null} [params.metadata]
 * @param {number}  [params.dedupFenetreHeures=4] - Fenêtre de déduplication en heures
 * @returns {Promise<Notification|null>}
 */
const creerNotification = async ({
  code_structure,
  type,
  titre,
  message,
  userId = null,
  entiteType = null,
  entiteId = null,
  metadata = null,
  dedupFenetreHeures = 4,
}) => {
  try {
    if (!db.Notification) {
      logger.warn('notification.service', 'Modèle Notification non chargé');
      return null;
    }

    // Déduplication : éviter le spam pour la même entité
    if (entiteId && entiteType) {
      const { Op } = db.Sequelize;
      const fenetreDebut = new Date(Date.now() - dedupFenetreHeures * 3600 * 1000);
      const existante = await db.Notification.findOne({
        where: {
          code_structure,
          type,
          entite_type: entiteType,
          entite_id: entiteId,
          lu: false,
          created_at: { [Op.gte]: fenetreDebut },
          ...(userId ? { user_id: userId } : { user_id: null }),
        },
      });
      if (existante) return null; // déjà notifié récemment
    }

    const notification = await db.Notification.create({
      code_structure,
      userId,
      type,
      priorite: PRIORITE_PAR_TYPE[type] || 'informative',
      titre,
      message,
      entiteType,
      entiteId,
      lienAction: LIEN_PAR_TYPE[type] || null,
      metadata,
      lu: false,
    });

    logger.log('notification.service', `✅ Notification créée [${type}] — ${titre}`);
    return notification;
  } catch (error) {
    logger.error('notification.service', '❌ Erreur création notification:', error.message);
    return null;
  }
};

/**
 * Raccourcis sémantiques pour les notifications les plus fréquentes
 */
const notifierRuptureStock = (code_structure, produit, magasin) =>
  creerNotification({
    code_structure,
    type: 'STOCK_RUPTURE',
    titre: `Rupture de stock — ${produit.designation}`,
    message: `Le produit "${produit.designation}" est en rupture de stock${magasin ? ` au magasin ${magasin.nom}` : ''}.`,
    entiteType: 'produit',
    entiteId: produit.id,
    metadata: { produitId: produit.id, magasinId: magasin?.id, quantite: 0 },
    dedupFenetreHeures: 12,
  });

const notifierAlerteStock = (code_structure, produit, quantite, seuil, magasin) =>
  creerNotification({
    code_structure,
    type: 'STOCK_ALERTE',
    titre: `Stock critique — ${produit.designation}`,
    message: `Stock de "${produit.designation}" : ${quantite} unité(s) restante(s)${magasin ? ` (magasin ${magasin.nom})` : ''}. Seuil d'alerte : ${seuil}.`,
    entiteType: 'produit',
    entiteId: produit.id,
    metadata: { produitId: produit.id, magasinId: magasin?.id, quantite, seuilAlerte: seuil },
    dedupFenetreHeures: 8,
  });

const notifierReappro = (code_structure, produit, quantite, seuil, magasin) =>
  creerNotification({
    code_structure,
    type: 'STOCK_REAPPRO',
    titre: `Réapprovisionnement recommandé — ${produit.designation}`,
    message: `Le stock de "${produit.designation}" (${quantite} unités) est en dessous du seuil de réapprovisionnement (${seuil})${magasin ? ` au magasin ${magasin.nom}` : ''}.`,
    entiteType: 'produit',
    entiteId: produit.id,
    metadata: { produitId: produit.id, magasinId: magasin?.id, quantite, seuilReappro: seuil },
    dedupFenetreHeures: 8,
  });

const notifierPeremption = (code_structure, produit, datePeremption, joursRestants, magasin) =>
  creerNotification({
    code_structure,
    type: 'STOCK_PEREMPTION',
    titre: `Péremption imminente — ${produit.designation}`,
    message: `Le produit "${produit.designation}" expire dans ${joursRestants} jour(s) (${new Date(datePeremption).toLocaleDateString('fr-FR')})${magasin ? ` — magasin ${magasin.nom}` : ''}.`,
    entiteType: 'produit',
    entiteId: produit.id,
    metadata: { produitId: produit.id, magasinId: magasin?.id, datePeremption, joursRestants },
    dedupFenetreHeures: 24,
  });

const notifierBonEnAttente = (code_structure, bon) =>
  creerNotification({
    code_structure,
    type: 'BON_EN_ATTENTE',
    titre: `Bon en attente de traitement — ${bon.numero}`,
    message: `Le bon ${bon.numero} est en attente depuis plus de 24h (créé le ${new Date(bon.createdAt).toLocaleDateString('fr-FR')}).`,
    entiteType: 'bon',
    entiteId: bon.id,
    metadata: { bonId: bon.id, numeroBon: bon.numero, type: bon.type },
    dedupFenetreHeures: 12,
  });

const notifierPaiementRetard = (code_structure, client, solde, jours) =>
  creerNotification({
    code_structure,
    type: 'PAIEMENT_RETARD',
    titre: `Crédit impayé — ${client.nomComplet}`,
    message: `Le client ${client.nomComplet} a un solde impayé de ${solde.toLocaleString('fr-FR')} F CFA depuis ${jours} jour(s).`,
    entiteType: 'client',
    entiteId: client.id,
    metadata: { clientId: client.id, solde, jours },
    dedupFenetreHeures: 24,
  });

const notifierReconciliationAttente = (code_structure, magasin, derniereDateStr, joursSans) =>
  creerNotification({
    code_structure,
    type: 'RECONCILIATION_ATTENTE',
    titre: `Réconciliation en retard — ${magasin.nom}`,
    message: `Aucune réconciliation depuis ${joursSans} jours pour le magasin ${magasin.nom} (dernière : ${derniereDateStr}).`,
    entiteType: 'magasin',
    entiteId: magasin.id,
    metadata: { magasinId: magasin.id, joursSans, derniereDate: derniereDateStr },
    dedupFenetreHeures: 24,
  });

const notifierVenteImportante = (code_structure, panier, montant, vendeur) =>
  creerNotification({
    code_structure,
    type: 'VENTE_IMPORTANTE',
    titre: `Vente exceptionnelle — ${montant.toLocaleString('fr-FR')} F CFA`,
    message: `Une vente de ${montant.toLocaleString('fr-FR')} F CFA a été enregistrée${vendeur ? ` par ${vendeur}` : ''}.`,
    entiteType: 'panier',
    entiteId: panier.id,
    metadata: { panierId: panier.id, montant, vendeur },
    dedupFenetreHeures: 1,
  });

const notifierRetourMarchandise = (code_structure, panier, nbArticles) =>
  creerNotification({
    code_structure,
    type: 'RETOUR_MARCHANDISE',
    titre: `Retour de marchandise — ${nbArticles} article(s)`,
    message: `Un retour de ${nbArticles} article(s) a été enregistré sur le bon ${panier.id}.`,
    entiteType: 'panier',
    entiteId: panier.id,
    metadata: { panierId: panier.id, nbArticles },
    dedupFenetreHeures: 1,
  });

const notifierUtilisateurCree = (code_structure, user, creePar) =>
  creerNotification({
    code_structure,
    type: 'UTILISATEUR_CREE',
    titre: `Nouvel utilisateur — ${user.nom}`,
    message: `Le compte de ${user.nom} (${user.email}) a été créé${creePar ? ` par ${creePar}` : ''}.`,
    entiteType: 'user',
    entiteId: user.id,
    metadata: { userId: user.id, nom: user.nom, email: user.email },
    dedupFenetreHeures: 1,
  });

const notifierTransfertRecu = (code_structure, transfert, magasinDestination, produit, quantite) =>
  creerNotification({
    code_structure,
    type: 'TRANSFERT_RECU',
    titre: `Transfert reçu — ${produit.designation}`,
    message: `${quantite} unité(s) de "${produit.designation}" reçue(s) au magasin ${magasinDestination.nom}.`,
    entiteType: 'transfert',
    entiteId: transfert.id,
    metadata: { transfertId: transfert.id, magasinId: magasinDestination.id, produitId: produit.id, quantite },
    dedupFenetreHeures: 1,
  });

const notifierRemiseExceptionnelle = (code_structure, bon, remisePct, vendeur) =>
  creerNotification({
    code_structure,
    type: 'REMISE_EXCEPTIONNELLE',
    titre: `Remise exceptionnelle — ${remisePct.toFixed(1)}%`,
    message: `Une remise de ${remisePct.toFixed(1)}% a été accordée sur le bon ${bon.numero}${vendeur ? ` par ${vendeur}` : ''}.`,
    entiteType: 'bon',
    entiteId: bon.id,
    metadata: { bonId: bon.id, remisePct, vendeur },
    dedupFenetreHeures: 1,
  });

const notifierImportTermine = (code_structure, userId, type, nbCreated, nbUpdated, nbErrors) =>
  creerNotification({
    code_structure,
    type: 'IMPORT_TERMINE',
    titre: `Import ${type} terminé`,
    message: `Import terminé : ${nbCreated} créés, ${nbUpdated} mis à jour, ${nbErrors} erreur(s).`,
    userId,
    entiteType: 'import',
    entiteId: null,
    metadata: { type, nbCreated, nbUpdated, nbErrors },
    dedupFenetreHeures: 0.5,
  });

const notifierConnexionSuspecte = (code_structure, email, nbTentatives, ip) =>
  creerNotification({
    code_structure,
    type: 'CONNEXION_SUSPECTE',
    titre: `Tentatives de connexion suspectes`,
    message: `${nbTentatives} tentatives de connexion échouées sur le compte ${email} depuis ${ip}.`,
    entiteType: 'user',
    entiteId: null,
    metadata: { email, nbTentatives, ip },
    dedupFenetreHeures: 2,
  });

module.exports = {
  creerNotification,
  notifierRuptureStock,
  notifierAlerteStock,
  notifierReappro,
  notifierPeremption,
  notifierBonEnAttente,
  notifierPaiementRetard,
  notifierReconciliationAttente,
  notifierVenteImportante,
  notifierRetourMarchandise,
  notifierUtilisateurCree,
  notifierTransfertRecu,
  notifierRemiseExceptionnelle,
  notifierImportTermine,
  notifierConnexionSuspecte,
};
