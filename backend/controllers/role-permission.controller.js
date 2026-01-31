const db = require('../models');
const Role = db.role;
const Permission = db.permission;

exports.assignPermissionsToRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    const permissions = await Permission.findAll({ where: { id: req.body.permissionIds } });
    await role.setPermissions(permissions);

    res.json({ message: 'Permissions assignées au rôle' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId, {
      include: Permission,
    });
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    res.json(role.permissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remplace les permissions existantes par de nouvelles
exports.updateRolePermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    const permissions = await Permission.findAll({ where: { id: req.body.permissionIds } });
    await role.setPermissions(permissions); // Remplace les anciennes permissions

    res.json({ message: 'Permissions mises à jour pour le rôle.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Supprime une ou plusieurs permissions d’un rôle sans toucher aux autres
exports.removeRolePermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    await role.removePermissions(req.body.permissionIds);

    res.json({ message: 'Permissions supprimées du rôle.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//...........................Pour les tests avec Postman seulement............................//
/**
 * GET /api/roles
 */
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

/**
 * GET /api/roles/:id/permissions
 */
exports.getRolePermissions = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: {
        model: Permission,
        through: { attributes: [] }
      }
    });

    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    res.json({
      role: role.nom,
      permissions: role.Permissions
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

/**
 * POST /api/roles/:id/permissions
 * body: { permissionIds: [1,2,3] }
 */
exports.setRolePermissions = async (req, res) => {
  try {
    const { permissionIds } = req.body;

    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    const permissions = await Permission.findAll({
      where: { id: permissionIds }
    });

    await role.setPermissions(permissions);

    res.json({
      message: 'Permissions mises à jour avec succès',
      role: role.nom,
      permissions
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};
exports.getPermissionsGroupedByRole = async (req, res) => {
  try {
    const roles = await db.role.findAll({
      attributes: ['id', 'nom'],
      include: [
        {
          model: db.permission,
          attributes: ['id', 'nom', 'niveau', 'type'],
          through: { attributes: [] }
        }
      ],
      order: [
        ['id', 'ASC'],
        [db.permission, 'niveau', 'ASC']
      ]
    });

    const result = roles.map(role => ({
      roleId: role.id,
      role: role.nom,
      permissions: role.permissions
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des permissions groupées par rôle',
      error
    });
  }
};

