class Normalizer {
  /**
   * Normaliser toutes les données numériques d'un objet
   */
  static normalizeObject(obj) {
    if (!obj) return obj;
    
    const normalized = { ...obj };
    const numericFields = [
      'montantTotal', 'montantAvoir', 'netAPayer', 'resteAPayer',
      'remise', 'avance', 'tva', 'totalHT', 'totalTTC', 'tauxTVA',
      'quantite', 'prixUnitaire', 'prixAchatUnitaire', 'prixVenteUnitaire',
      'solde', 'montantAPayer'
    ];
    
    numericFields.forEach(field => {
      if (normalized[field] !== undefined) {
        const value = normalized[field];
        if (typeof value === 'string') {
          const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
          const num = parseFloat(cleaned);
          normalized[field] = isNaN(num) ? 0 : Number(num.toFixed(2));
        } else if (typeof value === 'number') {
          normalized[field] = Number(value.toFixed(2));
        }
      }
    });
    
    return normalized;
  }
  
  /**
   * Normaliser un tableau d'objets
   */
  static normalizeArray(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(item => this.normalizeObject(item));
  }
}

module.exports = Normalizer;