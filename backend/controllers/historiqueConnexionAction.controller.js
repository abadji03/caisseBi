const db = require('../models');
const {Op} = db.Sequelize;

// Récupérer l'historique des connexions d'un utilisateur
exports.getConnexionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const historiques = await db.HistoriqueConnexions.findAndCountAll({
      where: { userId },
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.Users,
          attributes: ['id', 'nom', 'email']
        }
      ]
    });
    
    res.json({
      items: historiques.rows,
      pagination: {
        total: historiques.count,
        page: parseInt(page),
        totalPages: Math.ceil(historiques.count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer l'historique des actions d'un utilisateur
exports.getActionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, actionType } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = { userId };
    if (actionType) {
      whereClause.action = { [Op.like]: `%${actionType}%` };
    }
    
    const historiques = await db.HistoriqueActionsUtilisateur.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: db.Users,
          attributes: ['id', 'nom', 'email']
        }
      ]
    });
    
    res.json({
      items: historiques.rows,
      pagination: {
        total: historiques.count,
        page: parseInt(page),
        totalPages: Math.ceil(historiques.count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer toutes les actions récentes (pour admin)
exports.getAllRecentActions = async (req, res) => {
  try {
    const { limit = 50, days = 7 } = req.query;
    
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    
    const actions = await db.HistoriqueActionsUtilisateur.findAll({
      where: {
        date: { [Op.gte]: dateLimit }
      },
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: db.Users,
          attributes: ['id', 'nom', 'email']
        }
      ]
    });
    
    res.json(actions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};