/**
 * Tests — vérification d'appartenance à une structure (multi-tenant)
 */
const { verifierAppartenanceStructure } = require('../services/verification.service');

describe('verifierAppartenanceStructure', () => {
  test('404 si la ressource est introuvable', () => {
    const r = verifierAppartenanceStructure(null, { code_structure: 'STR-1' });
    expect(r).toEqual({ ok: false, statut: 404, message: expect.any(String) });
  });

  test('403 si la ressource appartient à une autre structure', () => {
    const r = verifierAppartenanceStructure(
      { id: 5, code_structure: 'STR-AUTRE' },
      { code_structure: 'STR-1' }
    );
    expect(r.ok).toBe(false);
    expect(r.statut).toBe(403);
  });

  test('ok si la ressource appartient à la structure de l\'utilisateur', () => {
    const r = verifierAppartenanceStructure(
      { id: 5, code_structure: 'STR-1' },
      { code_structure: 'STR-1' }
    );
    expect(r.ok).toBe(true);
  });

  test('ok pour une ressource globale (sans code_structure)', () => {
    const r = verifierAppartenanceStructure({ id: 5 }, { code_structure: 'STR-1' });
    expect(r.ok).toBe(true);
  });

  test('ok pour un utilisateur sans structure (admin général)', () => {
    const r = verifierAppartenanceStructure(
      { id: 5, code_structure: 'STR-AUTRE' },
      { code_structure: null }
    );
    expect(r.ok).toBe(true);
  });

  test('ok sans utilisateur (cas non authentifié géré en amont par authenticateToken)', () => {
    const r = verifierAppartenanceStructure({ id: 5, code_structure: 'STR-1' }, null);
    expect(r.ok).toBe(true);
  });
});