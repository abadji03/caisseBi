const db = require('../models');
const Reconciliation = db.Reconciliation;
const MouvementStock = db.MouvementStock;
const Produit = db.Produit; // Assure-toi que l'association a été définie (Reconciliation.belongsTo(Produit))
const { Op,fn,col,literal } = db.Sequelize;
const { safeNumber } = require('./bonComplet/statutManager')

//Créer une réconciliation
exports.createReconciliation = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure, produitId, stockTheorique, stockPhysique, responsable, note,magasinId } =
      req.body;

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);

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
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");
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
      order: [['dateReconciliation', 'DESC']]
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
    };

    console.log(`📊 Analyse écarts: ${totalItems} produits analysés, page ${page}/${totalPages}`);

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

  } catch (error) {
    console.error('Erreur getAnalyseEcarts:', error);
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
  } catch (error) {
    console.error('Erreur getAnalyseProduit:', error);
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
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");
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
                SELECT 1 FROM MouvementStocks ms 
                WHERE ms.reconciliationId = Reconciliation.id
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
        'produitId',
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
      group: ['produitId', 'Produit.id', 'Produit.designation', 'Produit.unite'],
      order: [[literal('ABS(ecartTotal)'), 'DESC']],
      limit: 5,
      raw: true,
      subQuery: false
    });

    // Statistiques temporelles (par mois)
    const statsParMois = await Reconciliation.findAll({
      where: whereClause,
      attributes: [
        [fn('DATE_FORMAT', col('dateReconciliation'), '%Y-%m'), 'mois'],
        [fn('COUNT', col('id')), 'nombreReconciliations'],
        [fn('SUM', col('ecart')), 'sommeEcarts'],
        [fn('AVG', col('ecart')), 'moyenneEcart']
      ],
      group: [literal("DATE_FORMAT(dateReconciliation, '%Y-%m')")],
      order: [[literal("DATE_FORMAT(dateReconciliation, '%Y-%m')"), 'DESC']],
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
      order: [['dateReconciliation', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true,
      subQuery: false 
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Réconciliations: ${count} trouvées, page ${page}/${totalPages}`);

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

  } catch (err) {
    console.error('Erreur getReconciliationsByStructure:', err);
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

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { stockTheorique, stockPhysique, responsable, note } = req.body;

    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);

    await reconciliation.update({
      stockTheorique,
      stockPhysique,
      ecart,
      responsable,
      note,
    });

    res.json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: 'Erreur mise à jour', error: err.message });
  }
};

//Supprimer une réconciliation
exports.deleteReconciliation = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    await reconciliation.destroy();
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

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) return res.status(404).json({ message: 'Reconciliation non trouvé' });

    const { statut } = req.body;
    /* if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' }); */

    await reconciliation.update({ statut });
    res.json(reconciliation );
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};
