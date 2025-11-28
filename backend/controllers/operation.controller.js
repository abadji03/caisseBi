// controllers/operationController.js
const db = require('../models');
const { Op } = require('sequelize');
const Operation = db.Operation;

// Méthode pour créer une opération à partir d'un bon
exports.createFromBon = async (bon, transaction = null) => {
  try {
    const operationData = {
      type: bon.type?.toUpperCase() || 'BON',
      bonId: bon.id,
      fournisseurId: bon.fournisseurId,
      clientId: bon.clientId,
      magasinId: bon.magasinId,
      resteAPayer: bon.resteAPayer || (bon.montantTotal - (bon.avance || 0)),
      agentId: bon.agentId,
      code_structure: bon.code_structure,
      montantPaye: bon.avance || 0,
      statut: bon.statutBon?.toUpperCase() || 'brouillon',
      dateOperation: bon.dateBon || bon.createdAt || new Date(),
      commentaire: `Bon ${bon.type} - ${bon.numero}`,
      numeroBon: bon.numero,
      fichier: bon.fichier || null

    };

    const options = transaction ? { transaction } : {};
    const operation = await Operation.create(operationData, options);
    console.log('✅ Opération créée depuis bon:', operation.id);
    return operation;
  } catch (error) {
    console.error('❌ Erreur création opération depuis bon:', error);
    throw error;
  }
};

// Méthode pour créer une opération à partir d'un paiement
exports.createFromPaiement = async (paiement, transaction = null) => {
  try {
    const typeOperation = paiement.typePaiement === 'client' ? 'REGLEMENT' : 'VERSEMENT';
    
    const operationData = {
      type: typeOperation,
      paiementId: paiement.id,
      bonId: paiement.bonId,
      fournisseurId: paiement.fournisseurId,
      clientId: paiement.clientId,
      magasinId: paiement.magasinId,
      agentId: paiement.agentId,
      code_structure: paiement.code_structure,
      montantPaye: paiement.montant,
      statut: paiement.statut?.toUpperCase() || 'EFFECTUE',
      dateOperation: paiement.date || new Date(),
      commentaire: paiement.description || `${typeOperation} - ${paiement.numero}`,
      moyenPaiement: paiement.methodePaiement,
      numeroVersement: paiement.numero,
      fichier: paiement.fichier
    };

    const options = transaction ? { transaction } : {};
    const operation = await Operation.create(operationData, options);
    console.log('✅ Opération créée depuis paiement:', operation.id);
    return operation;
  } catch (error) {
    console.error('❌ Erreur création opération depuis paiement:', error);
    throw error;
  }
};

// Créer une opération (méthode générique)
exports.create = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const operation = await Operation.create(req.body, { transaction });
    await transaction.commit();
    res.status(201).json(operation);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Récupérer toutes les opérations avec filtres
