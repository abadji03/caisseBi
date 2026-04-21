const db = require('../models');
const Recette = db.Recette;
const Magasin = db.Magasin;
const User = db.Users;
const Categorie = db.Categorie;
const fs = require('fs');
const path = require('path');
const HistoriqueService = require('../services/historique.service');
const BASE_URL = 'http://localhost:5000/uploads/';

const { Op, fn, col, literal } = require('sequelize');



exports.createRecette = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req); // Récupérer l'IP

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const {
      categoryId,
      montant,
      description,
      paymentMode,
      magasinId,
      agentId,
      paiementId,
      statutRecette,
      code_structure,
      date,
    } = req.body;

    console.log('Données recette reçu : ',req.body);
    let receipt = null;
    if (req.file) {
      receipt = BASE_URL + req.file.filename;
    }

    console.log('Début création recette');
    const recette = await Recette.create({
      categoryId,
      montant,
      description,
      paymentMode,
      paiementId,
      statutRecette,
      receipt,
      magasinId,
      agentId,
      code_structure,
      date,
    });

    console.log('Fin création recette',recette);

        // ENREGISTRER L'HISTORIQUE DE CRÉATION
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'une recette: ${montant} FCFA (${paymentMode})`,
      clientIp,
      { 
        action: 'CREATE_RECETTE',
        recetteId: recette.id,
        montant: montant,
        paymentMode: paymentMode,
        categoryId: categoryId,
        magasinId: magasinId,
        code_structure: code_structure,
        hasReceipt: !!receipt
      }
    );

    res.status(201).json(recette);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de la recette', error });
  }
};


