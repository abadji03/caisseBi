const db = require('../models');
const logger = require('../services/logger.js');
const Depense = db.Depense;
const Magasin = db.Magasin;
const User = db.Users;
const Categorie = db.Categorie;
const { Op, fn, col, literal } = require('sequelize');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const HistoriqueService = require('../services/historique.service');
const BASE_URL = 'http://localhost:5000/uploads/';

exports.createDepense = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const {
      categoryId,
      code_structure,
      montant,
      type,
      description,
      paymentMode,
      magasinId,
      agentId,
      date,
    } = req.body;

     let receipt = null;
    if (req.file) {
      receipt = BASE_URL + req.file.filename;
    }
    const depense = await Depense.create({
      categoryId,
      code_structure,
      montant,
      type,
      description,
      paymentMode,
      receipt,
      magasinId,
      agentId,
      date,
      
    });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'une dépense de ${montant} F CFA - ${type || 'STANDARD'}`,
      clientIp,
      {
        action: 'CREATE_DEPENSE',
        depenseId: depense.id,
        depenseData: {
          categoryId,
          montant,
          type,
          paymentMode,
          description,
          magasinId,
          code_structure,
          date: date || new Date()
        }
      }
    );

    res.status(201).json(depense);
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la création d'une dépense`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_CREATE_DEPENSE',
          error: error.message,
          data: req.body
        }
      );
    }
    res.status(500).json({ message: 'Erreur de création de dépense', error });
  }
};

exports.getAllByMagasin = async (req, res) => {
  try {
    const { magasinId } = req.params;
    const depenses = await Depense.findAll({
      where: { magasinId },
      include: ['Categorie', 'User'],
      order: [['date', 'DESC']],
    });

    res.json(depenses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de récupération des dépenses', error });
  }
};

exports.deleteDepense = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    const depense = await Depense.findByPk(id);
    if (!depense) return res.status(404).json({ message: 'Dépense non trouvée' });


     // Sauvegarder les infos avant suppression
    const depenseInfo = {
      id: depense.id,
      montant: depense.montant,
      type: depense.type,
      description: depense.description,
      categoryId: depense.categoryId,
      magasinId: depense.magasinId,
      code_structure: depense.code_structure
    };

    // Supprimer le fichier justificatif si existant
    if (depense.receipt) {
      const receiptPath = path.join('uploads', path.basename(depense.receipt));
      if (fs.existsSync(receiptPath)) {
        fs.unlinkSync(receiptPath);
      }
    }

    const deleted = await Depense.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Dépense non trouvée' });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression de la dépense #${id} - Montant: ${depenseInfo.montant} F CFA`,
      clientIp,
      {
        action: 'DELETE_DEPENSE',
        depenseInfo: depenseInfo
      }
    );

    res.json({ message: 'Dépense supprimée' });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la suppression de la dépense ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_DELETE_DEPENSE',
          depenseId: req.params.id,
          error: error.message
        }
      );
    }

    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};
