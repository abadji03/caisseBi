const logger = require('../services/logger.js');
// controllers/structure.controller.js
const db = require('../models');
const Structure = db.Structure;
const { Op } = require('sequelize');
const User = db.Users;
const Role = db.Role;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const HistoriqueService = require('../services/historique.service');

//Fonction utilitaire pour générer un code unique basé sur le nom
/* function generateCodeStructure(nom) {
  const sanitized = nom
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Garde lettres et chiffres
  const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 caractères
  return `${sanitized.slice(0, 12)}-${shortCode}`; // Limite à 8 lettres du nom
} */

  function generateCodeStructure(nom) {
    const cleanName = nom
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);

    const uniquePart = crypto
      .createHash('sha256')
      .update(`${nom}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();

    return `${cleanName}-${uniquePart}`;
  }

  async function safeGenerateCodeStructure(nom, Structure) {
  let code;
  let exists = true;

  while (exists) {
    code = generateCodeStructure(nom);

    const found = await Structure.findOne({
      where: { code_structure: code }
    });

    exists = !!found;
  }

  return code;
}

const BASE_URL = 'http://localhost:5000/uploads/';

//Création d'une structure
exports.createStructure = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req); // Récupérer l'IP

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const {
      nom_structure,
      proprietaire,
      nombre_magasins,
      type_structure,
      devise,
      email,
      telephone,
      adresse,
      numero_identification_fiscale,
      registre_commerce,
      statut_juridique,
      banque,
      numero_compte,
      fournisseur_mobile_money,
      nombre_employes,
      responsable_administratif,
      horaires_ouverture,
      jours_fermeture,
      site_web,
      reseaux_sociaux,
      personne_confiance,
      assurances_souscrites,
      date_creation,
      description,
    } = req.body;

    // Vérifie si l'utilisateur existe déjà par email
    const existingStructure = await Structure.findOne({ where: { email } });

    if (existingStructure) {
      return res.status(400).json({ message: 'Une structure avec cet email existe déjà.' });
    }

    let logo = null;
    if (req.file) {
      logo = BASE_URL + req.file.filename;
    }

    //const logo = req.file ? req.file.filename : null;

    //const code_structure = generateCodeStructure(nom_structure); // On génère le code
    const code_structure = await safeGenerateCodeStructure(nom_structure, Structure);

    const structure = await Structure.create({
      code_structure, //Ajout dans la base
      nom_structure,
      proprietaire,
      nombre_magasins,
      type_structure,
      devise,
      email,
      telephone,
      adresse,
      numero_identification_fiscale,
      registre_commerce,
      statut_juridique,
      banque,
      numero_compte,
      fournisseur_mobile_money,
      nombre_employes,
      responsable_administratif,
      horaires_ouverture,
      jours_fermeture,
      site_web,
      reseaux_sociaux,
      personne_confiance,
      assurances_souscrites,
      date_creation,
      description,
      logo,
    });

    // ENREGISTRER L'HISTORIQUE DE CRÉATION DE STRUCTURE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Création de la structure: ${nom_structure} (Code: ${code_structure})`,
      clientIp,
      {
        action: 'CREATE_STRUCTURE',
        structureId: structure.id,
        structureData: {
          nom_structure,
          code_structure,
          type_structure,
          email,
          telephone
        }
      }
    );
    res.status(201).json(structure);
  } catch (err) {logger.error('structure.controller', err);
    res.status(500).json({ message: 'Erreur lors de la création de la structure.' });
  }
};


exports.getAllStructures = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const structures = await Structure.findAll({
      order: [['createdAt', 'DESC']],
    });
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const structuresWithLogoUrl = structures.map((struct) => {
      const structure = struct.toJSON(); // Convertit Sequelize instance en objet pur
      structure.logoUrl = structure.logo ? baseUrl + structure.logo : null;
      return structure;
    });

    res.status(200).json(structuresWithLogoUrl);
  } catch (err) {logger.error('structure.controller', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des structures.' });
  }
}; 

