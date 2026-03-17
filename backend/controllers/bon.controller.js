// controllers/bonController.js
const { Op } = require('sequelize');
const db = require('../models');
const Bon = db.Bon;
const fs = require('fs');
const path = require('path');
const Panier = db.Panier;
const ArticlePanier = db.ArticlePanier;
const Produit = db.Produit;
const User = db.Users;
const Fournisseur = db.Fournisseur;
const Client = db.Client;
const Magasin = db.Magasin;


const BASE_URL = 'http://localhost:5000/uploads/'; //url de l'emplacement des fichier à stocker

const {
  stockManager,
  reservationService,
  mouvementService,
  statutManager
} = require('./bonComplet');


exports.createBon = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bon = req.body;
    let fichier = null;
    if (req.file) {
      fichier = BASE_URL + req.file.filename;
    }

    const bonEnd = await Bon.create(
      ... bon,
      fichier
    );
    
    res.status(201).json(bonEnd);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les bons d'une structure
exports.getBonsByStructure = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bons = await Bon.findAll({
      where: { code_structure: req.params.code_structure },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model:Produit} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = bons.map((paiement) => {
      const bn = paiement.toJSON(); // Convertit Sequelize instance en objet pur
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      return bn;
    });

    res.status(200).json(bonsWithFichierUrl);

    //res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des bons', error:error.message });
  }
};
// Lister uniquement les bons clients d'une structure
exports.getBonsClientsByStructure = async (req, res) => {
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
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}
    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
        typeEntite: 'client'

    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;
    }
    const bons = await Bon.findAll({
      where: { 
        ...whereClause
      },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model: Produit,attributes: ['id', 'designation', 'unite']} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] },
        {model: Client, attributes: ['id', 'nomComplet'] },
        {model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = bons.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      // Ajouter le client directement dans l'objet pour faciliter l'accès
      bn.client = bn.Client;
      delete bn.Client;
      return bn;
    });

    res.status(200).json(bonsWithFichierUrl);

  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons clients', 
      error: error.message 
    });
  }
};

// Lister uniquement les bons clients d'une structure AVEC PAGINATION
exports.getBonsClientsByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      type = '',
      statut = ''
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
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      typeEntite: 'client'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;
    }

    // 🔍 FILTRE DE RECHERCHE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { numero: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        //{ '$Client.nomComplet$': { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { montantTotal: { [Op.eq]: parseFloat(search) } },
          { avance: { [Op.eq]: parseFloat(search) } },
          { resteAPayer: { [Op.eq]: parseFloat(search) } }
        );
      }
    }

    // 🔹 FILTRE PAR TYPE
    if (type && type !== 'tous') {
      whereClause.type = type;
    }

    // 🔹 FILTRE PAR STATUT
    if (statut && statut !== 'tous') {
      whereClause.statutBon = statut;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Bon.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: { model: Produit, attributes: ['id', 'designation', 'unite'] }
            }
          ],
        },
        { model: User, attributes: ['id', 'nom', 'email'] },
        { model: Client, attributes: ['id', 'nomComplet'] },
        { model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = rows.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      bn.client = bn.Client;
      delete bn.Client;
      return bn;
    });

    console.log(`📦 Bons clients: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: bonsWithFichierUrl,
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
    console.error("Erreur récupération bons clients:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons clients', 
      error: error.message 
    });
  }
};

// Lister uniquement les bons clients d'une structure AVEC PAGINATION
exports.getBonsFournisseursByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // Paramètres de pagination et recherche
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      type = '',
      statut = ''
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
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure,
      typeEntite: 'fournisseur'
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier n’est associé à aucun magasin"
        });
      }
      whereClause.magasinId = authUser.magasinId;
    }

    // 🔍 FILTRE DE RECHERCHE
    if (search && search.trim() !== '') {
      whereClause[Op.or] = [
        { numero: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        //{ '$Client.nomComplet$': { [Op.like]: `%${search}%` } }
      ];
      
      // Recherche par montant
      if (!isNaN(search)) {
        whereClause[Op.or].push(
          { montantTotal: { [Op.eq]: parseFloat(search) } },
          { avance: { [Op.eq]: parseFloat(search) } },
          { resteAPayer: { [Op.eq]: parseFloat(search) } }
        );
      }
    }

    // 🔹 FILTRE PAR TYPE
    if (type && type !== 'tous') {
      whereClause.type = type;
    }

    // 🔹 FILTRE PAR STATUT
    if (statut && statut !== 'tous') {
      whereClause.statutBon = statut;
    }

    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Bon.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: { model: Produit, attributes: ['id', 'designation', 'unite'] }
            }
          ],
        },
        { model: User, attributes: ['id', 'nom', 'email'] },
        { model: Fournisseur, attributes: ['id', 'nomComplet'] },
        { model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    // Calcul du nombre total de pages
    const totalPages = Math.ceil(count / limitInt);

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = rows.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      bn.fournisseur = bn.Fournisseur;
      delete bn.Fournisseur;
      return bn;
    });

    console.log(`📦 Bons clients: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: bonsWithFichierUrl,
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
    console.error("Erreur récupération bons clients:", error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons clients', 
      error: error.message 
    });
  }
};

