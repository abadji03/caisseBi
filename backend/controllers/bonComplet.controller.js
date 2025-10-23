/* // controllers/bonCompletController.js
const db = require('../models');
//const { Op } = require('sequelize');

exports.createBonComplet = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      bon,
      panier,
      articles,
      paiement,
      code_structure,
      magasinId,
      agentId,
      fournisseurId
    } = req.body;

    // Validation des données requises
    if (!bon || !panier || !articles || !code_structure || !magasinId || !agentId) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Données incomplètes: bon, panier, articles, code_structure, magasinId et agentId sont requis' 
      });
    }

    if (!Array.isArray(articles) || articles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Le panier doit contenir au moins un article' });
    }

    // 1. CRÉER LE BON
    const nouveauBon = await db.Bon.create({
      ...bon,
      code_structure,
      magasinId,
      agentId,
      fournisseurId: fournisseurId || bon.fournisseurId
    }, { transaction });

    // 2. CRÉER LE PANIER
    const nouveauPanier = await db.Panier.create({
      ...panier,
      bonId: nouveauBon.id,
      code_structure,
      magasinId,
      agentId,
      clientId: panier.clientId || null,
      fournisseurId: fournisseurId || panier.fournisseurId
    }, { transaction });

    // 3. CRÉER LES ARTICLES DU PANIER
    const articlesAvecRelations = articles.map(article => ({
      ...article,
      panierId: nouveauPanier.id,
      code_structure,
      produitId: article.produitId || article.produit?.id
    }));

    const articlesCrees = await db.ArticlePanier.bulkCreate(
      articlesAvecRelations,
      { transaction, returning: true }
    );

    // 4. GÉRER LES MOUVEMENTS DE STOCK ET MAJ DES STOCKS
    await Promise.all(articles.map(async (article) => {
      await traiterMouvementStock(
        article,
        nouveauBon,
        magasinId,
        agentId,
        code_structure,
        transaction
      );
    }));

    // 5. CRÉER LE PAIEMENT SI AVANCE > 0
    let paiementCree = null;
    if (paiement && nouveauBon.avance > 0) {
      paiementCree = await db.Paiement.create({
        ...paiement,
        montant: nouveauBon.avance,
        bonId: nouveauBon.id,
        panierId: nouveauPanier.id,
        fournisseurId: fournisseurId || paiement.fournisseurId,
        code_structure,
        magasinId,
        date: new Date()
      }, { transaction });
    }

    // 6. VALIDER LA TRANSACTION
    await transaction.commit();

    // 7. RÉPONSE AVEC TOUTES LES DONNÉES CRÉÉES
    res.status(201).json({
      message: 'Bon créé avec succès',
      bon: nouveauBon,
      panier: nouveauPanier,
      articles: articlesCrees,
      paiement: paiementCree
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur création bon complet:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du bon',
      details: error.message 
    });
  }
};

// Fonction helper pour gérer les mouvements de stock
async function traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction) {
  const typeMouvement = bon.type === 'retour' ? 'Entree' : 'Sortie';
  
  // Trouver ou créer le stock
  let stock = await db.Stock.findOne({
    where: { 
      produitId: article.produitId || article.produit?.id,
      magasinId,
      code_structure 
    },
    transaction
  });

  if (!stock) {
    stock = await db.Stock.create({
      produitId: article.produitId || article.produit?.id,
      magasinId,
      code_structure,
      quantiteTotale: 0,
      quantiteReservee: 0,
      seuilAlerte: 5,
      seuilReapprovisionnement: 10,
      stockSecurite: 5,
      statutStock: 'Nouveau',
      dateDerniereMiseAJour: new Date()
    }, { transaction });
  }

  // Calculer la nouvelle quantité
  const ancienneQuantite = stock.quantiteTotale;
  let nouvelleQuantite = ancienneQuantite;
  
  if (typeMouvement === 'Entree') {
    nouvelleQuantite += article.quantite;
  } else {
    nouvelleQuantite = Math.max(0, ancienneQuantite - article.quantite);
  }

  // Mettre à jour le stock
  await stock.update({
    quantiteTotale: nouvelleQuantite,
    dateDerniereMiseAJour: new Date(),
    statutStock: calculerStatutStock(nouvelleQuantite, stock)
  }, { transaction });

  // Créer le mouvement de stock
  await db.MouvementStock.create({
    ref: `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    produitId: article.produitId || article.produit?.id,
    magasinId,
    stockId: stock.id,
    typeMouvement,
    quantite: article.quantite,
    prixUnitaire: article.prixVenteUnitaire,
    acteurId: agentId,
    description: `Mouvement ${typeMouvement} - Bon ${bon.numero}`,
    motif: bon.type,
    dateMouvement: new Date(),
    code_structure
  }, { transaction });
}

function calculerStatutStock(quantite, stock) {
  if (quantite === 0) return 'Rupture';
  if (quantite <= stock.seuilAlerte) return 'Critique';
  if (quantite <= stock.seuilReapprovisionnement) return 'À réapprovisionner';
  return 'En stock';
} */

