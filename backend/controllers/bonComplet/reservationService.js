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
       
        if (['validé'].includes(statut)) {
        await this.reserverStockClient(articles, bon, magasinId, code_structure, transaction);
      }
      
      if (['livré', 'facturé','annulé'].includes(statut)) {
        await this.libererStockClient(articles, bon, magasinId, code_structure, transaction);
      }
     }
    

     // 2. RÉSERVATIONS COMMANDES FOURNISSEURS (préparation réception)
     if (typeEntite === 'fournisseur' && typeBon === 'commande') {
        if (['validé'].includes(statut)) {
          await this.preparerReceptionFournisseur(articles, bon, magasinId, code_structure, transaction);
        }
        
        if (['annulé'].includes(statut)) {
          await this.libererPreparationFournisseur(articles, bon, magasinId, code_structure, transaction);
        }
      }

      // 3. LIBÉRATION GÉNÉRIQUE POUR RETOURS
      if (statut === 'retourné') {
        await this.libererStockGenerique(articles, bon, magasinId, code_structure, transaction);
      }
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