// Lister uniquement les bons fournisseurs d'une structure
exports.getBonsFournisseursByStructure = async (req, res) => {
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
        typeEntite: 'fournisseur'

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
    const bons = await Bon.findAll({
      where: whereClause,
        include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model: Produit, attributes: ['id', 'designation', 'unite']} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] },
        {model: Fournisseur, attributes: ['id', 'nomComplet'] },
        {model: Magasin, attributes: ['id', 'nom'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const bonsWithFichierUrl = bons.map((bon) => {
      const bn = bon.toJSON();
      bn.fichierUrl = bn.fichier ? baseUrl + bn.fichier : null;
      // Ajouter le fournisseur directement dans l'objet pour faciliter l'accès
      bn.fournisseur = bn.Fournisseur;
      delete bn.Fournisseur;
      return bn;
    });

    res.status(200).json(bonsWithFichierUrl);

  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des bons fournisseurs', 
      error: error.message 
    });
  }
};
// Lister tous les bons avec associations
exports.getAllBons = async (req, res) => {
  try {
    const bons = await Bon.findAll({
      include: [
        { model: db.Fournisseur, as: 'Fournisseur' },
        { model: db.Client, as: 'Client' },
        { model: db.User, as: 'User' },
        { model: db.Magasin, as: 'Magasin' },
      ],
      order: [['createdAt', 'DESC']],
    });
    return res.json(bons);
  } catch (error) {
    console.error('Erreur récupération tous les bons:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Récupérer un bon par ID
exports.getBonById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    const bonData = bon.toJSON();
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    bonData.fichierUrl = bonData.fichier ? baseUrl + bonData.fichier : null;

    res.status(200).json(bonData);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du bon', error });
  }
};

// Mettre à jour un bon
exports.updateBon = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const bon = await Bon.findByPk(req.params.id);
    if (!bon) {
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    const updatedData = { ...req.body };
    
        // Si un nouveau fichier est envoyé
        if (req.file) {
          // Supprimer l'ancien fichier si il existe
          if (bon.fichier) {
            const oldPath = path.join('uploads', path.basename(bon.fichier)); // attention à ne pas concaténer l'URL complète
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
    
          // Mettre à jour le champ fichier avec la nouvelle URL
          updatedData.fichier = BASE_URL + req.file.filename;
        } else {
          // Sinon, conserver le fichier existant
          updatedData.fichier = bon.fichier;
        }
    
        await bon.update(updatedData);
        console.log('Bon mis à jour avec:', updatedData);
        res.json({ message: 'Bon mis à jour', bon });
      } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
      }
};

// Supprimer un bon
/* exports.deleteBon = async (req, res) => {
  try {
    const deleted = await Bon.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Bon non trouvé' });
    return res.status(204).send();
  } catch (error) {
    console.error('Erreur suppression bon:', error);
    return res.status(500).json({ error: error.message });
  }
}; */

