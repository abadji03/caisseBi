const db = require('../models');
const Fournisseur = db.Fournisseur;
const Bon = db.Bon;
const Panier = db.Panier;
const ArticlePanier = db.ArticlePanier;
const Produit = db.Produit;
const {Op} = db.Sequelize;
const HistoriqueService = require('../services/historique.service');


// Créer un nouveau fournisseur avec vérification de l'email et du téléphone
exports.createFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { email, telephone } = req.body;

    // Vérifier si un fournisseur existe déjà avec cet email ou ce téléphone
    const existingFournisseur = await Fournisseur.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ email: email }, { telephone: telephone }],
      },
    });

    if (existingFournisseur) {
      let message = '';
      if (existingFournisseur.email === email && existingFournisseur.telephone === telephone) {
        message = 'Un fournisseur existe déjà avec cet email et ce numéro de téléphone';
      } else if (existingFournisseur.email === email) {
        message = 'Un fournisseur existe déjà avec cet email';
      } else {
        message = 'Un fournisseur existe déjà avec ce numéro de téléphone';
      }

      return res.status(400).json({ message });
    }

    // Si aucun fournisseur existant n'est trouvé, créer le nouveau fournisseur
    const fournisseur = await Fournisseur.create(req.body);

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un nouveau fournisseur: ${fournisseur.nomComplet || fournisseur.nom || fournisseur.email}`,
      clientIp,
      {
        action: 'CREATE_FOURNISSEUR',
        fournisseurId: fournisseur.id,
        fournisseurData: {
          nomComplet: fournisseur.nomComplet,
          email: fournisseur.email,
          telephone: fournisseur.telephone,
          code_structure: fournisseur.code_structure,
          magasinId: fournisseur.magasinId
        }
      }
    );

    res.status(201).json(fournisseur);
  } catch (error) {

    // Enregistrer l'erreur dans l'historique
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la création d'un fournisseur`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_CREATE_FOURNISSEUR',
          error: error.message,
          data: req.body
        }
      );
    }
    res.status(500).json({
      message: 'Erreur lors de la création du fournisseur' + error,
      error: error.message,
    });
  }
};

// Récupérer tous les fournisseurs
exports.getAllFournisseurs = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseurs = await Fournisseur.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération des fournisseurs', error });
  }
};

// Récupérer un fournisseur par son ID
exports.getFournisseurById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }
    res.json(fournisseur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération du fournisseur', error });
  }
};

// Mettre à jour un fournisseur
exports.updateFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });

    // Récupérer les anciennes valeurs pour comparer
    const oldValues = {
      nomComplet: fournisseur.nomComplet,
      email: fournisseur.email,
      telephone: fournisseur.telephone,
      adresse: fournisseur.adresse,
      statut: fournisseur.statut
    };

    await fournisseur.update(req.body);

    // Identifier les changements
    const changes = {};
    if (oldValues.nomComplet !== fournisseur.nomComplet) changes.nomComplet = { old: oldValues.nomComplet, new: fournisseur.nomComplet };
    if (oldValues.email !== fournisseur.email) changes.email = { old: oldValues.email, new: fournisseur.email };
    if (oldValues.telephone !== fournisseur.telephone) changes.telephone = { old: oldValues.telephone, new: fournisseur.telephone };
    if (oldValues.adresse !== fournisseur.adresse) changes.adresse = { old: oldValues.adresse, new: fournisseur.adresse };
    if (oldValues.statut !== fournisseur.statut) changes.statut = { old: oldValues.statut, new: fournisseur.statut };
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du fournisseur: ${fournisseur.nomComplet || fournisseur.email}`,
      clientIp,
      {
        action: 'UPDATE_FOURNISSEUR',
        fournisseurId: fournisseur.id,
        changes: changes,
        updatedData: req.body
      }
    );
    res.json({ message: 'Fournisseur mis à jour', fournisseur });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la mise à jour du fournisseur ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_FOURNISSEUR',
          fournisseurId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
};


// Mettre à jour uniquement le statut d'un fournisseur
exports.updateFournisseurStatus = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });

    const { statut } = req.body;
    if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' });

    const oldStatut = fournisseur.statut;
    await fournisseur.update({ statut });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut du fournisseur ${fournisseur.nomComplet || fournisseur.email}: ${oldStatut ? 'actif' : 'inactif'} → ${statut ? 'actif' : 'inactif'}`,
      clientIp,
      {
        action: 'UPDATE_FOURNISSEUR_STATUS',
        fournisseurId: fournisseur.id,
        oldStatut: oldStatut,
        newStatut: statut
      }
    );

    res.json({ message: 'Statut du fournisseur mis à jour', fournisseur });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors du changement de statut du fournisseur ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_FOURNISSEUR_STATUS',
          fournisseurId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};

// Supprimer un fournisseur
exports.deleteFournisseur = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: 'Fournisseur non trouvé' });

    // Sauvegarder les infos avant suppression
    const fournisseurInfo = {
      id: fournisseur.id,
      nomComplet: fournisseur.nomComplet,
      email: fournisseur.email,
      telephone: fournisseur.telephone,
      code_structure: fournisseur.code_structure
    };

     // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression du fournisseur: ${fournisseurInfo.nomComplet || fournisseurInfo.email}`,
      clientIp,
      {
        action: 'DELETE_FOURNISSEUR',
        fournisseurInfo: fournisseurInfo
      }
    );
    await fournisseur.destroy();
    res.json({ message: 'Fournisseur supprimé' });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la suppression du fournisseur ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_DELETE_FOURNISSEUR',
          fournisseurId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur suppression', error });
  }
};

