const db = require('../models');
const MouvementStock = db.MouvementStock;

//Créer un mouvement de stock
exports.createMouvementStock = async (req, res) => {
  console.log(req.body);
  try {
    const mouvement = await MouvementStock.create(req.body);
    res.status(201).json({ message: 'Mouvement créé avec succès', mouvement });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: 'Erreur lors de la création du mouvement', error: error.message });
  }
};

//Récupérer tous les mouvements de stock
exports.getAllMouvementsStock = async (req, res) => {
  try {
    const mouvements = await MouvementStock.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json(mouvements);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la récupération des mouvements', error: error.message });
  }
};

//Récupérer un mouvement par ID
exports.getMouvementStockById = async (req, res) => {
  try {
    const mouvement = await MouvementStock.findByPk(req.params.id);
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    res.status(200).json(mouvement);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la récupération du mouvement', error: error.message });
  }
};

//Mettre à jour un mouvement
exports.updateMouvementStock = async (req, res) => {
  try {
    const mouvement = await MouvementStock.findByPk(req.params.id);
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }

    await mouvement.update(req.body);
    res.status(200).json({ message: 'Mouvement mis à jour', mouvement });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
};

//Supprimer un mouvement
exports.deleteMouvementStock = async (req, res) => {
  try {
    const mouvement = await MouvementStock.findByPk(req.params.id);
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }

    await mouvement.destroy();
    res.status(200).json({ message: 'Mouvement supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
};

// ✅ Récupérer tous les mouvements d'une structure donnée
exports.getMouvementsByStructure = async (req, res) => {
  try {
    const mouvements = await MouvementStock.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(mouvements);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
};