// Supprimer un bon avec cascade
exports.deleteBon = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const bonId = req.params.id;
    
    // Trouver le bon avec son panier associé
    const bon = await Bon.findByPk(bonId, {
      include: [{
        model: Panier,
        as: 'Panier'
      }],
      transaction
    });
    
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bon non trouvé' });
    }

    // Si le bon a un fichier, le supprimer physiquement
    if (bon.fichier) {
      const nomFichier = path.basename(bon.fichier);
      const cheminFichier = path.join('uploads', nomFichier);
      
      if (fs.existsSync(cheminFichier)) {
        fs.unlinkSync(cheminFichier);
      }
    }

    // Supprimer en cascade dans l'ordre
    if (bon.Panier) {
      // 1. Supprimer les articles du panier
      await ArticlePanier.destroy({ 
        where: { panierId: bon.Panier.id }, 
        transaction 
      });
      
      // 2. Supprimer le panier
      await Panier.destroy({ 
        where: { id: bon.Panier.id }, 
        transaction 
      });
    }

    // 3. Supprimer les éventuels paiements associés
    await db.Paiement.destroy({ 
      where: { bonId: bonId }, 
      transaction 
    });

    // 4. Supprimer les historiques de statut
    await db.HistoriqueStatut.destroy({ 
      where: { bonId: bonId }, 
      transaction 
    });

    // 5. Supprimer le bon
    await Bon.destroy({ 
      where: { id: bonId }, 
      transaction 
    });

    await transaction.commit();
    return res.status(200).json({ message: 'Bon, panier et éléments associés supprimés avec succès' });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur suppression bon avec cascade:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateStatutBon = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { statutBon } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.statutBon = statutBon;
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update statutBon:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateTypeBon = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { type } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.type = type;
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update type:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateResteAPayer = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { montant } = req.body; // montant payé
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.resteAPayer = parseFloat(bon.resteAPayer) - parseFloat(montant);

    // Auto-ajustement du statut si payé
    if (bon.resteAPayer <= 0) {
      bon.resteAPayer = 0;
      bon.statutBon = 'payé';
    }

    await bon.save();
    return res.json(bon);
  } catch (error) {
    console.error('Erreur update resteAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateNetAPayer = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { remise } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.remise = remise;
    bon.netAPayer = parseFloat(bon.montantTotal) - parseFloat(remise);
    bon.resteAPayer = bon.netAPayer; // réinitialiser le reste dû

    await bon.save();
    return res.json(bon);
  } catch (error) {
    console.error('Erreur update netAPayer:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updateFichier = async (req, res) => {

  try {
      const authUser = req.user;

      if (!authUser) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const bon = await Bon.findByPk(req.params.id);
      if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });
  
      if (!req.file) return res.status(400).json({ message: 'Aucune fichier fournie' });
  
      // Supprimer l'ancienne image si elle existe
      if (bon.fichier) {
        const oldPath = path.join('uploads', path.basename(bon.fichier));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
  
      // Mettre à jour le fichier
      const nouvelleImageUrl = BASE_URL + req.file.filename;
      await bon.update({ fichier: nouvelleImageUrl });
  
      res.json({ message: 'Fichier du bon mis à jour', bon });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la mise à jour de l'image", error: error.message });
    }
  /* try {
    const { fichier } = req.body; // chemin ou base64
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.fichier = fichier;
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update fichier:', error);
    return res.status(500).json({ error: error.message });
  } */
};
exports.updateMotifsRetour = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { motifsRetour } = req.body;
    const bon = await Bon.findByPk(req.params.id);
    if (!bon) return res.status(404).json({ message: 'Bon non trouvé' });

    bon.motifsRetour = motifsRetour;
    bon.statutBon = 'retourné';
    await bon.save();

    return res.json(bon);
  } catch (error) {
    console.error('Erreur update motifsRetour:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ==========================================
// Lister les bons d'une structure par fournisseur
// ==========================================
exports.getBonsByFournisseur = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, fournisseurId } = req.params;

    const bons = await Bon.findAll({
      where: {
        code_structure: code_structure,
        fournisseurId: fournisseurId,
        statutBon: { [Op.ne]: 'brouillon' } //Exclut les bons dont le statut est "brouillon"

      },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model:Produit} 
            }
          ],
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ]
        
      ,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(bons);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des bons du fournisseur',
      error: error.message
    });
  }
};