// controllers/bonCompletController.js
/* const db = require('../models');
//const { Op } = require('sequelize');
const {
  stockManager,
  reservationService,
  mouvementService,
  statutManager
} = require('./bonComplet');


exports.createBonComplet = async (req, res) => {

  console.log('=== DEBUG DONNÉES REÇUES ===');
  console.log('Headers:', req.headers['content-type']);
  console.log('Body complet:', JSON.stringify(req.body, null, 2));

   // Vérification détaillée de chaque champ
  const champs = ['bon', 'panier', 'articles', 'code_structure', 'magasinId', 'agentId', 'typeEntite'];
  champs.forEach(champ => {
    console.log(`${champ}:`, req.body[champ] ? 'PRÉSENT' : 'MANQUANT');
  });
  
  console.log('Articles est array?:', Array.isArray(req.body.articles));
  console.log('Nombre articles:', req.body.articles?.length);
  console.log('================================');
  
  const transaction = await db.sequelize.transaction();
  
  try {
    const {
      bon,
      panier,
      articles,
      paiement,
      code_structure,
      magasinId,
      agentId,
      fournisseurId,
      clientId,
      typeEntite // 'client' ou 'fournisseur'
    } = req.body;

    // Validation des données requises
    if (!bon || !panier || !articles || !code_structure || !magasinId || !agentId || !typeEntite) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Données incomplètes: bon, panier, articles, code_structure, magasinId, agentId et typeEntite sont requis' 
      });
    }

    if (!Array.isArray(articles) || articles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Le panier doit contenir au moins un article' });
    }

    // Validation de la cohérence des IDs
    if (typeEntite === 'client' && !clientId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'clientId est requis pour un bon client' });
    }

    if (typeEntite === 'fournisseur' && !fournisseurId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'fournisseurId est requis pour un bon fournisseur' });
    }

    // VÉRIFICATION DISPONIBILITÉ STOCK AVANT TOUTE OPÉRATION
    await verifierDisponibiliteStock(articles, magasinId, code_structure, bon.type, typeEntite, transaction);

    // 1. CRÉER LE BON AVEC LOGIQUE MÉTIER
    const bonData = await preparerDonneesBon(bon, typeEntite, clientId, fournisseurId);
    
    const nouveauBon = await db.Bon.create({
      ...bonData,
      code_structure,
      magasinId,
      agentId,
      clientId: typeEntite === 'client' ? clientId : null,
      fournisseurId: typeEntite === 'fournisseur' ? fournisseurId : null,
      typeEntite: typeEntite
    }, { transaction });

    // 2. CRÉER LE PANIER
    const nouveauPanier = await db.Panier.create({
      ...panier,
      bonId: nouveauBon.id,
      code_structure,
      magasinId,
      agentId,
      clientId: typeEntite === 'client' ? clientId : null,
      fournisseurId: typeEntite === 'fournisseur' ? fournisseurId : null,
      //typeEntite: typeEntite,
      statut: 'VALIDE' // Synchroniser le statut
    }, { transaction });

    // 3. CRÉER LES ARTICLES DU PANIER
    const articlesAvecRelations = articles.map(article => ({
      ...article,
      panierId: nouveauPanier.id,
      code_structure,
      produitId: article.produitId || article.produit?.id,
      //statut: 'actif'
    }));

    const articlesCrees = await db.ArticlePanier.bulkCreate(
      articlesAvecRelations,
      { transaction, returning: true }
    );

    // 4. GESTION DES RÉSERVATIONS DE STOCK SELON LE STATUT
    await gererReservationsStock(
      articles, 
      nouveauBon, 
      magasinId, 
      agentId, 
      code_structure, 
      transaction
    );

    // 5. GÉRER LES MOUVEMENTS DE STOCK AVEC LOGIQUE MÉTIER
    await Promise.all(articles.map(async (article) => {
      await traiterMouvementStock(
        article,
        nouveauBon,
        magasinId,
        agentId,
        code_structure,
        transaction
      );
    }));

    // 6. CRÉER LE PAIEMENT SI AVANCE > 0
    let paiementCree = null;
    if (paiement && nouveauBon.avance > 0) {
      paiementCree = await db.Paiement.create({
        ...paiement,
        montant: nouveauBon.avance,
        bonId: nouveauBon.id,
        panierId: nouveauPanier.id,
        clientId: typeEntite === 'client' ? clientId : null,
        fournisseurId: typeEntite === 'fournisseur' ? fournisseurId : null,
        code_structure,
        magasinId,
        typeEntite: typeEntite,
        date: new Date(),
        statut: 'complet'
      }, { transaction });
    }

    // 7. METTRE À JOUR LE CLIENT OU FOURNISSEUR (SOLDE, MONTANTS, etc.)
    await mettreAJourEntite(nouveauBon, typeEntite, clientId, fournisseurId, transaction);

    // 8. GÉRER LES AVOIRS POUR LES RETOURS CLIENTS
    if (typeEntite === 'client' && nouveauBon.type === 'retour') {
      await creerAvoirClient(nouveauBon, clientId, code_structure, transaction);
    }
 */
    // 9. CRÉER UN HISTORIQUE DE STATUT
    /* await db.HistoriqueStatutBon.create({
      bonId: nouveauBon.id,
      ancienStatut: 'création',
      nouveauStatut: nouveauBon.statutBon,
      agentId: agentId,
      commentaire: 'Création du bon',
      dateChangement: new Date()
    }, { transaction }); */

    // 10. VALIDER LA TRANSACTION
    //await transaction.commit();

    // 11. RÉPONSE AVEC TOUTES LES DONNÉES CRÉÉES
    /* res.status(201).json({
      message: 'Bon créé avec succès',
      bon: nouveauBon,
      panier: nouveauPanier,
      articles: articlesCrees,
      paiement: paiementCree,
      typeEntite: typeEntite,
      quantiteDisponible: await getQuantitesDisponibles(articles, magasinId, code_structure)
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur création bon complet:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du bon',
      details: error.message 
    });
  }
};

// FONCTION POUR VÉRIFIER LA DISPONIBILITÉ DU STOCK
async function verifierDisponibiliteStock(articles, magasinId, code_structure, typeBon, typeEntite, transaction) {
  for (const article of articles) {
    const stock = await db.Stock.findOne({
      where: { 
        produitId: article.produitId || article.produit?.id,
        magasinId,
        code_structure 
      },
      transaction
    });

    if (!stock && (typeBon === 'commande' && typeEntite === 'client')) {
      throw new Error(`Stock indisponible pour le produit ID: ${article.produitId}`);
    }

    if (stock) {
      const quantiteDisponible = stock.quantiteTotale - stock.quantiteReservee;
      
      // Pour les commandes clients, vérifier le stock disponible
      if (typeBon === 'commande' && typeEntite === 'client' && quantiteDisponible < article.quantite) {
        throw new Error(`Stock insuffisant pour le produit. Disponible: ${quantiteDisponible}, Demandé: ${article.quantite}`);
      }
    }
  } 
}*/

// FONCTION POUR GÉRER LES RÉSERVATIONS DE STOCK
/* async function gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction) {
  const statutsAvecReservation = ['commandé', 'en_preparation', 'a_livrer'];
  const statutsAvecLiberation = ['annulé', 'refusé', 'retourné'];
  const statutsAvecRealisation = ['livré', 'termine', 'payé'];

  // RÉSERVER LE STOCK POUR LES COMMANDES EN ATTENTE
  if (statutsAvecReservation.includes(bon.statutBon) && bon.typeEntite === 'client') {
    for (const article of articles) {
      await reserverStock(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        'réservation_commande',
        transaction
      );
    }
  }

  // LIBÉRER LE STOCK POUR LES COMMANDES ANNULEES
  if (statutsAvecLiberation.includes(bon.statutBon)) {
    for (const article of articles) {
      await libererStockReserve(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `annulation_${bon.statutBon}`,
        transaction
      );
    }
  }

  // RÉALISER LES MOUVEMENTS POUR LES COMMANDES TERMINÉES
  if (statutsAvecRealisation.includes(bon.statutBon)) {
    for (const article of articles) {
      await realiserMouvementStock(
        article,
        bon,
        magasinId,
        code_structure,
        transaction
      );
    }
  }
} */

