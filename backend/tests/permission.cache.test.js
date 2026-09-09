// tests/permission.cache.test.js
//
// Verrouille le cache TTL du rechargement des permissions :
//  - un 2e appel dans le TTL ne refait pas la requête DB ;
//  - invalidateUserPermissions force un rechargement ;
//  - le TTL expiré force un rechargement.

jest.mock('../models', () => ({
  Users: {
    findByPk: jest.fn(),
  },
  Role: {},
  Permission: {},
  Sequelize: {},
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ id: 7 })),
}));

jest.mock('../services/logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../models');
const auth = require('../middlewares/auth.middleware');

const JWT_PAYLOAD = { id: 7 };

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const utilisateurActif = {
  id: 7,
  email: 'a@b.c',
  nom: 'Test',
  code_structure: 'S1',
  structure_id: 1,
  magasinId: 2,
  status: true,
  roles: [
    {
      id: 1,
      nom: 'Caissier',
      permissions: [{ id: 1, code: 'sales.manage', nom: 'Gérer les ventes', type: 'edit' }],
    },
  ],
};

describe('Cache TTL des permissions (authenticateToken)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.invalidateAllPermissions();
    db.Users.findByPk.mockResolvedValue(utilisateurActif);
  });

  const call = async () => {
    const req = { headers: { authorization: 'Bearer token' } };
    const res = mockRes();
    const next = jest.fn();
    await auth.authenticateToken(req, res, next);
    return { req, res, next };
  };

  test('servi depuis le cache : la DB n\'est interrogée qu\'une fois dans le TTL', async () => {
    await call();
    await call();
    await call();

    expect(db.Users.findByPk).toHaveBeenCalledTimes(1);
  });

  test('invalidateUserPermissions force un rechargement depuis la base', async () => {
    await call();
    auth.invalidateUserPermissions(7);
    await call();

    expect(db.Users.findByPk).toHaveBeenCalledTimes(2);
  });

  test('invalidateAllPermissions force un rechargement pour tous', async () => {
    await call();
    auth.invalidateAllPermissions();
    await call();

    expect(db.Users.findByPk).toHaveBeenCalledTimes(2);
  });

  test('après expiration du TTL, la DB est réinterrogée', async () => {
    await call();
    // Simuler l'expiration en remontant l'horloge au-delà du TTL
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + auth.PERMISSION_CACHE_TTL_MS + 1);
    await call();
    Date.now.mockRestore();

    expect(db.Users.findByPk).toHaveBeenCalledTimes(2);
  });

  test('le payload servi par le cache est identique à un rechargement', async () => {
    const a = await call();
    const payload1 = a.req.user;
    auth.invalidateAllPermissions();
    const b = await call();
    expect(b.req.user).toEqual(payload1);
    expect(b.req.user.roles[0].permissions[0].code).toBe('sales.manage');
  });
});
