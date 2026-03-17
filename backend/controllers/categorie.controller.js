const db = require('../models');
const Categorie = db.Categorie;
const { Op, ValidationError, UniqueConstraintError } = require('sequelize');


exports.createCategorie = async (req, res) => {
  try {

    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    console.log('📝 Création catégorie - Données reçues:', req.body);
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

    const categorie = await Categorie.create({ code_structure, name, description, type,isActive });

    console.log('Catégorie créée:', categorie.id);
    res.status(201).json(categorie);
  } catch (error) {
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

exports.getAllByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;
    const categories = await Categorie.findAll({
      where: { 
        code_structure,
        isActive: true
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
    let whereClause = { 
      code_structure: code_structure
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
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Catégories: ${count} trouvées, page ${page}/${totalPages}`);

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

  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({ 
      message: 'Erreur de récupération des catégories', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

exports.updateCategorie = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { id } = req.params;
    const { name, description, type } = req.body;

    const categorie = await Categorie.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable' });

    categorie.name = name;
    categorie.description = description;
    categorie.type = type;

    await categorie.save();

    res.json(categorie);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de mise à jour', error });
  }
};

exports.toggleActive = async (req, res) => {
  try {

    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { id } = req.params;

    const categorie = await Categorie.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie introuvable' });

    categorie.isActive = !categorie.isActive;
    await categorie.save();

    res.json({ message: 'Statut modifié', isActive: categorie.isActive });
  } catch (error) {
    res.status(500).json({ message: 'Erreur de modification du statut', error });
  }
};

exports.deleteCategorie = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;

    const deleted = await Categorie.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Catégorie non trouvée' });

    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};
