const db = require('../models');
const Role = db.role;
const Permission = db.permission;
const HistoriqueService = require('../services/historique.service');


//Créer un rôle
exports.create = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.create(req.body);
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création du rôle: ${role.nom} (ID: ${role.id})`,
      clientIp,
      { 
        action: 'CREATE_ROLE',
        targetRoleId: role.id,
        roleData: { nom: role.nom, description: role.description }
      }
    );
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
/* exports.updateRole = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

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
}; */

exports.updateRole = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    // Récupérer l'ancien rôle avant modification
    const oldRole = await Role.findByPk(req.params.id);
    if (!oldRole) return res.status(404).json({ message: 'Rôle non trouvé' });

    const { nom, description } = req.body;
    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (description !== undefined) updateData.description = description;
    
    await oldRole.update(updateData);
    
    // Préparer les changements pour l'historique
    const changes = {};
    if (oldRole.nom !== nom) changes.nom = { old: oldRole.nom, new: nom };
    if (oldRole.description !== description) changes.description = { old: oldRole.description, new: description };
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du rôle: ${oldRole.nom} (ID: ${oldRole.id})`,
      clientIp,
      { 
        action: 'UPDATE_ROLE',
        targetRoleId: oldRole.id,
        changes: changes
      }
    );

    res.json({ message: 'Rôle mis à jour', role: oldRole });
  } catch (err) {
    console.error('Erreur mise à jour rôle:', err);
    res.status(500).json({ message: err.message });
  }
};

//Supprimer un rôle
exports.deleteRole = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });

    // Vérifier si le rôle est utilisé par des utilisateurs
    const utilisateursAvecRole = await db.Users.count({
      include: [{
        model: Role,
        where: { id: role.id },
        through: { attributes: [] }
      }]
    });
    
    if (utilisateursAvecRole > 0) {
      return res.status(400).json({ 
        message: `Impossible de supprimer ce rôle car il est utilisé par ${utilisateursAvecRole} utilisateur(s)` 
      });
    }
    
    // Récupérer les permissions associées pour l'historique
    const permissions = role.Permissions ? role.Permissions.map(p => p.nom) : [];
    
    await role.destroy();
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression du rôle: ${role.nom} (ID: ${role.id})`,
      clientIp,
      { 
        action: 'DELETE_ROLE',
        deletedRole: { 
          id: role.id, 
          nom: role.nom, 
          description: role.description,
          permissions: permissions
        }
      }
    );
    res.json({ message: 'Rôle supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//Assigner une permission à un rôle
exports.assignPermissions = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ message: 'Rôle non trouvé' });
    // Récupérer les permissions actuelles avant modification
    const anciennesPermissions = role.Permissions ? role.Permissions.map(p => ({ id: p.id, nom: p.nom })) : [];

    const permissions = await Permission.findAll({
      where: { id: req.body.permissionIds },
    });

     if (permissions.length === 0 && req.body.permissionIds && req.body.permissionIds.length > 0) {
      return res.status(400).json({ message: 'Aucune permission valide trouvée' });
    }

    await role.setPermissions(permissions);

    // Récupérer les nouvelles permissions pour l'historique
    const nouvellesPermissions = permissions.map(p => ({ id: p.id, nom: p.nom }));
    
    // Déterminer les permissions ajoutées et supprimées
    const anciensIds = anciennesPermissions.map(p => p.id);
    const nouveauxIds = nouvellesPermissions.map(p => p.id);
    
    const permissionsAjoutees = nouvellesPermissions.filter(p => !anciensIds.includes(p.id));
    const permissionsSupprimees = anciennesPermissions.filter(p => !nouveauxIds.includes(p.id));
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification des permissions du rôle: ${role.nom} (ID: ${role.id})`,
      clientIp,
      { 
        action: 'ASSIGN_PERMISSIONS_TO_ROLE',
        targetRoleId: role.id,
        roleNom: role.nom,
        permissionsAjoutees: permissionsAjoutees,
        permissionsSupprimees: permissionsSupprimees,
        totalPermissions: nouvellesPermissions.length
      }
    );
    
    res.json({ message: 'Permissions assignées au rôle' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
