const db = require('../models');
const Client = db.Client;
const Magasin = db.Magasin;
const {Op} = db.Sequelize;
const HistoriqueService = require('../services/historique.service');
const ExcelJS = require('exceljs');

//Créer un client
exports.createClient = async (req, res) => {

  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { email, telephone } = req.body;
    // Vérifie s'il existe un client avec le même email ou téléphone
    const existingClient = await Client.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ email: email || null }, { telephone: telephone || null }],
      },
    });

    if (existingClient) {
      return res.status(409).json({
        message: 'Un client avec cet email ou numéro de téléphone existe déjà',
        existingClient,
      });
    }

    // Créer le client s'il n'existe pas
    const client = await Client.create(req.body);

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création d'un nouveau client: ${client.nomComplet || client.email || client.telephone}`,
      clientIp,
      {
        action: 'CREATE_CLIENT',
        clientId: client.id,
        clientData: {
          nomComplet: client.nomComplet,
          email: client.email,
          telephone: client.telephone,
          code_structure: client.code_structure,
          magasinId: client.magasinId,
          solde: client.solde,
          plafond: client.plafond
        }
      }
    );

    res.status(201).json(client);
  } catch (error) {

    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la création d'un client`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_CREATE_CLIENT',
          error: error.message,
          data: req.body
        }
      );
    }

    res.status(500).json({
      message: 'Erreur lors de la création du client',
      error: error.message || error,
    });
  }
};

//Mettre à jour un client
exports.updateClient = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

     // Sauvegarder les anciennes valeurs
    const oldValues = {
      nomComplet: client.nomComplet,
      email: client.email,
      telephone: client.telephone,
      adresse: client.adresse,
      statut: client.statut,
      solde: client.solde,
      plafond: client.plafond
    };

    await client.update({ ...req.body, dateMiseAJour: new Date() });

     // Identifier les changements
    const changes = {};
    if (oldValues.nomComplet !== client.nomComplet) changes.nomComplet = { old: oldValues.nomComplet, new: client.nomComplet };
    if (oldValues.email !== client.email) changes.email = { old: oldValues.email, new: client.email };
    if (oldValues.telephone !== client.telephone) changes.telephone = { old: oldValues.telephone, new: client.telephone };
    if (oldValues.adresse !== client.adresse) changes.adresse = { old: oldValues.adresse, new: client.adresse };
    if (oldValues.statut !== client.statut) changes.statut = { old: oldValues.statut, new: client.statut };
    if (oldValues.solde !== client.solde) changes.solde = { old: oldValues.solde, new: client.solde };
    if (oldValues.plafond !== client.plafond) changes.plafond = { old: oldValues.plafond, new: client.plafond };
    
    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du client: ${client.nomComplet || client.email || client.telephone}`,
      clientIp,
      {
        action: 'UPDATE_CLIENT',
        clientId: client.id,
        changes: changes
      }
    );

    res.json({ message: 'Client mis à jour', client });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la mise à jour du client ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_CLIENT',
          clientId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
};

//Supprimer un client
exports.deleteClient = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    // Sauvegarder les infos avant suppression
    const clientInfo = {
      id: client.id,
      nomComplet: client.nomComplet,
      email: client.email,
      telephone: client.telephone,
      code_structure: client.code_structure,
      solde: client.solde
    };

    await client.destroy();

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression du client: ${clientInfo.nomComplet || clientInfo.email || clientInfo.telephone}`,
      clientIp,
      {
        action: 'DELETE_CLIENT',
        clientInfo: clientInfo
      }
    );

    res.json({ message: 'Client supprimé' });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la suppression du client ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_DELETE_CLIENT',
          clientId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur suppression', error });
  }
};

//Obtenir un client par ID
exports.getClientById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération', error });
  }
};

//Obtenir tous les clients d'une structure
exports.getClientsByStructure = async (req, res) => {
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
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;
    }
    const clients = await Client.findAll({
      where: whereClause,
      include:[
          { model: Magasin,attributes: ["id", "nom","telephone", "email"] },
        ], 
      order: [['createdAt', 'DESC']],
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération', error });
  }
};

