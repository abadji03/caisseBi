const db = require('../models');
const bcrypt = require('bcrypt');
const User = db.Users;
const Role = db.role;
const { Op } = require('sequelize'); // ✅ Op maintenant disponible
const HistoriqueService = require('../services/historique.service');


// Créer un nouvel utilisateur
exports.create = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const data = req.body;

    // Vérifie si l'utilisateur existe déjà par email
    const existingUser = await User.findOne({ where: { email: data.email } });

    if (existingUser) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà.' });
    }

    // Si un mot de passe est fourni, on le hache
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const user = await User.create(data);

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un nouvel utilisateur: ${user.email} (ID: ${user.id})`,
      clientIp,
      { 
        action: 'CREATE_USER',
        targetUserId: user.id,
        userData: { email: user.email, nom: user.nom, role: user.role }
      }
    );
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Erreur lors de la création de l'utilisateur.", error: error.message });
  }
};

// Récupérer tous les utilisateurs avec pagination
exports.findAll = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = 'tous'
    } = req.query;

    // Déterminer si c'est un admin général
    const isGeneralAdmin =
      authUser.structure_id === null &&
      authUser.code_structure === null &&
      authUser.roles?.some(r => r.nom === 'Administrateur Général');

    let whereClause = {};
    let roleWhere = {};

    if (isGeneralAdmin) {
      whereClause = {
        structure_id: { [Op.ne]: null }
      };
      roleWhere = {
        nom: 'Administrateur'
      };
    } else {
      whereClause = {
        structure_id: authUser.structure_id
      };
    }

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } }
      ];
    }

    // 🔹 FILTRE PAR STATUT
    if (statut !== 'tous') {
      whereClause.status = statut === 'actif' ? true : false;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Role,
          attributes: ['id', 'nom'],
          where: isGeneralAdmin ? roleWhere : undefined,
          required: isGeneralAdmin
        }
      ],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Utilisateurs: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un utilisateur par ID
exports.findOne = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const user = await User.findByPk(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour un utilisateur
exports.update = async (req, res) => {
  try {
    console.log('=== DÉBUT UPDATE UTILISATEUR ===');
    console.log('ID utilisateur:', req.params.id);
    console.log('Données reçues:', req.body);
    console.log('Mot de passe reçu:', req.body.password ? 'OUI' : 'NON');
    
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      console.log('ERROR: Non authentifié');
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    // Récupérer l'utilisateur avant modification pour comparer
    const oldUser = await User.findByPk(req.params.id);
    if (!oldUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    let data = req.body;

    // Vérifie si un nouveau mot de passe est fourni
    if (data.password) {
      console.log('Hashage du mot de passe...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      console.log('Mot de passe hashé (début):', hashedPassword.substring(0, 20));
      data.password = hashedPassword;
    } else {
      console.log('Aucun mot de passe fourni');
    }

    console.log('Données à mettre à jour:', data);
    
    // OPTION 1: Utiliser update() standard
    const [updated] = await User.update(data, {
      where: { id: req.params.id },
    });

    console.log('Résultat update:', updated ? 'SUCCÈS' : 'ÉCHEC');

    if (updated) {
      // Récupérer l'utilisateur pour vérifier
      const updatedUser = await User.findByPk(req.params.id, {
        attributes: ['id', 'email', 'password', 'nom'] // Inclure password pour vérifier
      });
      
      // ENREGISTRER L'HISTORIQUE AVEC LES CHANGEMENTS
      const changes = {};
      if (oldUser.nom !== updatedUser.nom) changes.nom = { old: oldUser.nom, new: updatedUser.nom };
      if (oldUser.email !== updatedUser.email) changes.email = { old: oldUser.email, new: updatedUser.email };
      if (oldUser.role !== updatedUser.role) changes.role = { old: oldUser.role, new: updatedUser.role };
      if (data.password) changes.password = 'modifié';
      
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Mise à jour de l'utilisateur: ${updatedUser.email} (ID: ${updatedUser.id})`,
        clientIp,
        { 
          action: 'UPDATE_USER',
          targetUserId: updatedUser.id,
          changes: changes
        }
      );
      console.log('Utilisateur après update:');
      console.log('- ID:', updatedUser.id);
      console.log('- Email:', updatedUser.email);
      console.log('- Nom:', updatedUser.nom);
      console.log('- Mot de passe présent:', updatedUser.password ? 'OUI' : 'NON');
      if (updatedUser.password) {
        console.log('- Longueur mot de passe:', updatedUser.password.length);
      }
      
      // Ne pas renvoyer le mot de passe hashé
      const userWithoutPassword = await User.findByPk(req.params.id, {
        attributes: { exclude: ['password'] }
      });
      
      res.json(userWithoutPassword);
    } else {
      console.log('ERROR: Utilisateur non trouvé');
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    console.log('=== FIN UPDATE UTILISATEUR ===');
  } catch (error) {
    console.error('ERROR dans update:', error);
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un utilisateur
exports.delete = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    // Récupérer l'utilisateur avant suppression
    const userToDelete = await User.findByPk(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    const deleted = await User.destroy({
      where: { id: req.params.id },
    });
    if (deleted) {
       // ENREGISTRER L'HISTORIQUE DE SUPPRESSION
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Suppression de l'utilisateur: ${userToDelete.email} (ID: ${userToDelete.id})`,
        clientIp,
        { 
          action: 'DELETE_USER',
          deletedUser: { 
            id: userToDelete.id, 
            email: userToDelete.email, 
            nom: userToDelete.nom,
            role: userToDelete.role
          }
        }
      );
      res.json({ message: 'Utilisateur supprimé' });
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer les utilisateurs par code_structure
exports.findByStructure = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const { code_structure } = req.params;

    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    } 

    const users = await User.findAll({
      where: { code_structure },
      include: [
        {
          model: Role,
          attributes: ['id', 'nom'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer les utilisateurs par code_structure avec pagination
exports.findByStructureBis = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const { code_structure } = req.params;
    
    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = 'tous'
    } = req.query;

    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Construction de la clause WHERE
    let whereClause = { code_structure };

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        //{ '$Roles.nom$': { [Op.like]: `%${search}%` } }
      ];
    }

    // 🔹 FILTRE PAR STATUT
    if (statut !== 'tous') {
      whereClause.status = statut === 'actif' ? true : false;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Role,
          attributes: ['id', 'nom'],
          through: { attributes: [] }
        },
      ],
      distinct: true,
      offset,
      limit: limitInt,
      order: [['createdAt', 'DESC']],
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Utilisateurs: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour uniquement le statut d'un fournisseur
exports.updateUserStatus = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const { status } = req.body;
    if (typeof status !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' });

    //await user.update({ status });
    const oldStatus = user.status;
    await user.update({ status });
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut de l'utilisateur ${user.email}: ${oldStatus ? 'actif' : 'inactif'} → ${status ? 'actif' : 'inactif'}`,
      clientIp,
      { 
        action: 'UPDATE_USER_STATUS',
        targetUserId: user.id,
        oldStatus: oldStatus,
        newStatus: status
      }
    );
    res.json({ message: 'Statut mis à jour avec succés', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};
