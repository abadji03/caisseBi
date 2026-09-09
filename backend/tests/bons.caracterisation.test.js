/**
 * Tests de CARACTÉRISATION — Lot 2a
 * Objectif : verrouiller le comportement ACTUEL (pas le comportement souhaité)
 * des zones sensibles bons/paniers avant toute refonte. Ces tests servent de
 * filet de sécurité : s'ils échouent après une modification, le comportement
 * métier a changé.
 *
 * Comportements documentés (après Lot 3 — corrections métier) :
 *  A. Historique de statut : la branche "mise à jour" crée désormais un
 *     historique via statutManager.creerHistoriqueStatut quand le statut
 *     change (comparaison ancienBon avant update vs nouveauBon après).
 *  B. Articles : la mise à jour détruit TOUS les anciens articles puis les
 *     recrée (destroy + bulkCreate).
 *  C. Création : le statut est forcé à 'brouillon' à la création.
 *  D. Numérotation panier : séquence atomique (SequenceService), initialisée
 *     au MAX(numeroE) existant ; repli COUNT+1 si la séquence échoue.
 */

jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn() },
  Sequence: { findOne: jest.fn(), create: jest.fn() },
  Bon: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
  Panier: { findOne: jest.fn(), create: jest.fn() },
  ArticlePanier: { destroy: jest.fn(), bulkCreate: jest.fn() },
  Paiement: { create: jest.fn() },
  Operation: { findOne: jest.fn() },
}));

jest.mock('../services/sequence.service', () => ({
  initialiserDepuisMax: jest.fn(),
  getNextNumero: jest.fn(),
  estNumeroAuto: jest.fn(() => false),
}));

jest.mock('../controllers/bonComplet', () => ({
  stockManager: {},
  reservationService: {},
  mouvementService: {},
  statutManager: {
    preparerDonneesBon: jest.fn(async (bon) => ({ ...bon })),
    creerHistoriqueStatut: jest.fn(),
    mettreAJourFournisseurApresVersement: jest.fn(),
    mettreAJourClientApresRegelement: jest.fn(),
  },
}));

jest.mock('../controllers/operation.controller', () => ({
  updateFromBon: jest.fn(async () => ({ id: 1, type: 'x', statut: 'y', montantPaye: 0 })),
  createFromBon: jest.fn(),
  createFromPaiement: jest.fn(),
  synchroniserOperations: jest.fn(),
}));

jest.mock('../services/historique.service', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
  enregistrerAction: jest.fn(),
  enregistrerConnexion: jest.fn(),
}));

const db = require('../models');
const { statutManager } = require('../controllers/bonComplet');
const SequenceService = require('../services/sequence.service');
const HistoriqueService = require('../services/historique.service');
const bonCompletController = require('../controllers/bonComplet.controller');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const fakeTransaction = () => {
  const t = { commit: jest.fn(), rollback: jest.fn(), finished: null, LOCK: { UPDATE: 'UPDATE' } };
  db.sequelize.transaction.mockResolvedValue(t);
  return t;
};

