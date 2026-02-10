const db = require('../models');
const MouvementStock = db.MouvementStock;

//Créer un mouvement de stock
exports.createMouvementStock = async (req, res) => {
  console.log(req.body);
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
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
    const mouvements = await MouvementStock.findAll({
      where: whereClause,
      include: [
        { model: db.Magasin, attributes: ["id", "nom", "telephone", "email"] },
        { model: db.Users, attributes: ["id", "nom"] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(mouvements);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
};