// ==========================================
// Lister les bons d'une structure par client
// ==========================================
exports.getBonsByClient = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure, clientId } = req.params;

    const bons = await Bon.findAll({
      where: {
        code_structure: code_structure,
        clientId: clientId,
        statutBon: { [Op.ne]: 'brouillon' } //Exclut les bons dont le statut est "brouillon"

      },
      include: [
        {
          model: Panier,
          include: [
            {
              model: ArticlePanier,
              include: {model:Produit}
            }
          ]
        },
        {model: User, attributes: ['id', 'nom', 'email'] }
      ]
      ,
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(bons);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des bons du client',
      error: error.message
    });
  }
};

exports.uploadFichier = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { bonId } = req.body;

    if (!bonId) {
      // Supprimer le fichier uploadé car pas de bonId
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'ID du bon requis' });
    }

    // Vérifier que le bon existe
    const bon = await db.Bon.findByPk(bonId);
    if (!bon) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Bon non trouvé' });
    }

    // Construire l'URL du fichier
    const fichierUrl = BASE_URL + req.file.filename;

    // Mettre à jour le bon avec le chemin du fichier
    await bon.update({ fichier: fichierUrl });

    res.status(200).json({
      message: 'Fichier uploadé avec succès',
      fichier: {
        nom: req.file.originalname,
        url: fichierUrl,
        taille: req.file.size,
        type: req.file.mimetype
      },
      bon: {
        id: bon.id,
        numero: bon.numero
      }
    });

  } catch (error) {
    // En cas d'erreur, supprimer le fichier uploadé
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erreur upload fichier:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'upload du fichier',
      details: error.message 
    });
  }
};