const fakeUser = { id: 42, code_structure: 'STR-1', magasinId: 3 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

describe('Caractérisation — createBonComplet (mise à jour dun bon existant)', () => {
  const setupUpdate = () => {
    const tx = fakeTransaction();

    // 1er findByPk : ancienBon (avant update) ; 2e : nouveauBon (mis à jour en place)
    const ancienBon = { id: 5, numero: 12, statutBon: 'brouillon', montantTotal: 100 };
    const nouveauBon = {
      id: 5,
      numero: 12,
      statutBon: 'brouillon',
      montantTotal: 100,
      avance: 0,
      update: jest.fn(function (data) { Object.assign(this, data); return Promise.resolve(this); }),
    };
    db.Bon.findByPk
      .mockResolvedValueOnce(ancienBon)
      .mockResolvedValueOnce(nouveauBon);

    const panierExistant = {
      id: 9,
      statut: 'en_cours',
      update: jest.fn(function (data) { Object.assign(this, data); return Promise.resolve(this); }),
    };
    db.Panier.findOne.mockResolvedValue(panierExistant);

    db.ArticlePanier.destroy.mockResolvedValue(3);
    db.ArticlePanier.bulkCreate.mockResolvedValue([]);
    db.Operation.findOne.mockResolvedValue(null);

    return { tx, ancienBon, nouveauBon, panierExistant };
  };

  const reqUpdate = () => ({
    user: fakeUser,
    headers: {},
    socket: {},
    body: {
      bon: { id: 5, numero: 12, type: 'vente', statutBon: 'validé', montantTotal: 150, remise: 0, avance: 0 },
      panier: { statut: 'validé' },
      articles: [
        { produitId: 1, quantite: 2, prixVenteUnitaire: 50 },
        { produitId: 2, quantite: 1, prixVenteUnitaire: 50 },
      ],
      typeEntite: 'divers', // ni client ni fournisseur → branche workflow non déclenchée
    },
  });

  test('A. un changement de statut crée un historique via statutManager', async () => {
    const { tx } = setupUpdate();
    const res = mockRes();

    await bonCompletController.createBonComplet(reqUpdate(), res);

    expect(res.status).toHaveBeenCalledWith(201); // le flux global réussit
    // CORRIGÉ (Lot 3) : le changement brouillon → validé crée bien un
    // historique dédié aux statuts, avec l'ancien statut capturé avant update.
    expect(statutManager.creerHistoriqueStatut).toHaveBeenCalledWith(
      5, 'brouillon', 'validé', 42, 'Mise à jour du statut du bon', 'STR-1', tx
    );
  });

  test("A''. aucun historique de statut si le statut est inchangé", async () => {
    // Même scénario mais le statut envoyé est identique à l'ancien
    setupUpdate();
    const res = mockRes();
    const req = reqUpdate();
    req.body.bon.statutBon = 'brouillon';

    await bonCompletController.createBonComplet(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(statutManager.creerHistoriqueStatut).not.toHaveBeenCalled();
  });

  test("A'. l'historique applicatif (HistoriqueService) capture bien le changement de statut", async () => {
    setupUpdate();
    const res = mockRes();

    await bonCompletController.createBonComplet(reqUpdate(), res);

    const call = HistoriqueService.enregistrerAction.mock.calls
      .find(c => c[3] && c[3].action === 'UPDATE_BON');
    expect(call).toBeDefined();
    expect(call[3].changes.statutBon).toEqual({ old: 'brouillon', new: 'validé' });
    expect(call[3].changes.montantTotal).toEqual({ old: 100, new: 150 });
  });

  test('B. la mise à jour détruit tous les anciens articles puis les recrée', async () => {
    const { panierExistant } = setupUpdate();
    const res = mockRes();

    await bonCompletController.createBonComplet(reqUpdate(), res);

    // destroy SANS filtre sur les IDs d'articles : tout le panier est vidé
    expect(db.ArticlePanier.destroy).toHaveBeenCalledWith({
      where: { panierId: panierExistant.id, code_structure: 'STR-1' },
      transaction: expect.anything(),
    });
    // puis recréation complète
    expect(db.ArticlePanier.bulkCreate).toHaveBeenCalledWith(
      [
        expect.objectContaining({ produitId: 1, panierId: panierExistant.id, code_structure: 'STR-1' }),
        expect.objectContaining({ produitId: 2, panierId: panierExistant.id, code_structure: 'STR-1' }),
      ],
      expect.anything()
    );
    // destroy s'exécute AVANT bulkCreate
    expect(db.ArticlePanier.destroy.mock.invocationCallOrder[0])
      .toBeLessThan(db.ArticlePanier.bulkCreate.mock.invocationCallOrder[0]);
  });
});

// == PART2 ==
describe('Caractérisation — createBonComplet (création dun nouveau bon)', () => {
  test("C. le statut est forcé à 'brouillon' à la création, quel que soit le statut envoyé", async () => {
    const tx = fakeTransaction();
    db.Bon.findOne.mockResolvedValue(null); // pas de doublon de numéro
    db.Bon.create.mockResolvedValue({ id: 7, numero: 13, statutBon: 'brouillon', montantTotal: 150, avance: 0 });
    db.Panier.create.mockResolvedValue({ id: 11 });
    db.ArticlePanier.bulkCreate.mockResolvedValue([]);
    db.Operation.findOne.mockResolvedValue(null);

    const res = mockRes();
    const req = {
      user: fakeUser,
      headers: {},
      socket: {},
      body: {
        bon: { numero: 13, type: 'vente', statutBon: 'validé', montantTotal: 150, remise: 0, avance: 0 },
        panier: { statut: 'en_cours' },
        articles: [{ produitId: 1, quantite: 3, prixVenteUnitaire: 50 }],
        typeEntite: 'divers',
      },
    };

    await bonCompletController.createBonComplet(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    // CARACTÉRISATION : le bon est créé avec statutBon forcé à 'brouillon'
    expect(db.Bon.create).toHaveBeenCalledWith(
      expect.objectContaining({ statutBon: 'brouillon' }),
      expect.anything()
    );
    // et l'historique de création est bien enregistré via statutManager
    expect(statutManager.creerHistoriqueStatut).toHaveBeenCalledWith(
      7, 'création', 'brouillon', 42, 'Création du bon', 'STR-1', tx
    );
  });
});

describe('Caractérisation — hook numeroE du modèle Panier (séquence atomique)', () => {
  const loadPanierModel = () => {
    const factory = require('../models/panier.model.js');
    const DataTypes = new Proxy({}, {
      get: (_t, prop) => (prop === 'NOW'
        ? 'NOW'
        : () => ({ dataType: String(prop) })),
    });
    const sequelize = {
      define: jest.fn((_name, _attrs, opts) => ({ hooks: opts.hooks })),
      models: { Panier: { count: jest.fn(), max: jest.fn() } },
    };
    const model = factory(sequelize, DataTypes);
    return { model, sequelize };
  };

  test('D. numeroE est fourni par la séquence atomique (initialisée au MAX existant)', async () => {
    const { model, sequelize } = loadPanierModel();
    SequenceService.initialiserDepuisMax.mockResolvedValue(undefined);
    SequenceService.getNextNumero.mockResolvedValue(6);

    const panier = { code_structure: 'STR-1' };
    await model.hooks.beforeValidate(panier, { transaction: null });

    // La séquence est initialisée à partir du MAX(numeroE) des paniers existants
    expect(SequenceService.initialiserDepuisMax).toHaveBeenCalledWith(
      sequelize.models.Panier, 'numeroE', db.Sequence, 'STR-1', 'panier', null
    );
    // puis le numéro atomique est utilisé
    expect(SequenceService.getNextNumero).toHaveBeenCalled();
    expect(panier.numeroE).toBe(6);
    expect(sequelize.models.Panier.count).not.toHaveBeenCalled();
  });

  test("D'. si la séquence échoue, repli sur l'ancien comportement COUNT + 1", async () => {
    const { model, sequelize } = loadPanierModel();
    SequenceService.initialiserDepuisMax.mockRejectedValue(new Error('Table Sequence absente'));
    sequelize.models.Panier.count.mockResolvedValue(5);

    const panier = { code_structure: 'STR-1' };
    await model.hooks.beforeValidate(panier, { transaction: null });

    expect(panier.numeroE).toBe(6); // 5 + 1, repli garanti non bloquant
  });

  test("D''. si numeroE est déjà fourni, le hook ne recalcule rien", async () => {
    const { model, sequelize } = loadPanierModel();

    const panier = { code_structure: 'STR-1', numeroE: 99 };
    await model.hooks.beforeValidate(panier, { transaction: null });

    expect(SequenceService.getNextNumero).not.toHaveBeenCalled();
    expect(sequelize.models.Panier.count).not.toHaveBeenCalled();
    expect(panier.numeroE).toBe(99);
  });

  test("D'''. double repli : si séquence ET count échouent, numeroE = 1 (dernier recours)", async () => {
    const { model, sequelize } = loadPanierModel();
    SequenceService.initialiserDepuisMax.mockRejectedValue(new Error('DB down'));
    sequelize.models.Panier.count.mockRejectedValue(new Error('DB down'));

    const panier = { code_structure: 'STR-1' };
    await model.hooks.beforeValidate(panier, { transaction: null });

    expect(panier.numeroE).toBe(1);
  });
});

describe('Caractérisation — hook beforeValidate du modèle Bon (Lot 5)', () => {
  const loadBonModel = () => {
    const factory = require('../models/bon.model.js');
    const DataTypes = new Proxy({}, {
      get: (_t, prop) => (prop === 'NOW' ? 'NOW' : () => ({ dataType: String(prop) })),
    });
    const sequelize = {
      define: jest.fn((_name, _attrs, opts) => ({ hooks: opts.hooks })),
      models: { Bon: { count: jest.fn(), max: jest.fn() } },
    };
    const model = factory(sequelize, DataTypes);
    return { model, sequelize };
  };

  const bonBase = () => ({
    code_structure: 'STR-1',
    numero: 'BON-1',
    montantTotal: 150,
    remise: 50,
    avance: 20,
  });

  test('E. numeroE est fourni par la séquence atomique (comme les paniers)', async () => {
    const { model } = loadBonModel();
    SequenceService.initialiserDepuisMax.mockResolvedValue(undefined);
    SequenceService.getNextNumero.mockResolvedValue(12);

    const bon = bonBase();
    await model.hooks.beforeValidate(bon, { transaction: null });

    expect(SequenceService.initialiserDepuisMax).toHaveBeenCalledWith(
      expect.anything(), 'numeroE', db.Sequence, 'STR-1', 'bon', null
    );
    expect(bon.numeroE).toBe(12);
  });

  test("E'. netAPayer et resteAPayer sont calculés s'ils sont absents", async () => {
    const { model } = loadBonModel();
    SequenceService.initialiserDepuisMax.mockResolvedValue(undefined);
    SequenceService.getNextNumero.mockResolvedValue(1);

    const bon = bonBase(); // 150 - 50 = 100 ; 100 - 20 = 80
    await model.hooks.beforeValidate(bon, { transaction: null });

    expect(bon.netAPayer).toBe(100);
    expect(bon.resteAPayer).toBe(80);
  });

  test("E''. les valeurs explicites ne sont PAS écrasées (flux updateNetAPayer/updateResteAPayer préservé)", async () => {
    const { model } = loadBonModel();
    SequenceService.initialiserDepuisMax.mockResolvedValue(undefined);
    SequenceService.getNextNumero.mockResolvedValue(1);

    const bon = { ...bonBase(), netAPayer: 100, resteAPayer: 30 };
    await model.hooks.beforeValidate(bon, { transaction: null });

    // resteAPayer=30 (< netAPayer - avance) : représente un paiement partiel
    // déjà enregistré via updateResteAPayer — le hook ne doit pas l'écraser.
    expect(bon.netAPayer).toBe(100);
    expect(bon.resteAPayer).toBe(30);
  });

  test("E'''. netAPayer borné à 0 si la remise dépasse le total", async () => {
    const { model } = loadBonModel();
    SequenceService.initialiserDepuisMax.mockResolvedValue(undefined);
    SequenceService.getNextNumero.mockResolvedValue(1);

    const bon = { ...bonBase(), montantTotal: 50, remise: 80 };
    await model.hooks.beforeValidate(bon, { transaction: null });

    expect(bon.netAPayer).toBe(0);
    expect(bon.resteAPayer).toBe(0);
  });
});
// == PART3 ==