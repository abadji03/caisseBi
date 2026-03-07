const db = require('../models');
const Produit = db.Produit;
const Stock = db.Stock;
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/uploads/'; //url de l'emplacement des fichier à stocker

//Créer un produit
exports.createProduit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produitData = req.body;

    // Vérification : produit déjà existant ?
    const { codeBarre } = produitData;
    if (codeBarre !== '') {
      const existingProduit = await Produit.findOne({ where: { codeBarre } });

      if (existingProduit) {
        return res.status(400).json({ message: 'Un produit avec ce code barre existe déjà.' });
      }
    }

    // Traitement de l'image (comme pour 'logo')
    let image = null;
    if (req.file) {
      image = BASE_URL + req.file.filename;
    }

    // Création du produit avec image (si présente)
    const produit = await Produit.create({
      ...produitData,
      image,
    });

    return res.status(201).json(produit);
  } catch (error) {
    console.error('Erreur lors de la création du produit :', error);
    return res.status(500).json({
      message: 'Erreur lors de la création du produit',
      error: error.message,
    });
  }
};

//Mettre à jour un produit
exports.updateProduit = async (req, res) => {
  console.log('BODY:', req.body);
  console.log('FILE:', req.file);

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    const updatedData = { ...req.body };

    // Si une nouvelle image est envoyée
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (produit.image) {
        const oldPath = path.join('uploads', path.basename(produit.image)); // attention à ne pas concaténer l'URL complète
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Mettre à jour le champ image avec la nouvelle URL
      updatedData.image = BASE_URL + req.file.filename;
    } else {
      // Sinon, conserver l'image existante
      updatedData.image = produit.image;
    }

    await produit.update(updatedData);
    console.log('Produit mis à jour avec:', updatedData);
    res.json({ message: 'Produit mis à jour', produit });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
  }
};

//Supprimer un produit (physiquement)
exports.deleteProduit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    await produit.destroy();
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression', error });
  }
};

//Obtenir un produit spécifique par ID
exports.getProduitById = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    const produitData = produit.toJSON();
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    produitData.imageUrl = produitData.image ? baseUrl + produitData.image : null;

    res.status(200).json(produitData);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du produit', error });
  }
};

//Récupérer les produits par structure
exports.getProduitsByStructure = async (req, res) => {
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
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    if (!isAdminStructure && !isGerant && !isCaissier && !isEmploye) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure
    };

     // --- INCLUDE STOCK
    let stockInclude = {
      model: Stock,
      attributes: ["id", "magasinId","quantiteTotale", "quantiteReservee","statutStock","datePeremption"],
      required: false // admin -> on garde même les produits sans stock
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier || isEmploye)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier ou employe n’est associé à aucun magasin"
        });
      }

      //whereClause.magasinId = authUser.magasinId;
      stockInclude = {
          ...stockInclude,
          where: { magasinId: authUser.magasinId },
          required: true // 🔥 important : produit doit avoir un stock dans ce magasin
        };
    }
    const produits = await Produit.findAll({
      where: whereClause,
      include: [stockInclude],
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const produitsWithImageUrl = produits.map((struct) => {
      const prod = struct.toJSON(); // Convertit Sequelize instance en objet pur
      prod.logoUrl = prod.image ? baseUrl + prod.image : null;
      return prod;
    });

    res.status(200).json(produitsWithImageUrl);

    //res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des produits', error });
  }
};

//Mettre à jour le statut d’un produit (actif/inactif, disponible/épuisé, etc.)
exports.updateStatusProduit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    const { statut } = req.body;
    // produit.statut = statut;
    // await produit.save();
    if (typeof statut !== 'boolean') {
      return res.status(400).json({ message: 'Le statut doit être un booléen.' });
    }

    await produit.update({ statut });

    res.json({ message: 'Statut du produit mis à jour', produit });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la mise à jour du statut', error: error.message });
  }
};

exports.updateTauxTVAProduit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    const { tauxTVA } = req.body;
    if (tauxTVA < 0) {
      return res.status(400).json({ message: 'Le taux de TVA doit être un nombre positif.' });
    }

    await produit.update({ tauxTVA });

    res.json({ message: 'Statut du produit mis à jour', produit });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la mise à jour du statut', error: error.message });
  }
};
//Récupérer tous les produits
/* exports.getAllProduits = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produits = await Produit.findAll();
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de tous les produits', error });
  }
}; */

//Rechercher des produits par désignation ou code-barres
/* exports.searchProduits = async (req, res) => {
  try {
    const keyword = req.query.q;
    const produits = await Produit.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { designation: { [db.Sequelize.Op.like]: `%${keyword}%` } },
          { codeBarre: { [db.Sequelize.Op.like]: `%${keyword}%` } },
        ],
      },
    });
    res.json(produits);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la recherche", error });
  }
}; */

//Marquer un produit comme archivé (au lieu de suppression définitive)
/* exports.archiveProduit = async (req, res) => {
  try {
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: "Produit non trouvé" });

    produit.archived = true; // suppose que tu as un champ `archived` (boolean) dans le modèle
    await produit.save();

    res.json({ message: "Produit archivé avec succès", produit });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'archivage", error });
  }
}; */

exports.updateImageProduit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    if (!req.file) return res.status(400).json({ message: 'Aucune image fournie' });

    // Supprimer l'ancienne image si elle existe
    if (produit.image) {
      const oldPath = path.join('uploads', path.basename(produit.image));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Mettre à jour l'image
    const nouvelleImageUrl = BASE_URL + req.file.filename;
    await produit.update({ image: nouvelleImageUrl });

    res.json({ message: 'Image du produit mise à jour', produit });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour de l'image", error: error.message });
  }
};

// Mettre à jour uniquement le code-barre d’un produit
exports.updateCodeBarreProduit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { codeBarre } = req.body;

    if (!codeBarre || codeBarre.trim() === '') {
      return res.status(400).json({ message: 'Le code-barre est requis.' });
    }

    const produit = await Produit.findByPk(req.params.id);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }

    // Vérifier l’unicité du code-barre
    const codeBarreExiste = await Produit.findOne({
      where: {
        codeBarre,
        id: { [db.Sequelize.Op.ne]: req.params.id }, // exclure le produit actuel
      },
    });

    if (codeBarreExiste) {
      return res
        .status(400)
        .json({ message: 'Ce code-barre est déjà utilisé par un autre produit.' });
    }

    // Mise à jour du code-barre
    await produit.update({ codeBarre });

    res.json({ message: 'Code-barre mis à jour avec succès', produit });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la mise à jour du code-barre', error: error.message });
  }
};
