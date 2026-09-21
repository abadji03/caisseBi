const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent un token valide
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Gestion des notifications utilisateur
 */

// GET    /api/notifications         — liste paginée
router.get('/', ctrl.getNotifications);

// GET    /api/notifications/count   — compteur non-lues (badge)
router.get('/count', ctrl.getCount);

// PATCH  /api/notifications/lire-tout — tout marquer comme lu
router.patch('/lire-tout', ctrl.marquerToutesLues);

// DELETE /api/notifications/purger  — purger les lues > 30j
router.delete('/purger', ctrl.purgerAnciennes);

// PATCH  /api/notifications/:id/lire — marquer une comme lue
router.patch('/:id/lire', ctrl.marquerComeLue);

// DELETE /api/notifications/:id     — supprimer une notification
router.delete('/:id', ctrl.supprimerNotification);

module.exports = router;
