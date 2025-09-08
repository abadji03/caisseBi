const db = require('../models');
const Categorie = db.Categorie;

exports.createCategorie = async (req, res) => {
  try {
    const { code_structure, name, description, type } = req.body;

    const categorie = await Categorie.create({ code_structure, name, description, type });

    res.status(201).json(categorie);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création', error });
  }
};

exports.getAllByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const categories = await Categorie.findAll({
      where: { code_structure },
      order: [['name', 'ASC']],
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Erreur de récupération', error });
  }
};

exports.updateCategorie = async (req, res) => {
  try {
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
    const { id } = req.params;

    const deleted = await Categorie.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: 'Catégorie non trouvée' });

    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};
