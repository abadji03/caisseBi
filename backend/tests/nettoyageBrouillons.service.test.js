/**
 * Tests unitaires — NettoyageBrouillonsService
 * Brouillon abandonné = en_cours, sans bon, sans mise à jour depuis N jours.
 * Vide → supprimé ; non vide → archivé en 'annulé'.
 */
jest.mock('../models', () => ({
  Sequelize: { Op: require('sequelize').Op },
  Panier: { findAll: jest.fn(), destroy: jest.fn() },
  ArticlePanier: { count: jest.fn() },
}));
jest.mock('../services/logger', () => ({
  log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(),
}));

const NettoyageBrouillonsService = require('../services/nettoyageBrouillons.service');
const db = require('../models');

describe('NettoyageBrouillonsService.nettoyerBrouillonsAbandonnes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('supprime les brouillons vides et archive les non vides', async () => {
    const vide = { id: 1, destroy: jest.fn(), update: jest.fn() };
    const nonVide = { id: 2, destroy: jest.fn(), update: jest.fn() };
    db.Panier.findAll.mockResolvedValue([vide, nonVide]);
    db.ArticlePanier.count
      .mockResolvedValueOnce(0)   // panier 1 : vide
      .mockResolvedValueOnce(4);  // panier 2 : articles

    const res = await NettoyageBrouillonsService.nettoyerBrouillonsAbandonnes({ joursInactivite: 7 });

    expect(res).toEqual({ examines: 2, supprimes: 1, archives: 1 });
    expect(vide.destroy).toHaveBeenCalled();
    expect(nonVide.update).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'annulé' })
    );
  });

  test('continue sur une erreur individuelle et remonte le total', async () => {
    const ok = { id: 3, destroy: jest.fn(), update: jest.fn() };
    const ko = { id: 4, destroy: jest.fn().mockRejectedValue(new Error('FK')), update: jest.fn() };
    db.Panier.findAll.mockResolvedValue([ko, ok]);
    db.ArticlePanier.count.mockResolvedValue(0);

    const res = await NettoyageBrouillonsService.nettoyerBrouillonsAbandonnes();

    expect(res.examines).toBe(2);
    expect(res.supprimes).toBe(1);
  });

  test('ne cible que les brouillons en_cours sans bon, anciens', async () => {
    db.Panier.findAll.mockResolvedValue([]);
    await NettoyageBrouillonsService.nettoyerBrouillonsAbandonnes({ joursInactivite: 14 });

    expect(db.Panier.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ statut: 'en_cours', bonId: null }),
        limit: 500,
      })
    );
  });
});