/* // FONCTION POUR GÉRER LES RÉSERVATIONS DE STOCK AVEC VOS STATUTS
async function gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction) {
  // STATUTS AVEC RÉSERVATION DE STOCK (commandes en attente)
  const statutsAvecReservation = ['commandé', 'expédié'];
  
  // STATUTS AVEC LIBÉRATION DE STOCK (annulations/retours)
  //const statutsAvecLiberation = ['annulé', 'retourné'];
  
  // STATUTS AVEC MOUVEMENT PHYSIQUE (livraisons réalisées)
  const statutsAvecRealisation = ['livré', 'validé', 'facturé', 'payé'];
  
  // STATUTS INTERMÉDIAIRES (pas d'action sur le stock)
  const statutsIntermediaires = ['brouillon'];

  console.log(`📦 Gestion réservations - Statut: ${bon.statutBon}, Type: ${bon.typeEntite}`);

  // 1. RÉSERVER LE STOCK POUR LES COMMANDES CLIENTS EN ATTENTE
  if (statutsAvecReservation.includes(bon.statutBon) && bon.typeEntite === 'client') {
    console.log('🔒 Réservation de stock pour commande client...');
    for (const article of articles) {
      await reserverStock(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `réservation_${bon.statutBon}`,
        transaction
      );
    }
  }

  // 2. RÉSERVER LE STOCK POUR LES COMMANDES FOURNISSEURS (préparation réception)
  if (statutsAvecReservation.includes(bon.statutBon) && bon.typeEntite === 'fournisseur' && bon.type === 'commande') {
    console.log('🔒 Pré-réservation pour réception fournisseur...');
    for (const article of articles) {
      await reserverStock(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `préparation_réception_${bon.statutBon}`,
        transaction
      );
    }
  }

  // 3. LIBÉRER LE STOCK POUR LES ANNULLATIONS
  if (bon.statutBon === 'annulé') {
    console.log('🔄 Libération stock pour annulation...');
    for (const article of articles) {
      await libererStockReserve(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        'annulation_commande',
        transaction
      );
    }
  }

  // 4. TRAITEMENT DES RETOURS (libération + mouvement entrée)
  if (bon.statutBon === 'retourné') {
    console.log('🔄 Traitement retour...');
    for (const article of articles) {
      // Libérer la réservation si existante
      await libererStockReserve(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        'retour_client',
        transaction
      );
      
      // Pour les retours clients = entrée en stock
      if (bon.typeEntite === 'client') {
        await realiserMouvementStock(
          article,
          bon,
          magasinId,
          code_structure,
          transaction
        );
      }
    }
  }

  // 5. RÉALISER LES MOUVEMENTS PHYSIQUES POUR LES LIVRAISONS TERMINÉES
  if (statutsAvecRealisation.includes(bon.statutBon)) {
    console.log('🚚 Réalisation mouvement physique...');
    
    // Libérer d'abord les réservations
    if (bon.typeEntite === 'client') {
      for (const article of articles) {
        await libererStockReserve(
          article.produitId || article.produit?.id,
          article.quantite,
          magasinId,
          code_structure,
          bon.id,
          `réalisation_${bon.statutBon}`,
          transaction
        );
      }
    }
    
    // Puis effectuer les mouvements physiques
    for (const article of articles) {
      await realiserMouvementStock(
        article,
        bon,
        magasinId,
        code_structure,
        transaction
      );
    }
  }

  // 6. STATUTS INTERMÉDIAIRES - AUCUNE ACTION SUR LE STOCK
  if (statutsIntermediaires.includes(bon.statutBon)) {
    console.log('⏸️ Statut intermédiaire - Aucune action stock');
    return; // Pas d'action sur le stock pour les brouillons
  }

  console.log('✅ Gestion réservations terminée');
}

// FONCTION POUR DÉTERMINER LE TYPE DE MOUVEMENT (AMÉLIORÉE)
function determinerTypeMouvement(bon) {
  const matriceMouvements = {
    // COMMANDES CLIENTS = SORTIES
    'commande-client': 'Sortie',
    'expédié-client': 'Sortie', 
    'livré-client': 'Sortie',
    'validé-client': 'Sortie',
    'facturé-client': 'Sortie',
    'payé-client': 'Sortie',
    
    // COMMANDES FOURNISSEURS = ENTREES (réception)
    'commande-fournisseur': 'Entree',
    'expédié-fournisseur': 'Entree',
    'livré-fournisseur': 'Entree', 
    'validé-fournisseur': 'Entree',
    
    // RETOURS CLIENTS = ENTREES (retour au stock)
    'retourné-client': 'Entree',
    
    // RETOURS FOURNISSEURS = SORTIES (retour au fournisseur)
    'retourné-fournisseur': 'Sortie'
  };

  const cle = `${bon.type}-${bon.typeEntite}`;
  const cleStatut = `${bon.statutBon}-${bon.typeEntite}`;
  
  // Priorité au statut spécifique, sinon au type général
  return matriceMouvements[cleStatut] || matriceMouvements[cle] || 'Sortie';
}

// FONCTION POUR GÉRER LES TRANSITIONS DE STATUT (MISE À JOUR)
async function gererTransitionStatut(bon, ancienStatut, nouveauStatut, agentId, transaction) {
  const transitions = {
    // TRANSITIONS CLIENTS
    'brouillon→commandé': async () => await reserverStockPourBon(bon, transaction),
    'commandé→expédié': async () => await loggerTransition(bon, 'Expédition en cours', transaction),
    'expédié→livré': async () => await realiserLivraison(bon, transaction),
    'livré→validé': async () => await validerReception(bon, transaction),
    'validé→facturé': async () => await facturerBon(bon, transaction),
    'facturé→payé': async () => await enregistrerPaiement(bon, transaction),
    
    // ANNULATIONS
    'brouillon→annulé': async () => await loggerAnnulation(bon, 'Annulation brouillon', transaction),
    'commandé→annulé': async () => await libererStockPourBon(bon, 'annulation_avancée', transaction),
    'expédié→annulé': async () => await traiterAnnulationExpedie(bon, transaction),
    
    // RETOURS
    'livré→retourné': async () => await traiterRetour(bon, transaction),
    'validé→retourné': async () => await traiterRetour(bon, transaction),
    
    // TRANSITIONS FOURNISSEURS
    'brouillonf→commandé': async () => await preparerReceptionFournisseur(bon, transaction),
    'commandéf→expédié': async () => await loggerTransition(bon, 'Fournisseur a expédié', transaction),
    'expédiéf→livré': async () => await recevoirMarchandise(bon, transaction),
    'livréf→validé': async () => await validerReceptionFournisseur(bon, transaction)
  };

  const transitionCle = `${ancienStatut}→${nouveauStatut}`;
  if (transitions[transitionCle]) {
    console.log(`🔄 Transition: ${transitionCle}`);
    await transitions[transitionCle]();
  } else {
    console.log(`ℹ️ Transition non gérée: ${transitionCle}`);
  }
}

// FONCTIONS HELPERS POUR LES TRANSITIONS
async function loggerTransition(bon, message, transaction) {
  console.log(`📝 ${message} - Bon ${bon.numero}`);
  console.log(transaction);
  // Loguer dans l'historique sans action stock
}

async function loggerAnnulation(bon, motif, transaction) {
  console.log(`❌ Annulation: ${motif} - Bon ${bon.numero}`);
  console.log(transaction);
  // Loguer l'annulation
}

async function realiserLivraison(bon, transaction) {
  console.log(`🚚 Livraison réalisée pour ${bon.numero}`);
  await libererStockPourBon(bon, 'livraison', transaction);
  // Mouvements physiques déjà gérés par realiserMouvementStock
}

async function validerReception(bon, transaction) {
  console.log(`✅ Réception validée pour ${bon.numero}`);
  console.log(transaction);
  // Ajustements finaux après validation
}

async function facturerBon(bon, transaction) {
  console.log(`🧾 Bon facturé: ${bon.numero}`);
  console.log(transaction);
  // Logique de facturation
}

async function enregistrerPaiement(bon, transaction) {
  console.log(`💰 Paiement enregistré: ${bon.numero}`);
  console.log(transaction);
  // Clôture de la transaction
}

async function preparerReceptionFournisseur(bon, transaction) {
  console.log(`📦 Préparation réception fournisseur: ${bon.numero}`);
  console.log(transaction);
  // Pré-réserver l'espace pour la réception
}

async function recevoirMarchandise(bon, transaction) {
  console.log(`📬 Marchandise reçue: ${bon.numero}`);
  console.log(transaction);
  // Réception physique
}

async function validerReceptionFournisseur(bon, transaction) {
  console.log(`✅ Réception fournisseur validée: ${bon.numero}`);
  console.log(transaction);
  // Validation qualité, etc.
}

async function traiterAnnulationExpedie(bon, transaction) {
  console.log(`⚠️ Annulation après expédition: ${bon.numero}`);
  // Logique complexe d'annulation post-expédition
  await libererStockPourBon(bon, 'annulation_apres_expedition', transaction);
}

// FONCTION POUR RÉSERVER DU STOCK
async function reserverStock(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
  const stock = await db.Stock.findOne({
    where: { produitId, magasinId, code_structure },
    transaction
  });

  if (stock) {
    const nouvelleReserve = (stock.quantiteReservee || 0) + quantite;
    
    // Vérifier que la réservation ne dépasse pas le stock disponible
    if (nouvelleReserve > stock.quantiteTotale) {
      throw new Error(`Réservation impossible: stock insuffisant pour le produit ${produitId}`);
    }

    await stock.update({
      quantiteReservee: nouvelleReserve,
      dateDerniereMiseAJour: new Date()
    }, { transaction });

    // Créer un enregistrement de réservation
    await db.ReservationStock.create({
      produitId,
      magasinId,
      quantiteReservee: quantite,
      quantiteLiberee: 0,
      bonId,
      motif,
      dateReservation: new Date(),
      statut: 'reserve',
      code_structure
    }, { transaction });
  }
}

// FONCTION POUR LIBÉRER LE STOCK RÉSERVÉ
async function libererStockReserve(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
  const stock = await db.Stock.findOne({
    where: { produitId, magasinId, code_structure },
    transaction
  });

  if (stock && stock.quantiteReservee >= quantite) {
    await stock.update({
      quantiteReservee: Math.max(0, stock.quantiteReservee - quantite),
      dateDerniereMiseAJour: new Date()
    }, { transaction });

    // Mettre à jour la réservation
    const reservation = await db.ReservationStock.findOne({
      where: { produitId, magasinId, bonId, statut: 'reserve' },
      transaction
    });

    if (reservation) {
      await reservation.update({
        quantiteLiberee: quantite,
        statut: 'libere',
        dateLiberation: new Date(),
        motifLiberation: motif
      }, { transaction });
    }
  }
}

// FONCTION AMÉLIORÉE POUR LES MOUVEMENTS DE STOCK
async function traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction) {
  const typeMouvement = determinerTypeMouvement(bon);
  
  const stock = await trouverOuCreerStock(
    article.produitId || article.produit?.id,
    magasinId,
    code_structure,
    transaction
  );

  // Ne traiter le mouvement que pour les statuts terminaux
  const statutsAvecMouvement = ['livré', 'termine', 'payé', 'retourné'];
  if (!statutsAvecMouvement.includes(bon.statutBon)) {
    return; // Pas de mouvement physique pour les statuts intermédiaires
  }

  await executerMouvementPhysique(article, stock, typeMouvement, bon, agentId, code_structure, transaction);
} */

