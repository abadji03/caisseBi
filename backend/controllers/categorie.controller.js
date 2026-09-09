const db = require('../models');
const logger = require('../services/logger.js');
const Categorie = db.Categorie;
const { Op, ValidationError, UniqueConstraintError } = require('sequelize');
const HistoriqueService = require('../services/historique.service');
const ExcelJS = require('exceljs');

exports.createCategorie = async (req, res) => {
  try {

    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }logger.log('categorie.controller', '📝 Création catégorie - Données reçues:', req.body);
    const { code_structure, name, description, type,isActive } = req.body;

    // Validation des données requises
    if (!code_structure || !name || !type) {
      return res.status(400).json({ 
        message: 'Données manquantes',
        required: ['code_structure', 'name', 'type']
      });
    }

    // Validation du type
    const validTypes = ['DEPENSE', 'RECETTE'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: 'Type invalide',
        validTypes 
      });
    }

    const categorie = await Categorie.create({ code_structure, name, description, type,isActive });logger.log('categorie.controller', 'Catégorie créée:', categorie.id);

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'une catégorie ${type}: ${name}`,
      clientIp,
      {
        action: 'CREATE_CATEGORIE',
        categorieId: categorie.id,
        categorieData: {
          name: categorie.name,
          type: categorie.type,
          description: categorie.description,
          code_structure: categorie.code_structure,
          isActive: categorie.isActive
        }
      }
    );

    res.status(201).json(categorie);
  } catch (error) {

    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la création d'une catégorie`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_CREATE_CATEGORIE',
          error: error.message,
          data: req.body
        }
      );
    }
    res.status(500).json({ message: 'Erreur lors de la création', error });
    // Gestion des erreurs spécifiques
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        message: 'Erreur de validation', 
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    if (error instanceof UniqueConstraintError) {
      return res.status(400).json({ 
        message: 'Une catégorie avec ce nom existe déjà pour cette structure' 
      });
    }

    res.status(500).json({ 
      message: 'Erreur lors de la création de la catégorie',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// controllers/categorie.controller.js - Ajouter cette méthode

// Récupérer une catégorie par son code métier
exports.getByCode = async (req, res) => {
  try {
    const authUser = req.user;
    const { code } = req.params;
    const { code_structure } = req.query;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const categorie = await Categorie.findOne({
      where: {
        code: code,
        [Op.or]: [
          { code_structure: code_structure },
          { code_structure: null },
          { code_structure: '' }
        ]
      }
    });

    if (!categorie) {
      return res.status(404).json({ message: `Catégorie avec le code '${code}' non trouvée` });
    }

    res.json(categorie);
  } catch (error) {logger.error('categorie.controller', 'Erreur récupération catégorie par code:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
};

exports.getAllByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;
    const categories = await Categorie.findAll({
      /* where: { 
        code_structure,
        isActive: true
       }, */
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { code_structure: code_structure }, // 🔹 spécifique
              { code_structure: null },           // 🔹 global
              { code_structure: '' }              // 🔹 global vide
            ]
          },
          { isActive: true }
        ]
      },
      order: [['createdAt', 'DESC']],
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de récupération', error });
  }
};


