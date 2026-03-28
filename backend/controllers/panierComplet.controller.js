// controllers/panierComplet.controller.js
const db = require('../models');
const {
  stockManager,
  mouvementService,
} = require('./bonComplet');
const HistoriqueService = require('../services/historique.service');

class PanierCompletController {

  constructor() {
    this.createOrUpdatePanierComplet =
      this.createOrUpdatePanierComplet.bind(this);
  }
  /**
   * Créer ou mettre à jour un panier complet avec impact sur les stocks
   */
  async createOrUpdatePanierComplet(req, res) {
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
    const { panier, paiement, articles, clientId, typeEntite } = req.body;

      console.log('Données reçues pour création panier complet:', {
        panier,
        paiement,
        articles,
        typeEntite
      });

      // Validation
      if (!panier || !articles || !code_structure || !magasinId || !agentId || !typeEntite) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Données incomplètes' });
      }

      // Valider les montants
      if (panier.totalHT < 0 || panier.tva < 0 || panier.remise < 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Les montants ne peuvent pas être négatifs' });
      }

      let nouveauPanier;
      let articlesCrees;
      let paiementCree = null;
      let ancienStatut = null;
      let ancienTypeEntite = null;

      // ==============================
      // GESTION DES MODIFICATIONS DE PANIER
      // ==============================
      if (panier.id) {
        // Mise à jour du panier existant
        nouveauPanier = await db.Panier.findByPk(panier.id, { 
          include: [{ model: db.ArticlePanier, as: 'ArticlePaniers' }],
          transaction 
        });

        if (!nouveauPanier) {
          await transaction.rollback();
          return res.status(404).json({ error: 'Panier introuvable' });
        }

        // Sauvegarder l'ancien état pour l'historique
        ancienStatut = nouveauPanier.statut;
        ancienTypeEntite = nouveauPanier.typeEntite;

      
        // Mettre à jour le panier
        await nouveauPanier.update({
          ...panier,
          code_structure,
          magasinId,
          agentId,
          clientId: clientId || panier.clientId,
          typeEntite: typeEntite || panier.typeEntite,
          dateMiseAJour: new Date()
        }, { transaction });

        // Supprimer les anciens articles
        await db.ArticlePanier.destroy({ 
          where: { panierId: nouveauPanier.id }, 
          transaction 
        });

        // Recréer les articles
        articlesCrees = await db.ArticlePanier.bulkCreate(
          articles.map(article => ({ 
            ...article, 
            panierId: nouveauPanier.id, 
            code_structure 
          })),
          { transaction }
        );

        // ENREGISTRER L'HISTORIQUE DE MODIFICATION
        const modifications = [];
        if (ancienStatut !== panier.statut) {
          modifications.push(`Statut: ${ancienStatut} → ${panier.statut}`);
        }
        if (ancienTypeEntite !== typeEntite) {
          modifications.push(`Type: ${ancienTypeEntite} → ${typeEntite}`);
        }
        if (panier.totalTTC !== nouveauPanier.totalTTC) {
          modifications.push(`Montant: ${nouveauPanier.totalTTC} FCFA`);
        }

        await HistoriqueService.enregistrerAction(
          agentId,
          `Modification du panier #${nouveauPanier.id} - ${modifications.join(', ')}`,
          clientIp,
          {
            action: 'UPDATE_PANIER',
            panierId: nouveauPanier.id,
            ancienStatut,
            nouveauStatut: panier.statut,
            ancienTypeEntite,
            nouveauTypeEntite: typeEntite,
            modifications: modifications,
            articles: articles.map(a => ({
              produitId: a.produitId,
              quantite: a.quantite,
              prixUnitaire: a.prixUnitaire
            }))
          }
        );

      } else {
        // ==============================
        // CRÉATION D'UN NOUVEAU PANIER
        // ==============================
        nouveauPanier = await db.Panier.create({
          ...panier,
          code_structure,
          magasinId,
          agentId,
          clientId: clientId || null, // Client facultatif
          typeEntite,
          statut: panier.statut || 'en_cours', // Par défaut validé pour les ventes
          dateCreation: new Date(),
          dateMiseAJour: new Date()
        }, { transaction });

        // Créer les articles
        articlesCrees = await db.ArticlePanier.bulkCreate(
          articles.map(article => ({ 
            ...article, 
            panierId: nouveauPanier.id, 
            code_structure 
          })),
          { transaction }
        );

        // ENREGISTRER L'HISTORIQUE DE CRÉATION
        //const clientInfo = clientId ? `Client ID: ${clientId}` : 'Client non spécifié';
        
        await HistoriqueService.enregistrerAction(
          agentId,
          `Création d'un nouveau panier #${nouveauPanier.id} - ${typeEntite} - ${panier.statut} - Total: ${panier.totalTTC || 0} FCFA`,
          clientIp,
          {
            action: 'CREATE_PANIER',
            panierId: nouveauPanier.id,
            typeEntite: typeEntite,
            statut: panier.statut,
            clientId: clientId || null,
            montants: {
              totalHT: panier.totalHT,
              tva: panier.tva,
              remise: panier.remise,
              totalTTC: panier.totalTTC
            },
            articles: articles.map(a => ({
              produitId: a.produitId,
              quantite: a.quantite,
              prixUnitaire: a.prixUnitaire,
              totalLigne: a.quantite * a.prixUnitaire
            }))
          }
        );
      }

