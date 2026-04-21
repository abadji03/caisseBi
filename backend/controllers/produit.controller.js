const db = require('../models');
const Produit = db.Produit;
const Stock = db.Stock;
const fs = require('fs');
const path = require('path');
const { Op,literal } = db.Sequelize;
const sharp = require('sharp');
const ExcelJS = require('exceljs');
const { safeNumber } = require('./bonComplet/statutManager');
const PDFDocument = require('pdfkit');
const HistoriqueService = require('../services/historique.service');
const ActionMessagesService = require('../services/actionMessages.service');


const BASE_URL = 'http://localhost:5000/uploads/'; //url de l'emplacement des fichier à stocker

//Créer un produit
exports.createProduit = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
  const produitData = req.body;

  console.log('Données produit reçues : ',produitData)

   const existingProduit = await Produit.findOne({
      where: {
        designation: produitData.designation,
        categorieId: produitData.categorieId,
        //code_structure: produitData.code_structure
      }
    });

    if (existingProduit) {
        return res.status(400).json({ message: 'Un produit avec ces caractéristiques existe déjà.' });
      }
    // Traitement de l'image
    let image = null;
    let tempFilePath = null;
    
    if (req.file) {
      try {
        const inputPath = req.file.path;
        tempFilePath = inputPath;
        const filename = "prod-" + Date.now() + ".jpg";
        const outputPath = path.join("uploads", filename);

        console.log('Traitement de l\'image:', inputPath, '->', outputPath);

        // compression et redimensionnement
        await sharp(inputPath)
          .resize(300, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toFile(outputPath);

        image = BASE_URL + filename;

        // Créer le produit avec l'image
        const produit = await Produit.create({
          ...produitData,
          image,
        });

        // ENREGISTRER L'HISTORIQUE DE CRÉATION
        await HistoriqueService.enregistrerAction(
          authUser.id,
          ActionMessagesService.getCreateProductMessage(produit),
          clientIp,
          {
            action: 'CREATE_PRODUCT',
            targetId: produit.id,
            productData: {
              designation: produit.designation,
              prixVente: produit.prixVenteUnitaire,
              prixAchat: produit.prixAchatUnitaire,
              categorieId: produit.categorieId,
              code_structure: produit.code_structure
            }
          }
        );
        // Nettoyer le fichier temporaire après la création réussie
        setTimeout(() => {
          try {
            if (fs.existsSync(inputPath)) {
              fs.unlinkSync(inputPath);
              console.log('Fichier temporaire supprimé:', inputPath);
            }
          } catch (cleanupError) {
            console.error('Erreur lors du nettoyage:', cleanupError);
          }
        }, 1000);

        return res.status(201).json(produit);

      } catch (imageError) {
        console.error('Erreur lors du traitement de l\'image:', imageError);
        
        // Nettoyer le fichier temporaire en cas d'erreur
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.error('Erreur lors du nettoyage:', cleanupError);
          }
        }
        
        return res.status(500).json({ 
          message: 'Erreur lors du traitement de l\'image', 
          error: imageError.message 
        });
      }
    } else {
      // Pas d'image, créer le produit sans image
      const produit = await Produit.create(produitData);
      return res.status(201).json(produit);
    }
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
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    // Sauvegarder l'ancien état pour comparer
    const oldProduit = produit.toJSON();
    const updatedData = { ...req.body };

    // Suivre les changements
    const changes = {};

    // Comparer les champs importants
    if (oldProduit.designation !== updatedData.designation && updatedData.designation) {
      changes.designation = { old: oldProduit.designation, new: updatedData.designation };
    }
    if (oldProduit.prixVenteUnitaire !== parseFloat(updatedData.prixVenteUnitaire) && updatedData.prixVenteUnitaire) {
      changes.prixVenteUnitaire = { old: oldProduit.prixVenteUnitaire, new: parseFloat(updatedData.prixVenteUnitaire) };
    }
    if (oldProduit.prixAchatUnitaire !== parseFloat(updatedData.prixAchatUnitaire) && updatedData.prixAchatUnitaire) {
      changes.prixAchatUnitaire = { old: oldProduit.prixAchatUnitaire, new: parseFloat(updatedData.prixAchatUnitaire) };
    }
    if (oldProduit.tauxTVA !== parseFloat(updatedData.tauxTVA) && updatedData.tauxTVA) {
      changes.tauxTVA = { old: oldProduit.tauxTVA, new: parseFloat(updatedData.tauxTVA) };
    }
    if (oldProduit.categorieId !== updatedData.categorieId && updatedData.categorieId) {
      changes.categorieId = { old: oldProduit.categorieId, new: updatedData.categorieId };
    }
    if (oldProduit.description !== updatedData.description && updatedData.description) {
      changes.description = { old: oldProduit.description, new: updatedData.description };
    }
    
    // Sauvegarder l'ancienne image pour la supprimer plus tard
    const oldImagePath = produit.image ? path.join('uploads', path.basename(produit.image)) : null;

    // Traitement de la nouvelle image si présente
    if (req.file) {
      try {
        const inputPath = req.file.path;
        const filename = "prod-" + Date.now() + ".jpg";
        const outputPath = path.join("uploads", filename);

        console.log('Traitement de la nouvelle image:', inputPath, '->', outputPath);

        await sharp(inputPath)
          .resize(300, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toFile(outputPath);

        // Mettre à jour l'URL de l'image dans les données
        updatedData.image = BASE_URL + filename;
        changes.image = { old: oldProduit.image, new: updatedData.image };

        // Mettre à jour le produit (sans supprimer l'ancienne image immédiatement)
        await produit.update(updatedData);

        // ENREGISTRER L'HISTORIQUE DE MISE À JOUR
        await HistoriqueService.enregistrerAction(
          authUser.id,
          ActionMessagesService.getUpdateProductMessage(oldProduit, produit, changes),
          clientIp,
          {
            action: 'UPDATE_PRODUCT',
            targetId: produit.id,
            changes: changes,
            hasImageChange: true
          }
        );

        // Nettoyer les fichiers après la mise à jour
        setTimeout(() => {
          try {
            // Supprimer le fichier temporaire
            if (fs.existsSync(inputPath)) {
              fs.unlinkSync(inputPath);
              console.log('Fichier temporaire supprimé:', inputPath);
            }

            // Supprimer l'ancienne image si elle existe et est différente
            if (oldImagePath && fs.existsSync(oldImagePath) && oldImagePath !== outputPath) {
              fs.unlinkSync(oldImagePath);
              console.log('Ancienne image supprimée:', oldImagePath);
            }
          } catch (cleanupError) {
            console.error('Erreur lors du nettoyage:', cleanupError);
          }
        }, 1000);

      } catch (imageError) {
        console.error('Erreur lors du traitement de l\'image:', imageError);
        
        // Nettoyer le fichier temporaire en cas d'erreur
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.error('Erreur lors du nettoyage:', cleanupError);
          }
        }
        
        return res.status(500).json({ 
          message: 'Erreur lors du traitement de l\'image', 
          error: imageError.message 
        });
      }
    } else {
      // Pas de nouvelle image, mettre à jour sans changer l'image
      updatedData.image = produit.image;
      await produit.update(updatedData);

      // ENREGISTRER L'HISTORIQUE DE MISE À JOUR (sans changement d'image)
      await HistoriqueService.enregistrerAction(
        authUser.id,
        ActionMessagesService.getUpdateProductMessage(oldProduit, produit, changes),
        clientIp,
        {
          action: 'UPDATE_PRODUCT',
          targetId: produit.id,
          changes: changes,
          hasImageChange: false
        }
      );
    }

    console.log('Produit mis à jour avec:', updatedData);
    
    res.json({ message: 'Produit mis à jour', produit });
  } catch (error) {
    console.error('Erreur updateProduit:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour', 
      error: error.message 
    });
  }
};
//Supprimer un produit (physiquement)
exports.deleteProduit = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    // Sauvegarder les données avant suppression
    const produitData = produit.toJSON();

    await produit.destroy();

        // ENREGISTRER L'HISTORIQUE DE SUPPRESSION
    await HistoriqueService.enregistrerAction(
      authUser.id,
      ActionMessagesService.getDeleteProductMessage(produitData),
      clientIp,
      {
        action: 'DELETE_PRODUCT',
        targetId: produitData.id,
        deletedProduct: {
          designation: produitData.designation,
          codeBarre: produitData.codeBarre,
          prixVente: produitData.prixVenteUnitaire,
          categorieId: produitData.categorieId
        }
      }
    );

    // Supprimer l'image si elle existe
    if (produitData.image) {
      const imagePath = path.join('uploads', path.basename(produitData.image));
      setTimeout(() => {
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log('Image du produit supprimée:', imagePath);
          }
        } catch (err) {
          console.error('Erreur suppression image:', err);
        }
      }, 1000);
    }

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