// Supprimer un fichier
exports.supprimerFichier = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { bonId } = req.params;

    const bon = await db.Bon.findByPk(bonId);
    if (!bon || !bon.fichier) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Supprimer le fichier physique
    const nomFichier = path.basename(bon.fichier);
    const cheminFichier = path.join('uploads', nomFichier);
    
    if (fs.existsSync(cheminFichier)) {
      fs.unlinkSync(cheminFichier);
    }

    // Mettre à jour le bon
    await bon.update({ fichier: null });

    res.json({ message: 'Fichier supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
};

exports.createBonComplet = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { bon, panier, articles, paiement, code_structure, magasinId, agentId, fournisseurId, clientId, typeEntite } = req.body;
    
    // Validation
    if (!bon || !panier || !articles || !code_structure || !magasinId || !agentId || !typeEntite) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    let nouveauBon;
    let nouveauPanier;
    let articlesCrees;

    console.log(`Création bon - Type: ${bon.type}, Entité: ${typeEntite}, Statut: ${bon.statutBon}`);

    // ==============================
    // LOGIQUE SPÉCIFIQUE POUR LES BROUILLONS
    // ==============================
    
    if (bon.id) {
      // Mise à jour d'un bon existant
      nouveauBon = await db.Bon.findByPk(bon.id, { transaction });
      if (!nouveauBon) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Bon introuvable' });
      }
      
      // Préparer les données et mettre à jour le bon
      const bonData = await statutManager.preparerDonneesBon(bon, typeEntite, clientId, fournisseurId);
      await nouveauBon.update(bonData, { transaction });
      
      // Mettre à jour le panier
      nouveauPanier = await db.Panier.findOne({ where: { bonId: nouveauBon.id }, transaction });
      if (nouveauPanier) {
        await nouveauPanier.update({
          //...panier,
          totalHT: panier.totalHT || 0,
          tva: panier.tva || 0,
          totalTTC: panier.totalTTC || 0,
          statut: panier.statut || 'validé',
        }, { transaction });
        

        // 🔥 CORRECTION : Mettre à jour les articles existants au lieu de tout supprimer/recréer
        await this.mettreAJourArticlesExistants(nouveauPanier.id, articles, code_structure, transaction);
      }
        // Supprimer les anciens articles et créer les nouveaux
        /* await db.ArticlePanier.destroy({ where: { panierId: nouveauPanier.id }, transaction });
        
        articlesCrees = await db.ArticlePanier.bulkCreate(
          articles.map(article => ({ 
            ...article, 
            panierId: nouveauPanier.id, 
            code_structure 
          })),
          { transaction }
        );
      } */
      
      // Créer historique si le statut a changé
      if (bonData.statutBon && bonData.statutBon !== nouveauBon.statutBon) {
        await statutManager.creerHistoriqueStatut(
          nouveauBon.id,
          nouveauBon.statutBon,
          bonData.statutBon,
          agentId,
          'Mise à jour du statut du bon',
          code_structure,
          transaction
        );
      }
    } else {
      // ==============================
      // Création d'un NOUVEAU bon avec statut "brouillon"
      // ==============================
      const bonData = await statutManager.preparerDonneesBon(
        { ...bon, statutBon: 'brouillon' }, // Forcer le statut brouillon pour les nouveaux
        typeEntite, 
        clientId, 
        fournisseurId
      );
      
      // Créer le bon
      nouveauBon = await db.Bon.create(
        { 
          ...bonData, 
          code_structure, 
          magasinId, 
          agentId, 
          clientId, 
          fournisseurId, 
          typeEntite 
        },
        { transaction }
      );

      // Créer le panier avec statut "en_cours"
      nouveauPanier = await db.Panier.create(
        { 
          ...panier, 
          bonId: nouveauBon.id, 
          code_structure, 
          magasinId, 
          agentId, 
          clientId, 
          fournisseurId, 
          typeEntite: typeEntite,
          statut: 'en_cours' // Statut initial du panier
        },
        { transaction }
      );

      // Créer les articles (peut être vide pour un brouillon)
      articlesCrees = await db.ArticlePanier.bulkCreate(
        articles.map(article => ({ 
          ...article, 
          panierId: nouveauPanier.id, 
          code_structure 
        })),
        { transaction }
      );

      // Créer historique de création
      await statutManager.creerHistoriqueStatut(
        nouveauBon.id,
        'création',
        nouveauBon.statutBon,
        agentId,
        'Création du bon en brouillon',
        code_structure,
        transaction
      );
    }

    // ==============================
    // TRAITEMENT SELON LE STATUT FINAL
    // ==============================
    const statutFinal = nouveauBon.statutBon;
    
    // Si le bon passe de "brouillon" à "validé", traiter les impacts métier
    if (statutFinal === 'validé') {
      if (typeEntite === 'fournisseur') {
        await this.traiterBonFournisseur(nouveauBon, articles, magasinId, agentId, code_structure, transaction);
      } else if (typeEntite === 'client') {
        await this.traiterBonClient(nouveauBon, articles, magasinId, agentId, code_structure, transaction);
      }
    }

    // Créer paiement si avance et bon validé
    let paiementCree = null;
    if (paiement && nouveauBon.avance > 0 && statutFinal === 'validé') {
      paiementCree = await db.Paiement.create({ 
        ...paiement, 
        montant: nouveauBon.avance, 
        bonId: nouveauBon.id, 
        panierId: nouveauPanier.id, 
        code_structure, 
        magasinId, 
        date: new Date() 
      }, { transaction });
    }

    // Valider transaction
    await transaction.commit();
    
    res.status(201).json({
      message: 'Bon créé/mis à jour avec succès',
      bon: nouveauBon,
      panier: nouveauPanier,
      articles: articlesCrees,
      paiement: paiementCree,
      typeEntite: typeEntite
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur création bon complet:', error);
    res.status(500).json({ error: 'Erreur lors de la création du bon', details: error.message });
  }
};

