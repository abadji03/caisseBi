// tests/calculPanier.service.test.js
const {
  arrondi2,
  validerPanierInput,
  calculerPanier,
  preparerArticles,
} = require('../services/calculPanier.service');

describe('arrondi2', () => {
  test('arrondit à 2 décimales sans erreur de flottant', () => {
    expect(arrondi2(12.345)).toBe(12.35);
    expect(arrondi2(0.1 + 0.2)).toBe(0.3);
    expect(arrondi2(100)).toBe(100);
    expect(arrondi2('12.344')).toBe(12.34);
  });
});

describe('validerPanierInput', () => {
  const articleValide = {
    produitId: 1,
    quantite: 2,
    prixUnitaire: 1000,
    remise: 0,
    tauxTVA: 18,
  };

  test('accepte un panier valide', () => {
    const erreurs = validerPanierInput({
      panier: { remiseGlobale: 10, tauxTVA: 18 },
      articles: [articleValide],
    });
    expect(erreurs).toEqual([]);
  });

  test('rejette un taux supérieur à 100', () => {
    const erreurs = validerPanierInput({
      panier: { remiseGlobale: 150, tauxTVA: 18 },
      articles: [articleValide],
    });
    expect(erreurs.some((e) => e.includes('remiseGlobale'))).toBe(true);
  });

  test('rejette un tauxTVA article de 200', () => {
    const erreurs = validerPanierInput({
      panier: { remiseGlobale: 0, tauxTVA: 0 },
      articles: [{ ...articleValide, tauxTVA: 200 }],
    });
    expect(erreurs.some((e) => e.includes('tauxTVA'))).toBe(true);
  });

  test('rejette une quantité négative ou nulle', () => {
    const erreurs = validerPanierInput({
      panier: {},
      articles: [{ ...articleValide, quantite: 0 }],
    });
    expect(erreurs.some((e) => e.includes('quantite'))).toBe(true);
  });

  test('rejette un article sans produitId', () => {
    const { produitId, ...sansProduit } = articleValide;
    const erreurs = validerPanierInput({ panier: {}, articles: [sansProduit] });
    expect(erreurs.some((e) => e.includes('produitId'))).toBe(true);
  });
});

// ── Suite : tests de calcul ──