// Récupérer les produits par structure avec pagination
exports.getProduitsByStructure = async (req, res) => {
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
      categorieId = '',
      statut = '',
    } = req.query;


    // Vérification des droits d'accès
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    //const isAdminStructureSecondaire = authUser.roles?.some(r => r.nom === "Administrateur secondaire");
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
      code_structure: code_structure,
      //statut:true
    };

    // 🔍 FILTRE DE RECHERCHE
    if (search) {
      whereClause[Op.or] = [
        { designation: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { codeBarre: { [Op.like]: `%${search}%` } }
      ];
    }

    // 🔍 FILTRE PAR CATÉGORIE
    if (categorieId) {
      whereClause.categorieId = categorieId;
    }

    // 🔍 FILTRE PAR STATUT
    if (statut !== '') {
      whereClause.statut = statut === 'true';
    }

    // --- INCLUDE STOCK
    let stockInclude = {
      model: Stock,
      attributes: ["id", "magasinId", "quantiteTotale", "quantiteReservee", "statutStock", "datePeremption"],
      required: false
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier || isEmploye)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier ou employe n’est associé à aucun magasin"
        });
      }
      stockInclude = {
        ...stockInclude,
        where: { magasinId: authUser.magasinId },
        required: false
      };
    }

    const includes = [stockInclude];
    
    // Ajouter Fournisseur seulement si le modèle existe
    if (db.Fournisseur) {
      includes.push({
        model: db.Fournisseur,
        attributes: ["id", "nomComplet", "telephone", "email"],
        required: false
      });
    }
    if (db.CategoriesProduits) {
      includes.push({
        model: db.CategoriesProduits,
        attributes: ["id", "nom"],
        required: true
      });
    }

    if (db.Users) {
      includes.push({
        model: db.Users,
        attributes: ["id", "nom"],
        required: true
      });
    }
       
    // Calcul de l'offset pour la pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Exécution de la requête avec pagination
    const { count, rows } = await Produit.findAndCountAll({
      where: whereClause,
      include: includes,
      order: [['createdAt', 'DESC']],
      offset,
      limit: limitInt,
      distinct: true
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const produitsWithImageUrl = rows.map((struct) => {
      const prod = struct.toJSON();
      prod.logoUrl = prod.image ? baseUrl + prod.image : null;
      return prod;
    });

    const totalPages = Math.ceil(count / limitInt);

    console.log(`📦 Produits: ${count} trouvés, page ${page}/${totalPages}`);

    res.status(200).json({
      items: produitsWithImageUrl,
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
    console.error('Erreur getProduitsByStructure:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des produits', 
      error: error.message 
    });
  }
};

// Récupérer les produits avec stock disponible réel > 0
exports.getProduitsDisponibles = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;

    // Vérification structure
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier si admin
    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    //const isAdminStructureSecondaire = authUser.roles?.some(r => r.nom === "Administrateur secondaire");
    // --- WHERE PRODUIT
    const whereProduit = {
      code_structure: code_structure,
      statut: true
    };

    // --- INCLUDE STOCK avec STOCK RÉEL
    let stockWhere = {
      [Op.and]: [
        literal(`quantite_totale - quantite_reservee > 0`)
      ]
    };

    // 🔹 Si non admin → filtrer par magasin
    if (!isAdmin) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Utilisateur non associé à un magasin"
        });
      }

      stockWhere.magasinId = authUser.magasinId;
    }

    const produits = await Produit.findAll({
      where: whereProduit,
      include: [
        {
          model: Stock,
          attributes: [
            "id",
            "magasinId",
            "quantiteTotale",
            "quantiteReservee",
            //champ calculé utile côté front
            [
              literal(`quantite_totale - quantite_reservee`),
              "quantiteDisponible"
            ]
          ],
          where: stockWhere,
          required: true
        },
        {
          model: db.CategoriesProduits,
          attributes: ["id", "nom"],
          required: false
        },
        {
          model: db.Fournisseur,
          attributes: ["id", "nomComplet"],
          required: false
        }
      ],
      order: [["createdAt", "DESC"]],
      distinct: true
    });

    // --- IMAGE URL
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const result = produits.map(p => {
      const prod = p.toJSON();
      prod.logoUrl = prod.image ? baseUrl + prod.image : null;
      return prod;
    });

    console.log(`📦 Produits disponibles (stock réel): ${result.length}`);

    return res.status(200).json(result);

  } catch (error) {
    console.error("Erreur getProduitsDisponibles:", error);
    return res.status(500).json({
      message: "Erreur lors de la récupération des produits",
      error: error.message
    });
  }
};

