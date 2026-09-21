// middlewares/validatePanier.middleware.js
//
// Valide le corps d'une requête de création/modification de panier complet
// (POST /api/paniers/panier-complet). Contrôle structurel : taux entre 0 et 100,
// quantités et prix positifs. Le recalcul des montants est fait dans
// services/calculPanier.service.js (le serveur est la source de vérité).

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const validatePanier = (req, res, next) => {
  const { panier, articles, typeEntite } = req.body;
  const errors = [];

  if (!panier || typeof panier !== 'object') {
    errors.push('Le champ "panier" est requis et doit être un objet');
  }
  if (!typeEntite || !['client', 'fournisseur', 'autre'].includes(typeEntite)) {
    errors.push('Le champ "typeEntite" est requis (valeurs acceptées : client, fournisseur, autre)');
  }
  // Un panier de type "service" n'a pas de lignes d'articles produits :
  // un tableau d'articles vide est valide pour ce type.
  const panierSansArticles = panier && typeof panier === 'object' && panier.typePanier === 'service';
  if (!Array.isArray(articles) || (articles.length === 0 && !panierSansArticles)) {
    errors.push('Le champ "articles" est requis et doit être un tableau non vide');
  }

  if (panier && typeof panier === 'object') {
    for (const champ of ['remiseGlobale', 'tauxTVA']) {
      if (panier[champ] !== undefined) {
        const v = num(panier[champ]);
        if (v < 0 || v > 100) {
          errors.push(`"panier.${champ}" doit être compris entre 0 et 100 (reçu : ${v})`);
        }
      }
    }
  }

  if (Array.isArray(articles)) {
    articles.forEach((article, index) => {
      const pos = `Article[${index + 1}]`;
      if (!article.produitId && !(article.produit && article.produit.id) && !(article.Produit && article.Produit.id)) {
        errors.push(`${pos} : "produitId" est requis`);
      }
      if (num(article.quantite) <= 0) {
        errors.push(`${pos} : "quantite" doit être supérieure à 0`);
      }
      const prix = num(article.prixUnitaire ?? article.prixVenteUnitaire);
      if (prix < 0) {
        errors.push(`${pos} : le prix unitaire ne peut pas être négatif`);
      }
      for (const champ of ['remise', 'tauxTVA']) {
        if (article[champ] !== undefined) {
          const v = num(article[champ]);
          if (v < 0 || v > 100) {
            errors.push(`${pos} : "${champ}" doit être compris entre 0 et 100 (reçu : ${v})`);
          }
        }
      }
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = { validatePanier };
