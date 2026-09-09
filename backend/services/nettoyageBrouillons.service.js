// services/nettoyageBrouillons.service.js
//
// Nettoyage automatique des brouillons de caisse abandonnés.
//
// Un brouillon est "abandonné" quand il est en_cours, sans bon associé et
// sans mise à jour depuis N jours. Deux destins :
//  - vide (0 article) → supprimé : il ne portait aucune donnée métier ;
//  - non vide → archivé en 'annulé' : les données restent consultables.
//
// Déclenché par le planificateur de app.js (NETTOYAGE_BROUILLONS_HEURES,
// défaut : toutes les 6 h) ou manuellement via POST /paniers/nettoyage-brouillons.

const logger = require('./logger');

class NettoyageBrouillonsService {
  static async nettoyerBrouillonsAbandonnes({ joursInactivite = 7, limite = 500 } = {}) {
    const db = require('../models');
    const { Op } = db.Sequelize;

    const dateLimite = new Date(Date.now() - joursInactivite * 24 * 60 * 60 * 1000);

    const brouillons = await db.Panier.findAll({
      where: {
        statut: 'en_cours',
        bonId: null,
        [Op.or]: [
          { dateMiseAJour: { [Op.and]: [{ [Op.ne]: null }, { [Op.lt]: dateLimite }] } },
          { dateMiseAJour: null, dateCreation: { [Op.lt]: dateLimite } },
        ],
      },
      limit: limite,
    });

    let supprimes = 0;
    let archives = 0;

    for (const panier of brouillons) {
      const nbArticles = await db.ArticlePanier.count({ where: { panierId: panier.id } });
      try {
        if (nbArticles === 0) {
          await panier.destroy();
          supprimes += 1;
        } else {
          await panier.update({ statut: 'annulé', dateMiseAJour: new Date() });
          archives += 1;
        }
      } catch (error) {
        logger.error('nettoyageBrouillons', `Échec sur le panier #${panier.id} :`, error);
      }
    }

    if (supprimes || archives) {
      logger.log('nettoyageBrouillons',
        `Brouillons abandonnés (> ${joursInactivite} j) : ${supprimes} supprimé(s), ${archives} archivé(s) en 'annulé'.`);
    }
    return { examines: brouillons.length, supprimes, archives };
  }

  /** Démarre le planificateur (appelé une fois au démarrage du serveur). */
  static demarrerPlanificateur() {
    const heures = Number(process.env.NETTOYAGE_BROUILLONS_HEURES);
    const intervalleHeures = Number.isFinite(heures) && heures > 0 ? heures : 6;
    const intervalleMs = intervalleHeures * 60 * 60 * 1000;

    // Première passe différée : laisse le temps au démarrage de se terminer.
    setTimeout(() => {
      this.nettoyerBrouillonsAbandonnes().catch(e =>
        logger.error('nettoyageBrouillons', 'Erreur première passe :', e));
    }, 60 * 1000).unref();

    setInterval(() => {
      this.nettoyerBrouillonsAbandonnes().catch(e =>
        logger.error('nettoyageBrouillons', 'Erreur passe planifiée :', e));
    }, intervalleMs).unref();

    logger.log('nettoyageBrouillons', `Planificateur démarré : toutes les ${intervalleHeures} h.`);
  }
}

module.exports = NettoyageBrouillonsService;