//Mettre à jour le statut d’un produit (actif/inactif, disponible/épuisé, etc.)
exports.updateStatusProduit = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

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

    const oldStatut = produit.statut;
    await produit.update({ statut });

    // ENREGISTRER L'HISTORIQUE DE CHANGEMENT DE STATUT
    await HistoriqueService.enregistrerAction(
      authUser.id,
      ActionMessagesService.getStatusChangeMessage(produit, oldStatut, statut),
      clientIp,
      {
        action: 'UPDATE_PRODUCT_STATUS',
        targetId: produit.id,
        oldStatus: oldStatut,
        newStatus: statut
      }
    );

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
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    const { tauxTVA } = req.body;
    if (tauxTVA < 0) {
      return res.status(400).json({ message: 'Le taux de TVA doit être un nombre positif.' });
    }

    const oldTauxTVA = produit.tauxTVA;
    await produit.update({ tauxTVA });

    // ENREGISTRER L'HISTORIQUE DE CHANGEMENT DE TVA
    await HistoriqueService.enregistrerAction(
      authUser.id,
      ActionMessagesService.getTVAChangeMessage(produit, oldTauxTVA, tauxTVA),
      clientIp,
      {
        action: 'UPDATE_PRODUCT_TVA',
        targetId: produit.id,
        oldTVA: oldTauxTVA,
        newTVA: tauxTVA
      }
    );

    res.json({ message: 'Statut du produit mis à jour', produit });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la mise à jour du statut', error: error.message });
  }
};

