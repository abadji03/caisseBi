// tests/dedupe-operations.test.js
//
// Valide la logique pure de détection des doublons d'opérations
// (scripts/dedupe-operations.js) sans aucun besoin de base de données.

const { detecterDoublons } = require('../scripts/dedupe-operations');

const idsAux = (res) => [...res.idsASupprimer].sort((a, b) => a - b);

describe('detecterDoublons — dédoublonnage des opérations comptables', () => {
  test('garde la plus ancienne opération d\'un même paiement', () => {
    const ops = [
      { id: 1, paiementId: 100, bonId: null },
      { id: 2, paiementId: 100, bonId: null },
      { id: 3, paiementId: 101, bonId: null },
    ];
    const res = detecterDoublons(ops);
    expect(idsAux(res)).toEqual([2]);
    expect(res.doublonsPaiement).toBe(1);
    expect(res.doublonsBon).toBe(0);
  });

  test('supprime les opérations "bon" dupliquées pour le même bon sans paiement', () => {
    const ops = [
      { id: 10, bonId: 200, paiementId: null },
      { id: 11, bonId: 200, paiementId: null },
    ];
    const res = detecterDoublons(ops);
    expect(idsAux(res)).toEqual([11]);
    expect(res.doublonsBon).toBe(1);
  });

  test('ne considère PAS l\'opération de paiement comme doublon de l\'opération "bon"', () => {
    // Le bon 200 a son opération "bon" (sans paiement) ET une opération de paiement
    // qui copie légitimement bonId : ce n'est PAS un doublon.
    const ops = [
      { id: 20, bonId: 200, paiementId: null },
      { id: 21, bonId: 200, paiementId: 500 },
    ];
    const res = detecterDoublons(ops);
    expect(res.idsASupprimer.size).toBe(0);
  });

  test('ignore les opérations sans bon ni paiement', () => {
    const ops = [
      { id: 30, bonId: null, paiementId: null },
      { id: 31, bonId: null, paiementId: null },
    ];
    const res = detecterDoublons(ops);
    expect(res.idsASupprimer.size).toBe(0);
  });

  test('cas mixte : doublon paiement + doublon bon, sans faux positif', () => {
    const ops = [
      { id: 1, bonId: 100, paiementId: null },  // opération "bon"
      { id: 2, bonId: 100, paiementId: null },  // doublon "bon" → à supprimer
      { id: 3, bonId: 100, paiementId: 300 },   // paiement légitime du bon 100
      { id: 4, bonId: null, paiementId: 300 },  // doublon paiement → à supprimer
      { id: 5, bonId: 101, paiementId: 301 },
      { id: 6, bonId: 102, paiementId: null },
    ];
    const res = detecterDoublons(ops);
    expect(idsAux(res)).toEqual([2, 4]);
    expect(res.doublonsPaiement).toBe(1);
    expect(res.doublonsBon).toBe(1);
  });
});