exports.getByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    //const { code_structure } = req.params;
    const code_structure = authUser.code_structure;

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
      code_structure: code_structure
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

    const recettes = await Recette.findAll({
      where: whereClause,
      include: [
        { model: Magasin,attributes: ["id", "nom","telephone", "email"] },
        { model: Categorie },
        { model: User, attributes: ["id", "nom", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.json(recettes);
  } catch (error) {
    console.error("Erreur récupération recettes:", error);
    res.status(500).json({
      message: "Erreur de récupération des recettes",
      error: error.message
    });
  }
};

// Récupérer toutes les recettes d'une structure avec pagination et statistiques
exports.getByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    
    // Récupération des paramètres de pagination, recherche et filtres
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      //startDate = '',
      //endDate = '',
      categoryId = '',
      paymentMode = '',
      statut = ''
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
      code_structure: code_structure
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

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search) {
      whereClause[Op.or] = [
        //{ '$Categorie.name$': { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { paymentMode: { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant (si search est un nombre)
      if (!isNaN(search)) {
        whereClause[Op.or].push({ montant: { [Op.eq]: parseFloat(search) } });
      }

      // Recherche par date
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (datePattern.test(search)) {
        const [day, month, year] = search.split('/');
        const searchDate = new Date(`${year}-${month}-${day}`);
        if (!isNaN(searchDate)) {
          whereClause[Op.or].push(
            literal(`DATE(date) = '${year}-${month}-${day}'`)
          );
        }
      }
    }

    // 📅 FILTRE PAR PÉRIODE
    /* if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.date = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.date = { [Op.lte]: new Date(endDate) };
    }
 */
    // 🏷️ FILTRE PAR CATÉGORIE
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // 💳 FILTRE PAR MODE DE PAIEMENT
    if (paymentMode) {
      whereClause.paymentMode = paymentMode;
    }

    // ✅ FILTRE PAR STATUT
    if (statut) {
      whereClause.statutRecette = statut;
    }

    // 📊 STATISTIQUES GLOBALES
    const statsGlobales = await Recette.findAll({
      where: whereClause,
      attributes: [
        [fn('COUNT', col('Recette.id')), 'totalRecettes'],
        [fn('SUM', col('Recette.montant')), 'montantTotal'],
        [fn('AVG', col('Recette.montant')), 'montantMoyen'],
        [fn('MAX', col('Recette.montant')), 'montantMax'],
        [fn('MIN', col('Recette.montant')), 'montantMin'],
        
        // Statistiques par mode de paiement
        [
          literal(`SUM(CASE WHEN payment_mode = 'Espèce' THEN montant ELSE 0 END)`),
          'totalEspece'
        ],
        [
          literal(`SUM(CASE WHEN payment_mode = 'Carte' THEN montant ELSE 0 END)`),
          'totalCarte'
        ],
        [
          literal(`SUM(CASE WHEN payment_mode = 'Orange Money' THEN montant ELSE 0 END)`),
          'totalOrangeeMoney'
        ],
        [
          literal(`SUM(CASE WHEN payment_mode = 'Wave' THEN montant ELSE 0 END)`),
          'totalWave'
        ],
        [
          literal(`SUM(CASE WHEN payment_mode = 'Virement' THEN montant ELSE 0 END)`),
          'totalVirement'
        ],
        [
          literal(`SUM(CASE WHEN payment_mode = 'Chèque' THEN montant ELSE 0 END)`),
          'totalCheque'
        ],
        [
          literal(`SUM(CASE WHEN payment_mode = 'Autre' THEN montant ELSE 0 END)`),
          'totalAutre'
        ],

        // Statistiques par statut
        [
          literal(`COUNT(CASE WHEN statut_recette = 'validé' THEN 1 END)`),
          'nbValidees'
        ],
        [
          literal(`COUNT(CASE WHEN statut_recette = 'annulé' THEN 1 END)`),
          'nbAnnulees'
        ],

        // Pourcentage avec pièce jointe
        [
          literal(`SUM(CASE WHEN receipt IS NOT NULL AND receipt != '' THEN 1 ELSE 0 END)`),
          'nbAvecPieceJointe'
        ]
      ],
      raw: true,
      subQuery: false
    });

    // 📈 STATISTIQUES PAR CATÉGORIE
    const statsParCategorie = await Recette.findAll({
      where: whereClause,
      attributes: [
        'category_id',
        [fn('COUNT', col('Recette.id')), 'nombreRecettes'],
        [fn('SUM', col('Recette.montant')), 'montantTotal'],
        [fn('AVG', col('Recette.montant')), 'montantMoyen']
      ],
      include: [
        {
          model: Categorie,
          attributes: ['name', 'type']
        }
      ],
      group: ['category_id', 'Categorie.id', 'Categorie.name', 'Categorie.type'],
      order: [[literal('montantTotal'), 'DESC']],
      limit: 5,
      raw: true,
      subQuery: false
    });

    // 📅 STATISTIQUES MENSUELLES (6 derniers mois)
    const statsParMois = await Recette.findAll({
      where: whereClause,
      attributes: [
        [fn('DATE_FORMAT', col('date'), '%Y-%m'), 'mois'],
        [fn('COUNT', col('id')), 'nombreRecettes'],
        [fn('SUM', col('montant')), 'montantTotal'],
        [fn('AVG', col('montant')), 'montantMoyen']
      ],
      group: [literal("DATE_FORMAT(date, '%Y-%m')")],
      order: [[literal("DATE_FORMAT(date, '%Y-%m')"), 'DESC']],
      limit: 6,
      raw: true
    });

    // 📊 STATISTIQUES PAR JOUR DE LA SEMAINE
    const statsParJour = await Recette.findAll({
      where: whereClause,
      attributes: [
        [fn('DAYOFWEEK', col('date')), 'jourSemaine'],
        [fn('COUNT', col('id')), 'nombreRecettes'],
        [fn('SUM', col('montant')), 'montantTotal'],
        [fn('AVG', col('montant')), 'montantMoyen']
      ],
      group: [fn('DAYOFWEEK', col('date'))],
      order: [[fn('DAYOFWEEK', col('date')), 'ASC']],
      raw: true
    });

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Recette.findAndCountAll({
      where: whereClause,
      include: [
        { model: Magasin, attributes: ["id", "nom", "telephone", "email"] },
        { model: Categorie, attributes: ["id", "name", "type"] },
        { model: User, attributes: ["id", "nom", "email"] }
      ],
      order: [["date", "DESC"]],
      offset,
      limit: limitInt,
      distinct: true,
      subQuery: false
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Recettes: ${count} trouvées, page ${page}/${totalPages}`);

    // Formater les statistiques
    const statistiques = {
      globales: statsGlobales[0] ? {
        totalRecettes: parseInt(statsGlobales[0].totalRecettes) || 0,
        montantTotal: parseFloat(statsGlobales[0].montantTotal) || 0,
        montantMoyen: parseFloat(statsGlobales[0].montantMoyen) || 0,
        montantMax: parseFloat(statsGlobales[0].montantMax) || 0,
        montantMin: parseFloat(statsGlobales[0].montantMin) || 0,
        
        repartitionParMode: {
          espece: parseFloat(statsGlobales[0].totalEspece) || 0,
          carte: parseFloat(statsGlobales[0].totalCarte) || 0,
          orangeMoney: parseFloat(statsGlobales[0].totalMobileMoney) || 0,
          wave: parseFloat(statsGlobales[0].totalWave) || 0,
          virement: parseFloat(statsGlobales[0].totalVirement) || 0,
          cheque: parseFloat(statsGlobales[0].totalCheque) || 0,
          autre: parseFloat(statsGlobales[0].totalAutre) || 0
        },
        
        repartitionParStatut: {
          validees: parseInt(statsGlobales[0].nbValidees) || 0,
          annulees: parseInt(statsGlobales[0].nbAnnulees) || 0
        },
        
        tauxPieceJointe: statsGlobales[0].totalRecettes > 0 
          ? ((parseInt(statsGlobales[0].nbAvecPieceJointe) / parseInt(statsGlobales[0].totalRecettes)) * 100).toFixed(2)
          : 0,
        nbAvecPieceJointe: parseInt(statsGlobales[0].nbAvecPieceJointe) || 0
      } : {
        totalRecettes: 0,
        montantTotal: 0,
        montantMoyen: 0,
        montantMax: 0,
        montantMin: 0,
        repartitionParMode: {
          espece: 0, carte: 0, orangeMoney: 0, wave:0, virement: 0, cheque: 0,autre:0
        },
        repartitionParStatut: {
          validees: 0, annulees: 0
        },
        tauxPieceJointe: 0,
        nbAvecPieceJointe: 0
      },
      parCategorie: statsParCategorie.map(item => ({
        categoryId: item.categoryId,
        categoryName: item['Categorie.name'],
        categoryType: item['Categorie.type'],
        nombreRecettes: parseInt(item.nombreRecettes),
        montantTotal: parseFloat(item.montantTotal),
        montantMoyen: parseFloat(item.montantMoyen)
      })),
      evolutionMensuelle: statsParMois.map(item => ({
        mois: item.mois,
        nombreRecettes: parseInt(item.nombreRecettes),
        montantTotal: parseFloat(item.montantTotal),
        montantMoyen: parseFloat(item.montantMoyen)
      })),
      parJourSemaine: statsParJour.map(item => ({
        jourSemaine: parseInt(item.jourSemaine),
        nombreRecettes: parseInt(item.nombreRecettes),
        montantTotal: parseFloat(item.montantTotal),
        montantMoyen: parseFloat(item.montantMoyen)
      }))
    };

    // Réponse avec pagination et statistiques
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
      statistiques: statistiques,
      filtres: {
        search: search || null,
        //startDate: startDate || null,
        //endDate: endDate || null,
        categoryId: categoryId || null,
        paymentMode: paymentMode || null,
        statut: statut || null
      }
    });

  } catch (error) {
    console.error("Erreur récupération recettes:", error);
    res.status(500).json({
      message: "Erreur de récupération des recettes",
      error: error.message
    });
  }
};
exports.deleteRecette = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    // Récupérer la recette avant suppression
    const recette = await Recette.findByPk(id);
    if (!recette) {
      return res.status(404).json({ message: 'Recette non trouvée' });
    }

    // Supprimer le fichier associé si existant
    if (recette.receipt) {
      const oldPath = path.join('uploads', path.basename(recette.receipt));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    const deleted = await Recette.destroy({ where: { id } });
    if (deleted) {
      // ENREGISTRER L'HISTORIQUE DE SUPPRESSION
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Suppression de la recette #${id}: ${recette.montant} FCFA`,
        clientIp,
        { 
          action: 'DELETE_RECETTE',
          recetteId: id,
          recetteData: {
            montant: recette.montant,
            paymentMode: recette.paymentMode,
            description: recette.description,
            date: recette.date,
            magasinId: recette.magasinId,
            code_structure: recette.code_structure
          }
        }
      );
    }
    //if (!deleted) return res.status(404).json({ message: 'Recette non trouvée' });

    res.json({ message: 'Recette supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};

exports.findByPaiementId = async(req, res) => {
  try {
    const { paiementId } = req.params;

    const recette = await Recette.findOne({
      where: { paiementId },
    });

    res.json(recette);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la recette par paiementId', error });
  }
};

exports.updateRecette = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;


    // Vérifier si la recette existe
    const recette = await Recette.findByPk(id);
    if (!recette) {
      return res.status(404).json({ message: 'Recette non trouvée' });
    }

    // Sauvegarder l'ancien état pour l'historique
    const oldState = {
      montant: recette.montant,
      paymentMode: recette.paymentMode,
      description: recette.description,
      categoryId: recette.categoryId,
      statutRecette: recette.statutRecette
    };

  const updatedData = { ...req.body }
  // Si un nouveau fichier est envoyé
  if (req.file) {
    // Supprimer l'ancien fichier si il existe
    if (recette.receipt) {
      const oldPath = path.join('uploads', path.basename(recette.receipt)); // attention à ne pas concaténer l'URL complète
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Mettre à jour le champ fichier avec la nouvelle URL
    updatedData.receipt = BASE_URL + req.file.filename;
  } else {
    // Sinon, conserver le fichier existant
    updatedData.receipt = recette.receipt;
  }
  await recette.update(updatedData);

  // ENREGISTRER L'HISTORIQUE DE MODIFICATION
    const changes = {};
    if (oldState.montant !== recette.montant) changes.montant = { old: oldState.montant, new: recette.montant };
    if (oldState.paymentMode !== recette.paymentMode) changes.paymentMode = { old: oldState.paymentMode, new: recette.paymentMode };
    if (oldState.description !== recette.description) changes.description = { old: oldState.description, new: recette.description };
    if (oldState.categoryId !== recette.categoryId) changes.categoryId = { old: oldState.categoryId, new: recette.categoryId };
    if (oldState.statutRecette !== recette.statutRecette) changes.statutRecette = { old: oldState.statutRecette, new: recette.statutRecette };
    if (req.file) changes.receipt = 'modifié';

    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification de la recette #${id}`,
      clientIp,
      { 
        action: 'UPDATE_RECETTE',
        recetteId: id,
        changes: changes,
        hasFileChange: !!req.file
      }
    );
    res.json(recette);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error });
  }
};

// Mettre à jour le statut d'une recette
exports.updateStatut = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const recette = await Recette.findByPk(req.params.id);
    if (!recette) return res.status(404).json({ message: 'Recette non trouvé' });

    const { statutRecette } = req.body;

    const oldStatut = recette.statutRecette;
    /* if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' }); */

    await recette.update({ statutRecette });

    // ENREGISTRER L'HISTORIQUE DE CHANGEMENT DE STATUT
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut de la recette #${recette.id}: ${oldStatut} → ${statutRecette}`,
      clientIp,
      { 
        action: 'UPDATE_RECETTE_STATUS',
        recetteId: recette.id,
        montant: recette.montant,
        oldStatut: oldStatut,
        newStatut: statutRecette
      }
    );
    res.json(recette );
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};


