const db = require('../models');
const Client = db.Client;
const Magasin = db.Magasin;
const {Op} = db.Sequelize;

//Créer un client
exports.createClient = async (req, res) => {

  try {
    const authUser = req.user;

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
    res.status(201).json(client);
  } catch (error) {
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

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    await client.update({ ...req.body, dateMiseAJour: new Date() });
    res.json({ message: 'Client mis à jour', client });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
};

//Supprimer un client
exports.deleteClient = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    await client.destroy();
    res.json({ message: 'Client supprimé' });
  } catch (error) {
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

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    await client.update({ statut: req.body.statut, dateMiseAJour: new Date() });
    res.json({ message: 'Statut mis à jour', client });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};

//Mettre à jour le plafond
exports.updateClientPlafond = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    await client.update({ plafond: req.body.plafond, dateMiseAJour: new Date() });
    res.json({ message: 'Plafond mis à jour', client });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour plafond', error });
  }
};

//Mettre à jour le solde
exports.updateClientSolde = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    await client.update({ solde: req.body.solde, dateMiseAJour: new Date() });
    res.json({ message: 'Solde mis à jour', client });
  } catch (error) {
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
