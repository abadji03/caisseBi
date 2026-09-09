const db = require('../models');
const Historique = db.HistoriqueActionsUtilisateur;

exports.create = async (req, res) => {
  try {
    const { userId, action } = req.body;

    const historique = await Historique.create({ userId, action });
    res.status(201).json(historique);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'enregistrement de l'action", error });
  }
};

// Règle d'accès à l'historique d'un utilisateur : soit l'utilisateur lui-même,
// soit un admin (Administrateur/Administrateur secondaire) de la MÊME structure,
// soit l'administrateur général (sans structure).
const verifierAccesHistorique = async (authUser, userIdCible) => {
  const cible = await db.Users.findByPk(userIdCible, {
    attributes: ['id', 'code_structure'],
  });
  if (!cible) {
    return { ok: false, statut: 404, message: 'Utilisateur non trouvé' };
  }
  if (!authUser.code_structure) return { ok: true }; // admin général
  if (Number(authUser.id) === Number(userIdCible)) return { ok: true }; // soi-même
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
    const data = await Historique.findAll({
      where: { userId },
      order: [['date', 'DESC']],
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des actions', error });
  }
};
