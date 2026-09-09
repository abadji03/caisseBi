const db = require('../models');
const logger = require('../services/logger.js');
const Magasin = db.Magasin;
const User = db.Users;
const {Op} = db.Sequelize;
const HistoriqueService = require('../services/historique.service');


// Créer un magasin
exports.createMagasin = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const data = req.body;

    // Vérifie si le magasin existe déjà par téléphone
    const existingMagasin = await Magasin.findOne({ where: { telephone: data.telephone } });

    if (existingMagasin) {
      return res
        .status(400)
        .json({ message: 'Un magasin avec ce numéro de téléphone  existe déjà.' });
    }

    const magasin = await Magasin.create(data);
    // Enregistrement de l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création du magasin: ${magasin.nom} (ID: ${magasin.id})`,
      clientIp,
      { action: 'CREATE_MAGASIN', magasinId: magasin.id }
    );
    res.status(201).json(magasin);
  } catch (error) {logger.error('magasin.controller', error);
    res.status(500).json({ message: 'Erreur lors de la création du magasin' });
  }
};

// Modifier un magasin
exports.updateMagasin = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    const oldData = { nom: magasin.nom, adresse: magasin.adresse };
    await magasin.update(req.body);

    //Eneregistrer l'action
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification du magasin: ${magasin.nom} (ID: ${magasin.id})`,
      clientIp,
      { 
        action: 'UPDATE_MAGASIN', 
        magasinId: magasin.id,
        changes: {
          nom: oldData.nom !== magasin.nom ? { old: oldData.nom, new: magasin.nom } : undefined,
          adresse: oldData.adresse !== magasin.adresse ? { old: oldData.adresse, new: magasin.adresse } : undefined
        }
      }
    );
    res.json({ message: 'Magasin mis à jour', magasin });
  } catch (error) {logger.error('magasin.controller', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un magasin
exports.deleteMagasin = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    await magasin.destroy();
    const deletedMagasin = {id:magasin.id, nom: magasin.nom, adresse: magasin.adresse };
    // ENREGISTRER L'HISTORIQUE DE SUPPRESSION
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Suppression du magasin: ${deletedMagasin.nom} (Adresse: ${deletedMagasin.adresse})`,
        clientIp,
        { 
          action: 'DELETE_MAGASIN',
          deletedMagasin: {
            id:deletedMagasin.id,
            nom: deletedMagasin.nom,
            adresse: deletedMagasin.adresse
          }
        }
      );
    res.json({ message: 'Magasin supprimé' });
  } catch (error) {logger.error('magasin.controller', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

// Lister les magasins d'une structure
exports.getMagasinsByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }
    const magasins = await Magasin.findAll(
      {
        where: { code_structure },
        include: [
        { 
          model:db.Users,
          attributes: ['id', 'nom'],
          include: [{
            model: db.Role,
            attributes: ['id', 'nom']
          }]
        }
      ],
        order: [['createdAt', 'DESC']],
      },
      
  );
    res.json(magasins);
  } catch (error) {logger.error('magasin.controller', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des magasins' });
  }
};

// Lister les magasins d'une structure avec pagination
exports.getMagasinsByStructureBis = async (req, res) => {
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
      statut = ''
    } = req.query;

    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");

    if (!isAdminStructure) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Construction de la clause where
    const whereClause = { code_structure };

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { adresse: { [Op.like]: `%${search}%` } },
        { ville: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // 🔹 FILTRE PAR STATUT
    if (statut && statut !== 'tous') {
      whereClause.statut = statut;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    const { count, rows } = await Magasin.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: db.Users,
          attributes: ['id', 'nom'],
          include: [{
            model: db.Role,
            attributes: ['id', 'nom']
          }]
        }
      ],
      order: [['nom', 'ASC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);logger.log('magasin.controller', `📦 Magasins: ${count} trouvés, page ${page}/${totalPages}`);

    res.json({
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

  } catch (error) {logger.error('magasin.controller', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des magasins',
      error: error.message 
    });
  }
};

// Obtenir un magasin spécifique
exports.getMagasinById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    res.json(magasin);
  } catch (error) {logger.error('magasin.controller', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du magasin' });
  }
};
// Obtenir tous les magasins
exports.getAllMagasins = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const magasins = await Magasin.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json(magasins);
  } catch (error) {logger.error('magasin.controller', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des magasins' });
  }
};


// Mettre à jour le statut d’un magasin
exports.updateStatutMagasin = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;
    const { statut } = req.body;

    const magasin = await Magasin.findByPk(id, { transaction });

    if (!magasin) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Magasin non trouvé' });
    }

    const ancienStatut = magasin.statut;
    // 1️⃣ Mise à jour du magasin
    await magasin.update({ statut }, { transaction });

    // Compter les utilisateurs avant mise à jour
    const nbUtilisateurs = await User.count({
      where: { magasinId: magasin.id },
      transaction
    });
    // 2️⃣ Mise à jour des utilisateurs du magasin
    await User.update(
      { status:statut },
      {
        where: {
          magasinId: magasin.id
        },
        transaction
      }
    );

     // Enregistrement de l'historique
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification du statut du magasin "${magasin.nom}" (${ancienStatut ? 'Actif' : 'Inactif'} → ${statut ? 'Actif' : 'Inactif'}) - ${nbUtilisateurs} utilisateur(s) impacté(s)`,
      clientIp,
      {
        action: 'UPDATE_MAGASIN_STATUS',
        magasinId: magasin.id,
        magasinNom: magasin.nom,
        ancienStatut: ancienStatut,
        nouveauStatut: statut,
        utilisateursImpactes: nbUtilisateurs
      }
    );
    await transaction.commit();

    res.status(200).json({
      message: 'Statut du magasin et des utilisateurs mis à jour avec succès',
      magasin
    });

  } catch (err) {
    await transaction.rollback();logger.error('magasin.controller', err);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du statut du magasin'
    });
  }
};
  