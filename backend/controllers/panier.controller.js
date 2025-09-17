/* // controllers/panierController.js
const db = require('../models');
const Panier = db.Panier;

exports.createPanier = async (req, res) => {
  try {
    const panier = await Panier.create(req.body);
    res.status(201).json(panier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les magasins d'une structure
exports.getPaniersByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const paniers = await Panier.findAll({
      where: { code_structure },
      order: [['createdAt', 'DESC']],
    });
    res.json(paniers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des paniers' });
  }
};

exports.getAllPaniers = async (req, res) => {
  try {
    const paniers = await Panier.findAll({
      include: ['Client', 'Bon', 'Magasin', 'User'],
    });
    res.json(paniers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPanierById = async (req, res) => {
  try {
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    res.json(panier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePanier = async (req, res) => {
  try {
    const [updated] = await Panier.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Panier non trouvé' });
    const panier = await Panier.findByPk(req.params.id);
    res.json(panier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deletePanier = async (req, res) => {
  try {
    const deleted = await Panier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Panier non trouvé' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
 */

// controllers/panierController.js
const db = require('../models');
const Panier = db.Panier;

exports.createPanier = async (req, res) => {
  try {
    const panier = await Panier.create(req.body);
    return res.status(201).json(panier);
  } catch (error) {
    console.error('Erreur création panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Lister les paniers d'une structure
exports.getPaniersByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;
    const paniers = await Panier.findAll({
      where: { code_structure },
      order: [['createdAt', 'DESC']],
    });
    return res.json(paniers);
  } catch (error) {
    console.error('Erreur récupération paniers par structure:', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des paniers' });
  }
};

// Lister tous les paniers avec associations
exports.getAllPaniers = async (req, res) => {
  try {
    const paniers = await Panier.findAll({
      include: [
        { model: db.Client, as: 'Client' },
        { model: db.Bon, as: 'Bon' },
        { model: db.Magasin, as: 'Magasin' },
        { model: db.User, as: 'User' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json(paniers);
  } catch (error) {
    console.error('Erreur récupération tous les paniers:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Récupérer un panier par ID
exports.getPanierById = async (req, res) => {
  try {
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });
    return res.json(panier);
  } catch (error) {
    console.error('Erreur récupération panier par ID:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Mettre à jour un panier
exports.updatePanier = async (req, res) => {
  try {
    req.body.dateMiseAJour = new Date(); // maj auto de la date
    const [updated] = await Panier.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) return res.status(404).json({ message: 'Panier non trouvé' });
    const panier = await Panier.findByPk(req.params.id);
    return res.json(panier);
  } catch (error) {
    console.error('Erreur update panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Supprimer un panier
exports.deletePanier = async (req, res) => {
  try {
    const deleted = await Panier.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Panier non trouvé' });
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStatutPanier = async (req, res) => {
  try {
    const { statut } = req.body;
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.statut = statut;
    panier.dateMiseAJour = new Date();
    await panier.save();

    return res.json(panier);
  } catch (error) {
    console.error('Erreur update statut panier:', error);
    return res.status(500).json({ error: error.message });
  }
};


exports.updateTotauxPanier = async (req, res) => {
  try {
    const { totalHT, tva } = req.body;
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.totalHT = parseFloat(totalHT);
    panier.tva = parseFloat(tva);
    panier.totalTTC = panier.totalHT + panier.tva;
    panier.dateMiseAJour = new Date();

    await panier.save();
    return res.json(panier);
  } catch (error) {
    console.error('Erreur update totaux panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateDetailsVisible = async (req, res) => {
  try {
    const { visible } = req.body; // true ou false
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.detailsVisible = visible;
    panier.dateMiseAJour = new Date();
    await panier.save();

    return res.json(panier);
  } catch (error) {
    console.error('Erreur update detailsVisible panier:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.resetPanier = async (req, res) => {
  try {
    const panier = await Panier.findByPk(req.params.id);
    if (!panier) return res.status(404).json({ message: 'Panier non trouvé' });

    panier.totalHT = 0;
    panier.tva = 0;
    panier.totalTTC = 0;
    panier.statut = 'EN_COURS';
    panier.dateMiseAJour = new Date();

    await panier.save();
    return res.json(panier);
  } catch (error) {
    console.error('Erreur reset panier:', error);
    return res.status(500).json({ error: error.message });
  }
};


