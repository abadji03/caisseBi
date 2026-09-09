const db = require('../models');
const HistoriqueConnexions = db.HistoriqueConnexions;

exports.create = async (req, res) => {
  try {
    const { userId, ip } = req.body;
    const record = await HistoriqueConnexions.create({ userId, ip });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'enregistrement de la connexion", error });
  }
};

// Même règle que historiqueActionsUtilisateur : soi-même, admin de la même
// structure, ou administrateur général.
const verifierAccesHistorique = async (authUser, userIdCible) => {
  const cible = await db.Users.findByPk(userIdCible, {
    attributes: ['id', 'code_structure'],
  });
  if (!cible) {
    return { ok: false, statut: 404, message: 'Utilisateur non trouvé' };
  }
  if (!authUser.code_structure) return { ok: true };
  if (Number(authUser.id) === Number(userIdCible)) return { ok: true };
  const nomRoles = (authUser.roles || []).map(r => r.nom);
  const isAdminStructure =
    (nomRoles.includes('Administrateur') || nomRoles.includes('Administrateur secondaire')) &&
    cible.code_structure === authUser.code_structure;
  if (isAdminStructure) return { ok: true };
  return {
    ok: false,
    statut: 403,
    message: "Accès interdit : historique d'un autre utilisateur",
  };
};

exports.findByUser = async (req, res) => {
  try {
    const acces = await verifierAccesHistorique(req.user, req.params.userId);
    if (!acces.ok) return res.status(acces.statut).json({ message: acces.message });

    const { userId } = req.params;
    const data = await HistoriqueConnexions.findAll({
      where: { userId },
      order: [['date', 'DESC']],
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des connexions', error });
  }
};
