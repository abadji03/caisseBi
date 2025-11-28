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

      if (nouveauPanier) {
        await nouveauPanier.update({
          ...panier,
          statut: panier.statut || 'validé',
        }, { transaction });
        
        // Mettre à jour ou créer les articles
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
        /* for (const article of articles) {
          if (article.id) {
            articlesCrees = await db.ArticlePanier.update(article, { where: { id: article.id }, transaction });
          } else {
            articlesCrees = await db.ArticlePanier.create({ ...article, panierId: nouveauPanier.id, code_structure }, { transaction });
          }
        } */
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
      paiementCree = await db.Paiement.create({ ...paiement, montant: nouveauBon.avance, fournisseurId:fournisseurId,clientId:clientId, bonId: nouveauBon.id, panierId: nouveauPanier.id, code_structure, magasinId, date: new Date() }, { transaction });
    }

    // Créer l'opération associée
    if (nouveauBon) {
      await operationController.createFromBon(nouveauBon, transaction);
    }

    // Créer l'opération pour le paiement si applicable
    if (paiementCree) {
      await operationController.createFromPaiement(paiementCree, transaction);
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

  console.log(`Traitement bon client - Type: ${typeBon}, Statut: ${statut}`);

  switch (typeBon) {
    case 'commande':
      // COMMANDE CLIENT: Réservation immédiate du stock
      if (['validé'].includes(statut)) {
        // Vérification stock disponible
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'client', transaction);
        
        // Réservation du stock
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
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