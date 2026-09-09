const db = require('../models');
const logger = require('../services/logger.js');
const Reconciliation = db.Reconciliation;
const MouvementStock = db.MouvementStock;
const Produit = db.Produit; // Assure-toi que l'association a été définie (Reconciliation.belongsTo(Produit))
const { Op,fn,col,literal } = db.Sequelize;
const { safeNumber } = require('./bonComplet/statutManager')
const HistoriqueService = require('../services/historique.service'); 

//Créer une réconciliation
exports.createReconciliation = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure, produitId, stockTheorique, stockPhysique, responsable, note,magasinId } =
      req.body;

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);
    // Récupérer les informations du produit pour l'historique
    const produit = await Produit.findByPk(produitId, {
      attributes: ['designation', 'code_structure']
    });

    const reconciliation = await Reconciliation.create({
      code_structure,
      produitId,
      stockTheorique,
      stockPhysique,
      ecart,
      responsable,
      note,
      magasinId
    });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'une réconciliation pour le produit ${produit?.designation || 'ID: ' + produitId} (Écart: ${ecart > 0 ? '+' : ''}${ecart.toFixed(2)})`,
      clientIp,
      {
        action: 'CREATE_RECONCILIATION',
        reconciliationId: reconciliation.id,
        produitId: produitId,
        produitDesignation: produit?.designation,
        stockTheorique: stockTheorique,
        stockPhysique: stockPhysique,
        ecart: ecart,
        magasinId: magasinId,
        code_structure: code_structure
      }
    );
    res.status(201).json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la réconciliation', error: err.message });
  }
};