exports.updateDepense = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    const depense = await Depense.findByPk(id);
    if (!depense) {
      return res.status(404).json({ message: 'Dépense introuvable' });
    }

    // Sauvegarder les anciennes valeurs
    const oldValues = {
      categoryId: depense.categoryId,
      montant: depense.montant,
      type: depense.type,
      description: depense.description,
      paymentMode: depense.paymentMode,
      statutDepense: depense.statutDepense,
      magasinId: depense.magasinId
    };

    const updatedData = { ...req.body };

    // Si un nouveau fichier est envoyé
    if (req.file) {
      // Supprimer l'ancien fichier si il existe
      if (depense.receipt) {
        const oldPath = path.join('uploads', path.basename(depense.receipt)); // attention à ne pas concaténer l'URL complète
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Mettre à jour le champ fichier avec la nouvelle URL
      updatedData.receipt = BASE_URL + req.file.filename;
    } else {
      // Sinon, conserver le fichier existant
      updatedData.receipt = depense.receipt;
    }
    await depense.update(updatedData);

     // Identifier les changements
    const changes = {};
    if (oldValues.categoryId !== depense.categoryId) changes.categoryId = { old: oldValues.categoryId, new: depense.categoryId };
    if (oldValues.montant !== depense.montant) changes.montant = { old: oldValues.montant, new: depense.montant };
    if (oldValues.type !== depense.type) changes.type = { old: oldValues.type, new: depense.type };
    if (oldValues.description !== depense.description) changes.description = { old: oldValues.description, new: depense.description };
    if (oldValues.paymentMode !== depense.paymentMode) changes.paymentMode = { old: oldValues.paymentMode, new: depense.paymentMode };
    if (oldValues.statutDepense !== depense.statutDepense) changes.statutDepense = { old: oldValues.statutDepense, new: depense.statutDepense };
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour de la dépense #${depense.id} - Montant: ${depense.montant} F CFA`,
      clientIp,
      {
        action: 'UPDATE_DEPENSE',
        depenseId: depense.id,
        changes: changes,
        receiptChanged: !!req.file
      }
    );

    res.json(depense);
  } catch (error) {
     if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la mise à jour de la dépense ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_DEPENSE',
          depenseId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error });
  }
};

/* exports.getAllByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;

    const depenses = await Depense.findAll({
      where: { code_structure: code_structure},
      include: [
        {
          model: Magasin
        },
        {
          model: Categorie
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(depenses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de récupération des dépenses', error });
  }
}; */


