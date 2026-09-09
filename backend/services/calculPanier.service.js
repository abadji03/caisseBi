// services/calculPanier.service.js
//
// Recalcul serveur des montants d'un panier (source de vérité backend).
// Les montants envoyés par le client (totalHT, tva, remise, totalTTC,
// montantRemise, montantTVA) sont TOUJOURS ignorés et recalculés à partir
// des données de base : prix, quantité, taux de remise et taux de TVA.
//
// Règles métier (alignées sur le calcul frontend existant) :
//   - Remise par article OU remise globale (jamais les deux) ;
//   - Remise globale répartie proportionnellement au poids HT de chaque ligne ;
//   - TVA calculée sur le HT NET (après remise) ;
//   - Arrondi monétaire à 2 décimales à chaque étape (round half up).

const arrondi2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
// Taux (remise / TVA) bornés entre 0 et 100
const clampTaux = (v) => Math.min(100, Math.max(0, num(v)));

// ── Champs acceptés du client ──
// PANIER : montants recalculés exclus. Le statut reste accepté pour ne pas
// casser le flux existant (validé / annulé / retourné déclenchent des traitements).
const PANIER_FIELDS = [
  'clientId',
  'typeEntite',
  'typePanier',
  'statut',
  'remiseGlobale',
  'tauxTVA',
  'remiseMode',
  'tvaMode',
  'detailsVisible',
  'bonId',
];
// ARTICLE : id conservé (comportement historique delete+recreate avec mêmes ids),
// montants recalculés écrasés plus bas.
const ARTICLE_FIELDS = [
  'id',
  'produitId',
  'quantite',
  'prixUnitaire',
  'prixVenteUnitaire',
  'prixAchatUnitaire',
  'code_structure',
  'remise',
  'tauxTVA',
  'motifRetour',
];

function pickFields(source, fields) {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  for (const f of fields) {
    if (source[f] !== undefined) out[f] = source[f];
  }
  return out;
}

// ── Suite : validation et calcul ──

/**
 * Valide les données brutes reçues du client.
 * @returns {string[]} liste d'erreurs (vide si valide)
 */
function validerPanierInput({ panier, articles }) {
  const erreurs = [];

  if (!panier || typeof panier !== 'object') {
    erreurs.push('Le champ "panier" est requis et doit être un objet');
  }
  if (!Array.isArray(articles) || articles.length === 0) {
    erreurs.push('Le champ "articles" est requis et doit être un tableau non vide');
    return erreurs;
  }

  // Taux du panier entre 0 et 100
  for (const champ of ['remiseGlobale', 'tauxTVA']) {
    const v = num(panier[champ]);
    if (v < 0 || v > 100) {
      erreurs.push(`panier.${champ} doit être compris entre 0 et 100 (reçu : ${v})`);
    }
  }

  articles.forEach((a, i) => {
    const pos = `Article[${i + 1}]`;
    if (!a.produitId && !(a.produit && a.produit.id) && !(a.Produit && a.Produit.id)) {
      erreurs.push(`${pos} : "produitId" est requis`);
    }
    if (num(a.quantite) <= 0) {
      erreurs.push(`${pos} : "quantite" doit être supérieure à 0`);
    }
    const prix = num(a.prixUnitaire ?? a.prixVenteUnitaire);
    if (prix < 0) {
      erreurs.push(`${pos} : le prix unitaire ne peut pas être négatif`);
    }
    for (const champ of ['remise', 'tauxTVA']) {
      const v = num(a[champ]);
      if (v < 0 || v > 100) {
        erreurs.push(`${pos} : ${champ} doit être compris entre 0 et 100 (reçu : ${v})`);
      }
    }
  });

  return erreurs;
}

/**
 * Recalcule intégralement les montants du panier et de ses lignes.
 * @param {object} params
 * @param {object} params.panier   { remiseGlobale, tauxTVA, remiseMode?, tvaMode? }
 * @param {Array}  params.articles lignes brutes du client
 * @returns {{ panier: object, lignes: object[] }}
 */
