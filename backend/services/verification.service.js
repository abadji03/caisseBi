/**
 * Vérification d'appartenance à une structure (multi-tenant).
 *
 * À utiliser dans les handlers update/delete/lecture sensible après le
 * chargement de la ressource par id : garantit que l'utilisateur ne peut
 * pas manipuler une ressource appartenant à une autre structure.
 *
 * Règles :
 *  - ressource introuvable                  -> 404
 *  - ressource sans code_structure          -> autorisée (ressource globale)
 *  - utilisateur sans structure (admin général) -> autorisé
 *  - code_structure différent               -> 403
 */
const verifierAppartenanceStructure = (record, authUser) => {
  if (!record) {
    return { ok: false, statut: 404, message: 'Ressource non trouvée' };
  }
  if (record.code_structure == null) {
    return { ok: true }; // ressource globale (ex. administrateur général)
  }
  if (!authUser?.code_structure) {
    return { ok: true }; // admin général sans structure
  }
  if (String(record.code_structure) !== String(authUser.code_structure)) {
    return {
      ok: false,
      statut: 403,
      message: 'Accès interdit : cette ressource appartient à une autre structure',
    };
  }
  return { ok: true };
};

module.exports = { verifierAppartenanceStructure };
