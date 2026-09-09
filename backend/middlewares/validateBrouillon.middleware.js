// middlewares/validateBrouillon.middleware.js
//
// Valide le corps d'une requête de création/mise à jour de panier BROUILLON
// (POST /api/paniers/brouillon). Contrairement à /panier-complet (route de
// finalisation de vente), un brouillon peut être créé SANS article : la caisse
// initialise son panier de travail dès l'ouverture de l'écran.
// Contrôles structurels uniquement — aucun impact stock/paiement ici.

const validateBrouillon = (req, res, next) => {
  const { panier, articles, typeEntite } = req.body;
  const errors = [];

  if (!panier || typeof panier !== 'object') {
    errors.push('Le champ "panier" est requis et doit être un objet');
  }
  if (!typeEntite || !['client', 'fournisseur', 'autre'].includes(typeEntite)) {
    errors.push('Le champ "typeEntite" est requis (valeurs acceptées : client, fournisseur, autre)');
  }
  // Un brouillon PEUT être vide : articles est optionnel, mais doit être un
  // tableau s'il est fourni.
  if (articles !== undefined && !Array.isArray(articles)) {
    errors.push('Le champ "articles" doit être un tableau s\'il est fourni');
  }

  if (panier && typeof panier === 'object') {
    for (const champ of ['remiseGlobale', 'tauxTVA']) {
      if (panier[champ] !== undefined) {
        const v = Number(panier[champ]);
        if (!Number.isFinite(v) || v < 0 || v > 100) {
          errors.push(`"panier.${champ}" doit être compris entre 0 et 100 (reçu : ${panier[champ]})`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
};

module.exports = { validateBrouillon };