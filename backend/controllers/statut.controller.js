// statut.controller.js
const db = require('../models');
const { BonWorkflow } = require('./bonComplet.controller');

exports.changerStatutBon = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const { bonId, nouveauStatut, commentaire, agentId } = req.body;
    
    if (!bonId || !nouveauStatut || !agentId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Données incomplètes' });
    }
    
    // Récupérer le bon
    const bon = await db.Bon.findByPk(bonId, { transaction });
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Bon introuvable' });
    }
    
    // Vérifier la transition
    const ancienStatut = bon.statutBon;
    const transitionValide = BonWorkflow.validerTransition(
      ancienStatut,
      nouveauStatut,
      bon.typeEntite,
      bon.type
    );
    
    if (!transitionValide) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Transition de statut non autorisée',
        ancienStatut,
        nouveauStatut,
        transitionsAutorisees: BonWorkflow.getTransitionsAutorisees(bon.typeEntite, bon.type, ancienStatut)
      });
    }
    
    // Récupérer les articles du bon
    const panier = await db.Panier.findOne({ 
      where: { bonId: bon.id },
      include: [{
        model: db.ArticlePanier,
        as: 'ArticlePaniers'
      }]
    }, { transaction });
    
    // Mettre à jour le statut
    await bon.update({ statutBon: nouveauStatut }, { transaction });
    
    // Créer l'historique
    await db.HistoriqueStatut.create({
      bonId: bon.id,
      ancienStatut,
      nouveauStatut,
      code_structure: bon.code_structure,
      agentId,
      commentaire: commentaire || `Changement de statut: ${ancienStatut} → ${nouveauStatut}`,
      dateChangement: new Date()
    }, { transaction });
    
    // Traiter les impacts du changement de statut
    const bonCompletController = require('./bonComplet.controller');
    await bonCompletController.traiterChangementStatut(
      bon,
      panier.ArticlePaniers,
      bon.magasinId,
      agentId,
      bon.code_structure,
      bon.typeEntite,
      transaction
    );
    
    // Créer une opération pour le changement de statut
    await require('./operation.controller').createFromBon(bon, transaction);
    
    await transaction.commit();
    
    res.json({
      message: 'Statut du bon mis à jour avec succès',
      bon,
      transition: {
        from: ancienStatut,
        to: nouveauStatut,
        autorisee: true
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur changement statut bon:', error);
    res.status(500).json({ error: 'Erreur lors du changement de statut', details: error.message });
  }
};

exports.getHistoriqueStatuts = async (req, res) => {
  try {
    const { bonId } = req.params;
    
    const historique = await db.HistoriqueStatut.findAll({
      where: { bonId },
      include: [{
        model: db.User,
        as: 'Agent',
        attributes: ['id', 'nom', 'prenom', 'email']
      }],
      order: [['dateChangement', 'DESC']]
    });
    
    res.json(historique);
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
};

exports.getTransitionsPossibles = async (req, res) => {
  try {
    const { bonId } = req.params;
    
    const bon = await db.Bon.findByPk(bonId);
    if (!bon) {
      return res.status(404).json({ error: 'Bon introuvable' });
    }
    
    const transitions = BonWorkflow.getTransitionsAutorisees(
      bon.typeEntite,
      bon.type,
      bon.statutBon
    );
    
    res.json({
      bon: {
        id: bon.id,
        numero: bon.numero,
        type: bon.type,
        typeEntite: bon.typeEntite,
        statutActuel: bon.statutBon
      },
      transitionsPossibles: transitions
    });
  } catch (error) {
    console.error('Erreur récupération transitions:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des transitions possibles' });
  }
};