// Récupérer toutes les structures avec pagination et recherche
exports.getAllStructuresBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = 'tous'
    } = req.query;

    // Clause where pour la recherche
    const whereClause = {};

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { nom_structure: { [Op.like]: `%${search}%` } },
        { type_structure: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { telephone: { [Op.like]: `%${search}%` } },
        { adresse: { [Op.like]: `%${search}%` } }
      ];
    }

    // 🔹 FILTRE PAR STATUT
    if (statut !== 'tous') {
      whereClause.estActive = statut === 'actif';
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Structure.findAndCountAll({
      where: whereClause,
      order: [['nom_structure', 'ASC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const structuresWithLogoUrl = rows.map((struct) => {
      const structure = struct.toJSON();
      structure.logoUrl = structure.logo ? baseUrl + structure.logo : null;
      return structure;
    });logger.log('structure.controller', `📦 Structures: ${count} trouvées, page ${page}/${totalPages}`);

    res.status(200).json({
      items: structuresWithLogoUrl,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (err) {logger.error('structure.controller', 'Erreur récupération structures:', err);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des structures.',
      error: err.message 
    });
  }
};

exports.getStructureById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const structure = await Structure.findByPk(req.params.id);

    if (!structure) {
      return res.status(404).json({ message: 'Structure non trouvée' });
    }

    const structureData = structure.toJSON();
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    structureData.logoUrl = structureData.logo ? baseUrl + structureData.logo : null;

    res.status(200).json(structureData);
  } catch (err) {logger.error('structure.controller', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de la structure.' });
  }
};

exports.getStructureByCodeStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const structure = await Structure.findOne( {where: { code_structure: req.params.code_structure }});

    if (!structure) {
      return res.status(404).json({ message: 'Structure non trouvée' });
    }

    const structureData = structure.toJSON();
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    structureData.logoUrl = structureData.logo ? baseUrl + structureData.logo : null;

    res.status(200).json(structureData);
  } catch (err) {logger.error('structure.controller', err);
    res.status(500).json({ message: 'Erreur lors de la récupération de la structure.' });
  }
};

//Modification d'une structure
exports.updateStructure = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const structure = await Structure.findByPk(id); // Cherche la structure par son ID

    if (!structure) return res.status(404).json({ message: 'Structure non trouvée' });

    // Sauvegarder les anciennes données pour l'historique
    const oldData = {
      nom_structure: structure.nom_structure,
      type_structure: structure.type_structure,
      email: structure.email,
      telephone: structure.telephone,
      adresse: structure.adresse,
      estActive: structure.estActive
    };

    // Si nouveau logo, supprimer l'ancien
    if (req.file && structure.logo) {
      const oldPath = path.join('uploads', structure.logo); // Chemin de l’ancien fichier
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); // Suppression du fichier existant
    }

    const updatedData = { ...req.body }; // Copie les données envoyées dans la requête
    if (req.file) updatedData.logo = BASE_URL + req.file.filename; // Si nouveau fichier, on met à jour le champ logo

    await structure.update(updatedData); // Mise à jour dans la base

     // Analyser les changements
    const changes = {};
    if (oldData.nom_structure !== structure.nom_structure) {
      changes.nom_structure = { old: oldData.nom_structure, new: structure.nom_structure };
    }
    if (oldData.type_structure !== structure.type_structure) {
      changes.type_structure = { old: oldData.type_structure, new: structure.type_structure };
    }
    if (oldData.email !== structure.email) {
      changes.email = { old: oldData.email, new: structure.email };
    }
    if (oldData.telephone !== structure.telephone) {
      changes.telephone = { old: oldData.telephone, new: structure.telephone };
    }
    if (oldData.adresse !== structure.adresse) {
      changes.adresse = { old: oldData.adresse, new: structure.adresse };
    }
    if (req.file) changes.logo = 'modifié';

    // ENREGISTRER L'HISTORIQUE DE MODIFICATION
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Modification de la structure: ${structure.nom_structure} (Code: ${structure.code_structure})`,
      clientIp,
      {
        action: 'UPDATE_STRUCTURE',
        structureId: structure.id,
        changes: changes
      }
    );


    res.json({ message: 'Structure mise à jour', structure });
  } catch (err) {logger.error('structure.controller', err);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

//Suppression d'une structure
exports.deleteStructure = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const id = req.params.id;
    const structure = await Structure.findByPk(id); // Récupère la structure par ID

    if (!structure) return res.status(404).json({ message: 'Structure non trouvée' });

    // Sauvegarder les données avant suppression
    const structureData = {
      id: structure.id,
      nom_structure: structure.nom_structure,
      code_structure: structure.code_structure,
      type_structure: structure.type_structure,
      email: structure.email
    };

    // Supprimer le logo associé
    if (structure.logo) {
      const filePath = path.join('uploads', structure.logo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await structure.destroy(); // Supprime la structure de la base

    // ENREGISTRER L'HISTORIQUE DE SUPPRESSION
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Suppression de la structure: ${structureData.nom_structure} (Code: ${structureData.code_structure})`,
      clientIp,
      {
        action: 'DELETE_STRUCTURE',
        deletedStructure: structureData
      }
    );

    res.json({ message: 'Structure supprimée' });
  } catch (err) {logger.error('structure.controller', err);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

//Mettre àjour le status de la structure
exports.updateStructureStatus = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { id } = req.params;
    const { estActive } = req.body;

    const structure = await Structure.findByPk(id, { transaction });

    if (!structure) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Structure non trouvée' });
    }

    const oldStatus = structure.estActive;

    // 1️⃣ Mise à jour du statut de la structure
    await structure.update({ estActive }, { transaction });

    // 2️⃣ Mise à jour des utilisateurs liés à la structure
    const usersUpdated = await User.update(
      { status: estActive },
      {
        where: {
          code_structure: structure.code_structure,
          structure_id: structure.id
        },
        transaction
      }
    );

    await transaction.commit();

     // ENREGISTRER L'HISTORIQUE DE CHANGEMENT DE STATUT
    await HistoriqueService.enregistrerAction(
      authUser.id,
      `Changement de statut de la structure: ${structure.nom_structure} (Code: ${structure.code_structure}) - ${oldStatus ? 'Actif' : 'Inactif'} → ${estActive ? 'Actif' : 'Inactif'}`,
      clientIp,
      {
        action: 'UPDATE_STRUCTURE_STATUS',
        structureId: structure.id,
        oldStatus: oldStatus,
        newStatus: estActive,
        usersAffected: usersUpdated[0] // Nombre d'utilisateurs mis à jour
      }
    );
    res.status(200).json({
      message: 'Statut de la structure et des utilisateurs mis à jour avec succès',
      structure
    });

  } catch (err) {
    await transaction.rollback();logger.error('structure.controller', err);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du statut de la structure'
    });
  }
};

