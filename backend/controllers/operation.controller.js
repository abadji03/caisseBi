const logger = require('../services/logger.js');
// controllers/operationController.js
const db = require('../models');
const { Op } = require('sequelize');
const Operation = db.Operation;

/**
 * Mappe le type d'un bon vers une valeur valide de l'ENUM Operation.type.
 * Les bons peuvent avoir des types variés (livraison, commande, vente, etc.)
 * qui doivent correspondre aux valeurs acceptées par la DB.
 */
const mapperTypeBon = (typeBon) => {
  if (!typeBon) return 'BON';
  const type = typeBon.toUpperCase().replace(/[\s-]/g, '_');
  const mapping = {
    BON:              'BON',
    BON_LIVRAISON:    'BON_LIVRAISON',
    BON_COMMANDE:     'BON_COMMANDE',
    LIVRAISON:        'LIVRAISON',
    COMMANDE:         'COMMANDE',
    VENTE:            'VENTE',
    RETOUR:           'RETOUR',
    AVOIR:            'AVOIR',
    FACTURE:          'FACTURE',
    TICKET_CAISSE:    'TICKET_CAISSE',
    VERSEMENT:        'VERSEMENT',
    REGLEMENT:        'REGLEMENT',
  };
  return mapping[type] || 'BON';
};

// Exporter pour tests éventuels
exports.mapperTypeBon = mapperTypeBon;
// ============================================================
// Sécurité : un utilisateur ne crée/modifie/supprime que des
// opérations de SA structure (même logique que requireStructureAccess
// / verifierAppartenanceStructure). L'admin général (sans code_structure)
// et les comptes "Accès total" ne sont pas contraints.
// ============================================================
const verifierEntitesOperation = async (data, codeStructure, transaction) => {
  const options = transaction ? { transaction } : {};
  if (data.bonId) {
    const bon = await db.Bon.findByPk(data.bonId, { attributes: ['id', 'code_structure'], ...options });
    if (!bon) return `Le bon ${data.bonId} est introuvable`;
    if (codeStructure && bon.code_structure !== codeStructure) return `Le bon ${data.bonId} n'appartient pas à votre structure`;
  }
  if (data.paiementId) {
    const paiement = await db.Paiement.findByPk(data.paiementId, { attributes: ['id', 'code_structure'], ...options });
    if (!paiement) return `Le paiement ${data.paiementId} est introuvable`;
    if (codeStructure && paiement.code_structure !== codeStructure) return `Le paiement ${data.paiementId} n'appartient pas à votre structure`;
  }
  return null;
};

