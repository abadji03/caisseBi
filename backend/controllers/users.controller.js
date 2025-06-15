const db = require('../models');
const bcrypt = require('bcrypt');
const User = db.Users;

// Créer un nouvel utilisateur
/* exports.create = async (req, res) => {
  try {
    let data = req.body;

    // Si un mot de passe est fourni, on le hache
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const user = await User.create(data);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; */
exports.create = async (req, res) => {
  try {
    const data = req.body;

    // Vérifie si l'utilisateur existe déjà par email
    const existingUser = await User.findOne({ where: { email: data.email } });

    if (existingUser) {
      return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà." });
    }

    // Si un mot de passe est fourni, on le hache
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const user = await User.create(data);
    res.status(201).json(user);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la création de l'utilisateur.", error: error.message });
  }
};


// Récupérer tous les utilisateurs
exports.findAll = async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']] 
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un utilisateur par ID
exports.findOne = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour un utilisateur
exports.update = async (req, res) => {
  try {
    let data = req.body;

    // Vérifie si un nouveau mot de passe est fourni
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const [updated] = await User.update(data, {
      where: { id: req.params.id }
    });

    if (updated) {
      const updatedUser = await User.findByPk(req.params.id);
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un utilisateur
exports.delete = async (req, res) => {
  try {
    const deleted = await User.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Utilisateur supprimé' });
    } else {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer les utilisateurs par code_structure
exports.findByStructure = async (req, res) => {
  try {
    const { code_structure } = req.params;

    const users = await User.findAll({
      where: { code_structure },
      order: [['createdAt', 'DESC']] 
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