// FONCTION POUR DÉTERMINER LE TYPE DE MOUVEMENT
/* function determinerTypeMouvement(bon) {
  const matriceMouvements = {
    'commande-client': 'Sortie',
    'commande-fournisseur': 'Entree',
    'livraison-client': 'Sortie', 
    'livraison-fournisseur': 'Entree',
    'retour-client': 'Entree',
    'retour-fournisseur': 'Sortie'
  }; 

  const cle = `${bon.type}-${bon.typeEntite}`;
  return matriceMouvements[cle] || 'Sortie';
}*/

// FONCTION POUR TROUVER OU CRÉER UN STOCK
/* async function trouverOuCreerStock(produitId, magasinId, code_structure, transaction) {
  let stock = await db.Stock.findOne({
    where: { produitId, magasinId, code_structure },
    transaction
  });

  if (!stock) {
    stock = await db.Stock.create({
      produitId,
      magasinId,
      code_structure,
      quantiteTotale: 0,
      quantiteReservee: 0,
      seuilAlerte: 5,
      seuilReapprovisionnement: 10,
      stockSecurite: 5,
      statutStock: 'Nouveau',
      dateDerniereMiseAJour: new Date()
    }, { transaction });
  }

  return stock;
}

// FONCTION POUR EXÉCUTER LE MOUVEMENT PHYSIQUE
async function executerMouvementPhysique(article, stock, typeMouvement, bon, agentId, code_structure, transaction) {
  const ancienneQuantite = stock.quantiteTotale;
  let nouvelleQuantite = ancienneQuantite;
  
  if (typeMouvement === 'Entree') {
    nouvelleQuantite += article.quantite;
  } else {
    // Pour les sorties, vérifier le stock disponible (hors réservations)
    const stockDisponible = ancienneQuantite - stock.quantiteReservee;
    if (stockDisponible < article.quantite) {
      throw new Error(`Stock physique insuffisant. Disponible: ${stockDisponible}, Demandé: ${article.quantite}`);
    }
    nouvelleQuantite = Math.max(0, ancienneQuantite - article.quantite);
  }

  await stock.update({
    quantiteTotale: nouvelleQuantite,
    dateDerniereMiseAJour: new Date(),
    statutStock: calculerStatutStock(nouvelleQuantite, stock),
    dernierPrixAchat: article.prixAchatUnitaire || stock.dernierPrixAchat,
    prixVenteUnitaire: article.prixVenteUnitaire || stock.prixVenteUnitaire
  }, { transaction });

  // Créer le mouvement de stock
  await db.MouvementStock.create({
    ref: `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    produitId: article.produitId || article.produit?.id,
    // eslint-disable-next-line no-undef
    magasinId,
    stockId: stock.id,
    typeMouvement,
    quantite: article.quantite,
    prixUnitaire: article.prixVenteUnitaire,
    acteurId: agentId,
    description: genererDescriptionMouvement(bon, article, typeMouvement),
    motif: `${bon.type} - ${bon.typeEntite} - ${bon.statutBon}`,
    dateMouvement: new Date(),
    code_structure,
    bonId: bon.id
  }, { transaction });
}

// FONCTION POUR CALCULER LES QUANTITÉS DISPONIBLES
async function getQuantitesDisponibles(articles, magasinId, code_structure) {
  const disponibilites = [];
  
  for (const article of articles) {
    const stock = await db.Stock.findOne({
      where: { 
        produitId: article.produitId || article.produit?.id,
        magasinId,
        code_structure 
      }
    });

    if (stock) {
      disponibilites.push({
        produitId: article.produitId || article.produit?.id,
        quantiteTotale: stock.quantiteTotale,
        quantiteReservee: stock.quantiteReservee,
        quantiteDisponible: stock.quantiteTotale - stock.quantiteReservee,
        statutStock: stock.statutStock
      });
    }
  }

  return disponibilites;
}

// FONCTION POUR METTRE À JOUR LE STATUT D'UN BON (EXPORTÉE POUR USAGE EXTERNE)
exports.changerStatutBon = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { bonId, nouveauStatut, agentId, commentaire } = req.body;
    
    const bon = await db.Bon.findByPk(bonId, { 
      include: [{
        model: db.ArticlePanier,
        as: 'Articles'
      }],
      transaction 
    });

    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Bon non trouvé' });
    }

    const ancienStatut = bon.statutBon;

    // Gérer les transitions de statut
    await gererTransitionStatut(bon, ancienStatut, nouveauStatut, agentId, transaction);

    // Mettre à jour le statut du bon
    await bon.update({ statutBon: nouveauStatut }, { transaction });

    // Créer un historique
    await db.HistoriqueStatutBon.create({
      bonId: bon.id,
      ancienStatut,
      nouveauStatut,
      agentId,
      commentaire: commentaire || `Changement de statut: ${ancienStatut} → ${nouveauStatut}`,
      dateChangement: new Date()
    }, { transaction });

    await transaction.commit();

    res.json({ 
      message: 'Statut mis à jour avec succès',
      bon: await db.Bon.findByPk(bonId, {
        include: ['Articles', 'HistoriqueStatuts']
      })
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};
 */
