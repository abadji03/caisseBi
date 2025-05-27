const db = require("../models");
const Role = db.role;
const Permission = db.permission;

exports.assignPermissionsToRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: "Rôle non trouvé" });

    const permissions = await Permission.findAll({ where: { id: req.body.permissionIds } });
    await role.setPermissions(permissions);

    res.json({ message: "Permissions assignées au rôle" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId, {
      include: Permission
    });
    if (!role) return res.status(404).json({ message: "Rôle non trouvé" });

    res.json(role.permissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remplace les permissions existantes par de nouvelles
exports.updateRolePermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: "Rôle non trouvé" });

    const permissions = await Permission.findAll({ where: { id: req.body.permissionIds } });
    await role.setPermissions(permissions); // Remplace les anciennes permissions

    res.json({ message: "Permissions mises à jour pour le rôle." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Supprime une ou plusieurs permissions d’un rôle sans toucher aux autres
exports.removeRolePermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: "Rôle non trouvé" });

    await role.removePermissions(req.body.permissionIds);

    res.json({ message: "Permissions supprimées du rôle." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

