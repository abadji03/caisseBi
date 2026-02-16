// controllers/panierComplet.controller.js
const db = require('../models');
const {
  stockManager,
  mouvementService,
} = require('./bonComplet');

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
      }

      // ==============================
      // TRAITEMENT SELON TYPE D'ENTITÉ ET STATUT
      // ==============================
      if (panier.statut === 'validé') {
        await this.traiterPanierValide(nouveauPanier, articles, magasinId, agentId, code_structure, transaction);
      } 
      else if (panier.statut === 'retourné') {
        await this.traiterPanierRetourne(nouveauPanier, articles, magasinId, agentId, code_structure, transaction);
      }
      else if (panier.statut === 'annulé') {
        await this.traiterPanierAnnule(nouveauPanier, articles, magasinId, agentId, code_structure, transaction);
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
        }
      }


      // ==============================
      // CRÉATION DES OPÉRATIONS COMPTABLES
      // ==============================
      //await this.creerOperationPourPanier(nouveauPanier, paiementCree, code_structure, transaction);

      // Valider la transaction
      await transaction.commit();

      res.status(201).json({
        message: 'Panier traité avec succès',
        panier: nouveauPanier,
        paiement: paiementCree, 
        articles: articlesCrees,
        typeEntite: typeEntite
      });

    } catch (error) {
      await transaction.rollback();
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
  async traiterPanierValide(panier, articles, magasinId, agentId, code_structure, transaction) {
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
  }

  /**
   * Traiter un panier retourné
   */
  async traiterPanierRetourne(panier, articles, magasinId, agentId, code_structure, transaction) {
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

  /**
   * Traiter un panier annulé
   */
  async traiterPanierAnnule(panier, articles, magasinId, agentId, code_structure, transaction) {
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

}

module.exports = new PanierCompletController();