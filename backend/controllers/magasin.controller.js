const db = require('../models');
const Magasin = db.Magasin;
const User = db.Users;
const {Op} = db.Sequelize;

// Créer un magasin
exports.createMagasin = async (req, res) => {
  try {
    const authUser = req.user;

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
    res.status(201).json(magasin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création du magasin' });
  }
};

// Modifier un magasin
exports.updateMagasin = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    await magasin.update(req.body);
    res.json({ message: 'Magasin mis à jour', magasin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

// Supprimer un magasin
exports.deleteMagasin = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: 'Magasin non trouvé' });

    await magasin.destroy();
    res.json({ message: 'Magasin supprimé' });
  } catch (error) {
    console.error(error);
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
            model: db.role,
            attributes: ['id', 'nom']
          }]
        }
      ],
        order: [['createdAt', 'DESC']],
      },
      
  );
    res.json(magasins);
  } catch (error) {
    console.error(error);
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

    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");

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
            model: db.role,
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
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Magasins: ${count} trouvés, page ${page}/${totalPages}`);

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

  } catch (error) {
    console.error(error);
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
  } catch (error) {
    console.error(error);
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des magasins' });
  }
};

//Mettre àjour le status de la structure

// Mettre à jour le statut d’un magasin
exports.updateStatutMagasin = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const authUser = req.user;

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

    // 1️⃣ Mise à jour du magasin
    await magasin.update({ statut }, { transaction });

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

    await transaction.commit();

    res.status(200).json({
      message: 'Statut du magasin et des utilisateurs mis à jour avec succès',
      magasin
    });

  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du statut du magasin'
    });
  }
};
  