// controllers/historiqueConnexionAction.controller.js
const db = require('../models');
const { Op } = db.Sequelize;

/**
 * Récupérer l'historique des connexions avec filtrage par rôle
 */
exports.getConnexionsByUser = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    const { userId } = req.params;
    const { page = 1, limit = 10, structureId, dateDebut, dateFin } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Construction de la clause WHERE
    let whereClause = {};
    
    // Vérifier les droits d'accès
    const isAdminGeneral = !authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur Général');
    const isAdminStructure = authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur');
    
    if (isAdminGeneral) {
      // Admin général: peut voir les historiques de tous les utilisateurs
      if (userId && userId !== 'all') {
        whereClause.userId = userId;
      }
      if (structureId) {
        // Filtrer par structure via l'utilisateur
        const usersInStructure = await db.Users.findAll({
          where: { code_structure: structureId },
          attributes: ['id']
        });
        whereClause.userId = { [Op.in]: usersInStructure.map(u => u.id) };
      }
    } 
    else if (isAdminStructure) {
      // Admin de structure: ne voit que les utilisateurs de sa structure
      const usersInStructure = await db.Users.findAll({
        where: { code_structure: authUser.code_structure },
        attributes: ['id']
      });
      
      if (userId && userId !== 'all') {
        // Vérifier que l'utilisateur demandé est dans sa structure
        const userExists = usersInStructure.some(u => u.id == userId);
        if (!userExists) {
          return res.status(403).json({ message: 'Accès non autorisé à cet utilisateur' });
        }
        whereClause.userId = userId;
      } else {
        whereClause.userId = { [Op.in]: usersInStructure.map(u => u.id) };
      }
    }
    else {
      // Utilisateur standard: ne voit que ses propres historiques
      whereClause.userId = authUser.id;
    }
    
    // Filtre par date
    if (dateDebut && dateFin) {
      whereClause.date = {
        [Op.between]: [new Date(dateDebut), new Date(dateFin)]
      };
    } else if (dateDebut) {
      whereClause.date = { [Op.gte]: new Date(dateDebut) };
    } else if (dateFin) {
      whereClause.date = { [Op.lte]: new Date(dateFin) };
    }
    
    const historiques = await db.HistoriqueConnexions.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.Users,
          attributes: ['id', 'nom', 'email', 'code_structure', 'magasinId'],
          include:{model: db.Structure, attributes:['id','nom_structure']}
        }
      ]
    });
    
    // Ajouter des métadonnées sur les droits
    res.json({
      items: historiques.rows,
      pagination: {
        total: historiques.count,
        page: parseInt(page),
        totalPages: Math.ceil(historiques.count / limit),
        limit: parseInt(limit)
      },
      userRole: {
        isAdminGeneral,
        isAdminStructure,
        code_structure: authUser.code_structure
      }
    });
  } catch (error) {
    console.error('Erreur getConnexionsByUser:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer l'historique des actions avec filtrage par rôle
 */
exports.getActionsByUser = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      actionType,
      structureId,
      dateDebut,
      dateFin,
      actionCategory // CREATE, UPDATE, DELETE, EXPORT, etc.
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Construction de la clause WHERE
    let whereClause = {};
    
    // Vérifier les droits d'accès
    const isAdminGeneral = !authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur Général');
    const isAdminStructure = authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur');
    
    if (isAdminGeneral) {
      // Admin général: peut voir les actions de tous les utilisateurs
      if (userId && userId !== 'all') {
        whereClause.userId = userId;
      }
      if (structureId) {
        // Filtrer par structure via l'utilisateur
        const usersInStructure = await db.Users.findAll({
          where: { code_structure: structureId },
          attributes: ['id']
        });
        whereClause.userId = { [Op.in]: usersInStructure.map(u => u.id) };
      }
    } 
    else if (isAdminStructure) {
      // Admin de structure: ne voit que les utilisateurs de sa structure
      const usersInStructure = await db.Users.findAll({
        where: { code_structure: authUser.code_structure },
        attributes: ['id']
      });
      
      if (userId && userId !== 'all') {
        const userExists = usersInStructure.some(u => u.id == userId);
        if (!userExists) {
          return res.status(403).json({ message: 'Accès non autorisé à cet utilisateur' });
        }
        whereClause.userId = userId;
      } else {
        whereClause.userId = { [Op.in]: usersInStructure.map(u => u.id) };
      }
    }
    else {
      // Utilisateur standard: ne voit que ses propres actions
      whereClause.userId = authUser.id;
    }
    
    // Filtre par type d'action
    if (actionType) {
      whereClause.action = { [Op.like]: `%${actionType}%` };
    }
    
    // Filtre par catégorie d'action
    if (actionCategory) {
      const categoryPatterns = {
        'CREATE': ['Création', 'create', 'CREATE'],
        'UPDATE': ['Mise à jour', 'update', 'UPDATE'],
        'DELETE': ['Suppression', 'delete', 'DELETE'],
        'EXPORT': ['Export', 'export', 'EXPORT'],
        'LOGIN': ['Connexion', 'login', 'LOGIN'],
        'STATUS': ['statut', 'status', 'STATUS','STATUT']
      };
      
      const patterns = categoryPatterns[actionCategory];
      if (patterns) {
        whereClause.action = {
          [Op.or]: patterns.map(p => ({ [Op.like]: `%${p}%` }))
        };
      }
    }
    
    // Filtre par date
    if (dateDebut && dateFin) {
      whereClause.date = {
        [Op.between]: [new Date(dateDebut), new Date(dateFin)]
      };
    } else if (dateDebut) {
      whereClause.date = { [Op.gte]: new Date(dateDebut) };
    } else if (dateFin) {
      whereClause.date = { [Op.lte]: new Date(dateFin) };
    }
    
    const historiques = await db.HistoriqueActionsUtilisateur.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.Users,
          attributes: ['id', 'nom', 'email', 'code_structure', 'magasinId'],
          include:{model: db.Structure, attributes:['id','nom_structure']}
        }
      ]
    });
    
    // Enrichir les actions avec des informations lisibles
    const enrichedItems = historiques.rows.map(item => ({
      ...item.toJSON(),
      actionType: getActionType(item.action),
      actionCategory: getActionCategory(item.action),
      readableDate: new Date(item.date).toLocaleString('fr-FR')
    }));
    
    res.json({
      items: enrichedItems,
      pagination: {
        total: historiques.count,
        page: parseInt(page),
        totalPages: Math.ceil(historiques.count / limit),
        limit: parseInt(limit)
      },
      userRole: {
        isAdminGeneral,
        isAdminStructure,
        code_structure: authUser.code_structure
      }
    });
  } catch (error) {
    console.error('Erreur getActionsByUser:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer toutes les actions récentes (avec filtrage par rôle)
 */
exports.getAllRecentActions = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const { limit = 50, days = 7, structureId, actionCategory } = req.query;
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    // Vérifier les droits d'accès
    const isAdminGeneral = !authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur Général');
    const isAdminStructure = authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur');
    
    let whereClause = {
      date: { [Op.gte]: dateLimit }
    };
    
    if (isAdminGeneral) {
      // Admin général: peut voir toutes les actions
      if (structureId) {
        const usersInStructure = await db.Users.findAll({
          where: { code_structure: structureId },
          attributes: ['id']
        });
        whereClause.userId = { [Op.in]: usersInStructure.map(u => u.id) };
      }
    } 
    else if (isAdminStructure) {
      // Admin de structure: ne voit que sa structure
      const usersInStructure = await db.Users.findAll({
        where: { code_structure: authUser.code_structure },
        attributes: ['id']
      });
      whereClause.userId = { [Op.in]: usersInStructure.map(u => u.id) };
    }
    else {
      // Utilisateur standard: ne voit que ses actions
      whereClause.userId = authUser.id;
    }
    
    // Filtre par catégorie d'action
    if (actionCategory) {
      const categoryPatterns = {
        'CREATE': ['Création', 'create', 'CREATE'],
        'UPDATE': ['Mise à jour', 'update', 'UPDATE'],
        'DELETE': ['Suppression', 'delete', 'DELETE'],
        'EXPORT': ['Export', 'export', 'EXPORT'],
        'LOGIN': ['Connexion', 'login', 'LOGIN']
      };
      
      const patterns = categoryPatterns[actionCategory];
      if (patterns) {
        whereClause.action = {
          [Op.or]: patterns.map(p => ({ [Op.like]: `%${p}%` }))
        };
      }
    }
    
    const actions = await db.HistoriqueActionsUtilisateur.findAll({
      where: whereClause,
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: db.Users,
          attributes: ['id', 'nom', 'email', 'code_structure', 'magasinId'],
          include:{model: db.Structure, attributes:['id','nom_structure']}
        }
      ]
    });
    
    // Grouper les actions par structure pour l'admin général
    let result = actions;
    if (isAdminGeneral && structureId === 'all') {
      const groupedByStructure = {};
      for (const action of actions) {
        const structure = action.User?.code_structure || 'Sans structure';
        if (!groupedByStructure[structure]) {
          groupedByStructure[structure] = [];
        }
        groupedByStructure[structure].push(action);
      }
      result = { groupedByStructure, total: actions.length };
    }
    
    res.json({
      items: result,
      total: actions.length,
      userRole: {
        isAdminGeneral,
        isAdminStructure,
        code_structure: authUser.code_structure
      }
    });
  } catch (error) {
    console.error('Erreur getAllRecentActions:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer les statistiques des historiques
 */
exports.getHistoriqueStats = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    const { period = 'week' } = req.query; // week, month, year
    
    let dateCondition;
    const now = new Date();
    
    switch(period) {
      case 'week':
        dateCondition = { [Op.gte]: new Date(now.setDate(now.getDate() - 7)) };
        break;
      case 'month':
        dateCondition = { [Op.gte]: new Date(now.setMonth(now.getMonth() - 1)) };
        break;
      case 'year':
        dateCondition = { [Op.gte]: new Date(now.setFullYear(now.getFullYear() - 1)) };
        break;
      default:
        dateCondition = { [Op.gte]: new Date(now.setDate(now.getDate() - 7)) };
    }
    
    // Vérifier les droits
    const isAdminGeneral = !authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur Général');
    const isAdminStructure = authUser.code_structure && 
      authUser.roles?.some(r => r.nom === 'Administrateur');
    
    let userIds = [];
    
    if (isAdminGeneral) {
      // Compter toutes les actions
      userIds = null;
    } else if (isAdminStructure) {
      const usersInStructure = await db.Users.findAll({
        where: { code_structure: authUser.code_structure },
        attributes: ['id']
      });
      userIds = usersInStructure.map(u => u.id);
    } else {
      userIds = [authUser.id];
    }
    
    let actionsWhere = { date: dateCondition };
    if (userIds) {
      actionsWhere.userId = { [Op.in]: userIds };
    }
    
    const stats = {
      totalConnexions: 0,
      totalActions: 0,
      actionsByType: {},
      connexionsByDay: [],
      actionsByDay: []
    };
    
    // Compter les connexions
    if (isAdminGeneral || isAdminStructure) {
      stats.totalConnexions = await db.HistoriqueConnexions.count({
        where: actionsWhere
      });
    }
    
    // Compter les actions
    stats.totalActions = await db.HistoriqueActionsUtilisateur.count({
      where: actionsWhere
    });
    
    // Compter les actions par type
    const actionTypes = await db.HistoriqueActionsUtilisateur.findAll({
      where: actionsWhere,
      attributes: [
        [db.Sequelize.fn('SUBSTRING_INDEX', db.Sequelize.col('action'), ' ', 1), 'actionType'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
      ],
      group: [db.Sequelize.fn('SUBSTRING_INDEX', db.Sequelize.col('action'), ' ', 1)]
    });
    
    stats.actionsByType = actionTypes.reduce((acc, item) => {
      const type = item.dataValues.actionType;
      acc[type] = parseInt(item.dataValues.count);
      return acc;
    }, {});
    
    res.json(stats);
  } catch (error) {
    console.error('Erreur getHistoriqueStats:', error);
    res.status(500).json({ message: error.message });
  }
};

// Fonctions utilitaires
function getActionType(action) {
  if (action.includes('Création') || action.includes('create')) return 'Création';
  if (action.includes('Mise à jour') || action.includes('update')) return 'Modification';
  if (action.includes('Suppression') || action.includes('delete')) return 'Suppression';
  if (action.includes('Export')) return 'Export';
  if (action.includes('Connexion')) return 'Connexion';
  if (action.includes('statut')) return 'Changement statut';
  return 'Autre';
}

function getActionCategory(action) {
  if (action.includes('Création') || action.includes('create')) return 'CREATE';
  if (action.includes('Mise à jour') || action.includes('update')) return 'UPDATE';
  if (action.includes('Suppression') || action.includes('delete')) return 'DELETE';
  if (action.includes('Export')) return 'EXPORT';
  if (action.includes('Connexion')) return 'LOGIN';
  if (action.includes('statut')) return 'STATUS';
  return 'OTHER';
}