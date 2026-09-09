const db = require('../models');
const logger = require('../services/logger.js');
const CategorieProduit = db.CategoriesProduits;
const HistoriqueService = require('../services/historique.service');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');

exports.createCategorie = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const categorie = await CategorieProduit.create(req.body);

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'une nouvelle catégorie: ${categorie.nom || categorie.libelle || `ID: ${categorie.id}`}`,
      clientIp,
      {
        action: 'CREATE_CATEGORIE',
        categorieId: categorie.id,
        categorieData: {
          nom: categorie.nom,
          libelle: categorie.libelle,
          code_structure: categorie.code_structure,
          statut: categorie.statut
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
    res.status(500).json({ message: 'Erreur création catégorie', error });
  }
};

exports.updateCategorie = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const categorie = await CategorieProduit.findByPk(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    // Sauvegarder les anciennes valeurs
    const oldValues = {
      nom: categorie.nom,
      libelle: categorie.libelle,
      description: categorie.description,
      statut: categorie.statut
    };

    await categorie.update(req.body);

    // Identifier les changements
    const changes = {};
    if (oldValues.nom !== categorie.nom) changes.nom = { old: oldValues.nom, new: categorie.nom };
    if (oldValues.libelle !== categorie.libelle) changes.libelle = { old: oldValues.libelle, new: categorie.libelle };
    if (oldValues.description !== categorie.description) changes.description = { old: oldValues.description, new: categorie.description };
    if (oldValues.statut !== categorie.statut) changes.statut = { old: oldValues.statut, new: categorie.statut };
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour de la catégorie: ${categorie.nom || categorie.libelle || `ID: ${categorie.id}`}`,
      clientIp,
      {
        action: 'UPDATE_CATEGORIE',
        categorieId: categorie.id,
        changes: changes
      }
    );
    res.json({ message: 'Catégorie mise à jour', categorie });
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
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
};

exports.deleteCategorie = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const categorie = await CategorieProduit.findByPk(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    // Sauvegarder les infos avant suppression
    const categorieInfo = {
      id: categorie.id,
      nom: categorie.nom,
      libelle: categorie.libelle,
      code_structure: categorie.code_structure
    };

    await categorie.destroy();

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression de la catégorie: ${categorieInfo.nom || categorieInfo.libelle || `ID: ${categorieInfo.id}`}`,
      clientIp,
      {
        action: 'DELETE_CATEGORIE',
        categorieInfo: categorieInfo
      }
    );

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
    res.status(500).json({ message: 'Erreur suppression', error });
  }
};
exports.getCategoriesById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const categorie = await CategorieProduit.findByPk(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvé' });

    res.json(categorie);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la récupération de la catégorie catégorie', error });
  }
};

exports.getCategoriesByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const categories = await CategorieProduit.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['createdAt', 'DESC']],
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération', error });
  }
};

exports.updateStatutCategorie = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const categorie = await CategorieProduit.findByPk(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    const { statut } = req.body;

    if (typeof statut !== 'boolean') {
      return res.status(400).json({ message: 'Le statut doit être un booléen.' });
    }

    const oldStatut = categorie.statut;
    await categorie.update({ statut });

    // 2️⃣ Mise à jour des utilisateurs du magasin
    const [updatedProducts] = await db.Produit.update(
      { statut:statut },
      {
        where: {
          categorieId : categorie.id
        },
        transaction
      }
    );

    await transaction.commit();

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut de la catégorie ${categorie.nom || categorie.libelle || `ID: ${categorie.id}`}: ${oldStatut ? 'actif' : 'inactif'} → ${statut ? 'actif' : 'inactif'}`,
      clientIp,
      {
        action: 'UPDATE_CATEGORIE_STATUT',
        categorieId: categorie.id,
        oldStatut: oldStatut,
        newStatut: statut,
        produitsMisAJour: updatedProducts
      }
    );
    res.json({ message: 'Statut mis à jour avec succès', categorie });
  } catch (error) {
     // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors du changement de statut de la catégorie ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_CATEGORIE_STATUT',
          categorieId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
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

    const { code_structure, search, statut } = req.query;
    
    // Construction de la clause WHERE
    let whereClause = {};
    
    if (code_structure) {
      whereClause.code_structure = code_structure;
    }
    
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { libelle: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (statut && statut !== 'tous') {
      whereClause.statut = statut === 'actif' ? true : false;
    }
    
    const categories = await CategorieProduit.findAll({
      where: whereClause,
      order: [['nom', 'ASC']],
      include: [
        {
          model: db.Produit,
          attributes: ['id'],
          required: false
        }
      ]
    });
    
    // Compter les produits par catégorie
    const categoriesWithCount = categories.map(cat => ({
      ...cat.toJSON(),
      nombreProduits: cat.Produits ? cat.Produits.length : 0
    }));
    
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
      'ID', 'Nom', 'Libellé', 'Description', 
      'Nombre de produits', 'Statut', 
      'Code structure', 'Date création', 'Dernière modification'
    ];
    
    sheet.addRow(headers).eachCell(cell => {
      cell.style = headerStyle;
    });
    
    // Remplir les données
    categoriesWithCount.forEach(categorie => {
      sheet.addRow([
        categorie.id,
        categorie.nom || '-',
        categorie.libelle || '-',
        categorie.description || '-',
        categorie.nombreProduits,
        categorie.statut ? 'Actif' : 'Inactif',
        categorie.code_structure || '-',
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
        filtres: { code_structure, search, statut }
      }
    );
    
    // Générer et envoyer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=categories-${Date.now()}.xlsx`);
    res.send(buffer);
    
  } catch (error) {logger.error('categorieProduit.controller', '❌ Erreur export Excel catégories:', error);
    
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
