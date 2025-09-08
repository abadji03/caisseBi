/* const db = require("../models");
const Reconciliation = db.Reconciliation;

exports.createReconciliation = async (req, res) => {
  try {
    const { code_structure, produitId, stockTheorique, stockPhysique, responsable, note } = req.body;

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);

    const reconciliation = await Reconciliation.create({
      code_structure,
      produitId,
      stockTheorique,
      stockPhysique,
      ecart,
      responsable,
      note
    });

    res.status(201).json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la réconciliation", error: err });
  }
};

exports.getReconciliationsByStructure = async (req, res) => {
  try {
    const reconciliations = await Reconciliation.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['dateReconciliation', 'DESC']],
      include: [{ model: db.Produit }]
    });

    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: err });
  }
};
 */

const db = require('../models');
const Reconciliation = db.Reconciliation;
const Produit = db.Produit; // Assure-toi que l'association a été définie (Reconciliation.belongsTo(Produit))

//Créer une réconciliation
exports.createReconciliation = async (req, res) => {
  try {
    const { code_structure, produitId, stockTheorique, stockPhysique, responsable, note } =
      req.body;

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);

    const reconciliation = await Reconciliation.create({
      code_structure,
      produitId,
      stockTheorique,
      stockPhysique,
      ecart,
      responsable,
      note,
    });

    res.status(201).json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la réconciliation', error: err.message });
  }
};

//Récupérer toutes les réconciliations d'une structure
exports.getReconciliationsByStructure = async (req, res) => {
  try {
    const reconciliations = await Reconciliation.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['dateReconciliation', 'DESC']],
      include: [{ model: Produit }],
    });

    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: err.message });
  }
};

//Récupérer une réconciliation par ID
exports.getReconciliationById = async (req, res) => {
  try {
    const reconciliation = await Reconciliation.findByPk(req.params.id, {
      include: [{ model: Produit }],
    });

    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    res.json(reconciliation);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

//Mettre à jour une réconciliation
exports.updateReconciliation = async (req, res) => {
  try {
    const { stockTheorique, stockPhysique, responsable, note } = req.body;

    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    const ecart = parseFloat(stockPhysique) - parseFloat(stockTheorique);

    await reconciliation.update({
      stockTheorique,
      stockPhysique,
      ecart,
      responsable,
      note,
    });

    res.json({ message: 'Réconciliation mise à jour', reconciliation });
  } catch (err) {
    res.status(500).json({ message: 'Erreur mise à jour', error: err.message });
  }
};

//Supprimer une réconciliation
exports.deleteReconciliation = async (req, res) => {
  try {
    const reconciliation = await Reconciliation.findByPk(req.params.id);
    if (!reconciliation) {
      return res.status(404).json({ message: 'Réconciliation non trouvée' });
    }

    await reconciliation.destroy();
    res.json({ message: 'Réconciliation supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
};

//Récupérer toutes les réconciliations (admin/export)
exports.getAllReconciliations = async (req, res) => {
  try {
    const reconciliations = await Reconciliation.findAll({
      order: [['dateReconciliation', 'DESC']],
      include: [{ model: Produit }],
    });
    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ message: 'Erreur récupération', error: err.message });
  }
};

// Récupérer les réconciliations d’un produit
exports.getReconciliationsByProduit = async (req, res) => {
  try {
    const reconciliations = await Reconciliation.findAll({
      where: { produitId: req.params.produitId },
      order: [['dateReconciliation', 'DESC']],
      include: [{ model: Produit }],
    });

    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ message: 'Erreur récupération', error: err.message });
  }
};
