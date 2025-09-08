const db = require('../models');
const CategorieProduit = db.CategoriesProduits;

exports.createCategorie = async (req, res) => {
  try {
    const categorie = await CategorieProduit.create(req.body);
    res.status(201).json(categorie);
  } catch (error) {
    res.status(500).json({ message: 'Erreur création catégorie', error });
  }
};

exports.updateCategorie = async (req, res) => {
  try {
    const categorie = await CategorieProduit.findByPk(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    await categorie.update(req.body);
    res.json({ message: 'Catégorie mise à jour', categorie });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
};

exports.deleteCategorie = async (req, res) => {
  try {
    const categorie = await CategorieProduit.findByPk(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    await categorie.destroy();
    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur suppression', error });
  }
};
exports.getCategoriesById = async (req, res) => {
  try {
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
  try {
    const categorie = await CategorieProduit.findByPk(req.params.id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });

    const { statut } = req.body;

    if (typeof statut !== 'boolean') {
      return res.status(400).json({ message: 'Le statut doit être un booléen.' });
    }

    await categorie.update({ statut });
    res.json({ message: 'Statut mis à jour avec succès', categorie });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};