exports.getAllByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;

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

    const depenses = await Depense.findAll({
      where: whereClause,
      include: [
        { model: Magasin,attributes: ["id", "nom","telephone", "email"] },
        { model: Categorie },
        { model: User, attributes: ["id", "nom", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.json(depenses);
  } catch (error) {logger.error('depense.controller', "Erreur récupération dépenses:", error);
    res.status(500).json({
      message: "Erreur de récupération des dépenses",
      error: error.message
    });
  }
};

exports.getAllByStructureBis = async (req, res) => {
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
      // startDate = '',
      // endDate = '',
      categoryId = '',
      paymentMode = '',
      typeDepense = '',
      statut = ''
    } = req.query;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
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
        { paymentMode: { [Op.like]: `%${search}%` } },
        { type: { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant (si search est un nombre)
      if (!isNaN(search)) {
        whereClause[Op.or].push({ montant: { [Op.eq]: parseFloat(search) } });
      }

      // Recherche par date
      /* const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (datePattern.test(search)) {
        const [day, month, year] = search.split('/');
        const searchDate = new Date(`${year}-${month}-${day}`);
        if (!isNaN(searchDate)) {
          whereClause[Op.or].push(
            literal(`DATE(date) = '${year}-${month}-${day}'`)
          );
        }
      } */
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
    } */

    // 🏷️ FILTRE PAR CATÉGORIE
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // 💳 FILTRE PAR MODE DE PAIEMENT
    if (paymentMode) {
      whereClause.paymentMode = paymentMode;
    }

    // 📋 FILTRE PAR TYPE DE DÉPENSE
    if (typeDepense) {
      whereClause.type = typeDepense;
    }

    // ✅ FILTRE PAR STATUT
    if (statut) {
      whereClause.statutDepense = statut;
    }

    // 📊 STATISTIQUES GLOBALES
    const statsGlobales = await Depense.findAll({
      where: whereClause,
      attributes: [
        [fn('COUNT', col('Depense.id')), 'totalDepenses'],
        [fn('SUM', col('Depense.montant')), 'montantTotal'],
        [fn('AVG', col('Depense.montant')), 'montantMoyen'],
        [fn('MAX', col('Depense.montant')), 'montantMax'],
        [fn('MIN', col('Depense.montant')), 'montantMin'],
        
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
          'totalOrangeMoney'
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

        // Statistiques par type de dépense
        [
          literal(`SUM(CASE WHEN type = 'STANDARD' THEN montant ELSE 0 END)`),
          'totalStandard'
        ],
        [
          literal(`SUM(CASE WHEN type = 'STOCK' THEN montant ELSE 0 END)`),
          'totalStock'
        ],
        [
          literal(`SUM(CASE WHEN type = 'FRAIS' THEN montant ELSE 0 END)`),
          'totalFrais'
        ],
        [
          literal(`SUM(CASE WHEN type = 'INVESTISSEMENT' THEN montant ELSE 0 END)`),
          'totalInvestissement'
        ],

        // Statistiques par statut
        [
          literal(`COUNT(CASE WHEN statut_depense = 'validé' THEN 1 END)`),
          'nbValidees'
        ],
        [
          literal(`COUNT(CASE WHEN statut_depense = 'annulé' THEN 1 END)`),
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
    const statsParCategorie = await Depense.findAll({
      where: whereClause,
      attributes: [
        'categoryId',
        [fn('COUNT', col('Depense.id')), 'nombreDepenses'],
        [fn('SUM', col('Depense.montant')), 'montantTotal'],
        [fn('AVG', col('Depense.montant')), 'montantMoyen']
      ],
      include: [
        {
          model: Categorie,
          attributes: ['name']
        }
      ],
      group: ['category_id', 'Categorie.id', 'Categorie.name'],
      order: [[literal('montantTotal'), 'DESC']],
      limit: 5,
      raw: true,
      subQuery: false
    });

    // 📅 STATISTIQUES MENSUELLES (6 derniers mois)
    const statsParMois = await Depense.findAll({
      where: whereClause,
      attributes: [
        [fn('DATE_FORMAT', col('date'), '%Y-%m'), 'mois'],
        [fn('COUNT', col('id')), 'nombreDepenses'],
        [fn('SUM', col('montant')), 'montantTotal'],
        [fn('AVG', col('montant')), 'montantMoyen']
      ],
      group: [literal("DATE_FORMAT(date, '%Y-%m')")],
      order: [[literal("DATE_FORMAT(date, '%Y-%m')"), 'DESC']],
      limit: 6,
      raw: true
    });

    // 📊 STATISTIQUES PAR JOUR DE LA SEMAINE
    const statsParJour = await Depense.findAll({
      where: whereClause,
      attributes: [
        [fn('DAYOFWEEK', col('date')), 'jourSemaine'],
        [fn('COUNT', col('id')), 'nombreDepenses'],
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
    const { count, rows } = await Depense.findAndCountAll({
      where: whereClause,
      include: [
        { model: Magasin, attributes: ["id", "nom", "telephone", "email"] },
        { model: Categorie, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "nom", "email"] }
      ],
      order: [["date", "DESC"]],
      offset,
      limit: limitInt,
      distinct: true,
      subQuery: false
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);logger.log('depense.controller', `📦 Dépenses: ${count} trouvées, page ${page}/${totalPages}`);

    // Formater les statistiques
    const statistiques = {
      globales: statsGlobales[0] ? {
        totalDepenses: parseInt(statsGlobales[0].totalDepenses) || 0,
        montantTotal: parseFloat(statsGlobales[0].montantTotal) || 0,
        montantMoyen: parseFloat(statsGlobales[0].montantMoyen) || 0,
        montantMax: parseFloat(statsGlobales[0].montantMax) || 0,
        montantMin: parseFloat(statsGlobales[0].montantMin) || 0,
        
        repartitionParMode: {
          espece: parseFloat(statsGlobales[0].totalEspece) || 0,
          carte: parseFloat(statsGlobales[0].totalCarte) || 0,
          orangeMoney: parseFloat(statsGlobales[0].totalOrangeMoney) || 0,
          wave: parseFloat(statsGlobales[0].totalWave) || 0,
          virement: parseFloat(statsGlobales[0].totalVirement) || 0,
          cheque: parseFloat(statsGlobales[0].totalCheque) || 0,
          autre: parseFloat(statsGlobales[0].totalAutre) || 0
        },
        
        repartitionParType: {
          standard: parseFloat(statsGlobales[0].totalStandard) || 0,
          stock: parseFloat(statsGlobales[0].totalStock) || 0,
          frais: parseFloat(statsGlobales[0].totalFrais) || 0,
          investissement: parseFloat(statsGlobales[0].totalInvestissement) || 0
        },
        
        repartitionParStatut: {
          validees: parseInt(statsGlobales[0].nbValidees) || 0,
          annulees: parseInt(statsGlobales[0].nbAnnulees) || 0,
        },
        
        tauxPieceJointe: statsGlobales[0].totalDepenses > 0 
          ? ((parseInt(statsGlobales[0].nbAvecPieceJointe) / parseInt(statsGlobales[0].totalDepenses)) * 100).toFixed(2)
          : 0
      } : {
        totalDepenses: 0,
        montantTotal: 0,
        montantMoyen: 0,
        montantMax: 0,
        montantMin: 0,
        repartitionParMode: {
          espece: 0, carte: 0, orangeMoney: 0, wave:0, virement: 0, cheque: 0,autre:0
        },
        repartitionParType: {
          standard: 0, stock: 0, frais: 0, investissement: 0
        },
        repartitionParStatut: {
          validees: 0, annulees: 0
        },
        tauxPieceJointe: 0
      },
      parCategorie: statsParCategorie.map(item => ({
        categoryId: item.categoryId,
        categoryName: item['Categorie.name'],
        categoryType: item['Categorie.type'],
        nombreDepenses: parseInt(item.nombreDepenses),
        montantTotal: parseFloat(item.montantTotal),
        montantMoyen: parseFloat(item.montantMoyen)
      })),
      evolutionMensuelle: statsParMois.map(item => ({
        mois: item.mois,
        nombreDepenses: parseInt(item.nombreDepenses),
        montantTotal: parseFloat(item.montantTotal),
        montantMoyen: parseFloat(item.montantMoyen)
      })),
      parJourSemaine: statsParJour.map(item => ({
        jourSemaine: parseInt(item.jourSemaine),
        nombreDepenses: parseInt(item.nombreDepenses),
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
        /* startDate: startDate || null,
        endDate: endDate || null, */
        categoryId: categoryId || null,
        paymentMode: paymentMode || null,
        typeDepense: typeDepense || null,
        statut: statut || null
      }
    });

  } catch (error) {logger.error('depense.controller', "Erreur récupération dépenses:", error);
    res.status(500).json({
      message: "Erreur de récupération des dépenses",
      error: error.message
    });
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
    const depense = await Depense.findByPk(req.params.id);
    if (!depense) return res.status(404).json({ message: 'Dépense non trouvé' });

    const { statutDepense } = req.body;

    const oldStatut = depense.statutDepense;logger.log('depense.controller', 'Statut dépense',statutDepense);
    /* if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' }); */

    await depense.update({ statutDepense });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut de la dépense #${depense.id}: ${oldStatut || 'N/A'} → ${statutDepense}`,
      clientIp,
      {
        action: 'UPDATE_DEPENSE_STATUT',
        depenseId: depense.id,
        oldStatut: oldStatut,
        newStatut: statutDepense,
        montant: depense.montant
      }
    );

    res.json(depense );
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors du changement de statut de la dépense ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_DEPENSE_STATUT',
          depenseId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};

// NOUVEAU : Exporter les dépenses vers Excel
exports.exportDepensesExcel = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, magasinId, startDate, endDate, categoryId, paymentMode, typeDepense, statut } = req.query;
    
    // Construction de la clause WHERE (même logique que getAllByStructureBis)
    let whereClause = {};
    
    if (code_structure) {
      whereClause.code_structure = code_structure;
    }
    
    if (magasinId) {
      whereClause.magasinId = parseInt(magasinId);
    }
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.date = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.date = { [Op.lte]: new Date(endDate) };
    }
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    if (paymentMode) {
      whereClause.paymentMode = paymentMode;
    }
    
    if (typeDepense) {
      whereClause.type = typeDepense;
    }
    
    if (statut) {
      whereClause.statutDepense = statut;
    }
    
    const depenses = await Depense.findAll({
      where: whereClause,
      include: [
        { model: Magasin, attributes: ["id", "nom"] },
        { model: Categorie, attributes: ["id", "name"] },
        { model: User, attributes: ["id", "nom", "email"] }
      ],
      order: [["date", "DESC"]]
    });
    
    // Création du workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = authUser.nom || 'Application';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Dépenses');
    
    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      }
    };
    
    // En-têtes
    const headers = [
      'ID', 'Date', 'Catégorie', 'Montant (F CFA)', 'Type', 
      'Mode de paiement', 'Description', 'Statut', 'Magasin', 
      'Enregistré par', 'Justificatif', 'Date création'
    ];
    
    sheet.addRow(headers).eachCell(cell => {
      cell.style = headerStyle;
    });
    
    // Remplir les données
    depenses.forEach(depense => {
      sheet.addRow([
        depense.id,
        depense.date ? new Date(depense.date).toLocaleDateString('fr-FR') : '-',
        depense.Categorie?.name || '-',
        depense.montant ? depense.montant.toLocaleString('fr-FR') : '0',
        depense.type || '-',
        depense.paymentMode || '-',
        depense.description || '-',
        depense.statutDepense || 'en_attente',
        depense.Magasin?.nom || '-',
        depense.User?.nom || '-',
        depense.receipt ? 'Oui' : 'Non',
        depense.createdAt ? new Date(depense.createdAt).toLocaleDateString('fr-FR') : '-'
      ]);
    });
    
    // Ajuster les largeurs
    sheet.columns.forEach(column => {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Ajouter une feuille de résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    
    // Calculer les totaux
    const totalMontant = depenses.reduce((sum, d) => sum + (parseFloat(d.montant) || 0), 0);
    const totalParType = {};
    const totalParMode = {};
    
    depenses.forEach(d => {
      const type = d.type || 'STANDARD';
      const mode = d.paymentMode || 'Autre';
      const montant = parseFloat(d.montant) || 0;
      
      totalParType[type] = (totalParType[type] || 0) + montant;
      totalParMode[mode] = (totalParMode[mode] || 0) + montant;
    });
    
    summarySheet.addRow(['RÉSUMÉ DES DÉPENSES']).font = { bold: true, size: 14 };
    summarySheet.addRow([]);
    summarySheet.addRow(['Total des dépenses', `${totalMontant.toLocaleString('fr-FR')} F CFA`]);
    summarySheet.addRow(['Nombre de dépenses', depenses.length]);
    summarySheet.addRow(['Moyenne par dépense', `${(totalMontant / (depenses.length || 1)).toLocaleString('fr-FR')} F CFA`]);
    summarySheet.addRow([]);
    
    summarySheet.addRow(['Par type de dépense']).font = { bold: true };
    for (const [type, montant] of Object.entries(totalParType)) {
      summarySheet.addRow([type, `${montant.toLocaleString('fr-FR')} F CFA`]);
    }
    
    summarySheet.addRow([]);
    summarySheet.addRow(['Par mode de paiement']).font = { bold: true };
    for (const [mode, montant] of Object.entries(totalParMode)) {
      summarySheet.addRow([mode, `${montant.toLocaleString('fr-FR')} F CFA`]);
    }
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Export Excel de ${depenses.length} dépenses - Total: ${totalMontant.toLocaleString('fr-FR')} F CFA`,
      clientIp,
      {
        action: 'EXPORT_DEPENSES_EXCEL',
        nombreDepenses: depenses.length,
        montantTotal: totalMontant,
        filtres: { code_structure, magasinId, startDate, endDate, categoryId, paymentMode, typeDepense, statut }
      }
    );
    
    // Générer et envoyer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=depenses-${Date.now()}.xlsx`);
    res.send(buffer);
    
  } catch (error) {logger.error('depense.controller', '❌ Erreur export Excel dépenses:', error);
    
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de l'export Excel des dépenses`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_EXPORT_DEPENSES',
          error: error.message
        }
      );
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de l\'export Excel',
      error: error.message 
    });
  }
};
