const db = require('../models');
const MouvementStock = db.MouvementStock;
const { Op} = db.Sequelize;


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
/* exports.getAllMouvementsStock = async (req, res) => {
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
}; */

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
/* exports.getMouvementsByStructure = async (req, res) => {
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
      code_structure: code_structure,
      statut:'validé'
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
 */

exports.getMouvementsByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const { code_structure } = req.params;
    
    // Récupération des paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      typeMouvement = '',
      // dateDebut = '',
      // dateFin = ''
    } = req.query;

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
      code_structure: code_structure,
      statut: 'validé'
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

    // 🔍 FILTRE DE RECHERCHE
    if (search) {
      whereClause[Op.or] = [
        { ref: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { '$Produit.designation$': { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par ID si c'est un nombre
      if (!isNaN(search)) {
        whereClause[Op.or].push({ id: { [Op.eq]: parseInt(search) } });
        whereClause[Op.or].push({ quantite: { [Op.eq]: parseFloat(search) } });
      }
    }

    // 🔍 FILTRE PAR TYPE DE MOUVEMENT
    if (typeMouvement && typeMouvement !== 'tous') {
      whereClause.typeMouvement = typeMouvement;
    }

    // 📅 FILTRE PAR DATE
    /* if (dateDebut && dateFin) {
      whereClause.dateMouvement = {
        [Op.between]: [new Date(dateDebut), new Date(dateFin)]
      };
    } else if (dateDebut) {
      whereClause.dateMouvement = {
        [Op.gte]: new Date(dateDebut)
      };
    } else if (dateFin) {
      whereClause.dateMouvement = {
        [Op.lte]: new Date(dateFin)
      };
    } */

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await MouvementStock.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: db.Magasin, 
          attributes: ["id", "nom", "telephone", "email"] 
        },
        { 
          model: db.Users, 
          attributes: ["id", "nom"] 
        },
        {
          model: db.Produit,
          attributes: ["id", "designation", "unite"]
        }
      ],
      order: [['dateMouvement', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Mouvements: ${count} trouvés, page ${page}/${totalPages}`);

    // Réponse avec pagination
    res.status(200).json({
      mouvements: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: totalPages,
        limit: limitInt,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Erreur getMouvementsByStructure:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération', 
      error: error.message 
    });
  }
};
// Mettre à jour le statut d'une reconciliation
exports.updateStatut = async (req, res) => {
  try {
    const authUser = req.user; // utilisateur connecté

    if (!authUser) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const mvt = await MouvementStock.findByPk(req.params.id);
    if (!mvt) return res.status(404).json({ message: 'Mouvement non trouvé' });

    const { statut } = req.body;
    /* if (typeof statut !== 'boolean')
      return res.status(400).json({ message: 'Le statut doit être un booléen' }); */

    await mvt.update({ statut });
    res.json(mvt);
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour du statut', error });
  }
};
