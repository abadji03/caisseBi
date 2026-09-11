const db = require('../models');
const logger = require('../services/logger.js');
const { invalidateUserPermissions } = require('../middlewares/auth.middleware');
const User = db.Users;
const Role = db.Role;

exports.assignRolesToUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const roles = await Role.findAll({ where: { id: req.body.roleIds } });
    await user.setRoles(roles);
    invalidateUserPermissions(user.id);

    res.json({ message: "Rôles assignés à l'utilisateur" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserRoles = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      include: Role,
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.json(user.roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remplace les rôles existants par de nouveaux
exports.updateUserRoles = async (req, res) => {
  try {logger.log('user-role.controller', 'Corps de la requête reçu :', req.body);
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const roles = await Role.findAll({ where: { id: req.body.roleIds } });
    await user.setRoles(roles);
    invalidateUserPermissions(user.id); // Remplace les anciens rôles

    res.json({ message: "Rôles mis à jour pour l'utilisateur." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Supprime un ou plusieurs rôles d’un utilisateur sans toucher aux autres
exports.removeUserRoles = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    await user.removeRoles(req.body.roleIds);
    invalidateUserPermissions(user.id);

    res.json({ message: "Rôles supprimés de l'utilisateur." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
