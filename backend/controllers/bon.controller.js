/* // controllers/bonController.js
const db = require('../models');
const Bon = db.Bon;

exports.createBon = async (req, res) => {
  try {
    const bon = await Bon.create(req.body);
    res.status(201).json(bon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les bons d'une structure
exports.getBonsByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const bons = await Bon.findAll({
      where: { code_structure },
      order: [['createdAt', 'DESC']],
    });
    res.json(bons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des bons' });
  }
};

exports.getAllBons = async (req, res) => {
  try {
    const bons = await Bon.findAll({
      include: ['Fournisseur', 'Client', 'User', 'Magasin'],
    });
    res.json(bons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBonById = async (req, res) => {
  try {
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
    res.json(bon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBon = async (req, res) => {
  try {
    const [updated] = await Bon.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Bon non trouvé' });
    const bon = await Bon.findByPk(req.params.id);
    res.json(bon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBon = async (req, res) => {
  try {
    const deleted = await Bon.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Bon non trouvé' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
 */
// controllers/bonController.js
const db = require('../models');
const Bon = db.Bon;

exports.createBon = async (req, res) => {
  try {
    const bon = await Bon.create(req.body);
    return res.status(201).json(bon);
  } catch (error) {
    console.error('Erreur création bon:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Lister les bons d'une structure
exports.getBonsByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const bons = await Bon.findAll({
      where: { code_structure },
      order: [['createdAt', 'DESC']],
    });
    return res.json(bons);
  } catch (error) {
    console.error('Erreur récupération bons par structure:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des bons' });
  }
};

// Lister tous les bons avec associations
exports.getAllBons = async (req, res) => {
  try {
    const bons = await Bon.findAll({
      include: [
        { model: db.Fournisseur, as: 'Fournisseur' },
        { model: db.Client, as: 'Client' },
        { model: db.User, as: 'User' },
        { model: db.Magasin, as: 'Magasin' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json(bons);
  } catch (error) {
    console.error('Erreur récupération tous les bons:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Récupérer un bon par ID
exports.getBonById = async (req, res) => {
  try {
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
    return res.json(bon);
  } catch (error) {
    console.error('Erreur récupération bon par ID:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Mettre à jour un bon
exports.updateBon = async (req, res) => {
  try {
    const [updated] = await Bon.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Bon non trouvé' });
    const bon = await Bon.findByPk(req.params.id);
    return res.json(bon);
  } catch (error) {
    console.error('Erreur update bon:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Supprimer un bon
exports.deleteBon = async (req, res) => {
  try {
    const deleted = await Bon.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Bon non trouvé' });
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression bon:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStatutBon = async (req, res) => {
  try {
    const { statutBon } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.statutBon = statutBon;
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update statutBon:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateResteAPayer = async (req, res) => {
  try {
    const { montant } = req.body; // montant payé
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.resteAPayer = parseFloat(bon.resteAPayer) - parseFloat(montant);

    // Auto-ajustement du statut si payé
    if (bon.resteAPayer <= 0) {
      bon.resteAPayer = 0;
      bon.statutBon = 'payé';
    }

    await bon.save();
    return res.json(bon);
  } catch (error) {
    console.error('Erreur update resteAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateNetAPayer = async (req, res) => {
  try {
    const { remise } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.remise = remise;
    bon.netAPayer = parseFloat(bon.montantTotal) - parseFloat(remise);
    bon.resteAPayer = bon.netAPayer; // réinitialiser le reste dû

    await bon.save();
    return res.json(bon);
  } catch (error) {
    console.error('Erreur update netAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateFichier = async (req, res) => {
  try {
    const { fichier } = req.body; // chemin ou base64
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.fichier = fichier;
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update fichier:', error);
    return res.status(500).json({ error: error.message });
  }
};
exports.updateMotifsRetour = async (req, res) => {
  try {
    const { motifsRetour } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.motifsRetour = motifsRetour;
    bon.statutBon = 'retourné';
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update motifsRetour:', error);
    return res.status(500).json({ error: error.message });
  }
};
