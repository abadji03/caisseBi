const db = require('../models');
const logger = require('../services/logger.js');
const { verifierAppartenanceStructure } = require('../services/verification.service');
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
    const { magasinIds, ...clientData } = req.body; // Extraire les magasins

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { email, telephone } = clientData;
    
    // Vérifie s'il existe un client avec le même email ou téléphone
    const existingClient = await Client.findOne({
      where: {
        [Op.or]: [{ email: email || null }, { telephone: telephone || null }],
      },
    });

    if (existingClient) {
      return res.status(409).json({
        message: 'Un client avec cet email ou numéro de téléphone existe déjà',
        existingClient,
      });
    }

    // Créer le client
    const client = await Client.create(clientData);

    // Associer les magasins si fournis
    if (magasinIds && magasinIds.length > 0) {
      await client.setMagasins(magasinIds);
      
      // Initialiser les soldes dans la table de liaison
      for (const magasinId of magasinIds) {
        await db.MagasinClient.create({
          magasinId: magasinId,
          clientId: client.id,
          solde: 0
        });
      }
    }

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
          magasins: magasinIds
        }
      }
    );

    // Recharger avec les associations
    const clientAvecMagasins = await Client.findByPk(client.id, {
      include: [{ model: Magasin, as: 'Magasin', through: { attributes: ['solde'] } }]
    });

    res.status(201).json(clientAvecMagasins);
  } catch (error) {
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


// Créer ou associer un client à un magasin
exports.createOrAssociateClient = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const { magasinIds, ...clientData } = req.body; // Récupérer le solde initiallogger.log('client.controller', 'Données client reçues', clientData, magasinIds);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const telephone = clientData.telephone;
    const email = clientData.email;

    // Vérifier si le client existe déjà
    let existingClient = null;
    
    if (telephone) {
      existingClient = await Client.findOne({
        where: {
          code_structure: authUser.code_structure,
          telephone: telephone
        },
        include: [{ model: db.Magasin }]
      });
    }
    
    if (!existingClient && email) {
      existingClient = await Client.findOne({
        where: {
          code_structure: authUser.code_structure,
          email: email
        },
        include: [{ model: db.Magasin }]
      });
    }

    let client;
    let isNewClient = false;
    let magasinsToAssociate = magasinIds || [];

    if (existingClient) {
      // Client existe déjà
      client = existingClient;
      const magasinsExistants = client.magasins?.map(m => m.id) || [];
      const nouveauxMagasins = magasinsToAssociate.filter(id => !magasinsExistants.includes(id));
      
      if (nouveauxMagasins.length > 0) {
        // Pour chaque nouveau magasin, créer l'association avec le solde
        for (const magasinId of nouveauxMagasins) {
          await db.MagasinClient.create({
            magasinId: magasinId,
            clientId: client.id,
          }, { transaction });
        }
        
        await HistoriqueService.enregistrerAction(
          authUser.id,
          `Association du client existant ${client.nomComplet} aux magasins: ${nouveauxMagasins.join(', ')}`,
          clientIp,
          {
            action: 'ASSOCIATE_CLIENT_TO_MAGASINS',
            clientId: client.id,
            magasinsAjoutes: nouveauxMagasins,
          }
        );
      }
      
      // Mettre à jour les informations du client
      const hasChanges = Object.keys(clientData).some(key => 
        clientData[key] !== undefined && client[key] !== clientData[key]
      );
      
      if (hasChanges) {
        await client.update(clientData, { transaction });
      }
    } else {
      // Nouveau client
      isNewClient = true;
      
      // Vérifier les doublons
      const existingByPhone = await Client.findOne({
        where: { telephone: telephone, code_structure: authUser.code_structure }
      });
      
      if (existingByPhone) {
        await transaction.rollback();
        return res.status(409).json({
          message: 'Un client avec ce numéro de téléphone existe déjà'
        });
      }
      
      if (email) {
        const existingByEmail = await Client.findOne({
          where: { email: email, code_structure: authUser.code_structure }
        });
        if (existingByEmail) {
          await transaction.rollback();
          return res.status(409).json({
            message: 'Un client avec cet email existe déjà'
          });
        }
      }
      
      // Créer le client
      client = await Client.create({
        ...clientData,
        telephone,
        email,
        code_structure: authUser.code_structure,
        statut: true,
        solde_total: 0
      }, { transaction });
      
      // Créer les associations avec le solde initial
      if (magasinsToAssociate.length > 0) {
        for (const magasinId of magasinsToAssociate) {
          await db.MagasinClient.create({
            magasinId: magasinId,
            clientId: client.id,
          }, { transaction });
        }
      }
      
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Création d'un nouveau client: ${client.nomComplet}`,
        clientIp,
        {
          action: 'CREATE_CLIENT',
          clientId: client.id,
          clientData: {
            nomComplet: client.nomComplet,
            email: client.email,
            telephone: client.telephone,
            code_structure: client.code_structure,
            magasins: magasinsToAssociate,
          }
        }
      );
    }

    // Mettre à jour le solde total du client
    /* const tousSoldes = await db.MagasinClient.sum('solde', {
      where: { clientId: client.id },
      transaction
    });
    await client.update({ solde_total: tousSoldes }, { transaction });
 */
    await transaction.commit();

    const clientAvecMagasins = await Client.findByPk(client.id, {
      include: [{ 
        model: db.Magasin, 
        through: { attributes: ['solde'] }
      }]
    });

    res.status(isNewClient ? 201 : 200).json({
      message: isNewClient ? 'Client créé avec succès' : 'Client mis à jour avec succès',
      client: clientAvecMagasins,
      isNew: isNewClient
    });
    
  } catch (error) {
    await transaction.rollback();logger.error('client.controller', 'Erreur création/association client:', error);
    res.status(500).json({
      message: 'Erreur lors de l\'opération sur le client',
      error: error.message
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
    const verifStructure = verifierAppartenanceStructure(client, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

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
    const verifStructure = verifierAppartenanceStructure(client, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

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
    const verifStructure = verifierAppartenanceStructure(client, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération', error });
  }
};

// Obtenir tous les clients d'une structure
exports.getClientsByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // Vérification : l'utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    //const isAdminSecondaire = authUser.roles?.some(r => r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    let whereClause = { code_structure: code_structure, statut:true };
    //let magasinFilter = {};
    let includeConfig = [
          { 
            model: db.Magasin,
            through: { attributes: ['solde'] },
            attributes: ["id", "nom", "telephone", "email"]
          }
        ];

    // Si gérant ou caissier : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n'est associé à aucun magasin"
        });
      }
      includeConfig[0].where = { id: authUser.magasinId };
      includeConfig[0].required = true;
    }

    const clients = await Client.findAll({
      where: whereClause,
      include: includeConfig, 
      order: [['created_at', 'DESC']],
    });
    
    res.json(clients);
  } catch (error) {logger.error('client.controller', 'Erreur:', error);
    res.status(500).json({ message: 'Erreur récupération', error: error.message });
  }
};