exports.getStructuresWithoutAdmin = async (req, res) => {
  try {
    const authUser = req.user;
    
    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    // Vérifier que l'utilisateur est admin général
    const isGeneralAdmin = authUser.roles?.some(r => r.nom === 'Administrateur Général');
    if (!isGeneralAdmin) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    
    // Récupérer le rôle "Administrateur"
    const adminRole = await Role.findOne({ 
      where: { nom: 'Administrateur' } 
    });
    
    if (!adminRole) {
      return res.status(500).json({ message: 'Rôle Administrateur non trouvé' });
    }
    
    // Récupérer les IDs des structures qui ont déjà un administrateur
    // Un administrateur est un utilisateur qui a le rôle "Administrateur"
    const usersWithAdminRole = await User.findAll({
      include: [{
        model: Role,
        where: { id: adminRole.id },
        through: { attributes: [] },
        required: true // S'assurer que l'utilisateur a bien ce rôle
      }],
      attributes: ['structure_id'],
      where: {
        structure_id: { [Op.ne]: null }, // structure_id non null
        code_structure: { [Op.ne]: null } // code_structure non null aussi
      },
      raw: true // Pour obtenir des objets simples
    });
    
    // Extraire les IDs des structures
    const structureIdsWithAdmin = usersWithAdminRole
      .map(user => user.structure_id)
      .filter(id => id !== null && id !== undefined);logger.log('structure.controller', 'Structures avec admin déjà existant:', structureIdsWithAdmin);
    
    // Récupérer toutes les structures
    const allStructures = await Structure.findAll({
      where: {
        id: { [Op.notIn]: structureIdsWithAdmin } // Exclure celles qui ont déjà un admin
      }
    });logger.log('structure.controller', 'Structures sans admin trouvées:', allStructures.length);
    
    res.status(200).json(allStructures);
    
  } catch (error) {logger.error('structure.controller', 'Erreur récupération structures sans admin:', error);
    res.status(500).json({ message: error.message });
  }
};