//Récupérer toutes les analyses des écarts
exports.getAnalyseEcarts = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    
    // Récupération des paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      tri = 'ecartTotal_desc' // Option de tri par défaut
    } = req.query;

    // Vérification des droits d'accès
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

    if (!isAdminStructure && !isGerant) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Construction de la clause WHERE pour les réconciliations
    let reconciliationWhere = {
      code_structure: code_structure,
      statut: 'validé'
    };

    // Filtrer par magasin si gérant
    if (!isAdminStructure && isGerant && authUser.magasinId) {
      reconciliationWhere.magasinId = authUser.magasinId;
    }

    // Récupérer toutes les réconciliations pour les statistiques
    const reconciliations = await Reconciliation.findAll({
      where: reconciliationWhere,
      include: [
        { 
          model: Produit, 
          attributes: ["id", "designation", "unite"] 
        },
        { 
          model: MouvementStock,
          attributes: ["id", "typeMouvement", "quantite"],
          required: false
        }
      ],
      order: [['date_reconciliation', 'DESC']]
    });

    // Grouper par produit et calculer les statistiques
    const analysesMap = new Map();

    reconciliations.forEach(rec => {
      const produitId = rec.produitId;
      const produit = rec.Produit;
      
      if (!produitId) return;

      if (!analysesMap.has(produitId)) {
        analysesMap.set(produitId, {
          produitId: produitId,
          produitDesignation: produit?.designation || 'Produit inconnu',
          produitUnite: produit?.unite || '',
          ecartTotal: 0,
          dernierEcart: rec.dateReconciliation,
          premiereReconciliation: rec.dateReconciliation,
          nombreReconciliations: 0,
          ecartsPositifs: 0,
          ecartsNegatifs: 0,
          ecartsNuls: 0,
          sommeEcartAbsolu: 0,
          ecartsDetail: [],
          mouvementsCorrection: 0
        });
      }

      const analyse = analysesMap.get(produitId);
      
      // Mise à jour des statistiques
      analyse.ecartTotal += safeNumber(rec.ecart);
      analyse.nombreReconciliations++;
      analyse.sommeEcartAbsolu += Math.abs(rec.ecart);
      
      if (safeNumber(rec.ecart )> 0) analyse.ecartsPositifs++;
      else if (safeNumber(rec.ecart) < 0) analyse.ecartsNegatifs++;
      else analyse.ecartsNuls++;
      
      if (rec.dateReconciliation > analyse.dernierEcart) {
        analyse.dernierEcart = rec.dateReconciliation;
      }
      
      if (rec.dateReconciliation < analyse.premiereReconciliation) {
        analyse.premiereReconciliation = rec.dateReconciliation;
      }

      // Vérifier si un mouvement de correction existe
      const aMouvementCorrection = rec.MouvementStocks && rec.MouvementStocks.length > 0;
      if (aMouvementCorrection) {
        analyse.mouvementsCorrection++;
      }

      // Ajouter le détail
      analyse.ecartsDetail.push({
        id: rec.id,
        date: rec.dateReconciliation,
        ecart: safeNumber(rec.ecart),
        stockTheorique: safeNumber(rec.stockTheorique),
        stockPhysique: safeNumber(rec.stockPhysique),
        corrige: aMouvementCorrection,
        note: rec.note
      });
    });

    // Convertir la Map en tableau et calculer les métriques dérivées
    let analyses = Array.from(analysesMap.values()).map(analyse => {
      const moyenneEcart = safeNumber(analyse.nombreReconciliations) > 0 
        ? safeNumber(analyse.ecartTotal) / safeNumber(analyse.nombreReconciliations) 
        : 0;
      
      const moyenneEcartAbsolu = safeNumber(analyse.nombreReconciliations) > 0
        ? safeNumber(analyse.sommeEcartAbsolu) / safeNumber(analyse.nombreReconciliations)
        : 0;
      
      const tauxCorrection = safeNumber(analyse.nombreReconciliations) > 0
        ? (safeNumber(analyse.mouvementsCorrection )/ safeNumber(analyse.nombreReconciliations)) * 100
        : 0;

      const tendance = analyse.ecartsDetail.length >= 2
        ? safeNumber(analyse.ecartsDetail[analyse.ecartsDetail.length - 1].ecart) - safeNumber(analyse.ecartsDetail[0].ecart)
        : 0;

      return {
        ...analyse,
        moyenneEcart: parseFloat(moyenneEcart.toFixed(2)),
        moyenneEcartAbsolu: parseFloat(moyenneEcartAbsolu.toFixed(2)),
        tauxCorrection: parseFloat(tauxCorrection.toFixed(2)),
        tendance: tendance > 0 ? '↑' : tendance < 0 ? '↓' : '→',
        ecartsDetail: analyse.ecartsDetail.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      };
    });

    // Appliquer le filtre de recherche
    if (search) {
      const searchLower = search.toLowerCase();
      analyses = analyses.filter(a => 
        a.produitDesignation.toLowerCase().includes(searchLower) ||
        a.produitId.toString().includes(searchLower)
      );
    }

    // Appliquer le tri
    const [triChamp, triOrdre] = tri.split('_');
    analyses.sort((a, b) => {
      let aVal = a[triChamp];
      let bVal = b[triChamp];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (triOrdre === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    // Pagination
    const totalItems = analyses.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedAnalyses = analyses.slice(offset, offset + parseInt(limit));
    
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    // Statistiques globales
    const statsGlobales = {
      totalProduitsAvecEcarts: analyses.length,
      totalReconciliations: reconciliations.length,
      sommeEcarts: analyses.reduce((sum, a) => sum + safeNumber(a.ecartTotal), 0),
      moyenneEcartsGlobale: reconciliations.length > 0 
        ? parseFloat((analyses.reduce((sum, a) => sum + safeNumber(a.ecartTotal), 0) / reconciliations.length).toFixed(2))
        : 0,
      produitsPositifs: analyses.filter(a => safeNumber(a.ecartTotal) > 0).length,
      produitsNegatifs: analyses.filter(a => safeNumber(a.ecartTotal) < 0).length,
      produitsNuls: analyses.filter(a => safeNumber(a.ecartTotal) === 0).length
    };logger.log('reconciliation.controller', `📊 Analyse écarts: ${totalItems} produits analysés, page ${page}/${totalPages}`);

    res.status(200).json({
      analyses: paginatedAnalyses,
      statsGlobales,
      pagination: {
        total: totalItems,
        page: parseInt(page),
        totalPages: totalPages,
        limit: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {logger.error('reconciliation.controller', 'Erreur getAnalyseEcarts:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'analyse des écarts', 
      error: error.message 
    });
  }
};

// Endpoint pour obtenir les détails d'un produit spécifique
exports.getAnalyseProduit = async (req, res) => {
  try {
    const authUser = req.user;
    const { code_structure, produitId } = req.params;

    if (!authUser || authUser.code_structure !== code_structure) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    const reconciliations = await Reconciliation.findAll({
      where: {
        code_structure,
        produitId,
        statut: 'validé'
      },
      include: [
        { model: Produit, attributes: ["id", "designation", "unite"] },
        { model: MouvementStock, attributes: ["id", "typeMouvement", "quantite"] }
      ],
      order: [['dateReconciliation', 'DESC']]
    });

    if (reconciliations.length === 0) {
      return res.status(404).json({ message: "Aucune donnée pour ce produit" });
    }

    // Calculer les statistiques détaillées
    const stats = {
      produit: reconciliations[0].Produit,
      totalReconciliations: reconciliations.length,
      historique: reconciliations.map(r => ({
        id: r.id,
        date: r.dateReconciliation,
        stockTheorique: r.stockTheorique,
        stockPhysique: r.stockPhysique,
        ecart: r.ecart,
        note: r.note,
        mouvementCorrection: r.MouvementStocks?.length > 0
      }))
    };

    res.json(stats);
  } catch (error) {logger.error('reconciliation.controller', 'Erreur getAnalyseProduit:', error);
    res.status(500).json({ error: error.message });
  }
};
//Récupérer toutes les réconciliations d'une structure avec pagination
exports.getReconciliationsByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const { code_structure } = req.params;
    
    // Récupération des paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
    } = req.query;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur"|| r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

    if (!isAdminStructure && !isGerant) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      statut: 'validé'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;
    }

    // 🔍 FILTRE DE RECHERCHE
    if (search) {
      whereClause[Op.or] = [
        { '$Produit.designation$': { [Op.like]: `%${search}%` } },
        { note: { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par valeurs numériques
      if (!isNaN(search)) {
        whereClause[Op.or].push({ stockTheorique: { [Op.eq]: parseFloat(search) } });
        whereClause[Op.or].push({ stockPhysique: { [Op.eq]: parseFloat(search) } });
        whereClause[Op.or].push({ ecart: { [Op.eq]: parseFloat(search) } });
      }
    }

    const statsGlobales = await Reconciliation.findAll({
      where: whereClause,
      attributes: [
        [fn('COUNT', col('Reconciliation.id')), 'totalReconciliations'],
        [fn('SUM', col('Reconciliation.ecart')), 'sommeEcarts'],
        [fn('AVG', col('Reconciliation.ecart')), 'moyenneEcart'],
        [fn('MAX', col('Reconciliation.ecart')), 'ecartMax'],
        [fn('MIN', col('Reconciliation.ecart')), 'ecartMin'],
        [
          literal(`SUM(CASE WHEN ecart > 0 THEN 1 ELSE 0 END)`), 
          'reconciliationsPositives'
        ],
        [
          literal(`SUM(CASE WHEN ecart < 0 THEN 1 ELSE 0 END)`), 
          'reconciliationsNegatives'
        ],
        [
          literal(`SUM(CASE WHEN ecart = 0 THEN 1 ELSE 0 END)`), 
          'reconciliationsNulles'
        ],
        [
          literal(`SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM MouvementStock ms 
                WHERE ms.reconciliation_id = Reconciliation.id
              ) 
              THEN 1 ELSE 0 
            END
          )`),
          'reconciliationsAvecCorrection'
        ]
      ],
      /* include: [
        {
          model: MouvementStock,
          attributes: [],
          required: false
        }
      ], */
      raw: true,
      subQuery: false
    });

    // Statistiques par produit (top 5 des plus gros écarts)
    const topProduitsParEcart = await Reconciliation.findAll({
      where: whereClause,
      attributes: [
        'produit_id',
        [fn('SUM', col('Reconciliation.ecart')), 'ecartTotal'],
        [fn('COUNT', col('Reconciliation.id')), 'nombreReconciliations'],
        [fn('AVG', col('Reconciliation.ecart')), 'moyenneEcart']
      ],
      include: [
        {
          model: Produit,
          attributes: ['designation', 'unite']
        }
      ],
      group: ['produit_id', 'Produit.id', 'Produit.designation', 'Produit.unite'],
      order: [[literal('ABS(ecartTotal)'), 'DESC']],
      limit: 5,
      raw: true,
      subQuery: false
    });

    // Statistiques temporelles (par mois)
    const statsParMois = await Reconciliation.findAll({
      where: whereClause,
      attributes: [
        [fn('DATE_FORMAT', col('date_reconciliation'), '%Y-%m'), 'mois'],
        [fn('COUNT', col('id')), 'nombreReconciliations'],
        [fn('SUM', col('ecart')), 'sommeEcarts'],
        [fn('AVG', col('ecart')), 'moyenneEcart']
      ],
      group: [literal("DATE_FORMAT(date_reconciliation, '%Y-%m')")],
      order: [[literal("DATE_FORMAT(date_reconciliation, '%Y-%m')"), 'DESC']],
      limit: 6,
      raw: true
    });

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Reconciliation.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Produit, 
          attributes: ["id", "designation", "unite", "prixAchatUnitaire"] 
        },
        { 
          model: db.Users, 
          attributes: ["id", "nom"] 
        },
        { 
          model: MouvementStock, 
          attributes: ['id', 'produitId', 'typeMouvement', 'quantite'] 
        }
      ],
      order: [['date_reconciliation', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true,
      subQuery: false 
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);logger.log('reconciliation.controller', `📦 Réconciliations: ${count} trouvées, page ${page}/${totalPages}`);

    // Réponse avec pagination
    res.status(200).json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      statistiquesRec: {
        globales: statsGlobales[0] || {
          totalReconciliations: 0,
          sommeEcarts: 0,
          moyenneEcart: 0,
          ecartMax: 0,
          ecartMin: 0,
          reconciliationsPositives: 0,
          reconciliationsNegatives: 0,
          reconciliationsNulles: 0,
          reconciliationsAvecCorrection: 0
        },
        topProduits: topProduitsParEcart,
        evolutionMensuelle: statsParMois,
        tauxCorrectionGlobal: statsGlobales[0]?.totalReconciliations > 0 
          ? ((statsGlobales[0].reconciliationsAvecCorrection / statsGlobales[0].totalReconciliations) * 100).toFixed(2)
          : 0
      }

    });

  } catch (err) {logger.error('reconciliation.controller', 'Erreur getReconciliationsByStructure:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération', 
      error: err.message 
    });
  }
};


