const db = require("../models");
const Client = db.Client;

exports.createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du client", error });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });

    await client.update(req.body);
    res.json({ message: "Client mis à jour", client });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour", error });
  }
};

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

exports.getClientsByStructure = async (req, res) => {
  try {
    const clients = await Client.findAll({
      where: { code_structure: req.params.code_structure }
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération", error });
  }
};
