/* const db = require('../../models');

class StockManager {
  // VÉRIFIER LA DISPONIBILITÉ DU STOCK
  async verifierDisponibiliteStock(articles, magasinId, code_structure, typeBon, typeEntite, transaction) {
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
        
        if (typeBon === 'commande' && typeEntite === 'client' && quantiteDisponible < article.quantite) {
          throw new Error(`Stock insuffisant pour le produit. Disponible: ${quantiteDisponible}, Demandé: ${article.quantite}`);
        }
      }
    }
  }

  // TROUVER OU CRÉER UN STOCK
  async trouverOuCreerStock(produitId, magasinId, code_structure, transaction) {
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

  // CALCULER LE STATUT DU STOCK
  calculerStatutStock(quantiteTotale, quantiteReservee, stock) {
    const quantiteDisponible = quantiteTotale - quantiteReservee;
    
    if (quantiteTotale === 0) return 'Rupture';
    if (quantiteDisponible === 0) return 'Réservé';
    if (quantiteDisponible <= stock.seuilAlerte) return 'Critique';
    if (quantiteDisponible <= stock.seuilReapprovisionnement) return 'À réapprovisionner';
    if (quantiteDisponible > (stock.seuilReapprovisionnement + stock.stockSecurite) * 2) return 'Surstock';
    
    return 'En stock';
  }

  // CALCULER LES QUANTITÉS DISPONIBLES
  async getQuantitesDisponibles(articles, magasinId, code_structure) {
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
}

module.exports = new StockManager(); */

const db = require('../../models');

class StockManager {
  /**
   * Vérifier la disponibilité du stock pour un ensemble d'articles
   */
  async verifierDisponibiliteStock(articles, magasinId, code_structure, typeBon, typeEntite, transaction) {
    for (const article of articles) {
      const stock = await db.Stock.findOne({
        where: { produitId: article.produitId || article.produit?.id, magasinId, code_structure },
        transaction
      });

      if (!stock && typeBon === 'commande' && typeEntite === 'client') {
        throw new Error(`Stock indisponible pour le produit ID: ${article.produitId}`);
      }

      if (stock) {
        const disponible = stock.quantiteTotale - stock.quantiteReservee;
        if (typeBon === 'commande' && typeEntite === 'client' && disponible < article.quantite) {
          throw new Error(`Stock insuffisant pour le produit ${article.produitId}. Disponible: ${disponible}`);
        }
      }
    }
  }

  /**
   * Trouver ou créer un stock pour un produit
   */
  async trouverOuCreerStock(produitId, magasinId, code_structure, transaction) {
    let stock = await db.Stock.findOne({ where: { produitId, magasinId, code_structure }, transaction });

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

  /**
   * Calculer le statut du stock selon quantités et seuils
   */
  calculerStatutStock(quantiteTotale, quantiteReservee, stock) {
    const disponible = quantiteTotale - quantiteReservee;

    if (quantiteTotale === 0) return 'Rupture';
    if (disponible === 0) return 'Réservé';
    if (disponible <= stock.seuilAlerte) return 'Critique';
    if (disponible <= stock.seuilReapprovisionnement) return 'À réapprovisionner';
    if (disponible > (stock.seuilReapprovisionnement + stock.stockSecurite) * 2) return 'Surstock';

    return 'En stock';
  }

  /**
   * Retourner les quantités disponibles pour un ensemble d'articles
   */
  async getQuantitesDisponibles(articles, magasinId, code_structure) {
    const resultats = [];

    for (const article of articles) {
      const stock = await db.Stock.findOne({ where: { produitId: article.produitId || article.produit?.id, magasinId, code_structure } });
      if (stock) {
        resultats.push({
          produitId: article.produitId || article.produit?.id,
          quantiteTotale: stock.quantiteTotale,
          quantiteReservee: stock.quantiteReservee,
          quantiteDisponible: stock.quantiteTotale - stock.quantiteReservee,
          statutStock: stock.statutStock
        });
      }
    }

    return resultats;
  }
}

module.exports = new StockManager();
