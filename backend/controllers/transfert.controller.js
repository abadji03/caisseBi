const db = require('../models');
const Transfert = db.Transfert;

exports.createTransfert = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const {
      code_structure,
      produitId,
      quantite,
      magasinSource,
      magasinDestination,
      motif,
      agentResponsable,
    } = req.body;

    const reference = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const transfert = await Transfert.create({
      code_structure,
      produitId,
      quantite,
      magasinSource,
      magasinDestination,
      motif,
      agentResponsable,
      reference,
    });

    res.status(201).json(transfert);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création du transfert', error: err });
  }
};

exports.validerTransfert = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;
    const { agentValidation, mouvementSortieId, mouvementEntreeId } = req.body;

    const transfert = await Transfert.findByPk(id);
    if (!transfert) return res.status(404).json({ message: 'Transfert introuvable' });

    transfert.statut = 'Validé';
    transfert.dateValidation = new Date();
    transfert.agentValidation = agentValidation;
    transfert.mouvementSortieId = mouvementSortieId;
    transfert.mouvementEntreeId = mouvementEntreeId;

    await transfert.save();

    res.json(transfert);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la validation du transfert', error: err });
  }
};

exports.listerParStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const transferts = await Transfert.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['dateTransfert', 'DESC']],
      include: [db.Produit, db.Magasin],
    });
    res.json(transferts);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération', error: err });
  }
};
