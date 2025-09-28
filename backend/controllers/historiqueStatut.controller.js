const db = require('../models');
const HistoriqueStatut = db.HistoriqueStatut;
const Bon = db.Bon;
const User = db.Users;

/**
 * Créer un nouvel historique de statut
 */
exports.create = async (req, res) => {
  try {
    const { bonId, ancienStatut, nouveauStatut, commentaire, agentId, code_structure } = req.body;

    if (!bonId || !nouveauStatut || !agentId || !code_structure) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const historique = await HistoriqueStatut.create({
      bonId,
      ancienStatut,
      nouveauStatut,
      commentaire,
      agentId,
      code_structure,
      dateChangement: new Date()
    });

    res.status(201).json(historique);
  } catch (error) {
    console.error('Erreur création historique statut :', error);
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
  } catch (error) {
    console.error('Erreur récupération historiques :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération', details: error.message });
  }
};

/**
 * Récupérer les historiques d’un bon précis
 */
exports.findByBon = async (req, res) => {
  try {
    const { bonId } = req.params;

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
  } catch (error) {
    console.error('Erreur récupération historiques par bon :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération', details: error.message });
  }
};

/**
 * Supprimer un historique (optionnel, à restreindre si besoin)
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const historique = await HistoriqueStatut.findByPk(id);
    if (!historique) {
      return res.status(404).json({ error: 'Historique non trouvé' });
    }

    await historique.destroy();
    res.status(200).json({ message: 'Historique supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression historique :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression', details: error.message });
  }
};