// Récupérer les fournisseurs par structure
exports.getFournisseursByStructure = async (req, res) => {
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
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");
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
    const fournisseurs = await Fournisseur.findAll({
      where: whereClause,
      include: [
        { model: db.Magasin,attributes: ["id", "nom","telephone", "email"] },
      ], 
      order: [['createdAt', 'DESC']],
    });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération', error });
  }
};

// Récupérer les fournisseurs par structure avec pagination et recherche
exports.getFournisseursByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;
    
    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = 'tous'
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
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nomComplet: { [Op.like]: `%${search}%` } },
        { adresse: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        { banque: { [Op.like]: `%${search}%` } },
        { numeroCompte: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { montantAPayer: { [Op.eq]: parseFloat(search) } }
        );
      }
    }

    // 🔹 FILTRE PAR STATUT
    if (statut !== 'tous') {
      whereClause.statut = statut === 'actif' ? true : false;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Fournisseur.findAndCountAll({
      where: whereClause,
      include: [
        { model: db.Magasin, attributes: ["id", "nom", "telephone", "email"] },
      ],
      order: [['nomComplet', 'ASC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Fournisseurs: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error("Erreur récupération fournisseurs:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des fournisseurs', 
      error: error.message 
    });
  }
};

// Rechercher des fournisseurs selon différents critères
exports.searchFournisseurs = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const whereClause = {};

    // Filtres possibles
    if (req.query.nom) whereClause.nom = { [db.Sequelize.Op.like]: `%${req.query.nom}%` };
    if (req.query.statut) whereClause.statut = req.query.statut;
    if (req.query.code_structure) whereClause.code_structure = req.query.code_structure;

    const fournisseurs = await Fournisseur.findAll({ where: whereClause });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur recherche', error });
  }
};

// Compter le nombre total de fournisseurs
exports.countFournisseurs = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const count = await Fournisseur.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Erreur comptage', error });
  }
};

// Récupérer les fournisseurs avec pagination
exports.getFournisseursPaginated = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Fournisseur.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      fournisseurs: rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur pagination', error });
  }
};

exports.getBonsWithPaniersAndProduits = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id, code_structure } = req.params;

    const fournisseur = await Fournisseur.findOne({
      where: { id, code_structure: code_structure },
      include: [
        {
          model: Bon,
          include: [
            {
              model: Panier,
              include: [
                {
                  model: ArticlePanier,
                  include: [Produit]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    res.json(fournisseur);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NOUVEAU : Exporter les fournisseurs vers Excel
exports.exportFournisseursExcel = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const ExcelJS = require('exceljs');

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, magasinId, search, statut } = req.query;
    
    // Construction de la clause WHERE
    let whereClause = {};
    
    if (code_structure) {
      whereClause.code_structure = code_structure;
    }
    
    if (magasinId) {
      whereClause.magasinId = parseInt(magasinId);
    }
    
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nomComplet: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        { adresse: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (statut && statut !== 'tous') {
      whereClause.statut = statut === 'actif' ? true : false;
    }
    
    const fournisseurs = await Fournisseur.findAll({
      where: whereClause,
      include: [
        { model: db.Magasin, attributes: ["id", "nom"] }
      ],
      order: [['nomComplet', 'ASC']]
    });
    
    // Création du workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = authUser.nom || 'Application';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Fournisseurs');
    
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
      'ID', 'Nom complet', 'Email', 'Téléphone', 'Adresse', 
      'Banque', 'N° Compte', 'Montant à payer', 'Statut', 
      'Magasin', 'Date création'
    ];
    
    sheet.addRow(headers).eachCell(cell => {
      cell.style = headerStyle;
    });
    
    // Remplir les données
    fournisseurs.forEach(fournisseur => {
      sheet.addRow([
        fournisseur.id,
        fournisseur.nomComplet || '-',
        fournisseur.email || '-',
        fournisseur.telephone || '-',
        fournisseur.adresse || '-',
        fournisseur.banque || '-',
        fournisseur.numeroCompte || '-',
        fournisseur.montantAPayer ? `${fournisseur.montantAPayer.toLocaleString('fr-FR')} F CFA` : '0 F CFA',
        fournisseur.statut ? 'Actif' : 'Inactif',
        fournisseur.Magasin?.nom || '-',
        fournisseur.createdAt ? new Date(fournisseur.createdAt).toLocaleDateString('fr-FR') : '-'
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
      `Export Excel de ${fournisseurs.length} fournisseurs`,
      clientIp,
      {
        action: 'EXPORT_FOURNISSEURS_EXCEL',
        nombreFournisseurs: fournisseurs.length,
        filtres: { code_structure, magasinId, search, statut }
      }
    );
    
    // Générer et envoyer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=fournisseurs-${Date.now()}.xlsx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Erreur export Excel fournisseurs:', error);
    
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de l'export Excel des fournisseurs`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_EXPORT_FOURNISSEURS',
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
