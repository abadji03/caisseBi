const db = require('../../models');
const stockManager = require('./stockManager');

class MouvementService {
  /**
   * Déterminer le type de mouvement selon le bon
   */
  determinerTypeMouvement(bon) {
    const matrice = {
      'commande-client': 'Sortie',
      'vente-client': 'Sortie',
      'commande-fournisseur': null,
      'livraison-client': 'Sortie',
      'livraison-fournisseur': 'Entree',
      'retour-client': 'Entree',
      'retour-fournisseur': 'Sortie'
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

    // Vérifier si le statut autorise le mouvement
    const statutsAutorises = {
      'commande-client': ['livré','annulé'], // Seulement livré pour commande client
      'vente-client': ['validé','annulé'], // Immédiat pour vente validée
      'livraison-fournisseur': ['validé', 'livré', 'facturé','annulé'],
      'retour-client': ['validé', 'retourné','annulé'],
      'retour-fournisseur': ['validé', 'retourné','annulé']
    };
    
    // Si pas de mouvement défini, ne rien faire
    /* if (!typeMouvement) {
      console.log(`⏭️ Aucun mouvement nécessaire pour ${bon.type}-${bon.typeEntite}`);
      return;
    } */
    const cle = `${bon.type}-${bon.typeEntite}`;
    const statutsPourMouvement = statutsAutorises[cle] || [];
    
    if (!statutsPourMouvement.includes(bon.statutBon) || !typeMouvement) {
      console.log(`⏭️ Aucun mouvement nécessaire pour ${cle} avec statut ${bon.statutBon}`);
      return;
    }
    const stock = await stockManager.trouverOuCreerStock(
      article.produitId || article.produit?.id,
      magasinId,
      code_structure,
      transaction
    );

    console.log(`➡️ Préparation mouvement ${typeMouvement} pour le produit ID: ${article.produitId} et pour stock ${stock}`);
    //const typeMouvement = this.determinerTypeMouvement(bon);
    await this.executerMouvementPhysique(article, stock,magasinId, typeMouvement, bon, agentId, code_structure, transaction);
  }

  /**
   * Exécuter le mouvement physique
   */
  async executerMouvementPhysique(article, stock, magasinId,typeMouvement, bon, agentId, code_structure, transaction) {
    
    const ancienneQuantite = Number(stock.quantiteTotale);
    let nouvelleQuantite = ancienneQuantite;

    console.log(`Mouvement ${typeMouvement} - Produit: ${article.produitId}, Quantité: ${article.quantite}`);

    if (typeMouvement === 'Entree') {
      nouvelleQuantite += article.quantite;
    } 
    else {
      const stockDisponible = ancienneQuantite - Number(stock.quantiteReservee);
      if (stockDisponible < article.quantite) {
        throw new Error(`Stock insuffisant pour le produit ${article.produitId}. Disponible: ${stockDisponible}`);
      }
      nouvelleQuantite -= Number(article.quantite);
    }

    const updatedStoct = await stock.update(
      {
        quantiteTotale: nouvelleQuantite,
        dateDerniereMiseAJour: new Date(),
        statutStock: stockManager.calculerStatutStock(nouvelleQuantite, stock.quantiteReservee, stock),
        dernierPrixAchat: article.prixAchatUnitaire || stock.dernierPrixAchat,
        prixVenteUnitaire: article.prixVenteUnitaire || stock.prixVenteUnitaire
      },
      { transaction }
    );
    console.log(`Stock mis à jour pour le produit ID: ${article.produitId} - Ancienne quantité: ${ancienneQuantite}, Nouvelle quantité: ${updatedStoct.quantiteTotale}`);
    // Créer le mouvement de stock
    await db.MouvementStock.create(
      {
        ref: `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        produitId: article.produitId || article.produit?.id,
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
    //return `${actions[cle] || `Mouvement ${typeMouvement}`} - Bon ${bon.numero}`;
  }
}

module.exports = new MouvementService();