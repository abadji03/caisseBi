const db = require('../models');
const Role = db.Role;
const Permission = db.Permission;
const HistoriqueService = require('../services/historique.service');


exports.assignPermissionsToRole = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    // Récupérer les permissions existantes avant modification
    const oldPermissions = await role.getPermissions();
    const oldPermissionIds = oldPermissions.map(p => p.id);
    
    const permissions = await Permission.findAll({ 
      where: { id: req.body.permissionIds } 
    });
    
    await role.setPermissions(permissions);
    
    // Récupérer les nouvelles permissions assignées
    const newPermissions = await role.getPermissions();
    const newPermissionIds = newPermissions.map(p => p.id);
    
    // Identifier les permissions ajoutées et supprimées
    const addedPermissions = newPermissionIds.filter(id => !oldPermissionIds.includes(id));
    const removedPermissions = oldPermissionIds.filter(id => !newPermissionIds.includes(id));
    
    // Enregistrer l'historique
    let actionDetails = `Assignation de permissions au rôle "${role.nom}"`;
    if (addedPermissions.length > 0) {
      const addedPerms = await Permission.findAll({ where: { id: addedPermissions } });
      actionDetails += `\nPermissions ajoutées: ${addedPerms.map(p => p.nom).join(', ')}`;
    }
    if (removedPermissions.length > 0) {
      const removedPerms = await Permission.findAll({ where: { id: removedPermissions } });
      actionDetails += `\nPermissions retirées: ${removedPerms.map(p => p.nom).join(', ')}`;
    }
    
    await HistoriqueService.enregistrerAction(
      authUser.id,
      actionDetails,
      clientIp,
      {
        action: 'ASSIGN_PERMISSIONS_TO_ROLE',
        roleId: role.id,
        roleName: role.nom,
        addedPermissions: addedPermissions,
        removedPermissions: removedPermissions,
        finalPermissions: newPermissionIds,
        timestamp: new Date()
      }
    );
    
    res.json({ 
      message: 'Permissions assignées au rôle',
      details: {
        added: addedPermissions,
        removed: removedPermissions,
        total: newPermissions.length
      }
    });
  } catch (err) {
    console.error('Erreur assignPermissionsToRole:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    // Compatible avec /:roleId/permissions et /:id/permissions
    const id = req.params.roleId || req.params.id;
    const role = await Role.findByPk(id, {
      include: {
        model: Permission,
        through: { attributes: [] }
      }
    });
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    res.json({
      role: role.nom,
      permissions: role.Permissions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remplace les permissions existantes par de nouvelles
exports.updateRolePermissions = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });
    
    // Récupérer les anciennes permissions
    const oldPermissions = await role.getPermissions();
    const oldPermissionNames = oldPermissions.map(p => p.nom);
    
    const permissions = await Permission.findAll({ 
      where: { id: req.body.permissionIds } 
    });
    
    await role.setPermissions(permissions);
    
    // Récupérer les nouvelles permissions
    const newPermissions = await role.getPermissions();
    const newPermissionNames = newPermissions.map(p => p.nom);
    
    // Enregistrer l'historique
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour complète des permissions du rôle "${role.nom}"`,
      clientIp,
      {
        action: 'UPDATE_ROLE_PERMISSIONS',
        roleId: role.id,
        roleName: role.nom,
        oldPermissions: oldPermissionNames,
        newPermissions: newPermissionNames,
        timestamp: new Date()
      }
    );
    
    res.json({ 
      message: 'Permissions mises à jour pour le rôle.',
      details: {
        old: oldPermissionNames,
        new: newPermissionNames
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Supprime une ou plusieurs permissions d’un rôle sans toucher aux autres

exports.removeRolePermissions = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });
    
    // Récupérer les permissions à supprimer
    const permissionsToRemove = await Permission.findAll({
      where: { id: req.body.permissionIds }
    });
    
    await role.removePermissions(req.body.permissionIds);
    
    // Enregistrer l'historique
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression de permissions du rôle "${role.nom}": ${permissionsToRemove.map(p => p.nom).join(', ')}`,
      clientIp,
      {
        action: 'REMOVE_ROLE_PERMISSIONS',
        roleId: role.id,
        roleName: role.nom,
        removedPermissions: permissionsToRemove.map(p => ({ id: p.id, nom: p.nom })),
        timestamp: new Date()
      }
    );
    
    res.json({ 
      message: 'Permissions supprimées du rôle.',
      details: {
        removed: permissionsToRemove.map(p => p.nom)
      }
    });
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
 * GET /api/roles/:id/permissions — alias géré directement dans getRolePermissions ci-dessus
 */

exports.setRolePermissions = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const { permissionIds } = req.body;

    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }
    
    // Récupérer les anciennes permissions
    const oldPermissions = await role.getPermissions();
    const oldPermissionNames = oldPermissions.map(p => p.nom);

    const permissions = await Permission.findAll({
      where: { id: permissionIds }
    });

    await role.setPermissions(permissions);
    
    // Récupérer les nouvelles permissions
    const newPermissions = await role.getPermissions();
    const newPermissionNames = newPermissions.map(p => p.nom);
    
    // Enregistrer l'historique
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour des permissions du rôle "${role.nom}"`,
      clientIp,
      {
        action: 'SET_ROLE_PERMISSIONS',
        roleId: role.id,
        roleName: role.nom,
        oldPermissions: oldPermissionNames,
        newPermissions: newPermissionNames,
        timestamp: new Date()
      }
    );

    res.json({
      message: 'Permissions mises à jour avec succès',
      role: role.nom,
      permissions,
      changes: {
        old: oldPermissionNames,
        new: newPermissionNames
      }
    });
  } catch (error) {
    console.error('Erreur setRolePermissions:', error);
    res.status(500).json({ message: 'Erreur serveur', error });
  }
};

exports.getPermissionsGroupedByRole = async (req, res) => {
  try {
    const roles = await db.Role.findAll({
      attributes: ['id', 'nom'],
      include: [
        {
          model: db.Permission,
          attributes: ['id', 'nom', 'niveau', 'type'],
          through: { attributes: [] }
        }
      ],
      order: [
        ['id', 'ASC'],
        [db.Permission, 'niveau', 'ASC']
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

