const db = require("../models");
const Client = db.Client;

//Créer un client
exports.createClient = async (req, res) => {
  const { email, telephone } = req.body;

  try {
    // Vérifie s'il existe un client avec le même email ou téléphone
    const existingClient = await Client.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { email: email || null },
          { telephone: telephone || null }
        ]
      }
    });

    if (existingClient) {
      return res.status(409).json({
        message: "Un client avec cet email ou numéro de téléphone existe déjà",
        existingClient
      });
    }

    // Créer le client s'il n'existe pas
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création du client",
      error: error.message || error
    });
  }
};

//Mettre à jour un client
exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    await client.update({ ...req.body, dateMiseAJour: new Date() });
    res.json({ message: "Client mis à jour", client });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
};

//Supprimer un client
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    await client.destroy();
    res.json({ message: "Client supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error });
  }
};

//Obtenir un client par ID
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération", error });
  }
};

//Obtenir tous les clients d'une structure
exports.getClientsByStructure = async (req, res) => {
  try {
    const clients = await Client.findAll({
      where: { code_structure: req.params.code_structure },
      order: [['createdAt', 'DESC']]
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération", error });
  }
};

//Mettre à jour le statut (activer/désactiver)
exports.updateClientStatut = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    await client.update({ statut: req.body.statut, dateMiseAJour: new Date() });
    res.json({ message: "Statut mis à jour", client });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour du statut", error });
  }
};

//Mettre à jour le plafond
exports.updateClientPlafond = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    await client.update({ plafond: req.body.plafond, dateMiseAJour: new Date() });
    res.json({ message: "Plafond mis à jour", client });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour plafond", error });
  }
};

//Mettre à jour le solde
exports.updateClientSolde = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    await client.update({ solde: req.body.solde, dateMiseAJour: new Date() });
    res.json({ message: "Solde mis à jour", client });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour solde", error });
  }
};

//Mettre à jour le montant à payer
exports.updateMontantANousPayer = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    await client.update({ montantANousPayer: req.body.montantANousPayer, dateMiseAJour: new Date() });
    res.json({ message: "Montant à payer mis à jour", client });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour montant à payer", error });
  }
};