exports.createFromBon = async (bon, transaction = null) => {
  try {

    let statutOperation = bon.statutBon?.toUpperCase() || 'VALIDÉ';
    
    // Vérifier si une facture existe pour ce bon
    const facture = await db.Facture.findOne({
      where: { bonId: bon.id },
      transaction
    });
    
    if (facture) {
      statutOperation = 'FACTURÉ';
    }
    
    // Si le bon a un numeroFacture mais pas de facture, ignorer
    if (bon.numeroFacture && !facture) {logger.warn('operation.controller', `⚠️ Bon ${bon.numero} a numeroFacture sans facture réelle`);
      // Garder le statut original
      statutOperation = bon.statutBon?.toUpperCase() || 'VALIDÉ';
    }
    const operationData = {
      type: mapperTypeBon(bon.type),
      bonId: bon.id,
      fournisseurId: bon.fournisseurId,
      clientId: bon.clientId,
      magasinId: bon.magasinId,
      resteAPayer: bon.resteAPayer ?? (bon.montantTotal - (bon.avance ?? 0)),
      agentId: bon.agentId,
      code_structure: bon.code_structure,
      montantPaye: bon.avance ?? 0,
      statut: statutOperation, //bon.statutBon?.toUpperCase() || 'brouillon',
      dateOperation: bon.dateBon || bon.createdAt || new Date(),
      commentaire: `Bon ${bon.type} - ${bon.numero}`,
      numeroBon: bon.numero,
      fichier: bon.fichier || null

    };

    const options = transaction ? { transaction } : {};
     // Vérifier si une opération existe déjà pour ce bon
    let operation = await Operation.findOne({
      where: { bonId: bon.id },
      ...options
    });

    if (operation) {
      // Mettre à jour l'opération existante
      await operation.update(operationData, options);logger.log('operation.controller', 'Opération mise à jour depuis bon:', operation.id, 'Statut:', operationData.statut);
    } else {
      // Créer une nouvelle opération
      operation = await Operation.create(operationData, options);logger.log('operation.controller', 'Nouvelle opération créée depuis bon:', operation.id, 'Statut:', operationData.statut);
    }
    
    return operation;
    /* const operation = await Operation.create(operationData, options);logger.log('operation.controller', 'Opération créée depuis bon:', operation.id);
    return operation; */
  } catch (error) {logger.error('operation.controller', 'Erreur création opération depuis bon:', error);
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
    let operation;
    
    // Vérifier si une opération existe déjà pour ce paiement
    if (paiement.id) {
      operation = await Operation.findOne({
        where: { paiementId: paiement.id },
        ...options
      });
    }
    
    // Si pas de paiementId, vérifier par bonId et type
    if (!operation && paiement.bonId) {
      operation = await Operation.findOne({
        where: { 
          bonId: paiement.bonId,
          type: typeOperation,
          montantPaye: paiement.montant
        },
        ...options
      });
    }

    if (operation) {
      // Mettre à jour l'opération existante
      await operation.update(operationData, options);logger.log('operation.controller', 'Opération mise à jour depuis paiement:', operation.id);
    } else {
      // Créer une nouvelle opération
      operation = await Operation.create(operationData, options);logger.log('operation.controller', 'Nouvelle opération créée depuis paiement:', operation.id);
    }
    
    return operation;
    /* const operation = await Operation.create(operationData, options);logger.log('operation.controller', 'Opération créée depuis paiement:', operation.id);
    return operation; */
  } catch (error) {logger.error('operation.controller', '❌ Erreur création opération depuis paiement:', error);
    throw error;
  }
};

