const db = require("../models");
const User = db.Users;
const Role = db.role;

exports.assignRolesToUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    const roles = await Role.findAll({ where: { id: req.body.roleIds } });
    await user.setRoles(roles);

    res.json({ message: "Rôles assignés à l'utilisateur" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserRoles = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId, {
      include: Role
    });
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.json(user.roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
