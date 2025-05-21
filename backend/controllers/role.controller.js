const db = require("../models");
const Role = db.role;
const Permission = db.permission;

exports.create = async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const roles = await Role.findAll({ include: Permission });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.assignPermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: "Rôle non trouvé" });

    const permissions = await Permission.findAll({
      where: { id: req.body.permissionIds }
    });

    await role.setPermissions(permissions);
    res.json({ message: "Permissions assignées au rôle" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
