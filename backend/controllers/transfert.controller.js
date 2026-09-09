const db = require('../models');
const logger = require('../services/logger.js');
const Transfert = db.Transfert;
const Stock = db.Stock;
const { Op } = db.Sequelize;
const { safeNumber } = require('./bonComplet/statutManager')
const HistoriqueService = require('../services/historique.service');




exports.createTransfert = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      await transaction.rollback();
      return res.status(401).json({ message: "Non authentifié" });
    }

    const {
      produitId,
      quantite,
      magasinSource,
      magasinDestination,
      motif,
      agentResponsable,
    } = req.body;

    if (!produitId || !quantite || !magasinSource || !magasinDestination) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Données incomplètes : produitId, quantite, magasinSource et magasinDestination sont requis' });
    }

    const code_structure = authUser.code_structure;
    const reference = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Récupérer les informations du produit et des magasins pour l'historique
    const [produit, magasinSrc, magasinDest] = await Promise.all([
      db.Produit.findByPk(produitId, { transaction }),
      db.Magasin.findByPk(magasinSource, { transaction }),
      db.Magasin.findByPk(magasinDestination, { transaction }),
    ]);

    const transfert = await Transfert.create({
      code_structure,
      produitId,
      quantite,
      magasinSource,
      magasinDestination,
      motif,
      agentResponsable,
      reference,
    }, { transaction });

    await transaction.commit();

    // ENREGISTRER L'HISTORIQUE (hors transaction — opération non critique)
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un transfert: ${reference} - ${produit?.designation || 'Produit'} (${quantite}) de ${magasinSrc?.nom || magasinSource} vers ${magasinDest?.nom || magasinDestination}`,
      clientIp,
      {
        action: 'CREATE_TRANSFERT',
        transfertId: transfert.id,
        reference: reference,
        produitId: produitId,
        quantite: quantite,
        magasinSource: magasinSource,
        magasinDestination: magasinDestination,
        motif: motif,
        agentResponsable: agentResponsable
      }
    );

    res.status(201).json(transfert);
  } catch (err) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }logger.error('transfert.controller', 'Erreur création transfert:', err);
    res.status(500).json({ message: 'Erreur lors de la création du transfert', error: err.message });
  }
};

exports.validerTransfert = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { id } = req.params;
    const agentValidation = authUser.id;

    // Récupérer le transfert avec les associations
    const transfert = await Transfert.findByPk(id, {
      include: [
        { model: db.Produit },
        { model: db.Magasin, as: 'MagasinSource' },
        { model: db.Magasin, as: 'MagasinDestination' }
      ]
    });
    
    if (!transfert) {
      return res.status(404).json({ message: 'Transfert introuvable' });
    }

    if (transfert.statut !== 'En attente') {
      return res.status(400).json({ message: 'Ce transfert a déjà été traité' });
    }

    // 1. Vérifier le stock source
    let stockSource = await Stock.findOne({
      where: { 
        produitId: transfert.produitId, 
        magasinId: transfert.magasinSource,
        code_structure: transfert.code_structure 
      }
    });

    if (!stockSource) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Stock source non trouvé' });
    }

    const quantiteDisponible = safeNumber(stockSource.quantiteTotale )- (safeNumber(stockSource.quantiteReservee) || 0);
    
    if (quantiteDisponible < safeNumber(transfert.quantite)) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Stock source insuffisant' });
    }

    // 2. Vérifier/créer le stock destination
    let stockDestination = await Stock.findOne({
      where: { 
        produitId: transfert.produitId, 
        magasinId: transfert.magasinDestination,
        code_structure: transfert.code_structure 
      }
    });

    // Sauvegarder les anciennes quantités pour l'historique
    const ancienneQuantiteSource = safeNumber(stockSource.quantiteTotale);
    const ancienneQuantiteDestination = stockDestination ? safeNumber(stockDestination.quantiteTotale) : 0;

    // 3. Mettre à jour les stocks
    // Sortie du magasin source
    await stockSource.update({
      quantiteTotale: safeNumber(stockSource.quantiteTotale) - safeNumber(transfert.quantite),
      dateDerniereMiseAJour: new Date()
    }, { transaction });


    // Entrée dans le magasin destination
    // Entrée dans le magasin destination
    let nouvelleQuantiteDestination;
    if (stockDestination) {
      nouvelleQuantiteDestination = safeNumber(stockDestination.quantiteTotale) + safeNumber(transfert.quantite);
      await stockDestination.update({
        quantiteTotale: safeNumber(stockDestination.quantiteTotale) + safeNumber(transfert.quantite),
        dateDerniereMiseAJour: new Date()
      }, { transaction });
    } else {
      // Créer un nouveau stock avec les seuils par défaut
      //const produit = await db.Produit.findByPk(transfert.produitId);
      stockDestination = await Stock.create({
        produitId: transfert.produitId,
        magasinId: transfert.magasinDestination,
        code_structure: transfert.code_structure,
        quantiteTotale: transfert.quantite,
        quantiteReservee: 0,
        seuilAlerte: 5,
        seuilReapprovisionnement: 10,
        datePeremption:stockSource.datePeremption,
        prixVenteUnitaire : stockSource.prixVenteUnitaire,
        dernierPrixAchat:stockSource.dernierPrixAchat,
        stockSecurite:5,
        statutStock: 'En stock'
      }, { transaction });
    }

    // 4. Créer les mouvements de stock
    const reference = `MVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Mouvement de sortie
    const mouvementSortie = await db.MouvementStock.create({
      produitId: transfert.produitId,
      stockId: stockSource.id,
      typeMouvement: 'Sortie',
      quantite: transfert.quantite,
      prixUnitaire: stockSource.dernierPrixAchat,
      description: `Transfert vers magasin ${transfert.magasinDestination} - Ref: ${transfert.reference}`,
      code_structure: transfert.code_structure,
      magasinId: transfert.magasinSource,
      acteurId: agentValidation,
      ref: `${reference}-S`,
      dateMouvement: new Date(),
      transfertId: transfert.id
    }, { transaction });

    // Mouvement d'entrée
    const mouvementEntree = await db.MouvementStock.create({
      produitId: transfert.produitId,
      stockId: stockDestination.id,
      typeMouvement: 'Entrée',
      prixUnitaire: stockSource.dernierPrixAchat,
      quantite: transfert.quantite,
      description: `Transfert depuis magasin ${transfert.magasinSource} - Ref: ${transfert.reference}`,
      code_structure: transfert.code_structure,
      magasinId: transfert.magasinDestination,
      acteurId: agentValidation,
      ref: `${reference}-E`,
      dateMouvement: new Date(),
      transfertId: transfert.id
    }, { transaction });

    // 5. Mettre à jour le transfert
    transfert.statut = 'Validé';
    transfert.dateValidation = new Date();
    transfert.agentValidation = agentValidation;
    //transfert.mouvementSortieId = mouvementSortie.id;
    //transfert.mouvementEntreeId = mouvementEntree.id;

    await transfert.save({ transaction });

    await transaction.commit();

    // ENREGISTRER L'HISTORIQUE DE VALIDATION
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Validation du transfert: ${transfert.reference} - ${transfert.Produit?.designation || 'Produit'} (${transfert.quantite}) de ${transfert.MagasinSource?.nom || transfert.magasinSource} vers ${transfert.MagasinDestination?.nom || transfert.magasinDestination}`,
      clientIp,
      {
        action: 'VALIDATE_TRANSFERT',
        transfertId: transfert.id,
        reference: transfert.reference,
        produitId: transfert.produitId,
        produitNom: transfert.Produit?.designation,
        quantite: transfert.quantite,
        magasinSource: transfert.magasinSource,
        magasinSourceNom: transfert.MagasinSource?.nom,
        magasinDestination: transfert.magasinDestination,
        magasinDestinationNom: transfert.MagasinDestination?.nom,
        stockSource: {
          ancienneQuantite: ancienneQuantiteSource,
          nouvelleQuantite: safeNumber(stockSource.quantiteTotale)
        },
        stockDestination: {
          ancienneQuantite: ancienneQuantiteDestination,
          nouvelleQuantite: nouvelleQuantiteDestination
        },
        mouvementSortieId: mouvementSortie.id,
        mouvementEntreeId: mouvementEntree.id
      }
    );

    res.json({
      message: 'Transfert validé avec succès',
      transfert,
      mouvements: {
        sortie: mouvementSortie,
        entree: mouvementEntree
      }
    });

  } catch (err) {
    await transaction.rollback();logger.error('transfert.controller', 'Erreur validation transfert:', err);
    res.status(500).json({ message: 'Erreur lors de la validation', error: err.message });
  }
};

exports.refuserTransfert = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      await transaction.rollback();
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { id } = req.params;
    const agentValidation = authUser.id;

    const transfert = await Transfert.findByPk(id, {
      include: [
        { model: db.Produit },
        { model: db.Magasin, as: 'MagasinSource' },
        { model: db.Magasin, as: 'MagasinDestination' }
      ],
      transaction
    });

    if (!transfert) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Transfert introuvable' });
    }

    if (transfert.statut !== 'En attente') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Ce transfert a déjà été traité' });
    }

    const ancienStatut = transfert.statut;
    await transfert.update({
      statut: 'Refusé',
      dateValidation: new Date(),
      agentValidation
    }, { transaction });

    await transaction.commit();

    // ENREGISTRER L'HISTORIQUE (hors transaction — opération non critique)
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Refus du transfert: ${transfert.reference} - ${transfert.Produit?.designation || 'Produit'} (${transfert.quantite}) de ${transfert.MagasinSource?.nom || transfert.magasinSource} vers ${transfert.MagasinDestination?.nom || transfert.magasinDestination}`,
      clientIp,
      {
        action: 'REJECT_TRANSFERT',
        transfertId: transfert.id,
        reference: transfert.reference,
        produitId: transfert.produitId,
        produitNom: transfert.Produit?.designation,
        quantite: transfert.quantite,
        magasinSource: transfert.magasinSource,
        magasinSourceNom: transfert.MagasinSource?.nom,
        magasinDestination: transfert.magasinDestination,
        magasinDestinationNom: transfert.MagasinDestination?.nom,
        ancienStatut: ancienStatut,
      }
    );

    res.json({ message: 'Transfert refusé', transfert });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();logger.error('transfert.controller', 'Erreur refus transfert:', err);
    res.status(500).json({ message: 'Erreur lors du refus', error: err.message });
  }
};

