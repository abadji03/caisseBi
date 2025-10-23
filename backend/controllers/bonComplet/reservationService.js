/* const db = require('../../models');
const stockManager = require('./stockManager');

class ReservationService {
  // GÉRER LES RÉSERVATIONS DE STOCK
  async gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction) {
    const statutsAvecReservation = ['commandé', 'expédié'];
    //const statutsAvecLiberation = ['annulé', 'retourné'];
    const statutsAvecRealisation = ['livré', 'validé', 'facturé', 'payé'];

    console.log(`📦 Gestion réservations - Statut: ${bon.statutBon}, Type: ${bon.typeEntite}`);

    // RÉSERVER LE STOCK POUR LES COMMANDES CLIENTS
    if (statutsAvecReservation.includes(bon.statutBon) && bon.typeEntite === 'client') {
      for (const article of articles) {
        await this.reserverStockDirect(
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

    // LIBÉRER LE STOCK POUR LES ANNULLATIONS
    if (bon.statutBon === 'annulé') {
      for (const article of articles) {
        await this.libererStockReserveDirect(
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

    // TRAITEMENT DES RETOURS
    if (bon.statutBon === 'retourné') {
      for (const article of articles) {
        await this.libererStockReserveDirect(
          article.produitId || article.produit?.id,
          article.quantite,
          magasinId,
          code_structure,
          bon.id,
          'retour_client',
          transaction
        );
      }
    }

    // MOUVEMENTS PHYSIQUES POUR LIVRAISONS TERMINÉES
    if (statutsAvecRealisation.includes(bon.statutBon)) {
      if (bon.typeEntite === 'client') {
        for (const article of articles) {
          await this.libererStockReserveDirect(
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
    }
  }

  // RÉSERVER DU STOCK DIRECTEMENT
  async reserverStockDirect(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
    const stock = await stockManager.trouverOuCreerStock(produitId, magasinId, code_structure, transaction);

    const ancienneReserve = stock.quantiteReservee || 0;
    const nouvelleReserve = ancienneReserve + quantite;
    const quantiteDisponible = stock.quantiteTotale - ancienneReserve;
    
    if (quantite > quantiteDisponible) {
      throw new Error(`Réservation impossible: stock insuffisant pour le produit ${produitId}`);
    }

    await stock.update({
      quantiteReservee: nouvelleReserve,
      dateDerniereMiseAJour: new Date(),
      statutStock: stockManager.calculerStatutStock(stock.quantiteTotale, nouvelleReserve, stock)
    }, { transaction });

    console.log(`🔒 Stock réservé - Produit: ${produitId}, Quantité: ${quantite}`);
  }

  // LIBÉRER LE STOCK RÉSERVÉ
  async libererStockReserveDirect(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
    const stock = await db.Stock.findOne({
      where: { produitId, magasinId, code_structure },
      transaction
    });

    if (stock && stock.quantiteReservee >= quantite) {
      const nouvelleReserve = Math.max(0, stock.quantiteReservee - quantite);

      await stock.update({
        quantiteReservee: nouvelleReserve,
        dateDerniereMiseAJour: new Date(),
        statutStock: stockManager.calculerStatutStock(stock.quantiteTotale, nouvelleReserve, stock)
      }, { transaction });

      console.log(`🔄 Stock libéré - Produit: ${produitId}, Quantité: ${quantite}`);
    }
  }
}

module.exports = new ReservationService(); */


const db = require('../../models');
const stockManager = require('./stockManager');

