const db = require('../models');
const operationController = require('./operation.controller');
const HistoriqueService = require('../services/historique.service'); 

const {
  stockManager,
  reservationService,
  mouvementService,
  statutManager
} = require('./bonComplet');


exports.createBonComplet = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    const magasinId = authUser.magasinId;
    const agentId = authUser.id;

    const { bon, panier, articles, paiement,fournisseurId, clientId, typeEntite } = req.body;

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
    let isUpdate = false;

    // LOGIQUE MÉTIER AMÉLIORÉE
    console.log(`Création bon - Type: ${bon.type}, Entité: ${typeEntite}, Statut: ${bon.statutBon}`);
    
    // ==============================
    // GESTION DES MODIFICATIONS DE BON
    // ==============================

    //Vérifier si le bon existe
    if (bon.id) {
      isUpdate = true;
      
      // Récupérer l'ancien bon pour comparer
      const ancienBon = await db.Bon.findByPk(bon.id, { transaction })

      // Mise à jour statut / informations existantes
      nouveauBon = await db.Bon.findByPk(bon.id, { transaction });
      if (!nouveauBon) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Bon introuvable' });
      }

      // Préparer les données et mettre à jour le bon
      const bonData = await statutManager.preparerDonneesBon(bon, typeEntite, clientId, fournisseurId);
      
      // Sauvegarder l'ancien statut
      const ancienStatut = nouveauBon.statutBon;

      // Mettre à jour le bon
      await nouveauBon.update({...bonData, agentId,code_structure,magasinId}, { transaction });

      // ENREGISTRER L'HISTORIQUE POUR MISE À JOUR
      const changes = {};
      if (ancienBon.statutBon !== nouveauBon.statutBon) {
        changes.statutBon = { old: ancienBon.statutBon, new: nouveauBon.statutBon };
      }
      if (ancienBon.montantTotal !== nouveauBon.montantTotal) {
        changes.montantTotal = { old: ancienBon.montantTotal, new: nouveauBon.montantTotal };
      }
      
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Mise à jour du bon ${nouveauBon.numero} (${typeEntite}) - Nouveau statut: ${nouveauBon.statutBon}`,
        clientIp,
        {
          action: 'UPDATE_BON',
          bonId: nouveauBon.id,
          bonNumero: nouveauBon.numero,
          typeEntite,
          typeBon: bon.type,
          changes,
          ancienStatut,
          nouveauStatut: nouveauBon.statutBon
        }
      );

      // Mettre à jour le panier associé
      nouveauPanier = await db.Panier.findOne({ where: { bonId: nouveauBon.id }, transaction });

      if (nouveauPanier) {
        await nouveauPanier.update({
          ...panier,
          code_structure,
          magasinId,
          agentId,
          statut: panier.statut || 'validé',
        }, { transaction });
        
        //Supprimer tous les anciens articles et recréer
        await db.ArticlePanier.destroy({ 
          where: { panierId: nouveauPanier.id, code_structure }, 
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
      const bonExistantAvecNumero = await db.Bon.findOne({
          where: {
            numero: bon.numero,
            type: bon.type,
            typeEntite: typeEntite
          },
          transaction
        });
      
        if(bonExistantAvecNumero){
          const newNumero = bonExistantAvecNumero.numero + Math.floor(Math.random() * (1000 - 2 + 1)) + 2;
          bon.numero = newNumero;
        }
      // ==============================
      // Création d’un nouveau bon
      // ==============================

      const bonData = await statutManager.preparerDonneesBon({ ...bon, statutBon: 'brouillon' }, typeEntite, clientId, fournisseurId);
      
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

      // ENREGISTRER L'HISTORIQUE POUR CRÉATION
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Création du bon ${nouveauBon.numero} (${typeEntite}) - Type: ${bon.type} - Statut: ${nouveauBon.statutBon}`,
        clientIp,
        {
          action: 'CREATE_BON',
          bonId: nouveauBon.id,
          bonNumero: nouveauBon.numero,
          typeEntite,
          typeBon: bon.type,
          statut: nouveauBon.statutBon,
          montantTotal: nouveauBon.montantTotal,
          clientId,
          fournisseurId
        }
      );
       
    }

    
    // --- WORKFLOW SELON statutBon ---

    // CAS 1: BONS FOURNISSEURS
    if (typeEntite === 'fournisseur') {
      await this.traiterBonFournisseur(nouveauBon, articles, magasinId, agentId, code_structure,panier, transaction);
    }
    // CAS 2: BONS CLIENTS
    else if (typeEntite === 'client') {
      await this.traiterBonClient(nouveauBon, articles, magasinId, agentId, code_structure,panier, transaction);
    } 

    // ==============================
      // AJOUTEZ ICI: Gestion du bon de retour
      // ==============================
      if (bon.type === 'retour' && bon.numeroBonOrigine) {
        // Mettre à jour le statut du bon d'origine
        await this.mettreAJourBonOrigineRetour(nouveauBon, agentId, code_structure, transaction);
      }
    // 7. Créer paiement si avance
    console.log('Vérification de la création du paiement pour l\'avance...');
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
        typePaiement: typeEntite,
        agentId,
        date: new Date() 
      }, 
      { transaction });
    
      // ENREGISTRER L'HISTORIQUE POUR PAIEMENT
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Création d'un paiement d'avance de ${nouveauBon.avance} FCFA pour le bon ${nouveauBon.numero}`,
        clientIp,
        {
          action: 'CREATE_PAIEMENT_AVANCE',
          bonId: nouveauBon.id,
          bonNumero: nouveauBon.numero,
          montant: nouveauBon.avance,
          typeEntite,
          magasinId
        }
      );
      // CAS 1: BONS FOURNISSEURS
      if (typeEntite === 'fournisseur') {
        await statutManager.mettreAJourFournisseurApresVersement({ ...paiementCree.toJSON(), magasinId },fournisseurId, transaction);
      }
      // CAS 2: BONS CLIENTS
      else if (typeEntite === 'client') {
        await statutManager.mettreAJourClientApresRegelement({ ...paiementCree.toJSON(), magasinId },clientId, transaction);
      } 
    }

    // Créer ou mettre à jour l'opération associée
    console.log('Création/mise à jour de l\'opération associée au bon...'); 
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
    console.log('Création/mise à jour de l\'opération associée au paiement...');  
    if (paiementCree) {
      const operationPaiement = await operationController.createFromPaiement(paiementCree, transaction);
      console.log('💳 Opération de paiement:', {
        operationId: operationPaiement.id,
        type: operationPaiement.type,
        montant: operationPaiement.montantPaye
      });
    }  

    // Vérifier et corriger les incohérences
    console.log('Vérification et synchronisation des opérations pour la structure:', code_structure);                                   
    await operationController.synchroniserOperations(code_structure, transaction);

    // Ou pour un seul bon spécifique :
    console.log('Vérification et mise à jour de l\'opération pour le bon spécifique...');
    if (nouveauBon && nouveauBon.id) {
      // Vérifier si l'opération existe et est à jour
      const operationExistante = await db.Operation.findOne({
        where: { bonId: nouveauBon.id },
        transaction
      });

      if (operationExistante) {
        // Mettre à jour l'opération existante
        await operationController.updateFromBon(nouveauBon, transaction);
        console.log(`✅ Opération pour le bon ${nouveauBon.numero} mise à jour avec succès.`,
          {
            operationId: operationController.id,
            type: operationController.type,
            montant: operationController.montantPaye
          });  
      } else {
        // Créer une nouvelle opération
        await operationController.createFromBon(nouveauBon, transaction);
        console.log(`✅ Opération pour le bon ${nouveauBon.numero} créée avec succès.`,
          {
            operationId: operationController.id,
            type: operationController.type,
            montant: operationController.montantPaye
         });  
      }
    }
    // Valider transaction
    await transaction.commit();

    // ENREGISTRER L'HISTORIQUE FINAL DE SUCCÈS
    await HistoriqueService.enregistrerAction(
      authUser.id,
      isUpdate ? `Bon ${nouveauBon.numero} mis à jour avec succès` : `Bon ${nouveauBon.numero} créé avec succès`,
      clientIp,
      {
        action: isUpdate ? 'UPDATE_BON_SUCCESS' : 'CREATE_BON_SUCCESS',
        bonId: nouveauBon.id,
        bonNumero: nouveauBon.numero,
        typeEntite,
        typeBon: bon.type,
        statut: nouveauBon.statutBon
      }
    );

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
    // ENREGISTRER L'HISTORIQUE D'ERREUR
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la ${req.body.bon?.id ? 'mise à jour' : 'création'} du bon`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_BON_OPERATION',
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          bonData: req.body.bon
        }
      );
    }

    res.status(500).json({ 
      error: 'Erreur lors de la création/modification du bon', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Traitement spécifique pour les bons fournisseurs
 */
exports.traiterBonFournisseur = async (bon, articles, magasinId, agentId, code_structure, panier,transaction) => {
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
      
        // Historique
        await HistoriqueService.enregistrerAction(
          agentId,
          `Commande fournisseur ${bon.numero} validée - Réservation de stock effectuée`,
          null,
          { action: 'FOURNISSEUR_COMMANDE_VALIDEE', bonId: bon.id, articles: articles.length }
        );
      }
      if (['annulé'].includes(statut)) {
        // Réservation pour préparation réception
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        await HistoriqueService.enregistrerAction(
          agentId,
          `Commande fournisseur ${bon.numero} annulée - Réservations libérées`,
          null,
          { action: 'FOURNISSEUR_COMMANDE_ANNULEE', bonId: bon.id }
        );
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
      
        await HistoriqueService.enregistrerAction(
          agentId,
          `Livraison fournisseur ${bon.numero} - Entrée en stock de ${articles.reduce((sum, a) => sum + a.quantite, 0)} articles`,
          null,
          { action: 'FOURNISSEUR_LIVRAISON_VALIDEE', bonId: bon.id, articlesCount: articles.length }
        );
      }
      if (['retourné'].includes(statut)) {
        // Créer un bon de retour automatique
        await this.creerBonRetour(bon, articles, magasinId, agentId, code_structure,panier, transaction);
        
        // Entrée du stock (retour fournisseur)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
        
        // Mise à jour du fournisseur (création d'avoir)
        await statutManager.mettreAJourEntite(bon, 'fournisseur',null, bon.fournisseurId, transaction);
      
        await HistoriqueService.enregistrerAction(
          agentId,
          `Retour livraison fournisseur ${bon.numero} - Sortie de stock`,
          null,
          { action: 'FOURNISSEUR_LIVRAISON_RETOURNEE', bonId: bon.id }
        );
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
      
        await HistoriqueService.enregistrerAction(
          agentId,
          `Retour fournisseur ${bon.numero} traité - Stock ajusté`,
          null,
          { action: 'FOURNISSEUR_RETOUR_VALIDE', bonId: bon.id }
        );
      }
      break;

       case 'avoir':
      // AVOIR FOURNISSEUR: Sortie de stock après validation
      if (['validé'].includes(statut)) {
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
exports.traiterBonClient = async (bon, articles, magasinId, agentId, code_structure,panier, transaction) => {
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
        await HistoriqueService.enregistrerAction(
          agentId,
          `Commande client ${bon.numero} validée - Stock réservé`,
          null,
          { action: 'CLIENT_COMMANDE_VALIDEE', bonId: bon.id, articles: articles.length }
        );
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

        await HistoriqueService.enregistrerAction(
          agentId,
          `Commande client ${bon.numero} livrée - Stock sorti`,
          null,
          { action: 'CLIENT_COMMANDE_LIVREE', bonId: bon.id }
        );
      }
      if (['retourné'].includes(statut)) {
        // Créer un bon de retour automatique
        await this.creerBonRetour(bon, articles, magasinId, agentId, code_structure,panier, transaction);
        
        // Entrée du stock (retour client)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
        
        // Mise à jour du client (création d'avoir)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      
        await HistoriqueService.enregistrerAction(
          agentId,
          `Commande client ${bon.numero} retournée - Stock réintégré`,
          null,
          { action: 'CLIENT_COMMANDE_RETOURNEE', bonId: bon.id }
        );
      }
      
      if (['annulé'].includes(statut)) {
        // Libérer les réservations
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Annuler la dette
        //const bonAnnule = { ...bon, montantTotal: Math.abs(bon.montantTotal) };
        //await statutManager.mettreAJourEntite(bonAnnule, 'client', bon.clientId, null, transaction);
      
        await HistoriqueService.enregistrerAction(
          agentId,
          `Commande client ${bon.numero} annulée - Réservations libérées`,
          null,
          { action: 'CLIENT_COMMANDE_ANNULEE', bonId: bon.id }
        );
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

        await HistoriqueService.enregistrerAction(
          agentId,
          `Vente client ${bon.numero} validée - Stock sorti`,
          null,
          { action: 'CLIENT_VENTE_VALIDEE', bonId: bon.id, montant: bon.montantTotal }
        );
      }
       if (['retourné'].includes(statut)) {
        // Créer un bon de retour automatique
        await this.creerBonRetour(bon, articles, magasinId, agentId, code_structure,panier, transaction);
        
        // Entrée du stock (retour client)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );
        
        // Mise à jour du client (création d'avoir)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      
        await HistoriqueService.enregistrerAction(
          agentId,
          `Vente client ${bon.numero} retournée - Stock réintégré`,
          null,
          { action: 'CLIENT_VENTE_RETOURNEE', bonId: bon.id }
        );
      }
   
      break;
    case 'retour':
      // RETOUR CLIENT: Entrée en stock après validation

      if (['validé'].includes(statut)) {
        // Pour un retour validé, entrée en stock et création d'avoir
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      
        await HistoriqueService.enregistrerAction(
          agentId,
          `Retour client ${bon.numero} validé - Stock réintégré`,
          null,
          { action: 'CLIENT_RETOUR_VALIDE', bonId: bon.id }
        );
      }
      
      break;
      case 'avoir':
      // RETOUR CLIENT: Entrée en stock après validation

      if (['validé'].includes(statut)) {
        // Pour un avoir validé, on met à jour le client et on crée l'avoir
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      
      break;
    default:
      console.log(`Type de bon client non géré: ${typeBon}`);
  }
};

/**
 * Mettre à jour le bon d'origine lors de la création d'un retour
 */
exports.mettreAJourBonOrigineRetour = async (bonRetour, agentId, code_structure, transaction) => {
  if (!bonRetour.numeroBonOrigine) return null;
  
  const bonOrigine = await db.Bon.findOne({
    where: {
      numero: bonRetour.numeroBonOrigine,
      code_structure: code_structure
    },
    transaction
  });
  
  if (!bonOrigine) {
    console.warn(`⚠️ Bon d'origine ${bonRetour.numeroBonOrigine} introuvable`);
    return null;
  }
  
  // Mettre à jour le statut du bon d'origine
  const ancienStatut = bonOrigine.statutBon;
  await bonOrigine.update({
    statutBon: 'retourné partiellement',
    montantAvoir:bonRetour.montantAvoir,
  }, { transaction });
  
  // Historique
  await statutManager.creerHistoriqueStatut(
    bonOrigine.id,
    ancienStatut,
    'retourné partiellement',
    agentId,
    `Bon retourné via ${bonRetour.numero}`,
    code_structure,
    transaction
  );
  
  // ENREGISTRER L'HISTORIQUE
  await HistoriqueService.enregistrerAction(
    agentId,
    `Bon d'origine ${bonOrigine.numero} marqué comme "retourné partiellement" suite au retour ${bonRetour.numero}`,
    null,
    {
      action: 'BON_ORIGINE_RETOURNE',
      bonOrigineId: bonOrigine.id,
      bonOrigineNumero: bonOrigine.numero,
      bonRetourId: bonRetour.id,
      bonRetourNumero: bonRetour.numero,
      ancienStatut,
      nouveauStatut: 'retourné partiellement'
    }
  );

  // Mettre à jour l'opération associée
  const operationOrigine = await db.Operation.findOne({
    where: { bonId: bonOrigine.id },
    transaction
  });
  
  if (operationOrigine) {
    await operationOrigine.update({
      statut: 'retourné',
      dateRetour: new Date(),
      commentaire: `Retourné via ${bonRetour.numero}`
    }, { transaction });
    
    // Optionnel: créer une opération inverse pour le retour
    const operationRetour = await operationController.createFromBon(bonRetour, transaction);
    operationRetour.operationOrigineId = operationOrigine.id;
    await operationRetour.save({ transaction });
    
    console.log(`🔄 Opération ${operationOrigine.id} marquée comme retournée, opération de retour ${operationRetour.id} créée`);
  }
  
  console.log(`✅ Bon d'origine ${bonOrigine.numero} mis à jour avec statut "retourné"`);
  return bonOrigine;
};

/**
 * Créer un bon de retour automatique
 */
exports.creerBonRetour = async (bonOrigine, articles, magasinId, agentId, code_structure, panier, transaction) => {

  console.log('Début création bon de retour à partir du bon ',bonOrigine.id)
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
    montantTotal:  bonOrigine.netAPayer|| bonOrigine.montantTotal,
    montantAvoir:  bonOrigine.netAPayer || bonOrigine.montantTotal, // Montant de l'avoir
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
    remise:panier.remise || bonOrigine.remise,
    clientId: panier.clientId,
    tva:panier.tva,
    tauxTVA:panier.tauxTVA,
    fournisseurId: panier.fournisseurId,
    typeEntite: panier.typeEntite,
    statut: 'validé',
    totalHT: panier.totalHT,
    totalTTC: panier.totalTTC
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
      code_structure,
      remise: article.remise || 0,
      tauxTVA: article.tauxTVA || 0,
      montantTVA: article.montantTVA || 0,  
      montantRemise: article.montantRemise || 0,
      totalHT: article.totalHT || 0,
      totalTTC: article.totalTTC || 0
    })),
    { transaction }
  );

  // Créer l'opération pour le retour
  await require('./operation.controller').createFromBon(bonRetour, transaction);

  // ENREGISTRER L'HISTORIQUE
  await HistoriqueService.enregistrerAction(
    agentId,
    `Création automatique du bon de retour ${bonRetour.numero} pour le bon ${bonOrigine.numero}`,
    null,
    {
      action: 'CREATION_BON_RETOUR_AUTO',
      bonRetourId: bonRetour.id,
      bonRetourNumero: bonRetour.numero,
      bonOrigineId: bonOrigine.id,
      bonOrigineNumero: bonOrigine.numero,
      articlesCount: articlesRetour.length
    }
  );


  console.log(`📋 Bon de retour créé: ${bonRetour.numero}`);
  
  return { bonRetour, panierRetour, articlesRetour };
};