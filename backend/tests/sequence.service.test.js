/**
 * Tests unitaires — SequenceService.initialiserDepuisMax (Lot 3)
 * Garantit que la première utilisation d'une séquence repart du MAX
 * existant en base et non de 1 (sinon collision avec les données existantes).
 */
jest.mock('../models', () => ({ sequelize: {} }));

const SequenceService = require('../services/sequence.service');

describe('SequenceService.initialiserDepuisMax', () => {
  const tx = () => ({
    commit: jest.fn(),
    rollback: jest.fn(),
    LOCK: { UPDATE: 'UPDATE' },
  });

  const setup = () => {
    const Sequence = { findOne: jest.fn(), create: jest.fn() };
    const sourceModel = {
      max: jest.fn(),
      sequelize: { transaction: jest.fn(async () => tx()) },
    };
    return { Sequence, sourceModel };
  };

  test('ne fait rien si la séquence existe déjà', async () => {
    const { Sequence, sourceModel } = setup();
    Sequence.findOne.mockResolvedValue({ dernier_numero: 42 });

    await SequenceService.initialiserDepuisMax(sourceModel, 'numeroE', Sequence, 'STR-1', 'panier', null);

    expect(Sequence.create).not.toHaveBeenCalled();
    expect(sourceModel.max).not.toHaveBeenCalled();
  });

  test('crée la séquence initialisée au MAX existant si absente', async () => {
    const { Sequence, sourceModel } = setup();
    Sequence.findOne.mockResolvedValue(null);
    sourceModel.max.mockResolvedValue(87);

    await SequenceService.initialiserDepuisMax(sourceModel, 'numeroE', Sequence, 'STR-1', 'panier', null);

    expect(Sequence.create).toHaveBeenCalledWith(
      { code_structure: 'STR-1', entite: 'panier', dernier_numero: 87 },
      expect.anything()
    );
  });

  test('initialise à 0 si la table source est vide (MAX null)', async () => {
    const { Sequence, sourceModel } = setup();
    Sequence.findOne.mockResolvedValue(null);
    sourceModel.max.mockResolvedValue(null);

    await SequenceService.initialiserDepuisMax(sourceModel, 'numeroE', Sequence, 'STR-1', 'panier', null);

    expect(Sequence.create).toHaveBeenCalledWith(
      { code_structure: 'STR-1', entite: 'panier', dernier_numero: 0 },
      expect.anything()
    );
  });

  test('no-op sans code_structure (admin général sans structure)', async () => {
    const { Sequence, sourceModel } = setup();

    await SequenceService.initialiserDepuisMax(sourceModel, 'numeroE', Sequence, null, 'panier', null);

    expect(Sequence.findOne).not.toHaveBeenCalled();
    expect(Sequence.create).not.toHaveBeenCalled();
  });

  test("no-op si le modèle Sequence n'est pas disponible", async () => {
    const { sourceModel } = setup();

    await SequenceService.initialiserDepuisMax(sourceModel, 'numeroE', null, 'STR-1', 'panier', null);

    expect(sourceModel.max).not.toHaveBeenCalled();
  });
});

describe('SequenceService.formaterNumero', () => {
  test('formate un numéro court lisible PREFIX-AA-NNNN', () => {
    expect(SequenceService.formaterNumero('PAI', 2026, 7)).toBe('PAI-26-0007');
    expect(SequenceService.formaterNumero('BON', 2026, 123456789)).toBe('BON-26-123456789');
  });

  test('deux numéros consécutifs sont toujours distincts', () => {
    const a = SequenceService.formaterNumero('FAC', 2026, 41);
    const b = SequenceService.formaterNumero('FAC', 2026, 42);
    expect(a).not.toBe(b);
  });
});

describe('SequenceService.estNumeroAuto', () => {
  test('détecte un numéro absent', () => {
    expect(SequenceService.estNumeroAuto('PAI', null)).toBe(true);
    expect(SequenceService.estNumeroAuto('PAI', '')).toBe(true);
  });

  test('détecte un uuid généré par le front (avec ou sans préfixe)', () => {
    expect(SequenceService.estNumeroAuto('BON', 'BON-123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });

  test('détecte un numéro timestamp généré par le front', () => {
    expect(SequenceService.estNumeroAuto('BON', 'BON-1759878028276-742')).toBe(true);
  });

  test('préserve les numéros courts serveur et les références humaines', () => {
    expect(SequenceService.estNumeroAuto('PAI', 'PAI-26-0007')).toBe(false);
    expect(SequenceService.estNumeroAuto('BON', 'BON-1')).toBe(false);
    expect(SequenceService.estNumeroAuto('BON', 'RETOUR-BON-26-0007-1759878028276')).toBe(false);
  });
});

describe('SequenceService.getNextNumeroFormate', () => {
  test('combine getNextNumero et formaterNumero', async () => {
    jest.mock('../models', () => ({ sequelize: {} }));
    const Sequence = { findOne: jest.fn(), create: jest.fn() };
    const fakeTx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
    Sequence.findOne.mockResolvedValue({ dernier_numero: 41, save: jest.fn() });

    const { numeroE, numero } = await SequenceService.getNextNumeroFormate(
      { transaction: async () => fakeTx }, Sequence, 'STR-1', 'paiement', 'PAI', null
    );

    expect(numeroE).toBe(42);
    expect(numero).toMatch(/^PAI-\d{2}-0042$/);
  });
});