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

    // 1️⃣ Réserver le stock pour commandes clients
    if (['commandé', 'expédié'].includes(statut) && bon.typeEntite === 'client') {
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
    }

    // 2️⃣ Libérer le stock pour annulations ou retours
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
