/**
 * notification.controller.js
 * API REST pour la gestion des notifications utilisateur.
 */
const db = require('../models');
const logger = require('../services/logger.js');
const { Op } = db.Sequelize;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications  — liste paginée pour l'utilisateur connecté
// ─────────────────────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ message: 'Non authentifié' });

    const {
      page = 1,
      limit = 20,
      nonLuesSeulment = false,
    } = req.query;

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const offset   = (pageNum - 1) * limitNum;

    const code_structure = authUser.code_structure;
    const isAdmin  = authUser.roles?.some(r => ['Administrateur', 'Administrateur secondaire'].includes(r.nom));
    const isGerant = authUser.roles?.some(r => r.nom === 'Gérant');

    // Condition de ciblage :
    //  – Admin / Gérant voient les notifs globales (userId = null) ET les leurs
    //  – Vendeur ne voit que les siennes
    let whereUser;
    if (isAdmin || isGerant) {
      whereUser = {
        [Op.or]: [
          { userId: null },
          { userId: authUser.id },
        ],
      };
    } else {
      whereUser = { userId: authUser.id };
    }

    const where = {
      code_structure,
      ...whereUser,
      ...(nonLuesSeulment === 'true' ? { lu: false } : {}),
    };

    const { count, rows } = await db.Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      notifications: rows,
      nonLues: rows.filter(n => !n.lu).length,
      total: count,
      page: pageNum,
      totalPages: Math.ceil(count / limitNum),
    });
  } catch (error) {
    logger.error('notification.controller', '❌ getNotifications:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/count  — compteur de non-lues (pour le badge)
// ─────────────────────────────────────────────────────────────────────────────
exports.getCount = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ message: 'Non authentifié' });

    const code_structure = authUser.code_structure;
    const isAdmin  = authUser.roles?.some(r => ['Administrateur', 'Administrateur secondaire'].includes(r.nom));
    const isGerant = authUser.roles?.some(r => r.nom === 'Gérant');

    let whereUser;
    if (isAdmin || isGerant) {
      whereUser = { [Op.or]: [{ userId: null }, { userId: authUser.id }] };
    } else {
      whereUser = { userId: authUser.id };
    }

    const count = await db.Notification.count({
      where: { code_structure, lu: false, ...whereUser },
    });

    return res.json({ count });
  } catch (error) {
    logger.error('notification.controller', '❌ getCount:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/lire  — marquer une notification comme lue
// ─────────────────────────────────────────────────────────────────────────────
exports.marquerComeLue = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ message: 'Non authentifié' });

    const notif = await db.Notification.findByPk(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification introuvable' });

    if (notif.code_structure !== authUser.code_structure) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    await notif.update({ lu: true, luAt: new Date() });
    return res.json({ success: true, notification: notif });
  } catch (error) {
    logger.error('notification.controller', '❌ marquerComeLue:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/lire-tout  — marquer toutes comme lues
// ─────────────────────────────────────────────────────────────────────────────
exports.marquerToutesLues = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ message: 'Non authentifié' });

    const code_structure = authUser.code_structure;
    const isAdmin  = authUser.roles?.some(r => ['Administrateur', 'Administrateur secondaire'].includes(r.nom));
    const isGerant = authUser.roles?.some(r => r.nom === 'Gérant');

    let whereUser;
    if (isAdmin || isGerant) {
      whereUser = { [Op.or]: [{ userId: null }, { userId: authUser.id }] };
    } else {
      whereUser = { userId: authUser.id };
    }

    const [nbMaj] = await db.Notification.update(
      { lu: true, luAt: new Date() },
      { where: { code_structure, lu: false, ...whereUser } }
    );

    return res.json({ success: true, nbMaj });
  } catch (error) {
    logger.error('notification.controller', '❌ marquerToutesLues:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/:id  — supprimer une notification
// ─────────────────────────────────────────────────────────────────────────────
exports.supprimerNotification = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ message: 'Non authentifié' });

    const notif = await db.Notification.findByPk(req.params.id);
    if (!notif) return res.status(404).json({ message: 'Notification introuvable' });
    if (notif.code_structure !== authUser.code_structure) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    await notif.destroy();
    return res.json({ success: true });
  } catch (error) {
    logger.error('notification.controller', '❌ supprimerNotification:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/purger  — supprimer les lues > 30 jours
// ─────────────────────────────────────────────────────────────────────────────
exports.purgerAnciennes = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) return res.status(401).json({ message: 'Non authentifié' });

    const isAdmin = authUser.roles?.some(r => ['Administrateur', 'Administrateur secondaire'].includes(r.nom));
    if (!isAdmin) return res.status(403).json({ message: 'Réservé aux administrateurs' });

    const seuil = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const nb = await db.Notification.destroy({
      where: {
        code_structure: authUser.code_structure,
        lu: true,
        luAt: { [Op.lt]: seuil },
      },
    });

    return res.json({ success: true, nbSupprimees: nb });
  } catch (error) {
    logger.error('notification.controller', '❌ purgerAnciennes:', error);
    return res.status(500).json({ error: error.message });
  }
};
