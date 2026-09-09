/* const db = require("../models");
const Historique = db.HistoriqueReconciliation;

exports.create = async (req, res) => {
  try {
    const { reconciliationId, ecart, note } = req.body;

    const historique = await Historique.create({ reconciliationId, ecart, note });
    res.status(201).json(historique);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de l'historique", error });
  }
};

exports.findByReconciliation = async (req, res) => {
  try {
    const { reconciliationId } = req.params;
    const data = await Historique.findAll({
      where: { reconciliationId },
      order: [["date", "DESC"]]
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération", error });
  }
};
 */

const db = require('../models');
const { verifierAppartenanceStructure } = require('../services/verification.service');
const Historique = db.HistoriqueReconciliation;

// Créer un historique
exports.create = async (req, res) => {
  try {
    const { reconciliationId, ecart, note } = req.body;

    const historique = await Historique.create({
      reconciliationId,
      // Identifiant dérivé de l'utilisateur authentifié — jamais du client
      code_structure: req.user.code_structure ?? req.body.code_structure,
      ecart,
      note,
    });

    res.status(201).json(historique);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création de l'historique", error });
  }
};

// Récupérer tous les historiques d'une réconciliation
exports.findByReconciliation = async (req, res) => {
  try {
    const { reconciliationId } = req.params;

    const data = await Historique.findAll({
      where: { reconciliationId },
      order: [['date', 'DESC']],
      include: [{ model: db.Reconciliation }],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error });
  }
};

// Récupérer tous les historiques d'une structure
exports.findByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;

    const data = await Historique.findAll({
      where: { code_structure },
      order: [['date', 'DESC']],
      include: [{ model: db.Reconciliation }],
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération par structure', error });
  }
};

// Récupérer un historique par ID
exports.findById = async (req, res) => {
  try {
    const { id } = req.params;

    const historique = await Historique.findByPk(id, {
      include: [{ model: db.Reconciliation }],
    });

    if (!historique) {
      return res.status(404).json({ message: 'Historique non trouvé' });
    }

    const verif = verifierAppartenanceStructure(historique, req.user);
    if (!verif.ok) return res.status(verif.statut).json({ message: verif.message });

    res.json(historique);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération par ID', error });
  }
};

// Mettre à jour un historique
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const historique = await Historique.findByPk(id);
    if (!historique) {
      return res.status(404).json({ message: 'Historique non trouvé' });
    }

    const verif = verifierAppartenanceStructure(historique, req.user);
    if (!verif.ok) return res.status(verif.statut).json({ message: verif.message });

    await historique.update(req.body);
    res.json({ message: 'Historique mis à jour avec succès', historique });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error });
  }
};

// Supprimer un historique
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const historique = await Historique.findByPk(id);
    if (!historique) {
      return res.status(404).json({ message: 'Historique non trouvé' });
    }

    const verif = verifierAppartenanceStructure(historique, req.user);
    if (!verif.ok) return res.status(verif.statut).json({ message: verif.message });

    await historique.destroy();
    res.json({ message: 'Historique supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};
