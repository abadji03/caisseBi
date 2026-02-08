const db = require('../models');
const Categorie = db.Categorie;
const { ValidationError, UniqueConstraintError } = require('sequelize');


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