// Méthode pour mettre à jour les articles existants
exports.mettreAJourArticlesExistants = async (panierId, nouveauxArticles, code_structure, transaction) => {
  try {
    // Récupérer les articles existants
    const articlesExistants = await db.ArticlePanier.findAll({
      where: { panierId },
      transaction
    });

    const resultats = [];

    // Pour chaque nouvel article
    for (const nouvelArticle of nouveauxArticles) {
      if (nouvelArticle.id) {
        //ARTICLE EXISTANT : Mettre à jour
        const articleExistant = articlesExistants.find(art => art.id === nouvelArticle.id);
        if (articleExistant) {
          await articleExistant.update({
            quantite: nouvelArticle.quantite,
            prixUnitaire: nouvelArticle.prixUnitaire,
            prixAchatUnitaire: nouvelArticle.prixAchatUnitaire,
            prixVenteUnitaire: nouvelArticle.prixVenteUnitaire
            // Ne pas mettre à jour l'ID ou produitId
          }, { transaction });
          resultats.push(articleExistant);
        }
      } else {
        //NOUVEL ARTICLE : Créer
        const articleCree = await db.ArticlePanier.create({
          ...nouvelArticle,
          panierId,
          code_structure
        }, { transaction });
        resultats.push(articleCree);
      }
    }

    //SUPPRIMER les articles qui n'existent plus dans la nouvelle liste
    const nouveauxIds = nouveauxArticles.map(art => art.id).filter(id => id);
    const articlesASupprimer = articlesExistants.filter(art => !nouveauxIds.includes(art.id));
    
    for (const articleASupprimer of articlesASupprimer) {
      await articleASupprimer.destroy({ transaction });
    }

    return resultats;

  } catch (error) {
    console.error('Erreur mise à jour articles:', error);
    throw error;
  }
};

// Nouvelle méthode pour gérer les changements de statut du panier
exports.changerStatutPanier = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { panierId, nouveauStatut, confirmation } = req.body;
    
    if (!panierId || !nouveauStatut) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Données incomplètes' });
    }

    const panier = await db.Panier.findByPk(panierId, { 
      include: [db.Bon],
      transaction 
    });

    if (!panier) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Panier introuvable' });
    }

    // Logique pour l'annulation avec confirmation
    if (nouveauStatut === 'annulé') {
      if (!confirmation) {
        await transaction.rollback();
        return res.status(200).json({ 
          demandeConfirmation: true,
          message: 'Voulez-vous vraiment annuler ce panier ? Cela supprimera également le bon associé.'
        });
      }
      
      // Supprimer le panier et le bon
      await db.ArticlePanier.destroy({ where: { panierId }, transaction });
      await panier.destroy({ transaction });
      await db.Bon.destroy({ where: { id: panier.bonId }, transaction });
      
      await transaction.commit();
      return res.json({ message: 'Panier et bon annulés avec succès' });
    }

    // Mettre à jour le statut du panier
    await panier.update({ statut: nouveauStatut }, { transaction });

    // Si le panier est validé, mettre à jour le statut du bon
    if (nouveauStatut === 'validé' && panier.Bon) {
      await panier.Bon.update({ statutBon: 'validé' }, { transaction });
    }

    await transaction.commit();
    res.json({ message: 'Statut du panier mis à jour avec succès', panier });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur changement statut panier:', error);
    res.status(500).json({ error: 'Erreur lors du changement de statut', details: error.message });
  }
};

/**
 * Traitement spécifique pour les bons fournisseurs
 */