// Récupérer toutes les catégories d'une structure avec pagination et recherche
exports.getAllByStructureBis = async (req, res) => {
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
      type = '',
      showInactive = 'false'
    } = req.query;

    // Construction de la clause where
    /* let whereClause = { 
      code_structure: code_structure
    }; */

    let whereClause = {
      [Op.or]: [
        { code_structure: code_structure },
        { code_structure: null },
        { code_structure: '' }
      ]
    };
    // Filtre par statut actif/inactif
    if (showInactive === 'false') {
      whereClause.isActive = true;
    }

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { type: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filtre par type
    if (type) {
      whereClause.type = type;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Categorie.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);logger.log('categorie.controller', `📦 Catégories: ${count} trouvées, page ${page}/${totalPages}`);

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
      filtres: {
        search: search || null,
        type: type || null,
        showInactive: showInactive === 'true'
      }
    });

  } catch (error) {logger.error('categorie.controller', 'Erreur récupération catégories:', error);
    res.status(500).json({ 
      message: 'Erreur de récupération des catégories', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

exports.updateCategorie = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { id } = req.params;
    const { name, description, type } = req.body;

    const categorie = await Categorie.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable' });

    // Sauvegarder les anciennes valeurs
    const oldValues = {
      name: categorie.name,
      description: categorie.description,
      type: categorie.type
    };

    categorie.name = name;
    categorie.description = description;
    categorie.type = type;

    await categorie.save();

    // Identifier les changements
    const changes = {};
    if (oldValues.name !== categorie.name) changes.name = { old: oldValues.name, new: categorie.name };
    if (oldValues.description !== categorie.description) changes.description = { old: oldValues.description, new: categorie.description };
    if (oldValues.type !== categorie.type) changes.type = { old: oldValues.type, new: categorie.type };
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour de la catégorie ${categorie.type}: ${categorie.name}`,
      clientIp,
      {
        action: 'UPDATE_CATEGORIE',
        categorieId: categorie.id,
        changes: changes
      }
    );

    res.json(categorie);
  } catch (error) {

    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la mise à jour de la catégorie ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_CATEGORIE',
          categorieId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur de mise à jour', error });
  }
};

exports.toggleActive = async (req, res) => {
  try {

    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { id } = req.params;

    const categorie = await Categorie.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable' });

    const oldStatus = categorie.isActive;
    categorie.isActive = !categorie.isActive;
    await categorie.save();

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut de la catégorie ${categorie.type}: ${categorie.name} → ${categorie.isActive ? 'activée' : 'désactivée'}`,
      clientIp,
      {
        action: 'TOGGLE_CATEGORIE_STATUS',
        categorieId: categorie.id,
        oldStatus: oldStatus,
        newStatus: categorie.isActive
      }
    );

    res.json({ message: 'Statut modifié', isActive: categorie.isActive });
  } catch (error) {
     // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors du changement de statut de la catégorie ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_TOGGLE_CATEGORIE_STATUS',
          categorieId: req.params.id,
          error: error.message
        }
      );
    }

    res.status(500).json({ message: 'Erreur de modification du statut', error });
  }
};

exports.deleteCategorie = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    // Récupérer la catégorie avant suppression
    const categorie = await Categorie.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    const categorieInfo = {
      id: categorie.id,
      name: categorie.name,
      type: categorie.type,
      code_structure: categorie.code_structure
    };

    const deleted = await Categorie.destroy({ where: { id } });
    //if (!deleted) return res.status(404).json({ message: 'Catégorie non trouvée' });

    if (deleted) {
      // ENREGISTRER L'HISTORIQUE
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Suppression de la catégorie ${categorieInfo.type}: ${categorieInfo.name}`,
        clientIp,
        {
          action: 'DELETE_CATEGORIE',
          categorieInfo: categorieInfo
        }
      );
    }
    

    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la suppression de la catégorie ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_DELETE_CATEGORIE',
          categorieId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};

// NOUVEAU : Exporter les catégories vers Excel
exports.exportCategoriesExcel = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, type, showInactive } = req.query;
    
    // Construction de la clause WHERE
    let whereClause = {
      [Op.or]: [
        { code_structure: code_structure },
        { code_structure: null },
        { code_structure: '' }
      ]
    };
    
    if (showInactive !== 'true') {
      whereClause.isActive = true;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    const categories = await Categorie.findAll({
      where: whereClause,
      order: [['type', 'ASC'], ['name', 'ASC']]
    });
    
    // Création du workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = authUser.nom || 'Application';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Catégories');
    
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
      'ID', 'Nom', 'Type', 'Description', 
      'Statut', 'Code structure', 'Date création', 'Dernière modification'
    ];
    
    sheet.addRow(headers).eachCell(cell => {
      cell.style = headerStyle;
    });
    
    // Remplir les données
    categories.forEach(categorie => {
      sheet.addRow([
        categorie.id,
        categorie.name,
        categorie.type === 'DEPENSE' ? 'Dépense' : 'Recette',
        categorie.description || '-',
        categorie.isActive ? 'Actif' : 'Inactif',
        categorie.code_structure || 'Global',
        categorie.createdAt ? new Date(categorie.createdAt).toLocaleDateString('fr-FR') : '-',
        categorie.updatedAt ? new Date(categorie.updatedAt).toLocaleDateString('fr-FR') : '-'
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
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Export Excel de ${categories.length} catégories`,
      clientIp,
      {
        action: 'EXPORT_CATEGORIES_EXCEL',
        nombreCategories: categories.length,
        filtres: { code_structure, type, showInactive }
      }
    );
    
    // Générer et envoyer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=categories-${Date.now()}.xlsx`);
    res.send(buffer);
    
  } catch (error) {logger.error('categorie.controller', '❌ Erreur export Excel catégories:', error);
    
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de l'export Excel des catégories`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_EXPORT_CATEGORIES',
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