//Mettre à jour l'image du produit
exports.updateImageProduit = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const produit = await Produit.findByPk(req.params.id);
    if (!produit) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    // Sauvegarder l'ancienne image pour la supprimer plus tard
    const oldImagePath = produit.image ? path.join('uploads', path.basename(produit.image)) : null;
    const oldImageUrl = produit.image;
    try {
      // Traiter la nouvelle image
      const inputPath = req.file.path;
      const filename = "prod-" + Date.now() + ".jpg";
      const outputPath = path.join("uploads", filename);

      console.log('Traitement de la nouvelle image:', inputPath, '->', outputPath);

      // compression et redimensionnement
      await sharp(inputPath)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      // Nouvelle URL de l'image
      const nouvelleImageUrl = BASE_URL + filename;

      // Mettre à jour l'image dans la base de données
      await produit.update({ image: nouvelleImageUrl });
       // ENREGISTRER L'HISTORIQUE DE CHANGEMENT D'IMAGE
      await HistoriqueService.enregistrerAction(
        authUser.id,
        `Mise à jour de l'image du produit: ${produit.designation} (ID: ${produit.id})`,
        clientIp,
        {
          action: 'UPDATE_PRODUCT_IMAGE',
          targetId: produit.id,
          oldImage: oldImageUrl,
          newImage: nouvelleImageUrl
        }
      );

      // Attendre un peu avant de supprimer l'ancienne image
      setTimeout(() => {
        try {
          // Supprimer l'image temporaire uploadée
          if (fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
            console.log('Fichier temporaire supprimé:', inputPath);
          }

          // Supprimer l'ancienne image si elle existe et est différente de la nouvelle
          if (oldImagePath && fs.existsSync(oldImagePath) && oldImagePath !== outputPath) {
            fs.unlinkSync(oldImagePath);
            console.log('Ancienne image supprimée:', oldImagePath);
          }
        } catch (cleanupError) {
          console.error('Erreur lors du nettoyage des fichiers:', cleanupError);
          // Ne pas bloquer la réponse pour cette erreur
        }
      }, 1000); // Attendre 1 seconde

      res.json({ 
        message: 'Image du produit mise à jour', 
        produit: {
          ...produit.toJSON(),
          image: nouvelleImageUrl
        }
      });

    } catch (imageError) {
      console.error('Erreur lors du traitement de l\'image:', imageError);
      
      // Nettoyer le fichier temporaire en cas d'erreur
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Erreur lors du nettoyage:', cleanupError);
        }
      }
      
      return res.status(500).json({ 
        message: 'Erreur lors du traitement de l\'image', 
        error: imageError.message 
      });
    }
  } catch (error) {
    console.error('Erreur updateImageProduit:', error);
    res.status(500).json({ 
      message: "Erreur lors de la mise à jour de l'image", 
      error: error.message 
    });
  }
};