      // ==============================
      // TRAITEMENT SELON TYPE D'ENTITÉ ET STATUT
      // ==============================
      let traitementDetails = null;

      if (panier.statut === 'validé') {
        traitementDetails = await this.traiterPanierValide(nouveauPanier, articles, magasinId, agentId, code_structure, transaction);
      } 
      else if (panier.statut === 'retourné') {
        traitementDetails = await this.traiterPanierRetourne(nouveauPanier, articles, magasinId, agentId, code_structure, transaction);
      }
      else if (panier.statut === 'annulé') {
        traitementDetails = await this.traiterPanierAnnule(nouveauPanier, articles, magasinId, agentId, code_structure, transaction);
      }

      // ==============================
      // GESTION DES PAIEMENTS
      // ==============================
      if (paiement && nouveauPanier.totalTTC > 0) {

        // 1️⃣ Chercher un paiement existant pour ce panier
        const paiementExistant = await db.Paiement.findOne({
          where: {
            panierId: nouveauPanier.id,
            code_structure,
          },
          transaction
        });

        if (paiementExistant) {
          // 2️⃣ Mise à jour du paiement existant
          const ancienMontant = paiementExistant.montant;
          await paiementExistant.update({
            ...paiement,
            montant: nouveauPanier.totalTTC,
            clientId: clientId || paiementExistant.clientId,
            magasinId,
            code_structure,
            agentId,
            typePaiement: typeEntite,
            date: new Date()
          }, { transaction });

          paiementCree = paiementExistant;

          // ENREGISTRER L'HISTORIQUE DE PAIEMENT MODIFIÉ
          if (ancienMontant !== nouveauPanier.totalTTC) {
            await HistoriqueService.enregistrerAction(
              agentId,
              `Modification du paiement pour le panier #${nouveauPanier.id} - Montant: ${ancienMontant} → ${nouveauPanier.totalTTC} FCFA`,
              clientIp,
              {
                action: 'UPDATE_PAIEMENT',
                panierId: nouveauPanier.id,
                paiementId: paiementExistant.id,
                ancienMontant,
                nouveauMontant: nouveauPanier.totalTTC,
                modePaiement: paiement.mode
              }
            );
          }

        } else {
          // 3️⃣ Création d’un nouveau paiement
          paiementCree = await db.Paiement.create({
            ...paiement,
            montant: nouveauPanier.totalTTC,
            clientId: clientId || null,
            panierId: nouveauPanier.id,
            code_structure,
            magasinId,
            agentId,
            typePaiement: typeEntite,
            date: new Date()
          }, { transaction });

          // ENREGISTRER L'HISTORIQUE DE PAIEMENT CRÉÉ
          await HistoriqueService.enregistrerAction(
            agentId,
            `Paiement enregistré pour le panier #${nouveauPanier.id} - ${paiement.montant} FCFA (${paiement.mode || 'mode non spécifié'})`,
            clientIp,
            {
              action: 'CREATE_PAIEMENT',
              panierId: nouveauPanier.id,
              paiementId: paiementCree.id,
              montant: paiement.montant,
              mode: paiement.mode,
              reference: paiement.reference
            }
          );
        }
      }


      // ==============================
      // CRÉATION DES OPÉRATIONS COMPTABLES
      // ==============================
      //await this.creerOperationPourPanier(nouveauPanier, paiementCree, code_structure, transaction);

