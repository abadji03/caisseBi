/**
 * Tests — middleware requirePermission (RBAC backend)
 * Verrouille le controle des permissions cote serveur : les permissions
 * rechargees depuis la base (req.user.roles[].permissions[].code) sont la
 * source de verite. Les libelles historiques restent acceptes en entree
 * (transitoire) mais la reponse 403 expose les CODES requis.
 */
const { requirePermission, authenticateToken } = require('../middlewares/auth.middleware');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const userAvec = (nomsPermissions) => ({
  id: 1,
  roles: nomsPermissions.map(nom => ({ nom: 'role', permissions: [{ nom }] })),
});

describe('requirePermission', () => {
  test("autorise si l'utilisateur possede UNE des permissions requises (ANY-of)", () => {
    const req = { user: userAvec(['Gérer les produits', 'Voir le stock']) };
    const res = mockRes();
    const next = jest.fn();

    requirePermission('Gérer les produits')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('refuse avec 403 si aucune permission ne correspond', () => {
    const req = { user: userAvec(['Voir le stock']) };
    const res = mockRes();
    const next = jest.fn();

    requirePermission('Gérer les utilisateurs')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    // Le middleware normalise les libelles en codes stables
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ required: ['users.manage'] })
    );
  });

  test('"Accès total" court-circuite tous les controles', () => {
    const req = { user: userAvec(['Accès total']) };
    const res = mockRes();
    const next = jest.fn();

    requirePermission('Gérer les utilisateurs', 'Gérer les finances')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('refuse un utilisateur sans roles (403)', () => {
    const req = { user: { id: 1, roles: [] } };
    const res = mockRes();
    const next = jest.fn();

    requirePermission('Gérer les produits')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('refuse sans req.user (401) — middleware appele sans authenticateToken', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requirePermission('Gérer les produits')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('passe sans restriction si aucune permission requise', () => {
    const req = { user: userAvec([]) };
    const res = mockRes();
    const next = jest.fn();

    requirePermission()(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('le module reste compatible avec les routers existants (appel direct)', () => {
    expect(typeof authenticateToken).toBe('function');
    expect(typeof require('../middlewares/auth.middleware').requirePermission).toBe('function');
  });
});