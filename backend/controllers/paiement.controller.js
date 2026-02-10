// controllers/paiementController.js
const db = require('../models');
const Paiement = db.Paiement;
const User = db.Users;
const Magasin = db.Magasin;
const fs = require('fs');
const path = require('path');
const operationController = require('./operation.controller');
const { statutManager } = require('./bonComplet');


const BASE_URL = 'http://localhost:5000/uploads/';

exports.create = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const paie = req.body;

    let fichier = null;
    if (req.file) {
      fichier = BASE_URL + req.file.filename;
    }

    const paiement = await Paiement.create({
      ... paie,
      date:new Date(),
      fichier
    });
    // Créer l'opération associée
    await operationController.createFromPaiement(paiement, transaction);

    // Mettre à jour le fournisseur ou le client selon le type de paiement

    if(paiement.typePaiement === 'fournisseur') await statutManager.mettreAJourFournisseurApresVersement(paiement, paiement.fournisseurId, transaction);
    if(paiement.typePaiement === 'client') await statutManager.mettreAJourClientApresRegelement(paiement, paiement.clientId, transaction);
    
    await transaction.commit();

    res.status(201).json(paiement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const paiements = await Paiement.findAll({
      include: ['Client', 'Fournisseur', 'Bon', 'Panier', 'Magasin'],
    });
    res.json(paiements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.findById = async (req, res) => {

  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const paiement = await Paiement.findByPk(req.params.id);
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    const paiementData = paiement.toJSON();
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    paiementData.fichierUrl = paiementData.fichier ? baseUrl + paiementData.fichier : null;

    res.status(200).json(paiementData);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération du paiement', error });
  }
};

exports.update = async (req, res) => {
try {
  const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
  const paiement = await Paiement.findByPk(req.params.id);
  if (!paiement) {
    return res.status(404).json({ message: 'Paiement non trouvé' });
  }
  const updatedData = { ...req.body };
  
      // Si un nouveau fichier est envoyé
      if (req.file) {
        // Supprimer l'ancien fichier si il existe
        if (paiement.fichier) {
          const oldPath = path.join('uploads', path.basename(paiement.fichier)); // attention à ne pas concaténer l'URL complète
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
  
        // Mettre à jour le champ fichier avec la nouvelle URL
        updatedData.fichier = BASE_URL + req.file.filename;
      } else {
        // Sinon, conserver le fichier existant
        updatedData.fichier = paiement.fichier;
      }
  
      await paiement.update(updatedData);
      console.log('Paiement mis à jour avec:', updatedData);
      res.json({ message: 'Paiement mis à jour', paiement });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la mise à jour', error: error.message });
    }
};

exports.delete = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const deleted = await Paiement.destroy({
      where: { id: req.params.id },
    });
    if (!deleted) return res.status(404).json({ message: 'Paiement non trouvé' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lister les paiements d'une structure
exports.getPaiementsByStructure = async (req, res) => {
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
      code_structure: code_structure
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
    const paiements = await Paiement.findAll({
      where: whereClause ,
      include: [
        { model: Magasin,attributes: ["id", "nom","telephone", "email"] },
        { model: User, attributes: ["id", "nom", "email"] }
      ], 
      order: [['createdAt', 'DESC']],
    });

    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

    const paiementsWithFichierUrl = paiements.map((paiement) => {
      const paie = paiement.toJSON(); // Convertit Sequelize instance en objet pur
      paie.fichierUrl = paie.fichier ? baseUrl + paie.fichier : null;
      return paie;
    });

    res.status(200).json(paiementsWithFichierUrl);

    //res.json(produits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des paiements', error });
  }
};

// Récupérer les paiements d'une structure par fournisseur
exports.getPaiementsByFournisseur = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure, fournisseurId } = req.params;

    const paiements = await Paiement.findAll({
      where: {
        code_structure: code_structure,
        fournisseurId: fournisseurId
      },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(paiements);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des paiements du fournisseur',
      error: error.message
    });
  }
};

// Récupérer les paiements d'une structure par client
exports.getPaiementsByClient = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure, clientId } = req.params;

    const paiements = await Paiement.findAll({
      where: {
        code_structure: code_structure,
        clientId: clientId
      },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(paiements);
  } catch (error) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des paiements du client',
      error: error.message
    });
  }
};