      // ENREGISTRER L'HISTORIQUE GLOBAL SI TRAITEMENT SPÉCIFIQUE
      if (traitementDetails) {
        await HistoriqueService.enregistrerAction(
          agentId,
          traitementDetails.message,
          clientIp,
          {
            ...traitementDetails.details,
            action: traitementDetails.actionType,
            panierId: nouveauPanier.id
          }
        );
      }
      // Valider la transaction
      await transaction.commit();

      // ENREGISTRER UN RÉSUMÉ FINAL (optionnel)
      await HistoriqueService.enregistrerAction(
        agentId,
        `Panier #${nouveauPanier.id} traité avec succès - ${typeEntite} - ${panier.statut}`,
        clientIp,
        {
          action: 'PANIER_TRAITE',
          panierId: nouveauPanier.id,
          typeEntite,
          statut: panier.statut,
          totalTTC: nouveauPanier.totalTTC,
          nbArticles: articles.length,
          paiement: paiementCree ? {
            id: paiementCree.id,
            mode: paiementCree.mode,
            montant: paiementCree.montant
          } : null
        }
      );

      res.status(201).json({
        message: 'Panier traité avec succès',
        panier: nouveauPanier,
        paiement: paiementCree, 
        articles: articlesCrees,
        typeEntite: typeEntite
      });

    } catch (error) {
      await transaction.rollback();
      // ENREGISTRER L'ERREUR DANS L'HISTORIQUE
      if (req.user) {
        const clientIp = HistoriqueService.getClientIp(req);
        await HistoriqueService.enregistrerAction(
          req.user.id,
          `Erreur lors du traitement du panier: ${error.message}`,
          clientIp,
          {
            action: 'PANIER_ERROR',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            panierData: req.body.panier ? {
              id: req.body.panier.id,
              typeEntite: req.body.typeEntite,
              statut: req.body.panier.statut
            } : null
          }
        ).catch(console.error); // Ne pas bloquer si l'historique échoue
      }
      console.error('Erreur traitement panier complet:', error);
      res.status(500).json({ 
        error: 'Erreur lors du traitement du panier', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Traiter un panier validé (vente)
   */
  /* async traiterPanierValide(panier, articles, magasinId, agentId, code_structure, transaction) {
    console.log(`💰 Traitement panier validé (vente) - Type: ${panier.typeEntite}`);

    // 1. Vérifier la disponibilité du stock pour les clients
      await stockManager.verifierDisponibiliteStock(
        articles, 
        magasinId, 
        code_structure, 
        'vente', 
        'client', 
        transaction
      );

    // 2. Traiter les mouvements de stock
    await Promise.all(
      articles.map(async (article) => {

        await mouvementService.traiterMouvementStockBis(
          article, 
          panier, 
          magasinId, 
          agentId, 
          code_structure, 
          transaction
        );
      })
    );

    console.log(`✅ Panier ${panier.id} validé - Stock mis à jour`);
    
  } */

  async traiterPanierValide(panier, articles, magasinId, agentId, code_structure, clientIp, transaction) {
    console.log(`💰 Traitement panier validé (vente) - Type: ${panier.typeEntite}`);

    try {
      // 1. Vérifier la disponibilité du stock pour les clients
      await stockManager.verifierDisponibiliteStock(
        articles, 
        magasinId, 
        code_structure, 
        'vente', 
        'client', 
        transaction
      );

      // 2. Traiter les mouvements de stock
      const mouvements = [];
      for (const article of articles) {
        const mouvement = await mouvementService.traiterMouvementStockBis(
          article, 
          panier, 
          magasinId, 
          agentId, 
          code_structure, 
          transaction
        );
        mouvements.push(mouvement);
      }

      console.log(`✅ Panier ${panier.id} validé - Stock mis à jour`);

      // Retourner les détails pour l'historique
      return {
        actionType: 'VENTE_VALIDEE',
        message: `Vente validée - Panier #${panier.id} - ${articles.length} article(s) - Total: ${panier.totalTTC} FCFA`,
        details: {
          typeEntite: panier.typeEntite,
          totalTTC: panier.totalTTC,
          articles: articles.map(a => ({
            produitId: a.produitId,
            quantite: a.quantite,
            prix: a.prixUnitaire
          })),
          mouvements: mouvements.map(m => ({
            produitId: m.produitId,
            quantite: m.quantite,
            type: m.type
          }))
        }
      };
    } catch (error) {
      // ENREGISTRER L'ERREUR DE STOCK
      await HistoriqueService.enregistrerAction(
        agentId,
        `Erreur de stock lors de la validation du panier #${panier.id}: ${error.message}`,
        clientIp,
        {
          action: 'STOCK_ERROR',
          panierId: panier.id,
          error: error.message,
          articles: articles.map(a => ({
            produitId: a.produitId,
            quantite: a.quantite,
            stockDisponible: a.stockDisponible || 'inconnu'
          }))
        }
      );
      throw error;
    }
  }


  /**
   * Traiter un panier retourné
   */
  /* async traiterPanierRetourne(panier, articles, magasinId, agentId, code_structure, transaction) {
    console.log(`↩️ Traitement panier retourné - Type: ${panier.typeEntite}`);

    // Traiter les mouvements de stock (entrée pour retour client, sortie pour retour fournisseur)
    await Promise.all(
      articles.map(async (article) => {
        await mouvementService.traiterMouvementStockBis(
          article, 
          panier, 
          magasinId, 
          agentId, 
          code_structure, 
          transaction
        );
      })
    );

    console.log(`✅ Panier ${panier.id} retourné - Stock ajusté`);
  }
 */
  /**
   * Traiter un panier annulé
   */
  /* async traiterPanierAnnule(panier, articles, magasinId, agentId, code_structure, transaction) {
    console.log(`🚫 Traitement panier annulé - Type: ${panier.typeEntite}`);

      await Promise.all(
        articles.map(async (article) => {
          await mouvementService.traiterMouvementStockBis(
            article, 
            panier, 
            magasinId, 
            agentId, 
            code_structure, 
            transaction
          );
        })
      );

    console.log(`✅ Panier ${panier.id} annulé - Impact annulé`);
  }
 */

  /**
   * Traiter un panier retourné
   */
  async traiterPanierRetourne(panier, articles, magasinId, agentId, code_structure, clientIp, transaction) {
    console.log(`↩️ Traitement panier retourné - Type: ${panier.typeEntite}`);

    try {
      // Traiter les mouvements de stock (entrée pour retour client, sortie pour retour fournisseur)
      const mouvements = [];
      for (const article of articles) {
        const mouvement = await mouvementService.traiterMouvementStockBis(
          article, 
          panier, 
          magasinId, 
          agentId, 
          code_structure, 
          transaction
        );
        mouvements.push(mouvement);
      }

      console.log(`✅ Panier ${panier.id} retourné - Stock ajusté`);

      return {
        actionType: 'RETOUR_TRAITE',
        message: `Retour traité - Panier #${panier.id} - ${articles.length} article(s) retourné(s)`,
        details: {
          typeEntite: panier.typeEntite,
          articles: articles.map(a => ({
            produitId: a.produitId,
            quantite: a.quantite,
            motif: a.motifRetour || 'non spécifié'
          })),
          mouvements: mouvements.map(m => ({
            produitId: m.produitId,
            quantite: m.quantite,
            type: m.type
          }))
        }
      };
    } catch (error) {
      await HistoriqueService.enregistrerAction(
        agentId,
        `Erreur lors du retour du panier #${panier.id}: ${error.message}`,
        clientIp,
        {
          action: 'RETURN_ERROR',
          panierId: panier.id,
          error: error.message
        }
      );
      throw error;
    }
  }

  /**
   * Traiter un panier annulé
   */
  async traiterPanierAnnule(panier, articles, magasinId, agentId, code_structure, clientIp, transaction) {
    console.log(`🚫 Traitement panier annulé - Type: ${panier.typeEntite}`);

    try {
      const mouvements = [];
      for (const article of articles) {
        const mouvement = await mouvementService.traiterMouvementStockBis(
          article, 
          panier, 
          magasinId, 
          agentId, 
          code_structure, 
          transaction
        );
        mouvements.push(mouvement);
      }

      console.log(`✅ Panier ${panier.id} annulé - Impact annulé`);

      return {
        actionType: 'ANNULATION_TRAITEE',
        message: `Annulation traitée - Panier #${panier.id} - ${articles.length} article(s) annulé(s)`,
        details: {
          typeEntite: panier.typeEntite,
          articles: articles.map(a => ({
            produitId: a.produitId,
            quantite: a.quantite
          }))
        }
      };
    } catch (error) {
      await HistoriqueService.enregistrerAction(
        agentId,
        `Erreur lors de l'annulation du panier #${panier.id}: ${error.message}`,
        clientIp,
        {
          action: 'CANCEL_ERROR',
          panierId: panier.id,
          error: error.message
        }
      );
      throw error;
    }
  }
}

module.exports = new PanierCompletController();