class ReservationService {
  /**
   * Gérer les réservations et libérations de stock selon le statut du bon
   */
  async gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction) {
    const statut = bon.statutBon;
    const typeEntite = bon.typeEntite;
    const typeBon = bon.type;

    console.log(`Gestion réservations - ${typeBon}-${typeEntite}, Statut: ${statut}`);

    // RÈGLES MÉTIER SPÉCIFIQUES

    // 1. RÉSERVATIONS COMMANDES CLIENTS
    if (typeEntite === 'client' && typeBon === 'commande') {
        /* if (['commandé', 'expédié'].includes(statut) && bon.typeEntite === 'client') {
          for (const article of articles) {
            await this.reserverStockDirect(
              article.produitId || article.produit?.id,
              article.quantite,
              magasinId,
              code_structure,
              bon.id,
              `réservation_${statut}`,
              transaction
            );
          }
        } */
        if (['commandé', 'expédié'].includes(statut)) {
        await this.reserverStockClient(articles, bon, magasinId, code_structure, transaction);
      }
      
      if (['livré', 'validé', 'facturé', 'payé', 'annulé'].includes(statut)) {
        await this.libererStockClient(articles, bon, magasinId, code_structure, transaction);
      }
     }
    

     // 2. RÉSERVATIONS COMMANDES FOURNISSEURS (préparation réception)
     if (typeEntite === 'fournisseur' && typeBon === 'commande') {
        if (['commandé', 'expédié'].includes(statut)) {
          await this.preparerReceptionFournisseur(articles, bon, magasinId, code_structure, transaction);
        }
        
        if (['livré', 'validé', 'annulé'].includes(statut)) {
          await this.libererPreparationFournisseur(articles, bon, magasinId, code_structure, transaction);
        }
      }

      // 3. LIBÉRATION GÉNÉRIQUE POUR RETOURS
      if (statut === 'retourné') {
        await this.libererStockGenerique(articles, bon, magasinId, code_structure, transaction);
      }
    /* // 2 Libérer le stock pour annulations ou retours
    if (['annulé', 'retourné'].includes(statut)) {
      for (const article of articles) {
        await this.libererStockReserveDirect(
          article.produitId || article.produit?.id,
          article.quantite,
          magasinId,
          code_structure,
          bon.id,
          statut === 'annulé' ? 'annulation_commande' : 'retour_client',
          transaction
        );
      }
    }

    // 3️⃣ Libérer les réservations après livraison ou paiement
    if (['livré', 'validé', 'facturé', 'payé'].includes(statut) && bon.typeEntite === 'client') {
      for (const article of articles) {
        await this.libererStockReserveDirect(
          article.produitId || article.produit?.id,
          article.quantite,
          magasinId,
          code_structure,
          bon.id,
          `réalisation_${statut}`,
          transaction
        );
      }
    } */
  }

  /**
   * Réserver stock pour commande client
   */
  async reserverStockClient(articles, bon, magasinId, code_structure, transaction) {
    for (const article of articles) {
      await this.reserverStockDirect(
        article.produitId,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `réservation_commande_client`,
        transaction
      );
    }
  }

  /**
   * Libérer stock pour commande client
   */
  async libererStockClient(articles, bon, magasinId, code_structure, transaction) {
    for (const article of articles) {
      await this.libererStockReserveDirect(
        article.produitId,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `libération_${bon.statutBon}_client`,
        transaction
      );
    }
  }

  /**
   * Préparer réception fournisseur
   */
  async preparerReceptionFournisseur(articles, bon, magasinId, code_structure, transaction) {
    for (const article of articles) {
      await this.reserverStockDirect(
        article.produitId,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `préparation_réception_fournisseur`,
        transaction
      );
    }
  }

  /**
   * Libérer préparation fournisseur
   */
  async libererPreparationFournisseur(articles, bon, magasinId, code_structure, transaction) {
    for (const article of articles) {
      await this.libererStockReserveDirect(
        article.produitId,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `libération_préparation_${bon.statutBon}`,
        transaction
      );
    }
  }

  /**
   * Libération générique
   */
  async libererStockGenerique(articles, bon, magasinId, code_structure, transaction) {
    for (const article of articles) {
      await this.libererStockReserveDirect(
        article.produitId,
        article.quantite,
        magasinId,
        code_structure,
        bon.id,
        `retour_${bon.typeEntite}`,
        transaction
      );
    }
  }

  /**
   * Réserver le stock directement
   */
  async reserverStockDirect(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
    const stock = await stockManager.trouverOuCreerStock(produitId, magasinId, code_structure, transaction);

    const quantiteDisponible = stock.quantiteTotale - stock.quantiteReservee;
    if (quantite > quantiteDisponible) {
      throw new Error(`Réservation impossible: stock insuffisant pour le produit ${produitId}`);
    }

    await stock.update(
      {
        quantiteReservee: stock.quantiteReservee + quantite,
        dateDerniereMiseAJour: new Date(),
        statutStock: stockManager.calculerStatutStock(stock.quantiteTotale, stock.quantiteReservee + quantite, stock)
      },
      { transaction }
    );
  }

  /**
   * Libérer le stock réservé
   */
  async libererStockReserveDirect(produitId, quantite, magasinId, code_structure, bonId, motif, transaction) {
    const stock = await db.Stock.findOne({ where: { produitId, magasinId, code_structure }, transaction });
    if (!stock || stock.quantiteReservee < quantite) return;

    const nouvelleReserve = Math.max(0, stock.quantiteReservee - quantite);
    await stock.update(
      {
        quantiteReservee: nouvelleReserve,
        dateDerniereMiseAJour: new Date(),
        statutStock: stockManager.calculerStatutStock(stock.quantiteTotale, nouvelleReserve, stock)
      },
      { transaction }
    );
  }
}

module.exports = new ReservationService();