//Récupérer une réconciliation par ID
exports.getReconciliationById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const reconciliation = await Reconciliation.findByPk(req.params.id, {
      include: [
        { model: Produit, attributes:['id','designation','unite'] },
        { model: MouvementStock, attributes:['id','produitId'] }
      ],
    });

    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    res.json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

//Mettre à jour une réconciliation
exports.updateReconciliation = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { stockTheorique, stockPhysique, responsable, note } = req.body;

    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    // Sauvegarder les anciennes valeurs
    const anciennesValeurs = {
      stockTheorique: reconciliation.stockTheorique,
      stockPhysique: reconciliation.stockPhysique,
      ecart: reconciliation.ecart,
      responsable: reconciliation.responsable,
      note: reconciliation.note
    };

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);

    await reconciliation.update({
      stockTheorique,
      stockPhysique,
      ecart,
      responsable,
      note,
    });

     // ENREGISTRER L'HISTORIQUE
    const modifications = [];
    if (anciennesValeurs.stockTheorique !== stockTheorique) {
      modifications.push(`stock théorique: ${anciennesValeurs.stockTheorique} → ${stockTheorique}`);
    }
    if (anciennesValeurs.stockPhysique !== stockPhysique) {
      modifications.push(`stock physique: ${anciennesValeurs.stockPhysique} → ${stockPhysique}`);
    }
    if (anciennesValeurs.responsable !== responsable) {
      modifications.push(`responsable: ${anciennesValeurs.responsable} → ${responsable}`);
    }

    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour de la réconciliation #${reconciliation.id} pour le produit ${reconciliation.Produit?.designation || 'ID: ' + reconciliation.produitId} - Modifications: ${modifications.join(', ') || 'Aucune modification majeure'}`,
      clientIp,
      {
        action: 'UPDATE_RECONCILIATION',
        reconciliationId: reconciliation.id,
        produitId: reconciliation.produitId,
        anciennesValeurs: anciennesValeurs,
        nouvellesValeurs: {
          stockTheorique,
          stockPhysique,
          ecart: ecart,
          responsable,
          note
        }
      }
    );
    res.json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: 'Erreur mise à jour', error: err.message });
  }
};

