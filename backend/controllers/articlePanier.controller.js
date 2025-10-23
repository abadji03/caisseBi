// controllers/articlePanierController.js
const db = require('../models');
const ArticlePanier = db.ArticlePanier;

exports.create = async (req, res) => {
  try {
    const article = await ArticlePanier.create(req.body);
    res.status(201).json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Créer plusieurs articles de panier en lot
exports.createBatch = async (req, res) => {
  try {
    const articles = req.body;
    
    // Validation des données
    if (!Array.isArray(articles)) {
      return res.status(400).json({ error: 'Le corps de la requête doit être un tableau d\'articles' });
    }

    // Validation de chaque article
    for (const article of articles) {
      if (!article.produitId || !article.quantite || !article.prixVenteUnitaire) {
        return res.status(400).json({ 
          error: 'Chaque article doit avoir produitId, quantite et prixVenteUnitaire' 
        });
      }
    }

    // Création en lot
    const createdArticles = await ArticlePanier.bulkCreate(articles, {
      returning: true,
      validate: true
    });

    res.status(201).json(createdArticles);
  } catch (err) {
    console.error('Erreur création batch articles:', err);
    res.status(500).json({ error: err.message });
  }
};


exports.findAll = async (req, res) => {
  try {
    const articles = await ArticlePanier.findAll({
      include: ['Panier', 'Produit', 'Stock'],
    });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.findById = async (req, res) => {
  try {
    const article = await ArticlePanier.findByPk(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article non trouvé' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const [updated] = await ArticlePanier.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Article non trouvé' });
    const article = await ArticlePanier.findByPk(req.params.id);
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await ArticlePanier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Article non trouvé' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lister les articles d'un panier d'une structure
exports.getArticlesPanierByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const paniers = await ArticlePanier.findAll({
      where: { code_structure },
      order: [['createdAt', 'DESC']],
    });
    return res.json(paniers);
  } catch (error) {
    console.error('Erreur récupération des articles des paniers par structure:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des articles' });
  }
};

// Supprimer un article spécifique d’un panier
exports.deleteArticleFromPanier = async (req, res) => {
  try {
    const { panierId, id } = req.params;

    if (!panierId || !id) {
      return res.status(400).json({ message: 'panierId et produitId sont requis' });
    }

    const deleted = await ArticlePanier.destroy({
      where: { panierId, id },
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Aucun article correspondant trouvé dans ce panier' });
    }

    res.status(200).json({ message: 'Article supprimé du panier avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l’article du panier:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression' });
  }
};
