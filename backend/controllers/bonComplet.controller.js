const db = require('../models');
const operationController = require('./operation.controller');

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

    console.log('Données reçues pour création bon complet:', {
      bon,
      panier,
      articles,
      paiement
    });
    // Validation
    if (!bon || !panier || !articles || !code_structure || !magasinId || !agentId || !typeEntite) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    // Valider les montants
    if (bon.montantTotal < 0 || bon.remise < 0 || bon.avance < 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Les montants ne peuvent pas être négatifs' });
    }

    let nouveauBon;
    let nouveauPanier;
    let articlesCrees;

    // LOGIQUE MÉTIER AMÉLIORÉE
    console.log(`Création bon - Type: ${bon.type}, Entité: ${typeEntite}, Statut: ${bon.statutBon}`);
    
    // ==============================
    // GESTION DES MODIFICATIONS DE BON
    // ==============================

    //Vérifier si le bon existe
    if (bon.id) {
      // Mise à jour statut / informations existantes
      nouveauBon = await db.Bon.findByPk(bon.id, { transaction });
      if (!nouveauBon) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Bon introuvable' });
      }

      // Préparer les données et mettre à jour le bon
      const bonData = await statutManager.preparerDonneesBon(bon, typeEntite, clientId, fournisseurId);
      // Mettre à jour le bon
      await nouveauBon.update(bonData, { transaction });

       // Traiter les impacts du changement de statut
      /* await this.traiterChangementStatut(
        nouveauBon,
        articles,
        magasinId,
        agentId,
        code_structure,
        typeEntite,
        transaction
      ); */

      // Mettre à jour le panier associé
      nouveauPanier = await db.Panier.findOne({ where: { bonId: nouveauBon.id }, transaction });

      if (nouveauPanier) {
        await nouveauPanier.update({
          ...panier,
          statut: panier.statut || 'validé',
        }, { transaction });
        
        //Supprimer tous les anciens articles et recréer
        await db.ArticlePanier.destroy({ 
          where: { panierId: nouveauPanier.id }, 
          transaction 
        });
        
        // Recréer tous les articles avec leurs IDs d'origine si disponibles
        articlesCrees = await db.ArticlePanier.bulkCreate(
          articles.map(article => ({ 
            ...article, 
            panierId: nouveauPanier.id, 
            code_structure 
          })),
          { transaction }
        );
      }
      

      // Créer historique si le statut a changé
      if (bonData.statutBon && bonData.statutBon !== nouveauBon.statutBon) {
        await statutManager.creerHistoriqueStatut(
          nouveauBon.id,
          nouveauBon.statutBon,
          bonData.statutBon,
          agentId,
          'Mise à jour du statut du bon',
          code_structure,
          transaction
        );
      } 

    } 
    else {
      // ==============================
      // Création d’un nouveau bon
      // ==============================
      const bonData = await statutManager.preparerDonneesBon(bon, typeEntite, clientId, fournisseurId);
      
      // Créer le bon
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
       // Traiter les impacts du nouveau bon
      /* await this.traiterNouveauBon(
        nouveauBon,
        articles,
        magasinId,
        agentId,
        code_structure,
        typeEntite,
        transaction
      ); */
    }

    if (nouveauBon.statutBon === 'retourné' && nouveauBon.type !== 'retour') {
      // Créer un bon de retour automatique
      const bonRetour = await this.creerBonRetour(
        nouveauBon,
        articles,
        magasinId,
        agentId,
        code_structure,
        transaction
      );
      
      console.log(`🔄 Bon de retour créé automatiquement: ${bonRetour.bonRetour.numero}`);
    }

    // --- WORKFLOW SELON statutBon ---
    // const statut = nouveauBon.statutBon;
    // const typeBon = nouveauBon.type;
    
    // console.log(`Traitement - Type: ${typeBon}, Entité: ${typeEntite}, Statut: ${statut}`);

    // CAS 1: BONS FOURNISSEURS
    if (typeEntite === 'fournisseur') {
      await this.traiterBonFournisseur(nouveauBon, articles, magasinId, agentId, code_structure, transaction);
    }
    // CAS 2: BONS CLIENTS
    else if (typeEntite === 'client') {
      await this.traiterBonClient(nouveauBon, articles, magasinId, agentId, code_structure, transaction);
    } 


    // 7. Créer paiement si avance
    let paiementCree = null;
    if (paiement && nouveauBon.avance > 0) {
      paiementCree = await db.Paiement.create({
        ...paiement, 
        montant: nouveauBon.avance, 
        fournisseurId,
        clientId, 
        bonId: nouveauBon.id, 
        panierId: nouveauPanier.id, 
        code_structure, 
        magasinId, 
        agentId,
        date: new Date() 
      }, 
      { transaction });
    
          // Mettre à jour l'entité pour l'avance
      if (typeEntite === 'client') {
        await statutManager.mettreAJourClientApresRegelement(
          { montant: nouveauBon.avance },
          clientId,
          transaction
        );
      } else if (typeEntite === 'fournisseur') {
        await statutManager.mettreAJourFournisseurApresVersement(
          { montant: nouveauBon.avance },
          fournisseurId,
          transaction
        );
      }
    }

    // Créer l'opération associée
    /* if (nouveauBon) {
      await operationController.createFromBon(nouveauBon, transaction);
    }

    // Créer l'opération pour le paiement si applicable
    if (paiementCree) {
      await operationController.createFromPaiement(paiementCree, transaction);
    } */

    // Créer ou mettre à jour l'opération associée
    if (nouveauBon) {
      const operation = await operationController.updateFromBon(nouveauBon, transaction);
      console.log('🔄 Opération associée au bon:', {
        operationId: operation.id,
        type: operation.type,
        statut: operation.statut,
        montantPaye: operation.montantPaye
      });
    }

    // Créer ou mettre à jour l'opération pour le paiement si applicable
    if (paiementCree) {
      const operationPaiement = await operationController.createFromPaiement(paiementCree, transaction);
      console.log('💳 Opération de paiement:', {
        operationId: operationPaiement.id,
        type: operationPaiement.type,
        montant: operationPaiement.montantPaye
      });
    }

    // Vérifier et corriger les incohérences
    await operationController.synchroniserOperations(code_structure, transaction);

    // Ou pour un seul bon spécifique :
    if (nouveauBon && nouveauBon.id) {
      // Vérifier si l'opération existe et est à jour
      const operationExistante = await db.Operation.findOne({
        where: { bonId: nouveauBon.id },
        transaction
      });

      if (operationExistante) {
        // Mettre à jour l'opération existante
        await operationController.updateFromBon(nouveauBon, transaction);
      } else {
        // Créer une nouvelle opération
        await operationController.createFromBon(nouveauBon, transaction);
      }
    }
    // Valider transaction
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
    //res.status(500).json({ error: 'Erreur lors de la création du bon', details: error.message });
    res.status(500).json({ 
      error: 'Erreur lors de la création/modification du bon', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
/**
 * Traiter le changement de statut d'un bon
 */
/* exports.traiterChangementStatut = async (bon, articles, magasinId, agentId, code_structure, typeEntite, transaction) => {
  const ancienStatut = bon._previousDataValues?.statutBon || 'création';
  const nouveauStatut = bon.statutBon;

  console.log(`🔄 Changement de statut: ${ancienStatut} → ${nouveauStatut}`);

  // AJOUTER: Traitement spécifique pour vente à crédit
if (typeEntite === 'client' && bon.type === 'vente' && nouveauStatut === 'validé') {
  await this.traiterVenteCredit(bon, articles, magasinId, agentId, code_structure, transaction);
}

  // Annulation d'un bon
  if (nouveauStatut === 'annulé') {
    await this.annulerBon(bon, articles, magasinId, agentId, code_structure, typeEntite, transaction);
  }

  // Livraison d'un bon client
  if (nouveauStatut === 'livré' && typeEntite === 'client') {
    await this.livrerBonClient(bon, articles, magasinId, agentId, code_structure, transaction);
  }

  // Livraison d'un bon fournisseur
  if (nouveauStatut === 'livré' && typeEntite === 'fournisseur') {
    await this.livrerBonFournisseur(bon, articles, magasinId, agentId, code_structure, transaction);
  }

  // Retour validé
  if (nouveauStatut === 'retourné') {
    await this.validerRetour(bon, articles, magasinId, agentId, code_structure, typeEntite, transaction);
  }

  // Facturation
  if (nouveauStatut === 'facturé') {
    await this.facturerBon(bon, typeEntite, transaction);
  }

  // Paiement complet
  if (nouveauStatut === 'payé') {
    await this.payerBon(bon, typeEntite, transaction);
  }
};
 */
/**
 * Traiter un nouveau bon
 */
/* exports.traiterNouveauBon = async (bon, articles, magasinId, agentId, code_structure, typeEntite, transaction) => {
  const statut = bon.statutBon;
  const typeBon = bon.type;

  console.log(`✨ Traitement nouveau bon - Type: ${typeBon}, Entité: ${typeEntite}, Statut: ${statut}`);

  // Bon client validé
  if (typeEntite === 'client' && statut === 'validé') {
    if (typeBon === 'commande' || typeBon === 'vente') {
      // Réservation du stock
      await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
      
      // Mise à jour client
      await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
    }
  }

  // Bon fournisseur validé
  if (typeEntite === 'fournisseur' && statut === 'validé') {
    if (typeBon === 'livraison') {
      // Vérification stock
      await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'livraison', 'fournisseur', transaction);
      
      // Mouvements physiques
      await Promise.all(
        articles.map(article =>
          mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
        )
      );

      // Mise à jour fournisseur
      await statutManager.mettreAJourEntite(bon, 'fournisseur', null, bon.fournisseurId, transaction);
    }
  }
};
 */

/**
 * Traiter une vente à crédit client
 */
exports.traiterVenteCredit = async (bon, articles, magasinId, agentId, code_structure, transaction) => {
  console.log(`💳 Traitement vente à crédit ${bon.numero}`);
  
  // 1. Impact sur le stock immédiat (sortie)
  await Promise.all(
    articles.map(article =>
      mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
    )
  );
  
  // 2. Impact sur la dette client
  await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
  
  console.log(`✅ Vente crédit traitée - Stock déduit et dette client augmentée`);
};

/**
 * Annuler un bon
 */
exports.annulerBon = async (bon, articles, magasinId, agentId, code_structure, typeEntite, transaction) => {
  console.log(`❌ Annulation du bon ${bon.numero}`);
  
  // Libérer les réservations de stock
  //await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
  // 1. Libérer les réservations si c'est une commande
  if (bon.type === 'commande') {
    await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
  }
  // 2. Pour les ventes et livraisons validées, remettre le stock
  if ((bon.type === 'vente' || bon.type === 'livraison') && ['validé', 'livré'].includes(bon._previousDataValues?.statutBon)) {
    // Créer un bon d'annulation pour les mouvements inverses
    const bonAnnulation = {
      ...bon,
      type: typeEntite === 'client' ? 'annulation_client' : 'annulation_fournisseur',
      statutBon: 'annulé'
    };
    
    await Promise.all(
      articles.map(article =>
        mouvementService.traiterMouvementStock(article, bonAnnulation, magasinId, agentId, code_structure, transaction)
      )
    );
  }
  // Annuler la dette/avoir
  const annulationData = {
    ...bon,
    montantTotal: Math.abs(bon.montantTotal),
    montantAvoir: Math.abs(bon.montantAvoir),
    netAPayer: Math.abs(bon.netAPayer),
    resteAPayer: Math.abs(bon.resteAPayer)
  };
  
  await statutManager.mettreAJourEntite(annulationData, typeEntite, bon.clientId, bon.fournisseurId, transaction);
  
  console.log(`✅ Bon ${bon.numero} annulé avec succès`);
  // Annuler les mouvements de stock
  /* const annulationBon = {
    ...bon,
    type: typeEntite === 'client' ? 'annulation_client' : 'annulation_fournisseur'
  };
  
  await Promise.all(
    articles.map(article =>
      mouvementService.traiterMouvementStock(article, annulationBon, magasinId, agentId, code_structure, transaction)
    )
  ); */
};

/**
 * Livrer un bon client
 */
exports.livrerBonClient = async (bon, articles, magasinId, agentId, code_structure, transaction) => {
  console.log(`🚚 Livraison bon client ${bon.numero}`);
  
  // Libérer les réservations
  await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
  
  // Mouvements physiques (sortie de stock)
  await Promise.all(
    articles.map(article =>
      mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
    )
  );
  
  // Mettre à jour la date de livraison réelle
  await bon.update({ dateLivraisonReelle: new Date() }, { transaction });
};

/**
 * Livrer un bon fournisseur
 */
exports.livrerBonFournisseur = async (bon, articles, magasinId, agentId, code_structure, transaction) => {
  console.log(`🚛 Livraison bon fournisseur ${bon.numero}`);
  
  // Libérer les réservations de réception
  await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
  
  // Mouvements physiques (entrée en stock)
  await Promise.all(
    articles.map(article =>
      mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
    )
  );
  
  // Mettre à jour la date de livraison réelle
  await bon.update({ dateLivraisonReelle: new Date() }, { transaction });
};

/**
 * Valider un retour
 */
exports.validerRetour = async (bon, articles, magasinId, agentId, code_structure, typeEntite, transaction) => {
  console.log(`↩️ Validation retour ${bon.numero}`);
  
  // Traitement stock selon le type d'entité
  await Promise.all(
    articles.map(article =>
      mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
    )
  );
  
  // Créer un avoir associé
  if (bon.montantAvoir > 0) {
    const avoir = await db.Bon.create({
      code_structure,
      numero: `AVOIR-${bon.numero}-${Date.now()}`,
      type: 'avoir',
      typeEntite,
      clientId: bon.clientId,
      fournisseurId: bon.fournisseurId,
      description: `Avoir pour retour ${bon.numero}`,
      statutBon: 'validé',
      montantTotal: bon.montantAvoir,
      dateBon: new Date(),
      magasinId,
      agentId,
      numeroBonOrigine: bon.numero
    }, { transaction });
    
    console.log(`💰 Avoir créé: ${avoir.numero}`);
  }
};

/**
 * Facturer un bon
 */
exports.facturerBon = async (bon, typeEntite, transaction) => {
  console.log(`🧾 Facturation bon ${bon.numero}`);
  
  // Générer un numéro de facture
  const numeroFacture = `FACT-${bon.numero}-${Date.now()}`;
  await bon.update({ numeroFacture }, { transaction });
};

/**
 * Payer un bon
 */
exports.payerBon = async (bon, typeEntite, transaction) => {
  console.log(`💳 Paiement complet bon ${bon.numero}`);
  
  // Vérifier que le reste à payer est à 0
  if (bon.resteAPayer > 0) {
    throw new Error(`Le bon ${bon.numero} a encore un reste à payer de ${bon.resteAPayer}`);
  }
  
  // Marquer comme payé
  await bon.update({ resteAPayer: 0 }, { transaction });
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
      if (['validé'].includes(statut)) {
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'fournisseur', transaction);
        
        // Réservation pour préparation réception
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
      }
      break;

    case 'livraison':
      // LIVRAISON FOURNISSEUR: Impact sur le stock uniquement après validation
      if (['validé', 'facturé'].includes(statut)) {
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
      if (['validé'].includes(statut)) {
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

  console.log(`Traitement bon client - Type: ${typeBon}, Statut: ${statut}`);

  switch (typeBon) {
    case 'commande':
      // COMMANDE CLIENT: Réservation immédiate du stock
      if (['validé'].includes(statut)) {
        // Vérification stock disponible
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'client', transaction);
        
        // Réservation du stock
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Mise à jour du client (création de la dette)
        //await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }

      // LIVRAISON/RÉALISATION: Impact physique sur le stock
      if (['livré','facturé'].includes(statut)) {
        // Libération des réservations
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Mouvements physiques (sortie de stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
         // Mettre à jour la date de livraison
        await bon.update({ dateLivraisonReelle: new Date() }, { transaction });
        // Mise à jour du client
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      if (['retourné'].includes(statut)) {
        // Créer un bon de retour automatique
        await this.creerBonRetour(bon, articles, magasinId, agentId, code_structure, transaction);
        
        // Entrée du stock (retour client)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
        
        // Mise à jour du client (création d'avoir)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      
      if (['annulé'].includes(statut)) {
        // Libérer les réservations
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Annuler la dette
        //const bonAnnule = { ...bon, montantTotal: Math.abs(bon.montantTotal) };
        //await statutManager.mettreAJourEntite(bonAnnule, 'client', bon.clientId, null, transaction);
      }
      break;

    case 'vente':
      if (['validé'].includes(statut)) {
        // Vérification stock disponible
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'client', transaction);
        
        // Réservation du stock
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Mise à jour du client (création de la dette)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);

         // Mouvements physiques (sortie de stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
      }
       if (['retourné'].includes(statut)) {
        // Créer un bon de retour automatique
        await this.creerBonRetour(bon, articles, magasinId, agentId, code_structure, transaction);
        
        // Entrée du stock (retour client)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
        
        // Mise à jour du client (création d'avoir)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      
      /* if (['annulé'].includes(statut)) {
        // Libérer les réservations
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
         // Entrée du stock (retour client)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
        // Annuler la dette
        const bonAnnule = { ...bon, montantTotal: -bon.montantTotal };
        await statutManager.mettreAJourEntite(bonAnnule, 'client', bon.clientId, null, transaction);
      } */
      break;
    case 'retour':
      // RETOUR CLIENT: Entrée en stock après validation
      /* if (['retourné', 'validé'].includes(statut)) {
        // Mouvements physiques (entrée en stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Ajustement du client (avoir)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      } */

      if (['validé'].includes(statut)) {
        // Pour un retour validé, entrée en stock et création d'avoir
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      
      /* if (['retourné'].includes(statut)) {
        // Marquer comme retourné (logistique)
        await bon.update({ dateLivraisonReelle: new Date() }, { transaction });
      } */
      
      /* if (['annulé'].includes(statut)) {
        // Annuler l'avoir et sortir le stock
        const bonAnnule = { ...bon, montantTotal: -bon.montantTotal };
        await statutManager.mettreAJourEntite(bonAnnule, 'client', bon.clientId, null, transaction);
        
        // Sortie du stock (annulation de l'entrée)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
      } */
      break;

    default:
      console.log(`Type de bon client non géré: ${typeBon}`);
  }
};

/**
 * Créer un bon de retour automatique
 */
exports.creerBonRetour = async (bonOrigine, articles, magasinId, agentId, code_structure, transaction) => {

  // Vérifier si un retour existe déjà pour ce bon
  const retourExistant = await db.Bon.findOne({
    where: {
      numeroBonOrigine: bonOrigine.numero,
      type: 'retour',
      typeEntite: bonOrigine.typeEntite
    },
    transaction
  });
  
  if (retourExistant) {
    console.log(`⚠️ Un retour existe déjà pour le bon ${bonOrigine.numero}: ${retourExistant.numero}`);
    return retourExistant;
  }
  
  // Créer le bon de retour
  const bonRetour = await db.Bon.create({
    code_structure,
    numero: `RETOUR-${bonOrigine.numero}-${Date.now()}`,
    type: 'retour',
    typeEntite: bonOrigine.typeEntite,
    clientId: bonOrigine.clientId,
    fournisseurId: bonOrigine.fournisseurId,
    description: `Retour pour ${bonOrigine.type} ${bonOrigine.numero}`,
    statutBon: 'validé',
    montantTotal: bonOrigine.montantTotal,
    montantAvoir: bonOrigine.montantTotal, // Montant de l'avoir
    numeroBonOrigine: bonOrigine.numero,
    dateBon: new Date(),
    magasinId,
    agentId
  }, { transaction });

  // Créer le panier du retour
  const panierRetour = await db.Panier.create({
    bonId: bonRetour.id,
    code_structure,
    magasinId,
    agentId,
    clientId: bonOrigine.clientId,
    fournisseurId: bonOrigine.fournisseurId,
    typeEntite: bonOrigine.typeEntite,
    statut: 'validé',
    totalHT: bonOrigine.montantTotal,
    totalTTC: bonOrigine.montantTotal
  }, { transaction });

  // Créer les articles du retour
  const articlesRetour = await db.ArticlePanier.bulkCreate(
    articles.map(article => ({
      panierId: panierRetour.id,
      produitId: article.produitId,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      prixAchatUnitaire: article.prixAchatUnitaire,
      prixVenteUnitaire: article.prixVenteUnitaire,
      code_structure
    })),
    { transaction }
  );

  // Créer l'opération pour le retour
  await require('./operation.controller').createFromBon(bonRetour, transaction);

  console.log(`📋 Bon de retour créé: ${bonRetour.numero}`);
  
  return { bonRetour, panierRetour, articlesRetour };
};