/* const db = require('../../models');
const stockManager = require('./stockManager');

class MouvementService {
  // DÉTERMINER LE TYPE DE MOUVEMENT
  determinerTypeMouvement(bon) {
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
  }

  // TRAITER UN MOUVEMENT DE STOCK
  async traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction) {
    const typeMouvement = this.determinerTypeMouvement(bon);
    const stock = await stockManager.trouverOuCreerStock(
      article.produitId || article.produit?.id,
      magasinId,
      code_structure,
      transaction
    );

    // Ne traiter que pour les statuts terminaux
    const statutsAvecMouvement = ['livré', 'validé', 'facturé', 'payé', 'retourné'];
    if (!statutsAvecMouvement.includes(bon.statutBon)) {
      return;
    }

    await this.executerMouvementPhysique(article, stock, typeMouvement, bon, agentId, code_structure, transaction);
  }

  // EXÉCUTER LE MOUVEMENT PHYSIQUE
  async executerMouvementPhysique(article, stock, typeMouvement, bon, agentId, code_structure, transaction) {
    const ancienneQuantite = stock.quantiteTotale;
    let nouvelleQuantite = ancienneQuantite;
    
    if (typeMouvement === 'Entree') {
      nouvelleQuantite += article.quantite;
    } else {
      const stockDisponible = ancienneQuantite - stock.quantiteReservee;
      if (stockDisponible < article.quantite) {
        throw new Error(`Stock physique insuffisant. Disponible: ${stockDisponible}, Demandé: ${article.quantite}`);
      }
      nouvelleQuantite = Math.max(0, ancienneQuantite - article.quantite);
    }

    await stock.update({
      quantiteTotale: nouvelleQuantite,
      dateDerniereMiseAJour: new Date(),
      statutStock: stockManager.calculerStatutStock(nouvelleQuantite, stock.quantiteReservee, stock),
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
      description: this.genererDescriptionMouvement(bon, article, typeMouvement),
      motif: `${bon.type} - ${bon.typeEntite} - ${bon.statutBon}`,
      dateMouvement: new Date(),
      code_structure,
      bonId: bon.id
    }, { transaction });
  }

  // GÉNÉRER DESCRIPTION MOUVEMENT
  genererDescriptionMouvement(bon, article, typeMouvement) {
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
}

module.exports = new MouvementService(); */

const db = require('../../models');
const stockManager = require('./stockManager');

class MouvementService {
  /**
   * Déterminer le type de mouvement selon le bon
   */
  determinerTypeMouvement(bon) {
    const matrice = {
      'Commande-client': 'Sortie',
      'Commande-fournisseur': 'null',
      'Livraison-client': 'Sortie',
      'Livraison-fournisseur': 'Entree',
      'Retour-client': 'Entree',
      'Retour-fournisseur': 'Sortie'
    };
    const cle = `${bon.type}-${bon.typeEntite}`;
    const typeMouvement = matrice[cle];
    console.log(`Détermination mouvement - Clé: ${cle}, Résultat: ${typeMouvement}`);
    
    return typeMouvement;
    //return matrice[`${bon.type}-${bon.typeEntite}`] || 'Sortie';
  }

  /**
   * Traiter un mouvement de stock si le statut le nécessite
   */
  async traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction) {
    // const statutsAvecMouvement = ['livré', 'validé', 'facturé', 'payé', 'retourné'];
    // if (!statutsAvecMouvement.includes(bon.statutBon)) return;

    const typeMouvement = this.determinerTypeMouvement(bon);
    
    // Si pas de mouvement défini, ne rien faire
    if (!typeMouvement) {
      console.log(`⏭️ Aucun mouvement nécessaire pour ${bon.type}-${bon.typeEntite}`);
      return;
    }
    const stock = await stockManager.trouverOuCreerStock(
      article.produitId || article.produit?.id,
      magasinId,
      code_structure,
      transaction
    );

    //const typeMouvement = this.determinerTypeMouvement(bon);
    await this.executerMouvementPhysique(article, stock, typeMouvement, bon, agentId, code_structure, transaction);
  }

  /**
   * Exécuter le mouvement physique
   */
  async executerMouvementPhysique(article, stock, typeMouvement, bon, agentId, code_structure, transaction) {
    
    const ancienneQuantite = stock.quantiteTotale;
    let nouvelleQuantite = ancienneQuantite;

    console.log(`Mouvement ${typeMouvement} - Produit: ${article.produitId}, Quantité: ${article.quantite}`);

    if (typeMouvement === 'Entree') {
      nouvelleQuantite += article.quantite;
    } 
    else {
      const stockDisponible = ancienneQuantite - stock.quantiteReservee;
      if (stockDisponible < article.quantite) {
        throw new Error(`Stock insuffisant pour le produit ${article.produitId}. Disponible: ${stockDisponible}`);
      }
      nouvelleQuantite -= article.quantite;
    }

    await stock.update(
      {
        quantiteTotale: nouvelleQuantite,
        dateDerniereMiseAJour: new Date(),
        statutStock: stockManager.calculerStatutStock(nouvelleQuantite, stock.quantiteReservee, stock),
        dernierPrixAchat: article.prixAchatUnitaire || stock.dernierPrixAchat,
        prixVenteUnitaire: article.prixVenteUnitaire || stock.prixVenteUnitaire
      },
      { transaction }
    );

    // Créer le mouvement de stock
    await db.MouvementStock.create(
      {
        ref: `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        produitId: article.produitId || article.produit?.id,
        // eslint-disable-next-line no-undef
        magasinId,
        stockId: stock.id,
        typeMouvement,
        quantite: article.quantite,
        prixUnitaire: typeMouvement === 'Entree' ? article.prixAchatUnitaire : article.prixVenteUnitaire,
        acteurId: agentId,
        description: this.genererDescriptionMouvement(bon, article, typeMouvement),
        motif: `${bon.type} - ${bon.typeEntite} - ${bon.statutBon}`,
        dateMouvement: new Date(),
        code_structure,
        bonId: bon.id
      },
      { transaction }
    );
    console.log(`Mouvement ${typeMouvement} exécuté - Stock: ${ancienneQuantite} → ${nouvelleQuantite}`);
  }

  /**
   * Générer description lisible pour le mouvement
   */
  genererDescriptionMouvement(bon, article, typeMouvement) {
    const actions = {
      'Commande-client': 'Commande client',
      'Commande-fournisseur': 'Réception commande fournisseur',
      'Livraison-client': 'Livraison vers client',
      'Livraison-fournisseur': 'Livraison fournisseur',
      'Retour-client': 'Retour client',
      'Retour-fournisseur': 'Retour fournisseur'
    };
    const cle = `${bon.type}-${bon.typeEntite}`;
    const action = actions[cle] || `Mouvement ${typeMouvement}`;
    
    return `${action} - Bon ${bon.numero}`;
    //return `${actions[cle] || `Mouvement ${typeMouvement}`} - Bon ${bon.numero}`;
  }
}

module.exports = new MouvementService();