// FONCTION POUR GÉRER LES TRANSITIONS DE STATUT
/* async function gererTransitionStatut(bon, ancienStatut, nouveauStatut, agentId, transaction) {
  // Logique spécifique selon la transition
  const transitions = {
    'brouillon→commandé': async () => await reserverStockPourBon(bon, transaction),
    'commandé→annulé': async () => await libererStockPourBon(bon, 'annulation', transaction),
    'commandé→livré': async () => await realiserLivraison(bon, transaction),
    'livré→retourné': async () => await traiterRetour(bon, transaction)
  };

  const transitionCle = `${ancienStatut}→${nouveauStatut}`;
  if (transitions[transitionCle]) {
    await transitions[transitionCle]();
  }
}
 */
// FONCTION POUR GÉNÉRER UNE DESCRIPTION DÉTAILLÉE DES MOUVEMENTS
/* function genererDescriptionMouvement(bon, article, typeMouvement) {
  const actions = {
    'commande-client': 'Commande client',
    'commande-fournisseur': 'Réception commande fournisseur',
    'livraison-client': 'Livraison vers client',
    'livraison-fournisseur': 'Livraison fournisseur',
    'retour-client': 'Retour client',
    'retour-fournisseur': 'Retour fournisseur'
  };

  const cle = `${bon.type}-${bon.typeEntite}`;
  const action = actions[cle] || `Mouvement ${typeMouvement}`;
  
  return `${action} - Bon ${bon.numero}`;
}

// FONCTION POUR CALCULER LE STATUT DU STOCK (AMÉLIORÉE)
function calculerStatutStock(quantite, stock) {
  if (quantite === 0) return 'Rupture';
  if (quantite <= stock.seuilAlerte) return 'Critique';
  if (quantite <= stock.seuilReapprovisionnement) return 'À réapprovisionner';
  if (quantite > (stock.seuilReapprovisionnement + stock.stockSecurite) * 2) return 'Surstock';
  return 'En stock';
}

// ... (les autres fonctions restent similaires mais adatées)

// FONCTIONS MANQUANTES POUR LES TRANSITIONS DE STATUT

// 1. Réserver le stock pour un bon
async function reserverStockPourBon(bon, transaction) {
  const articles = await db.ArticlePanier.findAll({
    where: { panierId: bon.panierId },
    transaction
  });

  for (const article of articles) {
    await reserverStock(
      article.produitId,
      article.quantite,
      bon.magasinId,
      bon.code_structure,
      bon.id,
      'réservation_commande',
      transaction
    );
  }
  
  console.log(`📦 Stock réservé pour le bon ${bon.numero}`);
}

// 2. Libérer le stock réservé pour un bon
async function libererStockPourBon(bon, motif, transaction) {
  const articles = await db.ArticlePanier.findAll({
    where: { panierId: bon.panierId },
    transaction
  });

  for (const article of articles) {
    await libererStockReserve(
      article.produitId,
      article.quantite,
      bon.magasinId,
      bon.code_structure,
      bon.id,
      motif,
      transaction
    );
  }
  
  console.log(`🔄 Stock libéré pour le bon ${bon.numero} (${motif})`);
}
 */
// 3. Réaliser une livraison (mouvement physique)
/* async function realiserLivraison(bon, transaction) {
  const articles = await db.ArticlePanier.findAll({
    where: { panierId: bon.panierId },
    transaction
  });

  // Libérer d'abord la réservation
  await libererStockPourBon(bon, 'livraison', transaction);
  
  // Puis effectuer le mouvement physique
  for (const article of articles) {
    const stock = await db.Stock.findOne({
      where: { 
        produitId: article.produitId,
        magasinId: bon.magasinId,
        code_structure: bon.code_structure
      },
      transaction
    });

    if (stock) {
      const typeMouvement = determinerTypeMouvement(bon);
      await executerMouvementPhysique(
        article,
        stock,
        typeMouvement,
        bon,
        bon.agentId,
        bon.code_structure,
        transaction
      );
    }
  }
  
  console.log(`🚚 Livraison réalisée pour le bon ${bon.numero}`);
} */

