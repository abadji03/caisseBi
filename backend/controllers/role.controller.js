const db = require('../models');
const Role = db.role;
const Permission = db.permission;

//Créer un rôle
exports.create = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//Récupérer tous les rôles
exports.findAll = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const roles = await Role.findAll({ include: Permission });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//Obtenir un rôle par ID
exports.getRoleById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//Mettre à jour un rôle
exports.updateRole = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    const { nom } = req.body;
    await role.update({ nom });

    res.json({ message: 'Rôle mis à jour', role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//Supprimer un rôle
exports.deleteRole = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    await role.destroy();
    res.json({ message: 'Rôle supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//Assigner une permission à un rôle
exports.assignPermissions = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    const permissions = await Permission.findAll({
      where: { id: req.body.permissionIds },
    });

    await role.setPermissions(permissions);
    res.json({ message: 'Permissions assignées au rôle' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
