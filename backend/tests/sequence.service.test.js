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