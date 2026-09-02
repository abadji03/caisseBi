// middlewares/validateBonComplet.middleware.js
//
// Valide le corps d'une requête de création/modification de bon complet.
// Note : code_structure, magasinId et agentId sont extraits de req.user (JWT),
// pas de req.body — ils ne sont donc pas validés ici.

const validateBonComplet = (req, res, next) => {
  const { bon, panier, articles, typeEntite } = req.body;
  const errors = [];

  // ── Champs obligatoires du body ──
  if (!bon || typeof bon !== 'object') {
    errors.push('Le champ "bon" est requis et doit être un objet');
  }
  if (!panier || typeof panier !== 'object') {
    errors.push('Le champ "panier" est requis et doit être un objet');
  }
  if (!typeEntite || !['client', 'fournisseur'].includes(typeEntite)) {
    errors.push('Le champ "typeEntite" est requis (valeurs acceptées : client, fournisseur)');
  }
  if (!Array.isArray(articles) || articles.length === 0) {
    errors.push('Le champ "articles" est requis et doit être un tableau non vide');
  }

  // ── Validation des montants du bon ──
  if (bon && typeof bon === 'object') {
    if (bon.montantTotal !== undefined && Number(bon.montantTotal) < 0) {
      errors.push('"bon.montantTotal" ne peut pas être négatif');
    }
    if (bon.remise !== undefined && Number(bon.remise) < 0) {
      errors.push('"bon.remise" ne peut pas être négative');
    }
    if (bon.avance !== undefined && Number(bon.avance) < 0) {
      errors.push('"bon.avance" ne peut pas être négative');
    }
  }

  // ── Validation article par article ──
  if (Array.isArray(articles)) {
    articles.forEach((article, index) => {
      const pos = `Article[${index + 1}]`;
      if (!article.produitId && !article.produit?.id) {
        errors.push(`${pos} : "produitId" est requis`);
      }
      if (!article.quantite || Number(article.quantite) < 1) {
        errors.push(`${pos} : "quantite" doit être supérieure à 0`);
      }
      if (article.prixVenteUnitaire === undefined || Number(article.prixVenteUnitaire) < 0) {
        errors.push(`${pos} : "prixVenteUnitaire" doit être positif ou nul`);
      }
    });
  }

  // ── Vérification que l'utilisateur est authentifié (req.user injecté par auth middleware) ──
  if (!req.user) {
    return res.status(401).json({ message: 'Non authentifié' });
  }
  if (!req.user.code_structure) {
    errors.push('Impossible de déterminer la structure de l\'utilisateur connecté');
  }
  if (!req.user.magasinId) {
    errors.push('L\'utilisateur connecté n\'est associé à aucun magasin');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = { validateBonComplet };