// Méthode générique pour créer ou mettre à jour une opération
exports.createOrUpdate = async (operationData, transaction = null) => {
  try {
    const options = transaction ? { transaction } : {};
    const where = {};
    
    // Déterminer les critères de recherche
    if (operationData.bonId) {
      where.bonId = operationData.bonId;
    }
    if (operationData.paiementId) {
      where.paiementId = operationData.paiementId;
    }
    if (operationData.type) {
      where.type = operationData.type;
    }
    
    let operation;
    
    // Rechercher une opération existante
    if (Object.keys(where).length > 0) {
      operation = await Operation.findOne({
        where,
        ...options
      });
    }

    if (operation) {
      // Mettre à jour l'opération existante
      await operation.update(operationData, options);logger.log('operation.controller', '✅ Opération mise à jour:', operation.id);
    } else {
      // Créer une nouvelle opération
      operation = await Operation.create(operationData, options);logger.log('operation.controller', '✅ Nouvelle opération créée:', operation.id);
    }
    
    return operation;
  } catch (error) {logger.error('operation.controller', '❌ Erreur création/mise à jour opération:', error);
    throw error;
  }
};
// Méthode spécifique pour mettre à jour une opération quand le statut du bon change
exports.updateFromBon = async (bon, transaction = null) => {
  try {
    // Chercher l'opération associée au bon
    const operation = await Operation.findOne({
      where: { bonId: bon.id },
      transaction: transaction || undefined
    });

    if (!operation) {logger.log('operation.controller', `⚠️ Aucune opération trouvée pour le bon ${bon.id}, création d'une nouvelle`);
      return await this.createFromBon(bon, transaction);
    }

    // Mettre à jour les champs pertinents
    const updates = {
      statut: bon.statutBon?.toUpperCase() || operation.statut,
      resteAPayer: bon.resteAPayer ?? operation.resteAPayer,
      montantPaye: bon.avance ?? operation.montantPaye,
      dateOperation: bon.dateBon || operation.dateOperation,
      commentaire: `Bon ${bon.type} - ${bon.numero} (${bon.statutBon})`
    };

    // Si le statut change, ajouter un historique
    if (bon.statutBon && bon.statutBon.toUpperCase() !== operation.statut) {
      updates.commentaire = `[${new Date().toLocaleDateString()}] ${operation.statut} → ${bon.statutBon.toUpperCase()}: ${bon.description || 'Changement de statut'}`;
    }

    await operation.update(updates, { transaction: transaction || undefined });logger.log('operation.controller', `✅ Opération ${operation.id} mise à jour pour le bon ${bon.numero}, nouveau statut: ${updates.statut}`);
    
    return operation;
  } catch (error) {logger.error('operation.controller', '❌ Erreur mise à jour opération depuis bon:', error);
    throw error;
  }
};
// Méthode pour annuler une opération (quand un bon est annulé)
exports.annulerOperation = async (bonId, raison = 'Bon annulé', transaction = null) => {
  try {
    const operation = await Operation.findOne({
      where: { bonId },
      transaction: transaction || undefined
    });

    if (!operation) {logger.log('operation.controller', `⚠️ Aucune opération trouvée pour annulation (bonId: ${bonId})`);
      return null;
    }

    // Mettre à jour le statut
    await operation.update({
      statut: 'ANNULE',
      commentaire: `${operation.commentaire} - [ANNULATION] ${raison}`,
      dateAnnulation: new Date()
    }, { transaction: transaction || undefined });logger.log('operation.controller', `✅ Opération ${operation.id} annulée pour le bon ${bonId}`);
    return operation;
  } catch (error) {logger.error('operation.controller', '❌ Erreur annulation opération:', error);
    throw error;
  }
};
// Méthode pour synchroniser toutes les opérations avec leurs bons
exports.synchroniserOperations = async (code_structure, transaction = null) => {
  try {
    const options = transaction ? { transaction } : {};
    let compteur = { misesAJour: 0, nouvelles: 0, erreurs: 0 };

    // Récupérer tous les bons sans opération associée
    const bonsSansOperation = await db.Bon.findAll({
      where: { 
        code_structure,
        statutBon: { [Op.ne]: 'brouillon' } // Exclure les brouillons
      },
      include: [
        {
        model: db.Operation,
        required: false // LEFT JOIN
      },
      {
          model: db.Facture,  // l'inclusion des factures
          required: false
        }
    ],
      ...options
    });

    // Filtrer les bons qui n'ont pas d'opération
    const bonsASynchroniser = bonsSansOperation.filter(bon => !bon.Operation);logger.log('operation.controller', `🔄 Synchronisation de ${bonsASynchroniser.length} bons sans opération`);

    // Créer des opérations pour chaque bon
    for (const bon of bonsASynchroniser) {
      try {
        await this.createFromBon(bon, transaction);
        compteur.nouvelles++;
      } catch (error) {logger.error('operation.controller', `❌ Erreur synchronisation bon ${bon.id}:`, error.message);
        compteur.erreurs++;
      }
    }

    // Mettre à jour les opérations existantes
    const operations = await Operation.findAll({
      where: { code_structure },
      include: [{
        model: db.Bon,
        required: true
      }],
      ...options
    });

    for (const operation of operations) {
      try {
        const bon = operation.Bon;
        if (bon) {
          // Vérifier si l'opération est à jour
          const besoinMiseAJour = 
            operation.statut !== bon.statutBon?.toUpperCase() ||
            operation.resteAPayer !== bon.resteAPayer ||
            operation.montantPaye !== (bon.avance ?? 0);

          if (besoinMiseAJour) {
            await operation.update({
              statut: bon.statutBon?.toUpperCase() || operation.statut,
              resteAPayer: bon.resteAPayer ?? operation.resteAPayer,
              montantPaye: bon.avance ?? operation.montantPaye,
              commentaire: `Bon ${bon.type} - ${bon.numero} (${bon.statutBon})`
            }, { transaction: transaction || undefined });
            compteur.misesAJour++;
          }
        }
      } catch (error) {logger.error('operation.controller', `❌ Erreur mise à jour opération ${operation.id}:`, error.message);
        compteur.erreurs++;
      }
    }logger.log('operation.controller', '✅ Synchronisation terminée:', compteur);
    return compteur;
  } catch (error) {logger.error('operation.controller', '❌ Erreur synchronisation générale:', error);
    throw error;
  }
};
// Créer une opération (méthode générique)
exports.create = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    // SÉCURITÉ : la structure provient de l'utilisateur connecté (jamais du corps)
    // et les entités liées (bon, paiement) doivent appartenir à cette structure.
    const codeStructure = authUser.code_structure || req.body?.code_structure;
    if (authUser.code_structure && req.body?.code_structure && req.body.code_structure !== authUser.code_structure) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Accès refusé : cette ressource n\'appartient pas à votre structure' });
    }
    const corpsSecurise = { ...req.body, code_structure: codeStructure };
    const erreurEntite = await verifierEntitesOperation(corpsSecurise, codeStructure, transaction);
    if (erreurEntite) {
      await transaction.rollback();
      return res.status(400).json({ message: erreurEntite });
    }

    const operation = await Operation.create(corpsSecurise, { transaction });
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
        where.dateOperation[Op.gte] = new Date(`${dateDebut}T00:00:00`);
      }
      if (dateFin) {
        where.dateOperation[Op.lte] = new Date(`${dateFin}T23:59:59`);
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
      order: [['date_operation', 'DESC']],
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

  } catch (error) {logger.error('operation.controller', '❌ Erreur récupération opérations:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les opérations par fournisseur
exports.findByFournisseur = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const code_structure = authUser.code_structure;
    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    const { fournisseurId } = req.params;
    const { dateDebut, dateFin, type, statut } = req.query;logger.log('operation.controller', 'Requête opérations fournisseur:', {
      code_structure,
      fournisseurId,
      dateDebut,
      dateFin,
      type,
      statut
    });

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier" || r.nom === "Employé");

    if (!isAdminStructure && !isGerant && !isCaissier) {
        return res.status(403).json({
          message: "Accès interdit : rôle insuffisant"
        });
    }
    
    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      fournisseurId: parseInt(fournisseurId),
      statut: { [Op.ne]: 'BROUILLON' }
    };

    if (isAdminStructure) {
      // Admin -> tout structure
      //Aucune filtre
    } 
    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;
    } 
    else if (isCaissier) {
      // Caissier/Employé -> uniquement ses paniers
      whereClause.agentId = authUser.id;
      if (authUser.magasinId) {
        whereClause.magasinId = authUser.magasinId;
      }
    } 
    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }
    /* const where = {
      code_structure,
      fournisseurId: parseInt(fournisseurId),
      statut: { [Op.ne]: 'BROUILLON' }
    }; */

    // Filtre par date
    if (dateDebut || dateFin) {
      whereClause.dateOperation = {};
      if (dateDebut) {
        whereClause.dateOperation[Op.gte] = new Date(`${dateDebut}T00:00:00`);logger.log('operation.controller', 'Date début:', dateDebut, '->', new Date(`${dateDebut}T00:00:00`).toISOString());
      }
      if (dateFin) {
        whereClause.dateOperation[Op.lte] = new Date(`${dateFin}T23:59:59`);logger.log('operation.controller', 'Date fin:', dateFin, '->', new Date(`${dateFin}T23:59:59`).toISOString());
      }
    }logger.log('operation.controller', 'Conditions date:', whereClause.dateOperation);
    if (type) whereClause.type = type;
    if (statut) whereClause.statut = statut;logger.log('operation.controller', '🔍 Requête Sequelize WHERE:', JSON.stringify(whereClause, null, 2));

    const operations = await Operation.findAll({
      where : whereClause,
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
  });logger.log('operation.controller', `${operations.length} opérations trouvées`);
    res.json(operations);
  } catch (error) {logger.error('operation.controller', ' Erreur opérations fournisseur:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les opérations par client
exports.findByClient = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    const { clientId } = req.params;
    const { dateDebut, dateFin, type, statut } = req.query;

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier" || r.nom === "Employé");

    if (!isAdminStructure && !isGerant && !isCaissier) {
        return res.status(403).json({
          message: "Accès interdit : rôle insuffisant"
        });
    }
    
    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      clientId: parseInt(clientId),
      statut: { [Op.ne]: 'BROUILLON' }
    };

    if (isAdminStructure) {
      // Admin -> tout structure
      //Aucune filtre
    } 
    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;
    } 
    else if (isCaissier) {
      // Caissier/Employé -> uniquement ses paniers
      whereClause.agentId = authUser.id;
      if (authUser.magasinId) {
        whereClause.magasinId = authUser.magasinId;
      }
    } 
    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }
    /* const where = {
      code_structure,
      clientId: parseInt(clientId),
      statut: { [Op.ne]: 'BROUILLON' }
    }; */

    // Filtre par date
    // Les dates arrivent au format YYYY-MM-DD (heure locale).
    // new Date("YYYY-MM-DD") les interprète en UTC minuit, ce qui décale
    // d'un jour en heure locale positive (UTC+1, UTC+2...).
    // On ajoute T00:00:00 pour forcer l'interprétation en heure locale.
    if (dateDebut || dateFin) {
      whereClause.dateOperation = {};
      if (dateDebut) {
        whereClause.dateOperation[Op.gte] = new Date(`${dateDebut}T00:00:00`);
      }
      if (dateFin) {
        const dateFinObj = new Date(`${dateFin}T23:59:59`);
        whereClause.dateOperation[Op.lte] = dateFinObj;
      }
    }

    if (type) whereClause.type = type;
    if (statut) whereClause.statut = statut;

    const operations = await Operation.findAll({
      where: whereClause,
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
      order: [['date_operation', 'DESC']]
    });

    res.json(operations);
  } catch (error) {logger.error('operation.controller', '❌ Erreur opérations client:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer une opération par ID
exports.findById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
        { model: db.Users },
        { model: db.Magasin }
      ]
    });
    
    if (!operation) {
      return res.status(404).json({ message: 'Opération non trouvée' });
    }
    
    res.json(operation);
  } catch (error) {logger.error('operation.controller', '❌ Erreur récupération opération:', error);
    res.status(500).json({ error: error.message });
  }
};