describe('calculerPanier', () => {
  test('calcule HT / TVA / TTC par ligne et pour le panier (TVA par article)', () => {
    const { panier, lignes } = calculerPanier({
      panier: { remiseGlobale: 0, tauxTVA: 0 },
      articles: [
        { produitId: 1, quantite: 1, prixUnitaire: 1000, tauxTVA: 18 },
        { produitId: 2, quantite: 2, prixUnitaire: 500, tauxTVA: 9 },
        { produitId: 3, quantite: 1, prixUnitaire: 2000, tauxTVA: 0 },
      ],
    });

    expect(lignes[0].totalHT).toBe(1000);
    expect(lignes[0].montantTVA).toBe(180);
    expect(lignes[1].montantTVA).toBe(90);
    expect(lignes[2].montantTVA).toBe(0);

    expect(panier.totalHT).toBe(4000);
    expect(panier.tva).toBe(270);
    expect(panier.totalTTC).toBe(4270);
  });

  test('TVA globale appliquée au HT net de chaque ligne', () => {
    const { panier, lignes } = calculerPanier({
      panier: { tauxTVA: 18, remiseGlobale: 0, tvaMode: 'globale' },
      articles: [
        { produitId: 1, quantite: 1, prixUnitaire: 1000, tauxTVA: 0 },
        { produitId: 2, quantite: 1, prixUnitaire: 2000, tauxTVA: 0 },
      ],
    });
    expect(lignes[0].montantTVA).toBe(180);
    expect(lignes[1].montantTVA).toBe(360);
    expect(panier.tva).toBe(540);
    expect(panier.totalTTC).toBe(3540);
  });

  test('remise par article : la remise globale est ignorée (XOR)', () => {
    const { panier, lignes } = calculerPanier({
      panier: { remiseGlobale: 50, tauxTVA: 0 },
      articles: [
        { produitId: 1, quantite: 1, prixUnitaire: 1000, remise: 10 },
        { produitId: 2, quantite: 1, prixUnitaire: 3000, remise: 0 },
      ],
    });
    expect(lignes[0].montantRemise).toBe(100);
    expect(lignes[1].montantRemise).toBe(0);
    expect(panier.remise).toBe(100);
    expect(panier.totalHT).toBe(3900);
  });

  test('remise globale répartie proportionnellement au poids HT', () => {
    const { panier, lignes } = calculerPanier({
      panier: { remiseGlobale: 10, tauxTVA: 0, remiseMode: 'globale' },
      articles: [
        { produitId: 1, quantite: 1, prixUnitaire: 1000, remise: 0 },
        { produitId: 2, quantite: 3, prixUnitaire: 1000, remise: 0 },
      ],
    });
    expect(lignes[0].montantRemise).toBe(100);
    expect(lignes[1].montantRemise).toBe(300);
    expect(panier.remise).toBe(400);
    expect(panier.totalHT).toBe(3600);
  });

  test('TVA calculée sur le HT NET (après remise)', () => {
    const { lignes } = calculerPanier({
      panier: { remiseGlobale: 0, tauxTVA: 0 },
      articles: [{ produitId: 1, quantite: 1, prixUnitaire: 1000, remise: 10, tauxTVA: 18 }],
    });
    expect(lignes[0].montantRemise).toBe(100);
    expect(lignes[0].totalHT).toBe(900);
    expect(lignes[0].montantTVA).toBe(162); // 900 * 18% et non 1000 * 18%
    expect(lignes[0].totalTTC).toBe(1062);
  });

  test('les montants envoyés par le client sont ignorés (recalcul serveur)', () => {
    const { panier } = calculerPanier({
      panier: { totalHT: 1, tva: 1, totalTTC: 1, remise: 1, remiseGlobale: 0, tauxTVA: 0 },
      articles: [{ produitId: 1, quantite: 1, prixUnitaire: 50000, tauxTVA: 0 }],
    });
    expect(panier.totalHT).toBe(50000);
    expect(panier.totalTTC).toBe(50000);
  });

  test('pas de dérive de centimes : Σ lignes.TVA = panier.tva (cas 3 x 3333.33)', () => {
    const { panier, lignes } = calculerPanier({
      panier: { remiseGlobale: 0, tauxTVA: 0 },
      articles: [
        { produitId: 1, quantite: 1, prixUnitaire: 3333.33, tauxTVA: 18 },
        { produitId: 2, quantite: 1, prixUnitaire: 3333.33, tauxTVA: 18 },
        { produitId: 3, quantite: 1, prixUnitaire: 3333.33, tauxTVA: 18 },
      ],
    });
    const sommeLignes = lignes.reduce((s, l) => s + l.montantTVA, 0);
    expect(Math.round(sommeLignes * 100) / 100).toBe(panier.tva);
  });

  test('borne les taux hors limites au lieu de produire des montants absurdes', () => {
    const { lignes } = calculerPanier({
      panier: { remiseGlobale: 0, tauxTVA: 0 },
      articles: [{ produitId: 1, quantite: 1, prixUnitaire: 1000, remise: 150, tauxTVA: 200 }],
    });
    // remise clampée à 100 % => HT net 0 ; TVA clampée à 100 % sur 0
    expect(lignes[0].montantRemise).toBe(1000);
    expect(lignes[0].totalHT).toBe(0);
    expect(lignes[0].montantTVA).toBe(0);
  });
});

describe('preparerArticles', () => {
  test('applique la whitelist, écrase les montants et ajoute panierId/code_structure', () => {
    const { lignes } = calculerPanier({
      panier: { remiseGlobale: 0, tauxTVA: 0 },
      articles: [{ produitId: 1, quantite: 2, prixUnitaire: 1000, tauxTVA: 18 }],
    });
    const [ligne] = preparerArticles(
      [{ produitId: 1, quantite: 2, prixUnitaire: 1000, tauxTVA: 18, statut: 'HACK', montantTVA: 999 }],
      lignes,
      { panierId: 42, code_structure: 'STR-1' }
    );
    expect(ligne.panierId).toBe(42);
    expect(ligne.code_structure).toBe('STR-1');
    expect(ligne.montantTVA).toBe(360); // recalculé, pas 999
    expect(ligne.statut).toBeUndefined(); // hors whitelist
  });
});
