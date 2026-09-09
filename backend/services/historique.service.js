const db = require('../models');
const logger = require('./logger.js');

class HistoriqueService {
  /**
   * Enregistre une connexion utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} ip - Adresse IP
   */
  static async enregistrerConnexion(userId, ip) {
    try {
      await db.HistoriqueConnexions.create({
        userId: userId,
        ip: ip,
        date: new Date()
      });
    } catch (error) {logger.error('historique.service', 'Erreur lors de l\'enregistrement de la connexion:', error);
    }
  }

  /**
   * Enregistre une action utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {string} action - Description de l'action
   * @param {string} ip - Adresse IP (optionnel)
   * @param {object} details - Détails supplémentaires (optionnel)
   */
  static async enregistrerAction(userId, action, ip = null, details = null) {
    try {
      await db.HistoriqueActionsUtilisateur.create({
        userId: userId,
        action: action,
        ip: ip,
        details: details,
        date: new Date()
      });
    } catch (error) {logger.error('historique.service', 'Erreur lors de l\'enregistrement de l\'action:', error);
    }
  }

  /**
   * Récupère l'IP du client depuis la requête
   * @param {object} req - Requête Express
   * @returns {string} - Adresse IP
   */
  /* static getClientIp(req) {
    let ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.ip;

    if (ip) {
      ip = ip.split(',')[0].trim();

      // Nettoyage IPv6 mapped IPv4
      if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
      }
    }

    return ip || 'unknown';
  } */

  static getClientIp(req) {
  let ip =
    req.headers['x-forwarded-for'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip;

  if (ip) {
    ip = ip.split(',')[0].trim();

    // Nettoyage IPv6 mapped IPv4
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // 👉 Cas localhost IPv6
    if (ip === '::1') {
      ip = '127.0.0.1';
    }
  }

  return ip || 'unknown';
}
}

module.exports = HistoriqueService;