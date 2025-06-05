const db = require("../models");
const Magasin = db.Magasin;

// Créer un magasin
exports.createMagasin = async (req, res) => {
  try {
    const magasin = await Magasin.create(req.body);
    res.status(201).json(magasin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création du magasin" });
  }
};

// Modifier un magasin
exports.updateMagasin = async (req, res) => {
  try {
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: "Magasin non trouvé" });

    await magasin.update(req.body);
    res.json({ message: "Magasin mis à jour", magasin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

// Supprimer un magasin
exports.deleteMagasin = async (req, res) => {
  try {
    const id = req.params.id;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: "Magasin non trouvé" });

    await magasin.destroy();
    res.json({ message: "Magasin supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

// Lister les magasins d'une structure
exports.getMagasinsByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const magasins = await Magasin.findAll({ where: { code_structure } });
    res.json(magasins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des magasins" });
  }
};
// Obtenir un magasin spécifique
exports.getMagasinById = async (req, res) => {
  try {
    const { id } = req.params;
    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: "Magasin non trouvé" });

    res.json(magasin);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération du magasin" });
  }
};
// Mettre à jour le statut d’un magasin
exports.updateStatutMagasin = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;

    if (!["Actif", "Inactif"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide. Utilisez 'Actif' ou 'Inactif'" });
    }

    const magasin = await Magasin.findByPk(id);
    if (!magasin) return res.status(404).json({ message: "Magasin non trouvé" });

    magasin.statut = statut;
    magasin.derniereMiseAJour = new Date();
    await magasin.save();

    res.json({ message: "Statut mis à jour", magasin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut" });
  }
};
// Obtenir tous les magasins
exports.getAllMagasins = async (req, res) => {
  try {
    const magasins = await Magasin.findAll();
    res.json(magasins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la récupération des magasins" });
  }
};