function calculerPanier({ panier, articles }) {
  const remiseGlobale = clampTaux(panier.remiseGlobale);
  const tauxTVAGlobal = clampTaux(panier.tauxTVA);

  // Modes : explicites si fournis, sinon déduits des lignes (comportement historique)
  const remiseMode =
    panier.remiseMode === 'article' || panier.remiseMode === 'globale'
      ? panier.remiseMode
      : articles.some((a) => num(a.remise) > 0)
        ? 'article'
        : 'globale';
  const tvaMode =
    panier.tvaMode === 'article' || panier.tvaMode === 'globale'
      ? panier.tvaMode
      : articles.some((a) => num(a.tauxTVA) > 0)
        ? 'article'
        : 'globale';

  // 1. HT brut par ligne
  const lignes = articles.map((a) => ({
    ...pickFields(a, ARTICLE_FIELDS),
    prix: num(a.prixUnitaire ?? a.prixVenteUnitaire),
    quantite: num(a.quantite),
  }));
  lignes.forEach((l) => {
    l.htBrut = arrondi2(l.prix * l.quantite);
  });
  const totalHTBrut = arrondi2(lignes.reduce((s, l) => s + l.htBrut, 0));

  // 2. Remise : par article OU globale répartie proportionnellement
  let totalRemise = 0;
  lignes.forEach((l) => {
    if (remiseMode === 'article') {
      l.montantRemise = arrondi2(l.htBrut * (clampTaux(l.remise) / 100));
    } else if (remiseGlobale > 0 && totalHTBrut > 0) {
      l.montantRemise = arrondi2(
        totalHTBrut * (remiseGlobale / 100) * (l.htBrut / totalHTBrut)
      );
    } else {
      l.montantRemise = 0;
    }
    l.htNet = arrondi2(l.htBrut - l.montantRemise);
    totalRemise = arrondi2(totalRemise + l.montantRemise);
  });

  // 3. TVA sur le HT net
  let totalTVA = 0;
  lignes.forEach((l) => {
    const taux = tvaMode === 'article' ? clampTaux(l.tauxTVA) : tauxTVAGlobal;
    l.montantTVA = arrondi2(l.htNet * (taux / 100));
    l.totalHT = l.htNet;
    l.totalTTC = arrondi2(l.htNet + l.montantTVA);
    totalTVA = arrondi2(totalTVA + l.montantTVA);
  });

  const totalHT = arrondi2(totalHTBrut - totalRemise);
  return {
    lignes,
    panier: {
      totalHT,
      tva: totalTVA,
      remise: totalRemise,
      remiseGlobale,
      tauxTVA: tauxTVAGlobal,
      remiseMode,
      tvaMode,
      totalTTC: arrondi2(totalHT + totalTVA),
    },
  };
}

/**
 * Prépare les lignes pour bulkCreate : whitelist des champs client,
 * montants remplacés par ceux recalculés, + panierId / code_structure.
 */
function preparerArticles(articles, lignesCalculees, { panierId, code_structure }) {
  return lignesCalculees.map((l, i) => ({
    ...pickFields(articles[i], ARTICLE_FIELDS),
    quantite: l.quantite,
    prixUnitaire: l.prix ?? articles[i].prixUnitaire,
    prixVenteUnitaire:
      articles[i].prixVenteUnitaire !== undefined
        ? articles[i].prixVenteUnitaire
        : l.prix,
    montantRemise: l.montantRemise,
    totalHT: l.totalHT,
    montantTVA: l.montantTVA,
    totalTTC: l.totalTTC,
    panierId,
    code_structure,
  }));
}

module.exports = {
  arrondi2,
  validerPanierInput,
  calculerPanier,
  preparerArticles,
  pickFields,
  PANIER_FIELDS,
  ARTICLE_FIELDS,
};
