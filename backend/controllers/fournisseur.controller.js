const db = require("../models");
const Fournisseur = db.Fournisseur;

exports.createFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.create(req.body);
    res.status(201).json(fournisseur);
  } catch (error) {
    res.status(500).json({ message: "Erreur création fournisseur", error });
  }
};

exports.updateFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });

    await fournisseur.update(req.body);
    res.json({ message: "Fournisseur mis à jour", fournisseur });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
};

exports.deleteFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByPk(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });

    await fournisseur.destroy();
    res.json({ message: "Fournisseur supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error });
  }
};

exports.getFournisseursByStructure = async (req, res) => {
  try {
    const fournisseurs = await Fournisseur.findAll({
      where: { code_structure: req.params.code_structure }
    });
    res.json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération", error });
  }
};
