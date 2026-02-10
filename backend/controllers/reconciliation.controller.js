const db = require('../models');
const Reconciliation = db.Reconciliation;
const Produit = db.Produit; // Assure-toi que l'association a été définie (Reconciliation.belongsTo(Produit))

//Créer une réconciliation
exports.createReconciliation = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

    if (!isAdminStructure && !isGerant) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && isGerant) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;
    }
    const reconciliations = await Reconciliation.findAll({
      where: whereClause,
      include: [
        { model: Produit,attributes: ["id", "designation", "unite", "prixAchatUnitaire"] },
        { model: db.Users, attributes: ["id", "nom"] }
    ],
      order: [['createdAt', 'DESC']],
    });

    res.json(reconciliations);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: err.message });
  }
};

//Récupérer une réconciliation par ID
exports.getReconciliationById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
