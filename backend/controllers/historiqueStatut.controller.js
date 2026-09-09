const db = require('../models');
const logger = require('../services/logger.js');
const { verifierAppartenanceStructure } = require('../services/verification.service');
const HistoriqueStatut = db.HistoriqueStatut;
const Bon = db.Bon;
const User = db.Users;

/**
 * Créer un nouvel historique de statut
 */
exports.create = async (req, res) => {
  try {
    const authUser = req.user;
    const { bonId, ancienStatut, nouveauStatut, commentaire } = req.body;

    if (!bonId || !nouveauStatut) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // Cloisonnement : le bon doit appartenir à la structure de l'utilisateur
    const bon = await Bon.findByPk(bonId, { attributes: ['id', 'code_structure'] });
    if (!bon) return res.status(404).json({ error: 'Bon non trouvé' });
    const verifBon = verifierAppartenanceStructure(bon, authUser);
    if (!verifBon.ok) return res.status(verifBon.statut).json({ error: verifBon.message });

    const historique = await HistoriqueStatut.create({
      bonId,
      ancienStatut,
      nouveauStatut,
      commentaire,
      // Identifiants dérivés de l'utilisateur authentifié — jamais du client
      agentId: authUser.id,
      code_structure: authUser.code_structure ?? bon.code_structure,
      dateChangement: new Date()
    });

    res.status(201).json(historique);
  } catch (error) {logger.error('historiqueStatut.controller', 'Erreur création historique statut :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création', details: error.message });
  }
};

/**
 * Récupérer tous les historiques d’une structure
 */
exports.findAllByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;

    if (!code_structure) {
      return res.status(400).json({ error: 'code_structure requis' });
    }

    const historiques = await HistoriqueStatut.findAll({
      where: { code_structure },
      include: [
        {
          model: Bon,
          as: 'bon',
          attributes: ['id', 'statutBon', 'type', 'createdAt']
        },
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'nom', 'prenom', 'email']
        }
      ],
      order: [['dateChangement', 'DESC']]
    });

    res.status(200).json(historiques);
  } catch (error) {logger.error('historiqueStatut.controller', 'Erreur récupération historiques :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération', details: error.message });
  }
};

/**
 * Récupérer les historiques d’un bon précis
 */
exports.findByBon = async (req, res) => {
  try {
    const { bonId } = req.params;

    // Cloisonnement : le bon doit appartenir à la structure de l'utilisateur
    // (l'admin général, sans structure, a accès à tout).
    const bon = await Bon.findByPk(bonId, { attributes: ['id', 'code_structure'] });
    if (!bon) return res.status(404).json({ error: 'Bon non trouvé' });
    const verif = verifierAppartenanceStructure(bon, req.user);
    if (!verif.ok) return res.status(verif.statut).json({ error: verif.message });

    const historiques = await HistoriqueStatut.findAll({
      where: { bonId },
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'nom', 'prenom']
        }
      ],
      order: [['dateChangement', 'DESC']]
    });

    res.status(200).json(historiques);
  } catch (error) {logger.error('historiqueStatut.controller', 'Erreur récupération historiques par bon :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération', details: error.message });
  }
};

/**
 * Supprimer un historique — réservé aux administrateurs de la structure
 * (Administrateur, Administrateur secondaire) et à l'administrateur général.
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const nomRoles = (req.user.roles || []).map(r => r.nom);
    const estAdminGeneral = !req.user.code_structure;
    const estAdminStructure =
      nomRoles.includes('Administrateur') || nomRoles.includes('Administrateur secondaire');
    if (!estAdminGeneral && !estAdminStructure) {
      return res.status(403).json({ error: 'Suppression réservée aux administrateurs' });
    }

    const historique = await HistoriqueStatut.findByPk(id);
    if (!historique) {
      return res.status(404).json({ error: 'Historique non trouvé' });
    }

    const verif = verifierAppartenanceStructure(historique, req.user);
    if (!verif.ok) return res.status(verif.statut).json({ error: verif.message });

    await historique.destroy();
    res.status(200).json({ message: 'Historique supprimé avec succès' });
  } catch (error) {logger.error('historiqueStatut.controller', 'Erreur suppression historique :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression', details: error.message });
  }
};
