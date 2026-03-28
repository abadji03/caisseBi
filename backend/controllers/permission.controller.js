const db = require('../models');
const Permission = db.permission;
const HistoriqueService = require('../services/historique.service');

exports.create = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const data = await Permission.create(req.body);
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'une permission: ${data.nom} (ID: ${data.id})`,
      clientIp,
      { 
        action: 'CREATE_PERMISSION',
        targetId: data.id,
        permissionData: { 
          nom: data.nom, 
          type: data.type,
          description: data.description 
        }
      }
    );

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const data = await Permission.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const data = await Permission.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'Permission non trouvée' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    // Récupérer l'ancienne version avant mise à jour
    const oldPermission = await Permission.findByPk(req.params.id);
    if (!oldPermission) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }
    const [updated] = await Permission.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Permission non trouvée' });
    // Récupérer la nouvelle version
    const newPermission = await Permission.findByPk(req.params.id);
    
    // Construire la liste des changements
    const changes = {};
    if (oldPermission.nom !== newPermission.nom) {
      changes.nom = { old: oldPermission.nom, new: newPermission.nom };
    }
    if (oldPermission.type !== newPermission.type) {
      changes.type = { old: oldPermission.type, new: newPermission.type };
    }
    if (oldPermission.description !== newPermission.description) {
      changes.description = { 
        old: oldPermission.description, 
        new: newPermission.description 
      };
    }
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour de la permission: ${newPermission.nom} (ID: ${newPermission.id})`,
      clientIp,
      { 
        action: 'UPDATE_PERMISSION',
        targetId: newPermission.id,
        changes: changes
      }
    );
    res.json({ message: 'Permission mise à jour' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Récupérer la permission avant suppression
    const permissionToDelete = await Permission.findByPk(req.params.id);
    if (!permissionToDelete) {
      return res.status(404).json({ message: 'Permission non trouvée' });
    }

    const deleted = await Permission.destroy({ where: { id: req.params.id } });
    //if (!deleted) return res.status(404).json({ message: 'Permission non trouvée' });
    if (deleted) {
      // ENREGISTRER L'HISTORIQUE
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Suppression de la permission: ${permissionToDelete.nom} (ID: ${permissionToDelete.id})`,
        clientIp,
        { 
          action: 'DELETE_PERMISSION',
          deletedPermission: { 
            id: permissionToDelete.id, 
            nom: permissionToDelete.nom,
            type: permissionToDelete.type,
            description: permissionToDelete.description
          }
        }
      );
      res.json({ message: 'Permission supprimée' });
    } else {
      res.status(404).json({ message: 'Permission non trouvée' });
    }
    res.json({ message: 'Permission supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
