/**
 * Tests KPI â€” Lot 7 : règles de gestion
 *  R1. Ventes caisse = paniers SANS bon (bonId: null)
 *  R2. Ventes Ã  crédit = paniers LIÃ‰S Ã  un bon (type vente client)
 *  R3. Un mÃªme panier n'est compté que dans une seule catégorie
 *  R4. Retour partiel : seule la partie restante (netAPayer - montantAvoir)
 *      s'ajoute au CA (le retour déduit, il ne génère pas de recette)
 *  R5. Le ticket moyen compte des PANIERS, pas des bons
 *  R6. Les ventes Ã  crédit excluent les bons brouillons et annulés
 */
jest.mock('../models', () => ({
  Sequelize: require('sequelize'),
  Panier: { findAll: jest.fn(), count: jest.fn() },
  Bon: { findAll: jest.fn() },
  Paiement: { findOne: jest.fn() },
}));

const db = require('../models');
const {
  getCAVenduBaseData,
  getCAEncaisseBaseData,
  getVentesCreditData,
} = require('../controllers/utils/kpiCaisseUtilitaires');

const ctx = { code_structure: 'STR-1', debut: '2026-01-01', fin: '2026-01-31' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

describe('getCAVenduBaseData â€” règles R1 Ã  R5', () => {
  test('R1+R4+R5 : caisse (sans bon) + bons normaux + reste des retours partiels', async () => {
    // 1er findAll : ventes caisse ; 2e : paniers des bons normaux
    db.Panier.findAll
      .mockResolvedValueOnce([{ id: 1, totalTTC: 500 }, { id: 2, totalTTC: 300 }]) // caisse
      .mockResolvedValueOnce([{ id: 3, totalTTC: 200 }]); // bons normaux
    db.Bon.findAll.mockResolvedValue([
      { id: 10, netAPayer: 100, montantAvoir: 40 }, // retour partiel : reste 60
    ]);
    db.Panier.count.mockResolvedValue(2); // paniers réels du bon partiellement retourné

    const result = await getCAVenduBaseData(ctx);

    // CA = 500 + 300 (caisse) + 200 (bons) + 60 (reste du retour partiel)
    expect(result.totalVendu).toBeCloseTo(1060);
    // nombre de PANIERS : 2 + 1 + 2 (pas les bons)
    expect(result.nombrePaniers).toBe(5);
    expect(result.ticketMoyenVente).toBeCloseTo(212);

    // R1 : les ventes caisse excluent explicitement les paniers liés Ã  un bon
    const appelCaisse = db.Panier.findAll.mock.calls[0][0];
    expect(appelCaisse.where.bonId).toBeNull();
    expect(appelCaisse.where.statut).toEqual(
      expect.objectContaining({ [require('sequelize').Op.notIn]: expect.any(Array) })
    );

    // R4 : le bon partiellement retourné n'est pas compté dans les bons normaux
    const appelBonsNormaux = db.Panier.findAll.mock.calls[1][0];
    const conditionsBon = JSON.parse(
      JSON.stringify(appelBonsNormaux.include[0].where, (k, v) => (typeof v === 'symbol' ? v.toString() : v))
    );
    expect(conditionsBon.typeEntite).toBe('client');
  });

  test('retour partiel : la partie retournée (montantAvoir) est bien déduite', async () => {
    db.Panier.findAll.mockResolvedValue([]);
    db.Bon.findAll.mockResolvedValue([
      { id: 11, netAPayer: 1000, montantAvoir: 250 }, // reste : 750
    ]);
    db.Panier.count.mockResolvedValue(1);

    const result = await getCAVenduBaseData(ctx);

    expect(result.totalVendu).toBeCloseTo(750);
  });

  test("aucun bon partiellement retourné : Panier.count n'est pas appelé", async () => {
    db.Panier.findAll.mockResolvedValue([]);
    db.Bon.findAll.mockResolvedValue([]);

    await getCAVenduBaseData(ctx);

    expect(db.Panier.count).not.toHaveBeenCalled();
    // seule la requête caisse porte le filtre bonId: null
    expect(db.Panier.findAll.mock.calls[0][0].where.bonId).toBeNull();
  });
});

describe('getVentesCreditData â€” règles R2 et R6', () => {
  test('les bons brouillons et annulés sont exclus des ventes Ã  crédit', async () => {
    db.Bon.findAll.mockResolvedValue([{ id: 7, numero: 'B7' }]);
    db.Panier.findAll.mockResolvedValue([{ totalMontant: '400.00', nombrePaniers: '3' }]);

    const result = await getVentesCreditData({ code_structure: 'STR-1', periode: 'mois' });

    const Op = require('sequelize').Op;
    const whereBon = db.Bon.findAll.mock.calls[0][0].where;
    expect(whereBon.statutBon).toEqual(
      expect.objectContaining({ [Op.notIn]: ['annulé', 'brouillon'] })
    );
    expect(whereBon.type).toBe('vente');
    expect(whereBon.typeEntite).toBe('client');

    // Les paniers comptés sont ceux LIÃ‰S aux bons (vente Ã  crédit)
    const wherePaniers = db.Panier.findAll.mock.calls[0][0].where;
    expect(wherePaniers.bonId).toEqual({ [Op.in]: [7] });

    expect(result.montantCredit).toBe(400);
    expect(result.nombrePaniersCredit).toBe(3);
  });

  test('aucun bon : aucune requÃªte panier', async () => {
    db.Bon.findAll.mockResolvedValue([]);

    const result = await getVentesCreditData({ code_structure: 'STR-1', periode: 'jour' });

    expect(db.Panier.findAll).not.toHaveBeenCalled();
    expect(result.montantCredit).toBe(0);
    expect(result.nombreBonsCredit).toBe(0);
  });
});

describe('getCAEncaisseBaseData', () => {
  test("somme des paiements validés hors fournisseur", async () => {
    db.Paiement.findOne.mockResolvedValue({ totalEncaisse: '1500.00', nombrePaiements: 4 });

    const result = await getCAEncaisseBaseData(ctx);

    expect(result.totalEncaisse).toBe(1500);
    expect(result.nombrePaiements).toBe(4);
    expect(result.ticketMoyenEncaisse).toBeCloseTo(375);

    const where = db.Paiement.findOne.mock.calls[0][0].where;
    expect(where.statutPaiement).toBe('validé');
    expect(where.typePaiement).toEqual(
      expect.objectContaining({ [require('sequelize').Op.ne]: 'fournisseur' })
    );
  });
});