exports.listerParStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    
    // Paramètres de pagination et filtres
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = '',
      /* magasinId = '',
      dateDebut = '',
      dateFin = '' */
    } = req.query;

    // Vérification des droits d'accès
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({ message: "Accès interdit" });
    }

    // Vérifier le rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur"|| r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

    if (!isAdminStructure && !isGerant) {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // Construction de la clause WHERE
    let whereClause = {
      code_structure: code_structure
    };

    // 🔹 Si gérant : ne voir que les transferts de son magasin
    if (!isAdminStructure && isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({ message: "Gérant non associé à un magasin" });
      }
      
      // Le gérant voit les transferts où son magasin est impliqué
      whereClause[Op.or] = [
        { magasinSource: authUser.magasinId },
        { magasinDestination: authUser.magasinId }
      ];
    }

    // Filtre par statut
    if (statut && statut !== 'tous') {
      whereClause.statut = statut;
    }

    // Recherche textuelle
    if (search) {
        whereClause[Op.or] = [
          { reference: { [Op.like]: `%${search}%` } },
          { '$Produit.designation$': { [Op.like]: `%${search}%` } }
        ];
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Compter le nombre total pour la pagination
    const count = await Transfert.count({
      where: whereClause,
      include: [
        { 
          model: db.Produit, 
          where: search ? {
            designation: { [Op.like]: `%${search}%` }
          } : undefined,
          required: !!search
        }
      ],
      distinct: true
    });

    // Récupérer les transferts avec pagination
    const transferts = await Transfert.findAll({
      where: whereClause,
      include: [
        { 
          model: db.Produit, 
          attributes: ['id', 'designation', 'unite']
        },
        { 
          model: db.Magasin, 
          as: 'MagasinSource',
          attributes: ['id', 'nom']
        },
        { 
          model: db.Magasin, 
          as: 'MagasinDestination',
          attributes: ['id', 'nom']
        }, 
        {
          model: db.Users,
          as: 'Responsable',
          attributes: ['id', 'nom']
        },
        {
          model: db.Users,
          as: 'Validateur',
          attributes: ['id', 'nom']
        }
      ],
      order: [['dateTransfert', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);logger.log('transfert.controller', `📦 Transferts: ${count} trouvés, page ${page}/${totalPages}`);

    // Réponse avec pagination
    res.json({
      transferts,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (err) {logger.error('transfert.controller', 'Erreur récupération transferts:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des transferts', 
      error: err.message 
    });
  }
};

// Récupérer un stock par produit et magasin
exports.getStockByProduitAndMagasin = async (req, res) => {
  try {
    const authUser = req.user;
    const { produitId, magasinId } = req.params;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const stock = await Stock.findOne({
      where: { 
        produitId, 
        magasinId,
        code_structure: authUser.code_structure 
      }
    });

    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
};