//Supprimer une réconciliation
exports.deleteReconciliation = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    // Vérifier s'il y a des mouvements de stock associés
    const mouvementsAssocies = await MouvementStock.count({
      where: { reconciliationId: reconciliation.id }
    });

    const produitDesignation = reconciliation.Produit?.designation || 'ID: ' + reconciliation.produitId;

    await reconciliation.destroy();
     // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression de la réconciliation #${reconciliation.id} pour le produit ${produitDesignation} (Écart: ${reconciliation.ecart > 0 ? '+' : ''}${reconciliation.ecart})${mouvementsAssocies > 0 ? ` - Attention: ${mouvementsAssocies} mouvement(s) de stock associé(s) supprimé(s)` : ''}`,
      clientIp,
      {
        action: 'DELETE_RECONCILIATION',
        reconciliationId: reconciliation.id,
        produitId: reconciliation.produitId,
        produitDesignation: produitDesignation,
        ecart: reconciliation.ecart,
        mouvementsAssocies: mouvementsAssocies,
        dataSupprimee: {
          stockTheorique: reconciliation.stockTheorique,
          stockPhysique: reconciliation.stockPhysique,
          dateReconciliation: reconciliation.dateReconciliation,
          responsable: reconciliation.responsable,
          note: reconciliation.note
        }
      }
    );

    res.json({ message: 'Réconciliation supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
};

// Récupérer les réconciliations d’un produit
exports.getReconciliationsByProduit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const reconciliations = await Reconciliation.findAll({
      where: { produitId: req.params.produitId },
      order: [['dateReconciliation', 'DESC']],
      include: [{ model: Produit }],
    });

    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ message: 'Erreur récupération', error: err.message });
  }
};

// Mettre à jour le statut d'une reconciliation
exports.updateStatut = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) return res.status(404).json({ message: 'Reconciliation non trouvé' });

    const { statut } = req.body;
    const ancienStatut = reconciliation.statut;
    /* if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' }); */

    await reconciliation.update({ statut });

     // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut de la réconciliation #${reconciliation.id} pour le produit ${reconciliation.Produit?.designation || 'ID: ' + reconciliation.produitId}: ${ancienStatut} → ${statut}`,
      clientIp,
      {
        action: 'UPDATE_RECONCILIATION_STATUS',
        reconciliationId: reconciliation.id,
        produitId: reconciliation.produitId,
        ancienStatut: ancienStatut,
        nouveauStatut: statut
      }
    );
    res.json(reconciliation );
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};