// 4. Traiter un retour
/* async function traiterRetour(bon, transaction) {
  const articles = await db.ArticlePanier.findAll({
    where: { panierId: bon.panierId },
    transaction
  });

  for (const article of articles) {
    const stock = await db.Stock.findOne({
      where: { 
        produitId: article.produitId,
        magasinId: bon.magasinId,
        code_structure: bon.code_structure
      },
      transaction
    });

    if (stock) {
      // Pour un retour, c'est toujours une entrée en stock
      await executerMouvementPhysique(
        article,
        stock,
        'Entree',
        bon,
        bon.agentId,
        bon.code_structure,
        transaction
      );
    }
  }
  
  console.log(`🔄 Retour traité pour le bon ${bon.numero}`);
}

// 5. Fonction pour réaliser le mouvement de stock (déjà partiellement existante mais améliorée)
async function realiserMouvementStock(article, bon, magasinId, code_structure, transaction) {
  const typeMouvement = determinerTypeMouvement(bon);
  const stock = await trouverOuCreerStock(
    article.produitId || article.produit?.id,
    magasinId,
    code_structure,
    transaction
  );

  await executerMouvementPhysique(article, stock, typeMouvement, bon, bon.agentId, code_structure, transaction);
}

// FONCTION POUR METTRE À JOUR L'ENTITÉ (CLIENT/FOURNISSEUR)
async function mettreAJourEntite(bon, typeEntite, clientId, fournisseurId, transaction) {
  if (typeEntite === 'client' && clientId) {
    const client = await db.Client.findByPk(clientId, { transaction });
    if (client) {
      const nouveauSolde = (client.solde || 0) + bon.netAPayer;
      const nouveauMontantAPayer = (client.montantANousPayer || 0) + bon.resteAPayer;
      
      await client.update({
        solde: nouveauSolde,
        montantANousPayer: nouveauMontantAPayer,
        dateMiseAJour: new Date()
      }, { transaction });
      
      console.log(`👤 Client ${clientId} mis à jour - Solde: ${nouveauSolde}`);
    }
  } else if (typeEntite === 'fournisseur' && fournisseurId) {
    const fournisseur = await db.Fournisseur.findByPk(fournisseurId, { transaction });
    if (fournisseur) {
      const nouveauMontantAPayer = (fournisseur.montantAPayer || 0) + bon.resteAPayer;
      
      await fournisseur.update({
        montantAPayer: nouveauMontantAPayer,
        dateMiseAJour: new Date()
      }, { transaction });
      
      console.log(`🏭 Fournisseur ${fournisseurId} mis à jour - Montant à payer: ${nouveauMontantAPayer}`);
    }
  }
}

// FONCTION POUR CRÉER UN AVOIR CLIENT
async function creerAvoirClient(bon, clientId, code_structure, transaction) {
  const avoir = await db.Bon.create({
    numero: `AVOIR-${bon.numero}-${Date.now()}`,
    type: 'avoir',
    description: `Avoir généré automatiquement pour le retour ${bon.numero}`,
    montantTotal: bon.montantAvoir || bon.montantTotal,
    clientId: clientId,
    statutBon: 'généré',
    dateBon: new Date(),
    code_structure: code_structure,
    bonOrigineId: bon.id,
    typeEntite: 'client'
  }, { transaction });

  console.log(`💰 Avoir créé: ${avoir.numero} pour le client ${clientId}`);
  return avoir;
}

// FONCTION POUR PRÉPARER LES DONNÉES DU BON
async function preparerDonneesBon(bon, typeEntite, clientId, fournisseurId) {
  const bonData = { ...bon };
  
  // Logique spécifique selon le type d'entité
  if (typeEntite === 'client') {
    bonData.clientId = clientId;
    if (bon.type === 'retour') {
      bonData.statutBon = 'retourné';
      bonData.montantAvoir = bonData.montantTotal || 0;
    } else if (bon.type === 'commande') {
      bonData.statutBon = bonData.statutBon || 'commandé';
    }
  } else if (typeEntite === 'fournisseur') {
    bonData.fournisseurId = fournisseurId;
    if (bon.type === 'commande') {
      bonData.statutBon = bonData.statutBon || 'commandé';
    } else if (bon.type === 'livraison') {
      bonData.statutBon = bonData.statutBon || 'livré';
    }
  }

  // Calcul automatique des totaux si non fournis
  if (!bonData.netAPayer && bonData.montantTotal && bonData.remise) {
    bonData.netAPayer = bonData.montantTotal - (bonData.remise || 0);
  }
  
  if (!bonData.resteAPayer && bonData.netAPayer && bonData.avance) {
    bonData.resteAPayer = bonData.netAPayer - (bonData.avance || 0);
  }

  return bonData;
}
 */
// FONCTION POUR GÉRER LES RÉSERVATIONS DE STOCK (SANS TABLE RÉSERVATION SÉPARÉE)
/* async function gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction) {
  // STATUTS AVEC RÉSERVATION DE STOCK (commandes en attente)
  const statutsAvecReservation = ['commandé', 'expédié'];
  
  // STATUTS AVEC LIBÉRATION DE STOCK (annulations/retours)
  const statutsAvecLiberation = ['annulé', 'retourné'];
  
  // STATUTS AVEC MOUVEMENT PHYSIQUE (livraisons réalisées)
  const statutsAvecRealisation = ['livré', 'validé', 'facturé', 'payé'];

  console.log(`📦 Gestion réservations - Statut: ${bon.statutBon}, Type: ${bon.typeEntite}`);

  // 1. RÉSERVER LE STOCK POUR LES COMMANDES CLIENTS EN ATTENTE
  if (statutsAvecReservation.includes(bon.statutBon) && bon.typeEntite === 'client') {
    console.log('🔒 Réservation de stock pour commande client...');
    for (const article of articles) {
      await reserverStockDirect(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `réservation_${bon.statutBon}`,
        transaction
      );
    }
  }

  // 2. LIBÉRER LE STOCK RÉSERVÉ POUR LES ANNULLATIONS
  if (bon.statutBon === 'annulé') {
    console.log('🔄 Libération stock pour annulation...');
    for (const article of articles) {
      await libererStockReserveDirect(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        'annulation_commande',
        transaction
      );
    }
  }

  // 3. TRAITEMENT DES RETOURS (libération + mouvement entrée)
  if (bon.statutBon === 'retourné') {
    console.log('🔄 Traitement retour...');
    for (const article of articles) {
      // Libérer la réservation si existante
      await libererStockReserveDirect(
        article.produitId || article.produit?.id,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        'retour_client',
        transaction
      );
      
      // Pour les retours clients = entrée en stock
      if (bon.typeEntite === 'client') {
        await realiserMouvementStock(
          article,
          bon,
          magasinId,
          code_structure,
          transaction
        );
      }
    }
  }

  // 4. RÉALISER LES MOUVEMENTS PHYSIQUES POUR LES LIVRAISONS TERMINÉES
  if (statutsAvecRealisation.includes(bon.statutBon)) {
    console.log('🚚 Réalisation mouvement physique...');
    
    // Libérer d'abord les réservations pour les clients
    if (bon.typeEntite === 'client') {
      for (const article of articles) {
        await libererStockReserveDirect(
          article.produitId || article.produit?.id,
          article.quantite,
          magasinId,
          code_structure,
          bon.id,
          `réalisation_${bon.statutBon}`,
          transaction
        );
      }
    }
    
    // Puis effectuer les mouvements physiques
    for (const article of articles) {
      await realiserMouvementStock(
        article,
        bon,
        magasinId,
        code_structure,
        transaction
      );
    }
  }

  console.log('✅ Gestion réservations terminée');
} */