exports.traiterBonFournisseur = async (bon, articles, magasinId, agentId, code_structure, transaction) => {
  const statut = bon.statutBon;
  const typeBon = bon.type;

  console.log(`🏭 Traitement bon fournisseur - Type: ${typeBon}, Statut: ${statut}`);

  switch (typeBon) {
    case 'commande':
      // COMMANDE FOURNISSEUR: Aucun impact immédiat sur le stock
      // Seulement vérification et réservation si nécessaire
      if (['commandé', 'expédié'].includes(statut)) {
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'fournisseur', transaction);
        
        // Réservation pour préparation réception
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
      }
      break;

    case 'livraison':
      // LIVRAISON FOURNISSEUR: Impact sur le stock uniquement après validation
      if (['livré', 'validé', 'facturé'].includes(statut)) {
        // Vérification stock
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'livraison', 'fournisseur', transaction);
        
        // Libération des réservations précédentes
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Mouvements physiques (entrée en stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Mise à jour du fournisseur
        await statutManager.mettreAJourEntite(bon, 'fournisseur', null, bon.fournisseurId, transaction);
      }
      break;

    case 'retour':
      // RETOUR FOURNISSEUR: Sortie de stock après validation
      if (['retourné', 'validé'].includes(statut)) {
        // Vérification stock disponible
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'retour', 'fournisseur', transaction);
        
        // Mouvements physiques (sortie de stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Ajustement du fournisseur
        await statutManager.mettreAJourEntite(bon, 'fournisseur', null, bon.fournisseurId, transaction);
      }
      break;

    default:
      console.log(`Type de bon fournisseur non géré: ${typeBon}`);
  }
};

/**
 * Traitement spécifique pour les bons clients
 */
exports.traiterBonClient = async (bon, articles, magasinId, agentId, code_structure, transaction) => {
  const statut = bon.statutBon;
  const typeBon = bon.type;

  console.log(`👤 Traitement bon client - Type: ${typeBon}, Statut: ${statut}`);

  switch (typeBon) {
    case 'commande':
      // COMMANDE CLIENT: Réservation immédiate du stock
      if (['commandé', 'expédié'].includes(statut)) {
        // Vérification stock disponible
        await stockManager.verifierDisponibiliteStock(articles, magasinId, code_structure, 'commande', 'client', transaction);
        
        // Réservation du stock
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
      }

      // LIVRAISON/RÉALISATION: Impact physique sur le stock
      if (['livré', 'validé', 'facturé', 'payé'].includes(statut)) {
        // Libération des réservations
        await reservationService.gererReservationsStock(articles, bon, magasinId, agentId, code_structure, transaction);
        
        // Mouvements physiques (sortie de stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Mise à jour du client
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      break;

    case 'retour':
      // RETOUR CLIENT: Entrée en stock après validation
      if (['retourné', 'validé'].includes(statut)) {
        // Mouvements physiques (entrée en stock)
        await Promise.all(
          articles.map(article =>
            mouvementService.traiterMouvementStock(article, bon, magasinId, agentId, code_structure, transaction)
          )
        );

        // Ajustement du client (avoir)
        await statutManager.mettreAJourEntite(bon, 'client', bon.clientId, null, transaction);
      }
      break;

    default:
      console.log(`Type de bon client non géré: ${typeBon}`);
  }
};

// Dans le contrôleur
exports.getBonsBrouillons = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    const bons = await db.Bon.findAll({
      where: { 
        code_structure, 
        statutBon: 'brouillon' 
      },
      include: [db.Panier]
    });
    res.json(bons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.supprimerBonComplet = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { bonId } = req.params;
    
    const bon = await db.Bon.findByPk(bonId, { 
      include: [db.Panier],
      transaction 
    });
    
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Bon introuvable' });
    }
    
    // Supprimer dans l'ordre
    if (bon.Panier) {
      await db.ArticlePanier.destroy({ 
        where: { panierId: bon.Panier.id }, 
        transaction 
      });
      await db.Panier.destroy({ 
        where: { id: bon.Panier.id }, 
        transaction 
      });
    }
    
    await db.Bon.destroy({ 
      where: { id: bonId }, 
      transaction 
    });
    
    await transaction.commit();
    res.json({ message: 'Bon et éléments associés supprimés avec succès' });
    
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