// Obtenir le solde d'un client pour un magasin spécifique
exports.getClientSoldeByMagasin = async (req, res) => {
  try {
    const { clientId, magasinId } = req.params;
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const relation = await db.MagasinClient.findOne({
      where: { clientId, magasinId },
      include: [
        { model: db.Client, attributes: ['id', 'nomComplet', 'telephone'] },
        { model: db.Magasin, attributes: ['id', 'nom'] }
      ]
    });

    if (!relation) {
      return res.status(404).json({ 
        message: 'Ce client n\'est pas associé à ce magasin' 
      });
    }

    res.json({
      clientId: relation.clientId,
      clientNom: relation.Client.nomComplet,
      magasinId: relation.magasinId,
      magasinNom: relation.Magasin.nom,
      solde: relation.solde
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
};

// Obtenir tous les clients d'une structure avec pagination

exports.getClientsByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;
    const { code_structure } = req.params;
    
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = 'tous'
    } = req.query;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({ message: "Accès interdit : structure non autorisée" });
    }

    // Vérifier les rôles
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // Construction de la clause WHERE (sans magasinId car la colonne n'existe plus)
    let whereClause = { code_structure: code_structure };
    
    // Pour la recherche textuelle
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nomComplet: { [Op.like]: `%${search}%` } },
        { adresse: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Filtre par statut
    if (statut !== 'tous') {
      whereClause.statut = statut === 'actif' ? true : false;
    }

    // Configuration de l'include pour les magasins
    let includeConfig = [
      { 
        model: db.Magasin,
        through: { attributes: ['solde'] },
        attributes: ["id", "nom", "telephone", "email"]
      }
    ];

    // Si l'utilisateur n'est pas admin, filtrer par son magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({ message: "Utilisateur non associé à un magasin" });
      }
      // Filtrer via la table de liaison
      includeConfig[0].where = { id: authUser.magasinId };
      includeConfig[0].required = true; // INNER JOIN au lieu de LEFT JOIN
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Utiliser findAndCountAll sans magasinId dans where
    const { count, rows } = await db.Client.findAndCountAll({
      where: whereClause,
      include: includeConfig,
      order: [['nomComplet', 'ASC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calculer le solde pour chaque client en fonction du magasin filtré
    const rowsAvecSolde = rows.map(client => {
      const clientJson = client.toJSON();
      
      // Si l'utilisateur est non-admin et a un magasin spécifique
      if (!isAdminStructure && authUser.magasinId) {
        const magasinAssocie = clientJson.magasins?.find(m => m.id === authUser.magasinId);
        clientJson.solde = magasinAssocie?.MagasinClient?.solde || 0;
      } 
      // Si admin, utiliser le solde total ou la somme des soldes
      else {
        clientJson.solde = clientJson.magasins?.reduce((total, magasin) => {
          return total + (magasin.MagasinClient?.solde || 0);
        }, 0) || 0;
      }
      
      return clientJson;
    });

    const totalPages = Math.ceil(count / limitInt);

    res.status(200).json({
      items: rowsAvecSolde,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {logger.error('client.controller', "Erreur récupération clients:", error);
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
    const verifStructure = verifierAppartenanceStructure(client, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

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
    const verifStructure = verifierAppartenanceStructure(client, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

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


// Mettre à jour le solde d'un client pour un magasin spécifique
exports.updateClientSolde = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);
    const { clientId, magasinId } = req.params;
    const { solde } = req.body;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Vérifier si la relation existe
    const relation = await db.MagasinClient.findOne({
      where: {
        clientId: clientId,
        magasinId: magasinId
      }
    });

    if (!relation) {
      return res.status(404).json({ 
        message: 'Ce client n\'est pas associé à ce magasin' 
      });
    }

    const oldSolde = relation.solde;
    await relation.update({ solde });

    // ENREGISTRER L'HISTORIQUE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Mise à jour du solde client pour le magasin ${magasinId}`,
      clientIp,
      {
        action: 'UPDATE_CLIENT_SOLDE',
        clientId: clientId,
        magasinId: magasinId,
        oldSolde: oldSolde,
        newSolde: solde
      }
    );

    res.json({ 
      message: 'Solde mis à jour avec succès', 
      magasinId, 
      clientId, 
      solde 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur mise à jour solde', 
      error: error.message 
    });
  }
};

// Nouvelle méthode : Obtenir un client avec ses magasins et soldes
exports.getClientWithMagasins = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const client = await Client.findByPk(req.params.id, {
      include: [{ 
        model: db.Magasin, 
        through: { attributes: ['solde'] },
        attributes: ["id", "nom", "telephone", "email", "adresse"]
      }]
    });
    
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    // Ajouter les soldes par magasin
    const clientJson = client.toJSON();
    if (clientJson.Magasins) {
      clientJson.Magasins.forEach(magasin => {
        magasin.solde = magasin.MagasinClient?.solde || 0;
      });
    }

    res.json(clientJson);
  } catch (error) {logger.error('client.controller', 'Erreur getClientWithMagasins:', error);
    res.status(500).json({ message: 'Erreur récupération', error: error.message });
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
    const verifStructure = verifierAppartenanceStructure(client, req.user);
    if (!verifStructure.ok) return res.status(verifStructure.statut).json({ message: verifStructure.message });

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
    
  } catch (error) {logger.error('client.controller', '❌ Erreur export Excel clients:', error);
    
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