// Mettre à jour une opération
exports.update = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    // SÉCURITÉ : l'utilisateur ne modifie que les opérations de sa structure.
    const operationExistante = await Operation.findByPk(req.params.id, { transaction });
    if (!operationExistante) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Opération non trouvée' });
    }
    if (operationExistante.code_structure && authUser.code_structure && operationExistante.code_structure !== authUser.code_structure) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Accès refusé : cette ressource n\'appartient pas à votre structure' });
    }
    // La clé de structure et les identifiants ne sont pas modifiables depuis le client.
    const corpsSecurise = { ...req.body };
    delete corpsSecurise.code_structure;
    delete corpsSecurise.bonId;
    delete corpsSecurise.paiementId;
    const erreurEntite = await verifierEntitesOperation(corpsSecurise, operationExistante.code_structure, transaction);
    if (erreurEntite) {
      await transaction.rollback();
      return res.status(400).json({ message: erreurEntite });
    }

    const [updated] = await Operation.update(corpsSecurise, {
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    // SÉCURITÉ : l'utilisateur ne supprime que les opérations de sa structure.
    const operationExistante = await Operation.findByPk(req.params.id, { transaction });
    if (!operationExistante) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Opération non trouvée' });
    }
    if (operationExistante.code_structure && authUser.code_structure && operationExistante.code_structure !== authUser.code_structure) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Accès refusé : cette ressource n\'appartient pas à votre structure' });
    }

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
      if (dateDebut) where.dateOperation[Op.gte] = new Date(`${dateDebut}T00:00:00`);
      if (dateFin) where.dateOperation[Op.lte] = new Date(`${dateFin}T23:59:59`);
    }

    const stats = await Operation.findAll({
      where,
      attributes: [
        'type',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('montant')), 'totalMontant'],
        [db.sequelize.fn('SUM', db.sequelize.col('montant_paye')), 'totalPaye']
      ],
      group: ['type']
    });

    res.json(stats);
  } catch (error) {logger.error('operation.controller', '❌ Erreur statistiques:', error);
    res.status(500).json({ error: error.message });
  }
};