// services/actionMessages.service.js
class ActionMessagesService {
  /**
   * Génère un message pour la création d'un produit
   */
  static getCreateProductMessage(produit) {
    return `Création du produit: ${produit.designation} (ID: ${produit.id}) - Prix: ${produit.prixVenteUnitaire} FCFA`;
  }

  /**
   * Génère un message pour la mise à jour d'un produit
   */
  static getUpdateProductMessage(oldProduit, newProduit, changes) {
    let message = `Mise à jour du produit: ${newProduit.designation} (ID: ${newProduit.id})`;
    
    if (Object.keys(changes).length > 0) {
      const changeDetails = [];
      if (changes.designation) changeDetails.push(`nom: "${changes.designation.old}" → "${changes.designation.new}"`);
      if (changes.prixVenteUnitaire) changeDetails.push(`prix vente: ${changes.prixVenteUnitaire.old} → ${changes.prixVenteUnitaire.new} FCFA`);
      if (changes.prixAchatUnitaire) changeDetails.push(`prix achat: ${changes.prixAchatUnitaire.old} → ${changes.prixAchatUnitaire.new} FCFA`);
      if (changes.tauxTVA) changeDetails.push(`TVA: ${changes.tauxTVA.old}% → ${changes.tauxTVA.new}%`);
      if (changes.image) changeDetails.push(`image modifiée`);
      
      if (changeDetails.length > 0) {
        message += ` - Modifications: ${changeDetails.join(', ')}`;
      }
    }
    
    return message;
  }

  /**
   * Génère un message pour la suppression d'un produit
   */
  static getDeleteProductMessage(produit) {
    return `Suppression du produit: ${produit.designation} (ID: ${produit.id}) - Code barre: ${produit.codeBarre || 'N/A'}`;
  }

  /**
   * Génère un message pour le changement de statut
   */
  static getStatusChangeMessage(produit, oldStatus, newStatus) {
    return `Changement de statut du produit ${produit.designation}: ${oldStatus ? 'Actif' : 'Inactif'} → ${newStatus ? 'Actif' : 'Inactif'}`;
  }

  /**
   * Génère un message pour le changement de TVA
   */
  static getTVAChangeMessage(produit, oldTVA, newTVA) {
    return `Modification du taux TVA du produit ${produit.designation}: ${oldTVA}% → ${newTVA}%`;
  }

  /**
   * Génère un message pour le changement de code-barre
   */
  static getCodeBarreChangeMessage(produit, oldCodeBarre, newCodeBarre) {
    return `Modification du code-barre du produit ${produit.designation}: "${oldCodeBarre || 'N/A'}" → "${newCodeBarre}"`;
  }

  /**
   * Génère un message pour l'export Excel
   */
  static getExportExcelMessage(user, code_structure, filters) {
    let filterDetails = [];
    if (filters.categorieId) filterDetails.push(`catégorie ID: ${filters.categorieId}`);
    if (filters.statut) filterDetails.push(`statut: ${filters.statut === 'true' ? 'actif' : 'inactif'}`);
    if (filters.search) filterDetails.push(`recherche: "${filters.search}"`);
    
    const filterText = filterDetails.length > 0 ? ` avec filtres (${filterDetails.join(', ')})` : '';
    return `Export Excel des produits (structure: ${code_structure})${filterText}`;
  }

  /**
   * Génère un message pour l'export PDF
   */
  static getExportPDFMessage(user, code_structure, filters) {
    let filterDetails = [];
    if (filters.categorieId) filterDetails.push(`catégorie ID: ${filters.categorieId}`);
    if (filters.statut) filterDetails.push(`statut: ${filters.statut === 'true' ? 'actif' : 'inactif'}`);
    if (filters.search) filterDetails.push(`recherche: "${filters.search}"`);
    
    const filterText = filterDetails.length > 0 ? ` avec filtres (${filterDetails.join(', ')})` : '';
    return `Export PDF des produits (structure: ${code_structure})${filterText}`;
  }
}

module.exports = ActionMessagesService;