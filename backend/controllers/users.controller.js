const db = require('../models');
const bcrypt = require('bcrypt');
const User = db.Users;
const Role = db.role;
const { Op } = require('sequelize'); // ✅ Op maintenant disponible
// Créer un nouvel utilisateur

exports.create = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const data = req.body;

    // Vérifie si l'utilisateur existe déjà par email
    const existingUser = await User.findOne({ where: { email: data.email } });

    if (existingUser) {
      return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà.' });
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
    res
      .status(500)
      .json({ message: "Erreur lors de la création de l'utilisateur.", error: error.message });
  }
};

// Récupérer tous les utilisateurs

exports.findAll = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    // Déterminer si c'est un admin général
    const isGeneralAdmin =
      authUser.structure_id === null &&
      authUser.code_structure === null &&
      authUser.roles?.some(r => r.nom === 'Administrateur Général');

    let whereClause = {};
    let roleWhere = {};

    if (isGeneralAdmin) {
      // 🔹 Admin général → uniquement les admins des structures
      whereClause = {
        structure_id: { [Op.ne]: null } // utilisateur rattaché à une structure
      };
      roleWhere = {
        nom: 'Administrateur' // uniquement rôle Administrateur (pas Gérant, etc.)
      };
    } else {
      // 🔹 Admin de structure → tous les utilisateurs de SA structure
      whereClause = {
        structure_id: authUser.structure_id
      };
    }

    const users = await User.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Role,
          attributes: ['id', 'nom'],
          where: isGeneralAdmin ? roleWhere : undefined, // filtrer par rôle si admin général
          required: isGeneralAdmin // fait un INNER JOIN si on filtre par rôle
        }
      ]
    });

    res.json(users);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Récupérer un utilisateur par ID
exports.findOne = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
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
/* exports.update = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    let data = req.body;

    console.log('Données reçues pour mise à jour:', data); // Debug: voir les données reçues

    // Vérifie si un nouveau mot de passe est fourni
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }

    const [updated] = await User.update(data, {
      where: { id: req.params.id },
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
}; */

exports.update = async (req, res) => {
  try {
    console.log('=== DÉBUT UPDATE UTILISATEUR ===');
    console.log('ID utilisateur:', req.params.id);
    console.log('Données reçues:', req.body);
    console.log('Mot de passe reçu:', req.body.password ? 'OUI' : 'NON');
    
    const authUser = req.user;
    if (!authUser) {
      console.log('ERROR: Non authentifié');
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    let data = req.body;

    // Vérifie si un nouveau mot de passe est fourni
    if (data.password) {
      console.log('Hashage du mot de passe...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      console.log('Mot de passe hashé (début):', hashedPassword.substring(0, 20));
      data.password = hashedPassword;
    } else {
      console.log('Aucun mot de passe fourni');
    }

    console.log('Données à mettre à jour:', data);
    
    // OPTION 1: Utiliser update() standard
    const [updated] = await User.update(data, {
      where: { id: req.params.id },
    });

    console.log('Résultat update:', updated ? 'SUCCÈS' : 'ÉCHEC');

    if (updated) {
      // Récupérer l'utilisateur pour vérifier
      const updatedUser = await User.findByPk(req.params.id, {
        attributes: ['id', 'email', 'password', 'nom'] // Inclure password pour vérifier
      });
      
      console.log('Utilisateur après update:');
      console.log('- ID:', updatedUser.id);
      console.log('- Email:', updatedUser.email);
      console.log('- Nom:', updatedUser.nom);
      console.log('- Mot de passe présent:', updatedUser.password ? 'OUI' : 'NON');
      if (updatedUser.password) {
        console.log('- Longueur mot de passe:', updatedUser.password.length);
      }
      
      // Ne pas renvoyer le mot de passe hashé
      const userWithoutPassword = await User.findByPk(req.params.id, {
        attributes: { exclude: ['password'] }
      });
      
      res.json(userWithoutPassword);
    } else {
      console.log('ERROR: Utilisateur non trouvé');
      res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    console.log('=== FIN UPDATE UTILISATEUR ===');
  } catch (error) {
    console.error('ERROR dans update:', error);
    res.status(500).json({ message: error.message });
  }
};

// Supprimer un utilisateur
exports.delete = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const deleted = await User.destroy({
      where: { id: req.params.id },
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
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const { code_structure } = req.params;

    const users = await User.findAll({
      where: { code_structure },
      order: [['createdAt', 'DESC']],
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour uniquement le statut d'un fournisseur
exports.updateUserStatus = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const { status } = req.body;
    if (typeof status !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' });

    await user.update({ status });
    res.json({ message: 'Statut mis à jour avec succés', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};
