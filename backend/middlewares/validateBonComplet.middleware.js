// middleware/validateBonComplet.js
const validateBonComplet = (req, res, next) => {
  const {
    bon,
    panier,
    articles,
    code_structure,
    magasinId,
    agentId
  } = req.body;

  const errors = [];

  if (!bon) errors.push('Le bon est requis');
  if (!panier) errors.push('Le panier est requis');
  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    errors.push('Les articles sont requis et doivent être un tableau non vide');
  }
  if (!code_structure) errors.push('Le code structure est requis');
  if (!magasinId) errors.push('Le magasinId est requis');
  if (!agentId) errors.push('L\'agentId est requis');

  // Validation des articles
  if (articles && Array.isArray(articles)) {
    articles.forEach((article, index) => {
      if (!article.produitId && !article.produit?.id) {
        errors.push(`Article ${index + 1}: produitId est requis`);
      }
      if (!article.quantite || article.quantite < 1) {
        errors.push(`Article ${index + 1}: quantite doit être supérieure à 0`);
      }
      if (!article.prixVenteUnitaire || article.prixVenteUnitaire < 0) {
        errors.push(`Article ${index + 1}: prixVenteUnitaire doit être positif`);
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = { validateBonComplet };