exports.findAll = async (req, res) => {
  try {
    const { 
      code_structure, 
      dateDebut, 
      dateFin, 
      type, 
      statut, 
      fournisseurId, 
      clientId,
      page = 1,
      limit = 50
    } = req.query;

    // Construction des conditions de filtrage
    const where = {};
    const include = [
      { model: db.Client, attributes: ['id', 'nomComplet', 'telephone', 'email'] },
      { model: db.Fournisseur, attributes: ['id', 'nomComplet', 'telephone', 'email'] },
      { model: db.Users, attributes: ['id', 'nom', 'prenom', 'email'] },
      { 
        model: db.Bon, 
        attributes: ['id', 'numero', 'type', 'statutBon', 'montantTotal', 'avance', 'resteAPayer', 'dateBon','remise'],
        include: [
          {
            model: db.Panier,
            attributes: ['id', 'totalHT', 'tva', 'totalTTC','tauxTVA'],
            include: [{
              model: db.ArticlePanier,
              attributes: ['id', 'quantite', 'prixUnitaire', 'prixVenteUnitaire', 'prixAchatUnitaire'],
              include: [{
                model: db.Produit,
                attributes: ['id', 'designation', 'unite']
              }]
            }]
          }
        ]
      },
      { 
        model: db.Paiement, 
        attributes: ['id', 'numero', 'montant', 'moyenPaiement', 'statut'] 
      },
      { model: db.Magasin, attributes: ['id', 'nom', 'adresse'] }
    ];

    // Filtre par structure
    if (code_structure) {
      where.code_structure = code_structure;
    }

    // Filtre par date
    if (dateDebut || dateFin) {
      where.dateOperation = {};
      if (dateDebut) {
        where.dateOperation[Op.gte] = new Date(dateDebut);
      }
      if (dateFin) {
        const dateFinObj = new Date(dateFin);
        dateFinObj.setHours(23, 59, 59, 999); // Fin de journée
        where.dateOperation[Op.lte] = dateFinObj;
      }
    }

    // Filtres supplémentaires
    if (type) where.type = type;
    if (statut) where.statut = statut;
    if (fournisseurId) where.fournisseurId = fournisseurId;
    if (clientId) where.clientId = clientId;

    // Pagination
    const offset = (page - 1) * limit;

    const operations = await Operation.findAndCountAll({
      where,
      include,
      order: [['dateOperation', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      distinct: true // Important pour count avec includes
    });

    res.json({
      operations: operations.rows,
      total: operations.count,
      totalPages: Math.ceil(operations.count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('❌ Erreur récupération opérations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les opérations par fournisseur
exports.findByFournisseur = async (req, res) => {
  try {
    const { code_structure, fournisseurId } = req.params;
    const { dateDebut, dateFin, type, statut } = req.query;

    const where = {
      code_structure,
      fournisseurId: parseInt(fournisseurId)
    };

    // Filtre par date
    if (dateDebut || dateFin) {
      where.dateOperation = {};
      if (dateDebut) {
        where.dateOperation[Op.gte] = new Date(dateDebut);
      }
      if (dateFin) {
        const dateFinObj = new Date(dateFin);
        dateFinObj.setHours(23, 59, 59, 999);
        where.dateOperation[Op.lte] = dateFinObj;
      }
    }

    if (type) where.type = type;
    if (statut) where.statut = statut;

    const operations = await Operation.findAll({
      where,
      include: [
        { model: db.Bon, include: {model:db.Panier,include: [{
              model: db.ArticlePanier,
              include: [{
                model: db.Produit,
              }]},
          ]},
        },
        { model: db.Paiement },
        { model: db.Users }
  ],
    order: [['createdAt', 'DESC']]
  });

    res.json(operations);
  } catch (error) {
    console.error('❌ Erreur opérations fournisseur:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les opérations par client
exports.findByClient = async (req, res) => {
  try {
    const { code_structure, clientId } = req.params;
    const { dateDebut, dateFin, type, statut } = req.query;

    const where = {
      code_structure,
      clientId: parseInt(clientId)
    };

    // Filtre par date
    if (dateDebut || dateFin) {
      where.dateOperation = {};
      if (dateDebut) {
        where.dateOperation[Op.gte] = new Date(dateDebut);
      }
      if (dateFin) {
        const dateFinObj = new Date(dateFin);
        dateFinObj.setHours(23, 59, 59, 999);
        where.dateOperation[Op.lte] = dateFinObj;
      }
    }

    if (type) where.type = type;
    if (statut) where.statut = statut;

    const operations = await Operation.findAll({
      where,
      include: [
        { model: db.Bon, include: {model:db.Panier,include: [{
              model: db.ArticlePanier,
              include: [{
                model: db.Produit,
              }]},
        { model: db.Paiement },
        { model: db.Users }
        ]}
    }],
      order: [['dateOperation', 'DESC']]
    });

    res.json(operations);
  } catch (error) {
    console.error('❌ Erreur opérations client:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer une opération par ID
exports.findById = async (req, res) => {
  try {
    const operation = await Operation.findByPk(req.params.id, {
      include: [
        {
          model: db.Bon,
          include: [{
            model: db.Panier,
            include: [{
              model: db.ArticlePanier,
              include: [db.Produit]
            }]
          }]
        },
        { model: db.Paiement },
        { model: db.Client },
        { model: db.Fournisseur },
        { model: db.User },
        { model: db.Magasin }
      ]
    });
    
    if (!operation) {
      return res.status(404).json({ message: 'Opération non trouvée' });
    }
    
    res.json(operation);
  } catch (error) {
    console.error('❌ Erreur récupération opération:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mettre à jour une opération
exports.update = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const [updated] = await Operation.update(req.body, {
      where: { id: req.params.id },
      transaction
    });
    
    if (!updated) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Opération non trouvée' });
    }
    
    const operation = await Operation.findByPk(req.params.id, { transaction });
    await transaction.commit();
    res.json(operation);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Supprimer une opération
exports.delete = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const deleted = await Operation.destroy({
      where: { id: req.params.id },
      transaction
    });
    
    if (!deleted) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Opération non trouvée' });
    }
    
    await transaction.commit();
    res.status(204).send();
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

// Statistiques des opérations
exports.getStats = async (req, res) => {
  try {
    const { code_structure, dateDebut, dateFin } = req.query;

    const where = {};
    if (code_structure) where.code_structure = code_structure;
    
    if (dateDebut || dateFin) {
      where.dateOperation = {};
      if (dateDebut) where.dateOperation[Op.gte] = new Date(dateDebut);
      if (dateFin) {
        const dateFinObj = new Date(dateFin);
        dateFinObj.setHours(23, 59, 59, 999);
        where.dateOperation[Op.lte] = dateFinObj;
      }
    }

    const stats = await Operation.findAll({
      where,
      attributes: [
        'type',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('montant')), 'totalMontant'],
        [db.sequelize.fn('SUM', db.sequelize.col('montantPaye')), 'totalPaye']
      ],
      group: ['type']
    });

    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
    res.status(500).json({ error: error.message });
  }
};