// FONCTION POUR RÉSERVER DU STOCK DIRECTEMENT DANS LA TABLE STOCK
/* async function reserverStockDirect(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
  const stock = await db.Stock.findOne({
    where: { produitId, magasinId, code_structure },
    transaction
  });

  if (stock) {
    const ancienneReserve = stock.quantiteReservee || 0;
    const nouvelleReserve = ancienneReserve + quantite;
    const quantiteDisponible = stock.quantiteTotale - ancienneReserve;
    
    // Vérifier que la réservation ne dépasse pas le stock disponible
    if (quantite > quantiteDisponible) {
      throw new Error(`Réservation impossible: stock insuffisant pour le produit ${produitId}. Disponible: ${quantiteDisponible}, Demandé: ${quantite}`);
    }

    await stock.update({
      quantiteReservee: nouvelleReserve,
      dateDerniereMiseAJour: new Date(),
      // Mettre à jour le statut si nécessaire
      statutStock: calculerStatutStock(stock.quantiteTotale, nouvelleReserve, stock)
    }, { transaction });

    console.log(`🔒 Stock réservé - Produit: ${produitId}, Quantité: ${quantite}, Réserve: ${ancienneReserve} → ${nouvelleReserve}`);
    
    // Créer un mouvement de réservation (optionnel - pour historique)
    await db.MouvementStock.create({
      ref: `RES-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      produitId: produitId,
      magasinId: magasinId,
      stockId: stock.id,
      typeMouvement: 'Réservation',
      quantite: quantite,
      prixUnitaire: 0, // Pas de valeur monétaire pour les réservations
      acteurId: (await db.Bon.findByPk(bonId, { transaction }))?.agentId,
      description: `Réservation stock - ${motif}`,
      motif: motif,
      dateMouvement: new Date(),
      code_structure: code_structure,
      bonId: bonId,
      estReservation: true // Champ personnalisé pour identifier les réservations
    }, { transaction });

  } else {
    throw new Error(`Stock non trouvé pour le produit ${produitId} dans le magasin ${magasinId}`);
  }
}

// FONCTION POUR LIBÉRER LE STOCK RÉSERVÉ DIRECTEMENT
async function libererStockReserveDirect(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
  const stock = await db.Stock.findOne({
    where: { produitId, magasinId, code_structure },
    transaction
  });

  if (stock && stock.quantiteReservee >= quantite) {
    const ancienneReserve = stock.quantiteReservee || 0;
    const nouvelleReserve = Math.max(0, ancienneReserve - quantite);

    await stock.update({
      quantiteReservee: nouvelleReserve,
      dateDerniereMiseAJour: new Date(),
      statutStock: calculerStatutStock(stock.quantiteTotale, nouvelleReserve, stock)
    }, { transaction });

    console.log(`🔄 Stock libéré - Produit: ${produitId}, Quantité: ${quantite}, Réserve: ${ancienneReserve} → ${nouvelleReserve}`);

    // Créer un mouvement de libération (optionnel - pour historique)
    await db.MouvementStock.create({
      ref: `LIB-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      produitId: produitId,
      magasinId: magasinId,
      stockId: stock.id,
      typeMouvement: 'Libération',
      quantite: quantite,
      prixUnitaire: 0,
      acteurId: (await db.Bon.findByPk(bonId, { transaction }))?.agentId,
      description: `Libération réservation - ${motif}`,
      motif: motif,
      dateMouvement: new Date(),
      code_structure: code_structure,
      bonId: bonId,
      estReservation: true
    }, { transaction });

  } else if (stock) {
    console.warn(`⚠️ Réservation insuffisante pour libération - Produit: ${produitId}, Réservé: ${stock.quantiteReservee}, Demandé: ${quantite}`);
    
    // Libérer ce qui est disponible
    const quantiteALiberer = Math.min(stock.quantiteReservee, quantite);
    if (quantiteALiberer > 0) {
      await stock.update({
        quantiteReservee: stock.quantiteReservee - quantiteALiberer,
        dateDerniereMiseAJour: new Date()
      }, { transaction });
      console.log(`🔄 Libération partielle: ${quantiteALiberer} unités`);
    }
  }
} */

// FONCTION POUR CALCULER LE STATUT DU STOCK (AMÉLIORÉE AVEC RÉSERVATIONS)
/* function calculerStatutStock(quantiteTotale, quantiteReservee, stock) {
  const quantiteDisponible = quantiteTotale - quantiteReservee;
  
  if (quantiteTotale === 0) return 'Rupture';
  if (quantiteDisponible === 0) return 'Réservé';
  if (quantiteDisponible <= stock.seuilAlerte) return 'Critique';
  if (quantiteDisponible <= stock.seuilReapprovisionnement) return 'À réapprovisionner';
  if (quantiteDisponible > (stock.seuilReapprovisionnement + stock.stockSecurite) * 2) return 'Surstock';
  
  return 'En stock';
} */

// FONCTION POUR RÉSERVER LE STOCK POUR UN BON COMPLET
/* async function reserverStockPourBon(bon, transaction) {
  const articles = await db.ArticlePanier.findAll({
    where: { panierId: bon.panierId },
    transaction
  });

  for (const article of articles) {
    await reserverStockDirect(
      article.produitId,
      article.quantite,
      bon.magasinId,
      bon.code_structure,
      bon.id,
      'réservation_commande',
      transaction
    );
  }
  
  console.log(`📦 Stock réservé pour le bon ${bon.numero}`);
} */

// FONCTION POUR LIBÉRER LE STOCK RÉSERVÉ POUR UN BON COMPLET
/* async function libererStockPourBon(bon, motif, transaction) {
  const articles = await db.ArticlePanier.findAll({
    where: { panierId: bon.panierId },
    transaction
  });

  for (const article of articles) {
    await libererStockReserveDirect(
      article.produitId,
      article.quantite,
      bon.magasinId,
      bon.code_structure,
      bon.id,
      motif,
      transaction
    );
  }
  
  console.log(`🔄 Stock libéré pour le bon ${bon.numero} (${motif})`);
}

// FONCTION POUR RÉALISER UNE LIVRAISON
async function realiserLivraison(bon, transaction) {
  const articles = await db.ArticlePanier.findAll({
    where: { panierId: bon.panierId },
    transaction
  });

  // Libérer d'abord la réservation
  await libererStockPourBon(bon, 'livraison', transaction);
  
  // Puis effectuer le mouvement physique
  for (const article of articles) {
    const stock = await db.Stock.findOne({
      where: { 
        produitId: article.produitId,
        magasinId: bon.magasinId,
        code_structure: bon.code_structure
      },
      transaction
    });

    if (stock) {
      const typeMouvement = determinerTypeMouvement(bon);
      await executerMouvementPhysique(
        article,
        stock,
        typeMouvement,
        bon,
        bon.agentId,
        bon.code_structure,
        transaction
      );
    }
  }
  
  console.log(`🚚 Livraison réalisée pour le bon ${bon.numero}`);
} */

//module.exports = exports;

const db = require('../models');
// const fs = require('fs');
// const path = require('path');
// const BASE_URL = 'http://localhost:5000/uploads/'; // à configurer via .env si possible

const {
  stockManager,
  reservationService,
  mouvementService,
  statutManager
} = require('./bonComplet');