// Obtenir tous les clients d'une structure avec pagination
exports.getClientsByStructureBis = async (req, res) => {
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
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure
    };

    // 🔹 Si gérant ou caissier : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
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
        { email: { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant (solde ou plafond)
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { solde: { [Op.eq]: parseFloat(search) } },
          { plafond: { [Op.eq]: parseFloat(search) } }
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
    const { count, rows } = await Client.findAndCountAll({
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

    console.log(`📦 Clients: ${count} trouvés, page ${page}/${totalPages}`);

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
    console.error("Erreur récupération clients:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des clients', 
      error: error.message 
    });
  }
};

//Mettre à jour le statut (activer/désactiver)
exports.updateClientStatut = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    const oldStatut = client.statut;
    await client.update({ statut: req.body.statut, dateMiseAJour: new Date() });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut du client ${client.nomComplet || client.email || client.telephone}: ${oldStatut ? 'actif' : 'inactif'} → ${req.body.statut ? 'actif' : 'inactif'}`,
      clientIp,
      {
        action: 'UPDATE_CLIENT_STATUT',
        clientId: client.id,
        oldStatut: oldStatut,
        newStatut: req.body.statut
      }
    );
    res.json({ message: 'Statut mis à jour', client });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors du changement de statut du client ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_CLIENT_STATUT',
          clientId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};

//Mettre à jour le plafond
exports.updateClientPlafond = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    const oldPlafond = client.plafond;
    await client.update({ plafond: req.body.plafond, dateMiseAJour: new Date() });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification du plafond du client ${client.nomComplet || client.email || client.telephone}: ${oldPlafond || 0} → ${req.body.plafond || 0}`,
      clientIp,
      {
        action: 'UPDATE_CLIENT_PLAFOND',
        clientId: client.id,
        oldPlafond: oldPlafond,
        newPlafond: req.body.plafond
      }
    );

    res.json({ message: 'Plafond mis à jour', client });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour plafond', error });
  }
};

//Mettre à jour le solde
exports.updateClientSolde = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    const oldSolde = client.solde;
    await client.update({ solde: req.body.solde, dateMiseAJour: new Date() });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification du solde du client ${client.nomComplet || client.email || client.telephone}: ${oldSolde || 0} → ${req.body.solde || 0}`,
      clientIp,
      {
        action: 'UPDATE_CLIENT_SOLDE',
        clientId: client.id,
        oldSolde: oldSolde,
        newSolde: req.body.solde
      }
    );

    res.json({ message: 'Solde mis à jour', client });
  } catch (error) {
    // Enregistrer l'erreur
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de la modification du solde du client ID: ${req.params.id}`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_UPDATE_CLIENT_SOLDE',
          clientId: req.params.id,
          error: error.message
        }
      );
    }
    res.status(500).json({ message: 'Erreur mise à jour solde', error });
  }
};

//Mettre à jour le montant à payer
exports.updateMontantANousPayer = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    await client.update({
      montantANousPayer: req.body.montantANousPayer,
      dateMiseAJour: new Date(),
    });
    res.json({ message: 'Montant à payer mis à jour', client });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour montant à payer', error });
  }
};

// NOUVEAU : Exporter les clients vers Excel
exports.exportClientsExcel = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

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
    
    const clients = await Client.findAll({
      where: whereClause,
      include: [
        { model: Magasin, attributes: ["id", "nom"] }
      ],
      order: [['nomComplet', 'ASC']]
    });
    
    // Création du workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = authUser.nom || 'Application';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Clients');
    
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
      'Solde (F CFA)', 'Plafond (F CFA)', 'Montant à payer (F CFA)', 
      'Statut', 'Magasin', 'Date création', 'Dernière modification'
    ];
    
    sheet.addRow(headers).eachCell(cell => {
      cell.style = headerStyle;
    });
    
    // Remplir les données
    clients.forEach(client => {
      sheet.addRow([
        client.id,
        client.nomComplet || '-',
        client.email || '-',
        client.telephone || '-',
        client.adresse || '-',
        client.solde ? client.solde.toLocaleString('fr-FR') : '0',
        client.plafond ? client.plafond.toLocaleString('fr-FR') : '0',
        client.montantANousPayer ? client.montantANousPayer.toLocaleString('fr-FR') : '0',
        client.statut ? 'Actif' : 'Inactif',
        client.Magasin?.nom || '-',
        client.createdAt ? new Date(client.createdAt).toLocaleDateString('fr-FR') : '-',
        client.dateMiseAJour ? new Date(client.dateMiseAJour).toLocaleDateString('fr-FR') : '-'
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
      `Export Excel de ${clients.length} clients`,
      clientIp,
      {
        action: 'EXPORT_CLIENTS_EXCEL',
        nombreClients: clients.length,
        filtres: { code_structure, magasinId, search, statut }
      }
    );
    
    // Générer et envoyer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=clients-${Date.now()}.xlsx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Erreur export Excel clients:', error);
    
    if (req.user) {
      await HistoriqueService.enregistrerAction(
        req.user.id,
        `Erreur lors de l'export Excel des clients`,
        HistoriqueService.getClientIp(req),
        {
          action: 'ERROR_EXPORT_CLIENTS',
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
