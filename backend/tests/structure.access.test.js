// tests/structure.access.test.js
//
// Verrouille le cloisonnement multi-tenant :
//  - verifierAppartenanceStructure (service) : ressource vs structure utilisateur ;
//  - requireStructureAccess (middleware) : code_structure dans params/body/query.

const { verifierAppartenanceStructure } = require('../services/verification.service');
const { requireStructureAccess } = require('../middlewares/auth.middleware');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const userStructureA = { id: 1, code_structure: 'STR-A', roles: [] };
const userSansStructure = { id: 2, code_structure: null, roles: [] };

describe('verifierAppartenanceStructure', () => {
  test('refuse avec 403 une ressource d\'une autre structure', () => {
    const r = verifierAppartenanceStructure({ code_structure: 'STR-B' }, userStructureA);
    expect(r.ok).toBe(false);
    expect(r.statut).toBe(403);
  });

  test('autorise une ressource de sa propre structure', () => {
    expect(verifierAppartenanceStructure({ code_structure: 'STR-A' }, userStructureA).ok).toBe(true);
  });

  test('autorise l\'administrateur général (sans structure)', () => {
    expect(verifierAppartenanceStructure({ code_structure: 'STR-B' }, userSansStructure).ok).toBe(true);
  });

  test('autorise une ressource globale (sans code_structure)', () => {
    expect(verifierAppartenanceStructure({ code_structure: null }, userStructureA).ok).toBe(true);
  });
});

describe('requireStructureAccess (middleware)', () => {
  const run = (user, req) => {
    const res = mockRes();
    const next = jest.fn();
    requireStructureAccess(req, res, next);
    return { res, next };
  };

  test('laisse passer si aucune structure n\'est demandée', () => {
    const { next, res } = run(userStructureA, { user: userStructureA, params: {}, body: {}, query: {} });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('laisse passer si la structure demandée est la sienne (params)', () => {
    const { next } = run(userStructureA, {
      user: userStructureA, params: { code_structure: 'STR-A' }, body: {}, query: {},
    });
    expect(next).toHaveBeenCalled();
  });

  test('refuse avec 403 la structure d\'autrui (params)', () => {
    const { next, res } = run(userStructureA, {
      user: userStructureA, params: { code_structure: 'STR-B' }, body: {}, query: {},
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('refuse aussi via body et query', () => {
    const viaBody = run(userStructureA, { user: userStructureA, params: {}, body: { code_structure: 'STR-B' }, query: {} });
    expect(viaBody.res.status).toHaveBeenCalledWith(403);

    const viaQuery = run(userStructureA, { user: userStructureA, params: {}, body: {}, query: { code_structure: 'STR-B' } });
    expect(viaQuery.res.status).toHaveBeenCalledWith(403);
  });

  test('l\'administrateur général bypass le contrôle', () => {
    const { next } = run(userSansStructure, {
      user: userSansStructure, params: { code_structure: 'STR-Z' }, body: {}, query: {},
    });
    expect(next).toHaveBeenCalled();
  });
});
