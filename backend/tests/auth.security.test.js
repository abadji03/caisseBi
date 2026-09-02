/**
 * Tests de sécurité — Lot 1 (quick wins)
 * Verrouille les correctifs :
 *  1. Aucun mot de passe / hash ne doit être loggé lors de la connexion
 *  2. Le middleware d'authentification ne doit pas exposer le détail de l'erreur JWT
 */
process.env.JWT_SECRET = 'test-secret-unitaire';

jest.mock('../models', () => ({
  Users: { findOne: jest.fn(), findByPk: jest.fn() },
  Role: {},
  Permission: {},
}));

jest.mock('../services/historique.service', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
  enregistrerAction: jest.fn(),
  enregistrerConnexion: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const db = require('../models');
const bcrypt = require('bcrypt');
const authController = require('../controllers/auth.controller');
const authenticateToken = require('../middlewares/auth.middleware');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Sécurité — auth.controller.connexion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  test("ne logge jamais le mot de passe fourni ni des fragments de hash", async () => {
    const motDePasse = 'SecretUltraConfidentiel123!';
    const hashStocke = '$2b$10$abcdefghijklmnopqrstuvxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    db.Users.findOne.mockResolvedValue({
      id: 1,
      email: 'test@caisse.bi',
      password: hashStocke,
      save: jest.fn(),
    });
    bcrypt.compare.mockResolvedValue(false);

    const req = { body: { email: 'test@caisse.bi', password: motDePasse }, headers: {}, socket: {} };
    const res = mockRes();

    await authController.connexion(req, res);

    // Collecter toute la sortie console produite pendant l'appel
    const sortie = console.log.mock.calls.flat().join('\n');
    expect(sortie).not.toContain(motDePasse);
    expect(sortie).not.toContain(hashStocke);
    expect(sortie).not.toContain(hashStocke.substring(0, 30));
    expect(sortie).not.toContain('Mot de passe fourni');
    expect(sortie).not.toContain('Début du hash');

    // bcrypt.compare doit bien être utilisé (le bloc bcrypt.hash de debug est supprimé)
    expect(bcrypt.compare).toHaveBeenCalledWith(motDePasse, hashStocke);
    expect(bcrypt.hash).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("Sécurité — auth.middleware.authenticateToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renvoie 403 générique sans détail d\'erreur JWT interne pour un token invalide', async () => {
    const req = { headers: { authorization: 'Bearer token.completement.invalide' } };
    const res = mockRes();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ message: 'Token invalide' });
    expect(body.error).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/jwt|secret|expired|malformed/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('renvoie 401 si aucun token fourni', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});