// Mettre à jour uniquement le code-barre d’un produit
exports.updateCodeBarreProduit = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

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

    const oldCodeBarre = produit.codeBarre;

    // Mise à jour du code-barre
    await produit.update({ codeBarre });

    // ENREGISTRER L'HISTORIQUE DE CHANGEMENT DE CODE-BARRE
    await HistoriqueService.enregistrerAction(
      authUser.id,
      ActionMessagesService.getCodeBarreChangeMessage(produit, oldCodeBarre, codeBarre),
      clientIp,
      {
        action: 'UPDATE_PRODUCT_BARCODE',
        targetId: produit.id,
        oldBarcode: oldCodeBarre,
        newBarcode: codeBarre
      }
    );

    res.json({ message: 'Code-barre mis à jour avec succès', produit });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Erreur lors de la mise à jour du code-barre', error: error.message });
  }
};

//Exporter vers excel

// Exporter les produits vers Excel
exports.exportProduitsToExcel = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    
    // Récupération des filtres optionnels
    const { 
      categorieId = '',
      statut = '',
      search = ''
    } = req.query;

    // Vérification des droits d'accès
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    if (!isAdminStructure && !isGerant && !isCaissier && !isEmploye) {
      return res.status(403).json({
        message: "Accès interdit : rôle insuffisant"
      });
    }

    // AVANT d'envoyer la réponse, enregistrer l'historique
    const filters = { categorieId, statut, search };
    await HistoriqueService.enregistrerAction(
      authUser.id,
      ActionMessagesService.getExportExcelMessage(authUser, code_structure, filters),
      clientIp,
      {
        action: 'EXPORT_PRODUCTS_EXCEL',
        structureCode: code_structure,
        filters: filters
      }
    );

    // Construction de la clause WHERE
    let whereClause = {
      code_structure: code_structure
    };

    // Filtre par statut
    if (statut !== '') {
      whereClause.statut = statut === 'true';
    }

    // Filtre par catégorie
    if (categorieId) {
      whereClause.categorieId = categorieId;
    }

    // Filtre de recherche
    if (search) {
      whereClause[Op.or] = [
        { designation: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { codeBarre: { [Op.like]: `%${search}%` } }
      ];
    }

    // Configuration des includes
    const includes = [
      {
        model: db.Stock,
        attributes: ["id", "magasinId", "quantiteTotale", "quantiteReservee", "statutStock", "datePeremption","seuilAlerte"],
        required: false
      }
    ];

    if (db.Fournisseur) {
      includes.push({
        model: db.Fournisseur,
        attributes: ["id", "nomComplet", "telephone", "email"],
        required: false
      });
    }

    if (db.CategoriesProduits) {
      includes.push({
        model: db.CategoriesProduits,
        attributes: ["id", "nom"],
        required: false
      });
    }

    // Récupérer tous les produits sans pagination
    const produits = await Produit.findAll({
      where: whereClause,
      include: includes,
      order: [['designation', 'ASC']]
    });

    if (!produits || produits.length === 0) {
      return res.status(404).json({ message: "Aucun produit trouvé à exporter" });
    }

    // Créer un classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = authUser.nom || 'Système';
    workbook.created = new Date();

    // Ajouter une feuille de calcul
    const worksheet = workbook.addWorksheet('Produits', {
      properties: { tabColor: { argb: '28a745' } },
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Définir les colonnes
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Désignation', key: 'designation', width: 30 },
      { header: 'Catégorie', key: 'categorie', width: 20 },
      { header: 'Fournisseur', key: 'fournisseur', width: 25 },
      { header: 'Code-barre', key: 'codeBarre', width: 20 },
      { header: 'Unité', key: 'unite', width: 10 },
      { header: 'Prix Achat', key: 'prixAchat', width: 15 },
      { header: 'Prix Vente', key: 'prixVente', width: 15 },
      { header: 'TVA (%)', key: 'tva', width: 10 },
      { header: 'Stock Total', key: 'stockTotal', width: 12 },
      { header: 'Stock Réservé', key: 'stockReserve', width: 12 },
      { header: 'Stock Disponible', key: 'stockDisponible', width: 12 },
      { header: 'Seuil Alerte', key: 'seuilAlerte', width: 12 },
      { header: 'Périssable', key: 'perissable', width: 10 },
      { header: 'Date Péremption', key: 'datePeremption', width: 15 },
      { header: 'Statut', key: 'statut', width: 10 },
      { header: 'Date Création', key: 'dateCreation', width: 20 },
      { header: 'Description', key: 'description', width: 30 }
    ];

    // Styliser l'en-tête
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '28a745' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Ajouter les données
    produits.forEach(produit => {
      const produitJSON = produit.toJSON();
      
      // Calculer le stock disponible
      const stockTotal = produitJSON.Stocks?.reduce((sum, s) => sum + (safeNumber(s.quantiteTotale) || 0), 0) || 0;
      const stockReserve = produitJSON.Stocks?.reduce((sum, s) => sum + (safeNumber(s.quantiteReservee) || 0), 0) || 0;
      const stockDisponible = stockTotal - stockReserve;

      // Récupérer la date de péremption la plus proche
      const datePeremption = produitJSON.Stocks?.length > 0
        ? produitJSON.Stocks
            .filter(s => s.datePeremption)
            .map(s => new Date(s.datePeremption))
            .sort((a, b) => a - b)[0]
        : null;

      worksheet.addRow({
        id: produitJSON.id,
        designation: produitJSON.designation,
        categorie: produitJSON.CategoriesProduit?.nom || '-',
        fournisseur: produitJSON.Fournisseur?.nomComplet || '-',
        codeBarre: produitJSON.codeBarre || '-',
        unite: produitJSON.unite || '-',
        prixAchat: produitJSON.prixAchatUnitaire || 0,
        prixVente: produitJSON.prixVenteUnitaire || 0,
        tva: produitJSON.tauxTVA || 0,
        stockTotal: stockTotal,
        stockReserve: stockReserve,
        stockDisponible: stockDisponible,
        seuilAlerte: produitJSON.Stocks?.[0]?.seuilAlerte || 0,
        perissable: produitJSON.perissable ? 'Oui' : 'Non',
        datePeremption: datePeremption ? datePeremption.toLocaleDateString('fr-FR') : '-',
        statut: produitJSON.statut ? 'Actif' : 'Inactif',
        dateCreation: new Date(produitJSON.dateCreation).toLocaleDateString('fr-FR'),
        description: produitJSON.description || '-'
      });
    });

    // Ajouter une ligne de total
    const lastRow = worksheet.rowCount + 1;
    worksheet.addRow({});
    worksheet.getRow(lastRow).getCell(1).value = 'TOTAUX:';
    worksheet.getRow(lastRow).getCell(1).font = { bold: true };
    
    // Calculer les totaux
    const totalStock = produits.reduce((sum, p) => {
      const stock = p.Stocks?.reduce((s, st) => s + (safeNumber(st.quantiteTotale )|| 0), 0) || 0;
      return sum + stock;
    }, 0);
    
    worksheet.getRow(lastRow).getCell(10).value = totalStock;
    worksheet.getRow(lastRow).getCell(10).font = { bold: true };

    // Styliser les cellules de prix
    ['G', 'H'].forEach(col => {
      worksheet.getColumn(col).numFmt = '#,##0.00 [$F CFA]';
    });

    // Styliser les cellules de stock
    ['J', 'K', 'L'].forEach(col => {
      worksheet.getColumn(col).numFmt = '#,##0';
    });

    // Ajouter des bordures à toutes les cellules
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Ajouter une feuille de résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    summarySheet.columns = [
      { header: 'Indicateur', key: 'indicateur', width: 30 },
      { header: 'Valeur', key: 'valeur', width: 20 }
    ];

    // Styliser l'en-tête du résumé
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '17a2b8' }
    };

    // Ajouter les données du résumé
    const totalProduits = produits.length;
    const produitsActifs = produits.filter(p => p.statut).length;
    const produitsInactifs = totalProduits - produitsActifs;
    const produitsPerissables = produits.filter(p => p.perissable).length;
    const valeurStock = produits.reduce((sum, p) => {
      const stock = p.Stocks?.reduce((s, st) => s + (safeNumber(st.quantiteTotale) || 0), 0) || 0;
      return sum + (stock * (safeNumber(p.prixAchatUnitaire) || 0));
    }, 0);

    summarySheet.addRows([
      { indicateur: 'Total Produits', valeur: totalProduits },
      { indicateur: 'Produits Actifs', valeur: produitsActifs },
      { indicateur: 'Produits Inactifs', valeur: produitsInactifs },
      { indicateur: 'Produits Périssables', valeur: produitsPerissables },
      { indicateur: 'Valeur Totale du Stock', valeur: valeurStock },
      { indicateur: 'Date d\'exportation', valeur: new Date().toLocaleString('fr-FR') },
      { indicateur: 'Exporté par', valeur: authUser.nom || 'Utilisateur' }
    ]);

    // Styliser les valeurs monétaires dans le résumé
    summarySheet.getCell('B6').numFmt = '#,##0.00 [$F CFA]';

    // Générer le nom du fichier
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Catalogue_produits_${code_structure}_${dateStr}.xlsx`;

    // Configurer la réponse HTTP
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Écrire le fichier Excel dans la réponse
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Erreur exportProduitsToExcel:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'exportation des produits', 
      error: error.message 
    });
  }
};

// Exporter les produits vers PDF
exports.exportProduitsToPDF = async (req, res) => {
  try {
    const authUser = req.user;
    const clientIp = HistoriqueService.getClientIp(req);

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    
    // Récupération des filtres optionnels
    const { 
      categorieId = '',
      statut = '',
      search = ''
    } = req.query;

    // Vérification des droits d'accès
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({ message: "Accès interdit" });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    if (!isAdminStructure && !isGerant) {
      return res.status(403).json({ message: "Rôle insuffisant" });
    }

     // ENREGISTRER L'HISTORIQUE D'EXPORT PDF
    const filters = { categorieId, statut, search };
    await HistoriqueService.enregistrerAction(
      authUser.id,
      ActionMessagesService.getExportPDFMessage(authUser, code_structure, filters),
      clientIp,
      {
        action: 'EXPORT_PRODUCTS_PDF',
        structureCode: code_structure,
        filters: filters
      }
    );
    // Construction de la clause WHERE (identique à l'export Excel)
    let whereClause = { code_structure };
    
    if (statut !== '') whereClause.statut = statut === 'true';
    if (categorieId) whereClause.categorieId = categorieId;
    
    if (search) {
      whereClause[Op.or] = [
        { designation: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { codeBarre: { [Op.like]: `%${search}%` } }
      ];
    }

    // Récupérer les produits
    const produits = await Produit.findAll({
      where: whereClause,
      include: [
        {
          model: db.Stock,
          attributes: ["id", "magasinId", "quantiteTotale", "quantiteReservee"]
        },
        {
          model: db.Fournisseur,
          attributes: ["id", "nomComplet"]
        },
        {
          model: db.CategoriesProduits,
          attributes: ["id", "nom"]
        },
        {
          model: db.Structure,
          attributes: ["id", "nom_structure"]
        }
      ],
      order: [['designation', 'ASC']]
    });

    // Créer le document PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      info: {
        Title: `Catalogue Produits - ${code_structure}`,
        Author: authUser.nom || 'Système',
        Subject: 'Liste des produits',
        Keywords: 'produits, catalogue, inventaire',
        CreationDate: new Date()
      }
    });

    // Configurer la réponse HTTP
    const filename = `catalogue_${code_structure}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe le PDF vers la réponse
    doc.pipe(res);

    // Ajouter l'en-tête du document
    doc.fontSize(20).text('CATALOGUE DES PRODUITS', { align: 'center' });
    doc.moveDown();
    const structureNom = produits[0]?.Structure?.nom_structure || code_structure;
    // Ajouter les informations de génération
    doc.fontSize(10).text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, { align: 'right' });
    doc.text(`Généré par : ${authUser.nom || 'Utilisateur'}`, { align: 'right' });
    doc.text(`Structure : ${structureNom}`, { align: 'right' });
    doc.moveDown(2);

    // Ajouter un résumé
    doc.fontSize(14).text('RÉSUMÉ', { underline: true });
    doc.fontSize(11);
    doc.text(`Total produits : ${produits.length}`);
    
    const produitsActifs = produits.filter(p => p.statut).length;
    doc.text(`Produits actifs : ${produitsActifs}`);
    doc.text(`Produits inactifs : ${produits.length - produitsActifs}`);
    
    const stockTotal = produits.reduce((sum, p) => {
      return sum + (p.Stocks?.reduce((s, st) => s + (safeNumber(st.quantiteTotale) || 0), 0) || 0);
    }, 0);
    doc.text(`Stock total : ${stockTotal} unités`);
    
    const valeurStock = produits.reduce((sum, p) => {
      const stock = p.Stocks?.reduce((s, st) => s + (safeNumber(st.quantiteTotale) || 0), 0) || 0;
      return sum + (stock * (safeNumber(p.prixAchatUnitaire) || 0));
    }, 0);
    doc.text(`Valeur du stock : ${valeurStock.toLocaleString('fr-FR')} F CFA`);
    
    doc.moveDown(2);

    // Ajouter la liste des produits
    doc.fontSize(14).text('LISTE DES PRODUITS', { underline: true });
    doc.moveDown();

    // Créer un tableau pour les produits
    let y = doc.y;
    
    // En-têtes du tableau
    const startX = 50;
    const colWidths = [200, 80, 80, 80, 80];
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Produit', startX, y, { width: colWidths[0] });
    doc.text('Catégorie', startX + colWidths[0], y, { width: colWidths[1] });
    doc.text('Stock', startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'right' });
    doc.text('Prix Achat', startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'right' });
    doc.text('Prix Vente', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: 'right' });
    
    y += 20;
    
    // Ligne de séparation
    doc.strokeColor('#cccccc')
       .lineWidth(1)
       .moveTo(startX, y - 5)
       .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 5)
       .stroke();
    
    // Données des produits
    doc.font('Helvetica');
    
    produits.forEach((produit, index) => {
      // Vérifier si on doit créer une nouvelle page
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      
      const stock = produit.Stocks?.reduce((s, st) => s + (safeNumber(st.quantiteTotale) || 0), 0) || 0;
      
      doc.fontSize(9)
         .text((produit.designation || '').substring(0, 30), startX, y, { width: colWidths[0] });
      doc.text(produit.CategoriesProduit?.nom || '-', startX + colWidths[0], y, { width: colWidths[1] });
      doc.text(stock.toString(), startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'right' });
      doc.text(produit.prixAchatUnitaire?.toLocaleString('fr-FR') || '0', startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'right' });
      doc.text(produit.prixVenteUnitaire?.toLocaleString('fr-FR') || '0', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: 'right' });
      
      y += 20;
      
      // Ajouter le code-barre et la description en dessous pour les produits importants
      if (produit.codeBarre || produit.description) {
        doc.fontSize(8)
           .fillColor('#666666')
           .text(`Code: ${produit.codeBarre || '-'}`, startX + 10, y, { width: colWidths[0] - 10 });
        
        if (produit.description) {
          doc.text(produit.description.substring(0, 50), startX + colWidths[0] + 10, y, { width: colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] - 20 });
        }
        
        y += 15;
        doc.fillColor('#000000');
      }
      
      // Ligne de séparation entre les produits
      if (index < produits.length - 1) {
        doc.strokeColor('#eeeeee')
           .lineWidth(0.5)
           .moveTo(startX, y - 5)
           .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y - 5)
           .stroke();
      }
    });

    // Ajouter un pied de page
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      // Numéro de page
      doc.fontSize(8)
         .fillColor('#666666')
         .text(
           `Page ${i + 1} / ${pages.count}`,
           50,
           doc.page.height - 50,
           { align: 'center' }
         );
    }

    // Finaliser le PDF
    doc.end();

  } catch (error) {
    console.error('Erreur exportProduitsToPDF:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'exportation PDF', 
      error: error.message 
    });
  }
};