exports.createBonComplet = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { bon, panier, articles, paiement, code_structure, magasinId, agentId, fournisseurId, clientId, typeEntite } = req.body;

    // Validation
    if (!bon || !panier || !articles || !code_structure || !magasinId || !agentId || !typeEntite) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    let nouveauBon;
    let nouveauPanier;
    let articlesCrees;

    // LOGIQUE MÉTIER AMÉLIORÉE
    console.log(`Création bon - Type: ${bon.type}, Entité: ${typeEntite}, Statut: ${bon.statutBon}`);
    // ==============================
    //Vérifier si le bon existe
    // ==============================
    if (bon.id) {
      // Mise à jour statut / informations existantes
      nouveauBon = await db.Bon.findByPk(bon.id, { transaction });
      if (!nouveauBon) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Bon introuvable' });
      }

      // Préparer les données et mettre à jour le bon
      const bonData = await statutManager.preparerDonneesBon(bon, typeEntite, clientId, fournisseurId);
      
      await nouveauBon.update(bonData, { transaction });

      nouveauPanier = await db.Panier.findOne({ where: { bonId: nouveauBon.id }, transaction });

      // Mettre à jour ou créer les articles
      for (const article of articles) {
        if (article.id) {
          articlesCrees = await db.ArticlePanier.update(article, { where: { id: article.id }, transaction });
        } else {
          articlesCrees = await db.ArticlePanier.create({ ...article, panierId: nouveauPanier.id, code_structure }, { transaction });
        }
      }

      // Créer historique si le statut a changé
      if (bonData.statutBon && bonData.statutBon !== nouveauBon.statutBon) {
        await statutManager.creerHistoriqueStatut(
          nouveauBon.id,
          nouveauBon.statutBon,
          bonData.statutBon,
          agentId,
          'Mise à jour du statut du bon',
          transaction
        );
      } 

    } 
    else {
      // ==============================
      // Création d’un nouveau bon
      // ==============================
      const bonData = await statutManager.preparerDonneesBon(bon, typeEntite, clientId, fournisseurId);
      nouveauBon = await db.Bon.create(
        { ...bonData, code_structure, magasinId, agentId, clientId, fournisseurId, typeEntite },
        { transaction }
      );

      // Créer le panier
      nouveauPanier = await db.Panier.create(
        { ...panier, bonId: nouveauBon.id, code_structure, magasinId, agentId, clientId, fournisseurId, typeEntite:typeEntite },
        { transaction }
      );

      // Créer les articles
      articlesCrees = await db.ArticlePanier.bulkCreate(
        articles.map(article => ({ ...article, panierId: nouveauPanier.id, code_structure })),
        { transaction }
      );

      // Créer historique
      await statutManager.creerHistoriqueStatut(
        nouveauBon.id,
        'création',
        nouveauBon.statutBon,
        agentId,
        'Création du bon',
        code_structure,
        transaction
      );
    }

    // --- WORKFLOW SELON statutBon ---
    const statut = nouveauBon.statutBon;
    const typeBon = nouveauBon.type;
    
    console.log(`Traitement - Type: ${typeBon}, Entité: ${typeEntite}, Statut: ${statut}`);

    // CAS 1: BONS FOURNISSEURS
    if (typeEntite === 'fournisseur') {
      await this.traiterBonFournisseur(nouveauBon, articles, magasinId, agentId, code_structure, transaction);
    }
    // CAS 2: BONS CLIENTS
    else if (typeEntite === 'client') {
      await this.traiterBonClient(nouveauBon, articles, magasinId, agentId, code_structure, transaction);
    }

/*     // 1. Vérifier disponibilité stock
    // Vérification stock si nécessaire
    if (['commandé', 'expédié', 'livré', 'payé'].includes(statut)) {
      await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, bon.type, typeEntite, transaction);
    }
    // 5. Gérer réservations stock
    await reservationService.gererReservationsStock(articles, nouveauBon, magasinId, agentId, code_structure, transaction);

    // 6. Gérer mouvements stock
    //Gérer mouvements physiques uniquement pour statuts terminaux
    if (['livré', 'validé', 'facturé', 'payé', 'retourné'].includes(statut)) {
      await Promise.all(
        articles.map(article =>
          mouvementService.traiterMouvementStock(article, nouveauBon, magasinId, agentId, code_structure, transaction)
        )
      );
    } */

    // 7. Créer paiement si avance
    let paiementCree = null;
    if (paiement && nouveauBon.avance > 0) {
      paiementCree = await db.Paiement.create({ ...paiement, montant: nouveauBon.avance, bonId: nouveauBon.id, panierId: nouveauPanier.id, code_structure, magasinId, date: new Date() }, { transaction });
    }

    // 8. Mettre à jour entité
    //await statutManager.mettreAJourEntite(nouveauBon, typeEntite, clientId, fournisseurId, transaction);
    // if (['expédié', 'livré', 'payé'].includes(statut)) {
    //   await statutManager.mettreAJourEntite(nouveauBon, typeEntite, clientId, fournisseurId, transaction);
    // }
    // 9. Créer historique
    //await statutManager.creerHistoriqueStatut(nouveauBon.id, 'création', nouveauBon.statutBon, agentId, 'Création du bon', transaction);

    // 10. Valider transaction
    await transaction.commit();

    res.status(201).json({
      message: 'Bon créé avec succès',
      bon: nouveauBon,
      panier: nouveauPanier,
      articles: articlesCrees,
      paiement: paiementCree,
      typeEntite: typeEntite
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Erreur création bon complet:', error);
    res.status(500).json({ error: 'Erreur lors de la création du bon', details: error.message });
  }
};

/**
 * Traitement spécifique pour les bons fournisseurs
 */
exports.traiterBonFournisseur = async (bon, articles, magasinId, agentId, code_structure, transaction) => {
  const statut = bon.statutBon;
  const typeBon = bon.type;

  console.log(`🏭 Traitement bon fournisseur - Type: ${typeBon}, Statut: ${statut}`);

  switch (typeBon) {
    case 'commande':
      // COMMANDE FOURNISSEUR: Aucun impact immédiat sur le stock
      // Seulement vérification et réservation si nécessaire
      if (['commandé', 'expédié'].includes(statut)) {
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'fournisseur', transaction);
        
        // Réservation pour préparation réception
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
      }
      break;

    case 'livraison':
      // LIVRAISON FOURNISSEUR: Impact sur le stock uniquement après validation
      if (['livré', 'validé', 'facturé'].includes(statut)) {
        // Vérification stock
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'livraison', 'fournisseur', transaction);
        
        // Libération des réservations précédentes
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Mouvements physiques (entrée en stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Mise à jour du fournisseur
        await statutManager.mettreAJourEntite(bon, 'fournisseur', null, bon.fournisseurId, transaction);
      }
      break;

    case 'retour':
      // RETOUR FOURNISSEUR: Sortie de stock après validation
      if (['retourné', 'validé'].includes(statut)) {
        // Vérification stock disponible
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'retour', 'fournisseur', transaction);
        
        // Mouvements physiques (sortie de stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Ajustement du fournisseur
        await statutManager.mettreAJourEntite(bon, 'fournisseur', null, bon.fournisseurId, transaction);
      }
      break;

    default:
      console.log(`Type de bon fournisseur non géré: ${typeBon}`);
  }
};

/**
 * Traitement spécifique pour les bons clients
 */
exports.traiterBonClient = async (bon, articles, magasinId, agentId, code_structure, transaction) => {
  const statut = bon.statutBon;
  const typeBon = bon.type;

  console.log(`👤 Traitement bon client - Type: ${typeBon}, Statut: ${statut}`);

  switch (typeBon) {
    case 'commande':
      // COMMANDE CLIENT: Réservation immédiate du stock
      if (['commandé', 'expédié'].includes(statut)) {
        // Vérification stock disponible
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'client', transaction);
        
        // Réservation du stock
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
      }

      // LIVRAISON/RÉALISATION: Impact physique sur le stock
      if (['livré', 'validé', 'facturé', 'payé'].includes(statut)) {
        // Libération des réservations
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Mouvements physiques (sortie de stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Mise à jour du client
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      break;

    case 'retour':
      // RETOUR CLIENT: Entrée en stock après validation
      if (['retourné', 'validé'].includes(statut)) {
        // Mouvements physiques (entrée en stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Ajustement du client (avoir)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      break;

    default:
      console.log(`Type de bon client non géré: ${typeBon}`);
  }
};