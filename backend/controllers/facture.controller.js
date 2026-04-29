// controllers/facture.controller.js
const db = require('../models');
const Facture = db.Facture;
const Client = db.Client;
const Fournisseur = db.Fournisseur;
//const Magasin = db.Magasin;
const Bon = db.Bon;
//const Panier = db.Panier;
const MagasinClient = db.MagasinClient;
const MagasinFournisseur = db.MagasinFournisseur;
const PDFDocument = require('pdfkit');
const { Op,literal } = require('sequelize');

// ==================== SERVICES D'INTEGRATION ====================

/**
 * Récupère la dette actuelle d'un client pour un magasin spécifique
 */
async function getDetteActuelle(clientId, magasinId) {
  const magasinClient = await MagasinClient.findOne({
    where: { clientId, magasinId }
  });
  return magasinClient ? parseFloat(magasinClient.solde) : 0;
}

/**
 * Récupère la dette actuelle envers un fournisseur
 */
async function getDetteFournisseur(fournisseurId, magasinId) {
  const magasinFournisseur = await MagasinFournisseur.findOne({
    where: { fournisseurId, magasinId }
  });
  return magasinFournisseur ? parseFloat(magasinFournisseur.solde) : 0;
}
/**
 * Calcule les montants à partir d'un panier
 */
function calculerMontants(panier, remise = 0) {
  const montantHT = parseFloat(panier.totalHT) || 0;
  const montantTVA = parseFloat(panier.tva) || 0;
  const montantTTC = parseFloat(panier.totalTTC) || 0;
  const montantNet = montantTTC - remise;
  
  return { montantHT, montantTVA, montantTTC, montantNet };
}

// ==================== CRUD PRINCIPAL ====================

exports.createFactureCommande = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { bonId, commentaire } = req.body;
    
    const bon = await Bon.findByPk(bonId, {
      include: [
        { model: db.Panier, include: [{ model: db.ArticlePanier }] },
        { model: db.Client},
        { model: db.Magasin }
      ],
      transaction
    });
    
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    
    if (!bon.Client) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Ce bon n\'est pas associé à un client' });
    }
    
    const factureExistante = await Facture.findOne({
      where: { bonId, type_facture: 'commande', statut: { [Op.ne]: 'annulee' } },
      transaction
    });
    
    if (factureExistante) {
      await transaction.rollback();
      return res.status(409).json({ message: 'Un bon de commande existe déjà pour ce bon' });
    }
    
    const panier = bon.Panier;
    const { montantHT, montantTVA, montantTTC, montantNet } = calculerMontants(panier, 0);
    const detteApres = await getDetteActuelle(bon.Client.id, bon.magasinId);
    const detteAvant = detteApres - montantNet
    
    const facture = await Facture.create({
      code_structure: bon.code_structure,
      clientId: bon.Client.id,
      magasinId: bon.magasinId,
      bonId: bon.id,
      panierId: panier?.id,
      type_facture: 'commande',
      montant_ht: montantHT,
      montant_tva: montantTVA,
      montant_ttc: montantTTC,
      montant_remise: 0,
      montant_net: montantNet,
      dette_avant_facture: detteAvant,
      dette_apres_facture: detteAvant,
      statut: 'emise',
      date_facture: new Date(),
      commentaire: commentaire || `Bon de commande ${bon.numero}`,
      generated_by: authUser.nom || authUser.email
    }, { transaction });
    
    await transaction.commit();
    
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateFacturePDF(facture.id);
    } catch (pdfError) {
      console.error('Erreur génération PDF:', pdfError);
      return res.status(201).json({
        message: 'Bon de commande créé avec succès (PDF non généré)',
        facture,
        pdf: null,
        pdfError: pdfError.message
      });
    }
    
    res.status(201).json({
      message: 'Bon de commande créé avec succès',
      facture,
      pdf: pdfBuffer.toString('base64')
    });
    
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
};

/**
 * Créer une facture à partir d'un bon
 * POST /api/factures/from-bon
 */
exports.createFactureFromBon = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { bonId, type_facture = 'vente', remise = 0, commentaire } = req.body;
    
    const bon = await Bon.findByPk(bonId, {
      include: [
        { model: db.Panier, include: [{ model: db.ArticlePanier, include: [{ model: db.Produit}] }] },
        { model: db.Client},
        { model: db.Magasin}
      ],
      transaction
    });
    
    if (!bon) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Bon non trouvé' });
    }
    
    if (!bon.Client) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Ce bon n\'est pas associé à un client' });
    }
    
    const factureExistante = await Facture.findOne({
      where: { bonId, statut: { [Op.ne]: 'annulee' } },
      transaction
    });
    
    if (factureExistante) {
      await transaction.rollback();
      return res.status(409).json({ message: 'Une facture existe déjà pour ce bon' });
    }
    
    const panier = bon.Panier;
    const { montantHT, montantTVA, montantTTC, montantNet } = calculerMontants(panier, remise);
    const detteApres = await getDetteActuelle(bon.Client.id, bon.magasinId);
    const detteAvant = detteApres - montantNet;
    
    const facture = await Facture.create({
      code_structure: bon.code_structure,
      clientId: bon.Client.id,
      magasinId: bon.magasinId,
      bonId: bon.id,
      panierId: panier?.id,
      type_facture,
      montant_ht: montantHT,
      montant_tva: montantTVA,
      montant_ttc: montantTTC,
      montant_remise: remise,
      montant_net: montantNet,
      dette_avant_facture: detteAvant,
      dette_apres_facture: detteApres,
      statut: 'emise',
      date_facture: new Date(),
      commentaire: commentaire || `Facture générée depuis le bon ${bon.numero}`,
      generated_by: authUser.nom || authUser.email
    }, { transaction });
    
    await transaction.commit();
    
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateFacturePDF(facture.id);
    } catch (pdfError) {
      console.error('Erreur génération PDF:', pdfError);
      return res.status(201).json({
        message: 'Facture créée avec succès (PDF non généré)',
        facture,
        pdf: null,
        pdfError: pdfError.message
      });
    }
    
    res.status(201).json({
      message: 'Facture créée avec succès',
      facture,
      pdf: pdfBuffer.toString('base64')
    });
    
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Erreur création facture:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la facture', error: error.message });
  }
};

/**
 * Créer une facture d'avoir (annulation partielle ou totale)
 * POST /api/factures/avoir
 */
exports.createAvoir = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { factureId, montant, motif, commentaire } = req.body;
    //const { user } = req;
    
    // Récupérer la facture originale
    const factureOriginale = await Facture.findByPk(factureId, {
      include: [{ model: db.Client}],
      transaction
    });
    
    if (!factureOriginale) {
      return res.status(404).json({ message: 'Facture originale non trouvée' });
    }
    
    if (factureOriginale.statut === 'annulee') {
      return res.status(400).json({ message: 'Cette facture est déjà annulée' });
    }
    
    const montantAvoir = montant || factureOriginale.montant_net;
    const montantAvoirAbs = Math.abs(montantAvoir);
    
    // Calculer la nouvelle dette
    const detteApres = await getDetteActuelle(factureOriginale.clientId, factureOriginale.magasinId);
    const detteAvant = Math.max(0, detteApres - montantAvoirAbs);
    
    // Créer la facture d'avoir
    const avoir = await Facture.create({
      code_structure: factureOriginale.code_structure,
      clientId: factureOriginale.clientId,
      magasinId: factureOriginale.magasinId,
      bonId: factureOriginale.bonId,
      type_facture: 'avoir',
      montant_ht: -Math.abs(factureOriginale.montant_ht),
      montant_tva: -Math.abs(factureOriginale.montant_tva),
      montant_ttc: -montantAvoirAbs,
      montant_remise: 0,
      montant_net: -montantAvoirAbs,
      dette_avant_facture: detteAvant,
      dette_apres_facture: detteApres,
      statut: 'emise',
      date_facture: new Date(),
      commentaire: commentaire || `Avoir pour facture ${factureOriginale.numero_facture} - Motif: ${motif}`,
      generated_by:authUser.nom || authUser.email
    }, { transaction });
    
    // Mettre à jour le solde du client
    /* await MagasinClient.update(
      { solde: detteApres },
      { where: { clientId: factureOriginale.clientId, magasinId: factureOriginale.magasinId }, transaction }
    ); */
    
    // Marquer la facture originale comme annulée
    await factureOriginale.update({ statut: 'annulee' }, { transaction });
    
    await transaction.commit();
    
    // Générer le PDF
    const pdfBuffer = await generateFacturePDF(avoir.id);
    
    res.status(201).json({
      message: 'Avoir créé avec succès',
      avoir,
      pdf: pdfBuffer.toString('base64')
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur création avoir:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'avoir', error: error.message });
  }
};

/**
 * Créer une facture de régularisation (pour ajuster la dette sans bon)
 * POST /api/factures/regularisation
 */
exports.createFactureRegularisation = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { clientId, magasinId, montant, type, motif, commentaire } = req.body;
    //const { user } = req;
    
    const client = await Client.findByPk(clientId, { transaction });
    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }
    
    const montantAbs = Math.abs(montant);
    const detteAvant = await getDetteActuelle(clientId, magasinId);
    const detteApres = type === 'debit' ? detteAvant + montantAbs : Math.max(0, detteAvant - montantAbs);
    
    const facture = await Facture.create({
      code_structure: client.code_structure,
      clientId,
      magasinId,
      type_facture: 'regularisation',
      montant_ht: type === 'debit' ? montantAbs : -montantAbs,
      montant_tva: 0,
      montant_ttc: type === 'debit' ? montantAbs : -montantAbs,
      montant_remise: 0,
      montant_net: type === 'debit' ? montantAbs : -montantAbs,
      dette_avant_facture: detteAvant,
      dette_apres_facture: detteApres,
      statut: 'emise',
      date_facture: new Date(),
      commentaire: commentaire || `Régularisation: ${motif}`,
      generated_by: authUser.nom || authUser.email
    }, { transaction });
    
    /* await MagasinClient.update(
      { solde: detteApres },
      { where: { clientId, magasinId }, transaction }
    ); */
    
    await transaction.commit();
    
    const pdfBuffer = await generateFacturePDF(facture.id);
    
    res.status(201).json({
      message: 'Facture de régularisation créée',
      facture,
      pdf: pdfBuffer.toString('base64')
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
};

/**
 * Créer une facture d'achat (dette envers fournisseur)
 * POST /api/factures/achat
 */
exports.createFactureAchat = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { bonId, fournisseurId, magasinId, remise, commentaire } = req.body;
    
    let bon = null;
    let panier = null;
    let montantHT = 0, montantTVA = 0, montantTTC = 0, montantNet = 0;
    
    if (bonId) {
      bon = await Bon.findByPk(bonId, {
        include: [{ model: db.Panier, include: [{ model: db.ArticlePanier }] }],
        transaction
      });
      
      if (!bon) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Bon non trouvé' });
      }
      
      panier = bon.Panier;
      const calcul = calculerMontants(panier, remise);
      montantHT = calcul.montantHT;
      montantTVA = calcul.montantTVA;
      montantTTC = calcul.montantTTC;
      montantNet = calcul.montantNet;
    } else {
      const { montant } = req.body;
      montantNet = montant || 0;
      montantTTC = montantNet;
    }
    
    if (!fournisseurId) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Fournisseur requis' });
    }
    
    const fournisseur = await Fournisseur.findByPk(fournisseurId, { transaction });
    if (!fournisseur) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }
    
    // Récupérer la dette actuelle envers le fournisseur
    const detteApres = await getDetteFournisseur(fournisseurId, magasinId);
    const detteAvant = detteApres + montantNet;
    
    const facture = await Facture.create({
      code_structure: fournisseur.code_structure,
      fournisseurId,
      magasinId,
      bonId: bon?.id || null,
      panierId: panier?.id || null,
      type_facture: 'achat',
      montant_ht: montantHT,
      montant_tva: montantTVA,
      montant_ttc: montantTTC,
      montant_remise: remise,
      montant_net: montantNet,
      dette_avant_facture: detteAvant,
      dette_apres_facture: detteApres,
      statut: 'emise',
      date_facture: new Date(),
      commentaire: commentaire || (bon ? `Facture d'achat pour bon ${bon.numero}` : 'Facture d\'achat'),
      generated_by: authUser.nom || authUser.email
    }, { transaction });
    
    // Commit de la transaction AVANT la génération du PDF
    await transaction.commit();
    
    // Générer le PDF APRÈS le commit de la transaction
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateFacturePDF(facture.id);
    } catch (pdfError) {
      console.error('Erreur génération PDF:', pdfError);
      // Le PDF a échoué mais la facture est créée
      return res.status(201).json({
        message: 'Facture d\'achat créée avec succès (PDF non généré)',
        facture,
        pdf: null,
        pdfError: pdfError.message
      });
    }
    
    res.status(201).json({
      message: 'Facture d\'achat créée avec succès',
      facture,
      pdf: pdfBuffer.toString('base64')
    });
    
  } catch (error) {
    // Vérifier si la transaction est encore active avant rollback
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Erreur création facture achat:', error);
    res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
};
// ==================== FACTURES D'ACOMPTE ====================

/**
 * Créer une facture d'acompte
 * POST /api/factures/acompte
 */
/* exports.createFactureAcompte = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { clientId, magasinId, montant, commentaire, facture_finale_id } = req.body;
    //const { user } = req;
    
    if (!clientId) {
      return res.status(400).json({ message: 'Client requis' });
    }
    
    if (!montant || montant <= 0) {
      return res.status(400).json({ message: 'Montant d\'acompte valide requis' });
    }
    
    const client = await Client.findByPk(clientId, { transaction });
    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }
    
    // Vérifier que le client a une commande en cours
    let commandeRef = null;
    if (facture_finale_id) {
      commandeRef = await Facture.findOne({
        where: { id: facture_finale_id, clientId, type_facture: 'commande' },
        transaction
      });
    }
    
    // La dette actuelle n'est pas affectée par un acompte
    // L'acompte sera déduit de la future facture
    const detteAvant = await getDetteActuelle(clientId, magasinId);
    
    const facture = await Facture.create({
      code_structure: client.code_structure,
      clientId,
      magasinId,
      facture_parent_id: facture_finale_id || null,
      type_facture: 'acompte',
      montant_ht: montant,
      montant_tva: 0,
      montant_ttc: montant,
      montant_remise: 0,
      montant_net: montant,
      dette_avant_facture: detteAvant,
      dette_apres_facture: detteAvant, // L'acompte ne change pas la dette immédiatement
      montant_applique: 0,
      statut: 'emise',
      date_facture: new Date(),
      commentaire: commentaire || (commandeRef ? `Acompte pour commande ${commandeRef.numero_facture}` : 'Acompte client'),
      generated_by: authUser.nom || authUser.email
    }, { transaction });
    
    await transaction.commit();
    
    const pdfBuffer = await generateFacturePDF(facture.id);
    
    res.status(201).json({
      message: 'Facture d\'acompte créée avec succès',
      facture,
      pdf: pdfBuffer.toString('base64')
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création', error: error.message });
  }
};
 */

/**
 * Récupérer toutes les factures d'une structure
 * GET /api/factures
 */
/* exports.getFactures = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure, typeEntite } = req.params;
  
    const { 
      page = 1, 
      limit = 10, 
      statut, 
      type_facture, 
      //startDate, 
      //endDate 
    } = req.query;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }
    
    // Vérifier rôle
    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    let whereCondition = { code_structure,typeEntite };
    
    if (isAdmin) {
      // Admin -> tout dans la structure
      // (optionnel) filtre magasin si query donnée
    }

    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({ message: "Ce gérant n’est associé à aucun magasin" });
      }

      whereCondition.magasinId = authUser.magasinId;
    }

    else if (isCaissier || isEmploye) {
      // Caissier/Employé -> uniquement ses ventes
      whereCondition.agentId = authUser.id;

      // (Optionnel) si tu veux aussi limiter au magasin
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    }

    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    //const where = { code_structure, typeEntite };
    if (typeEntite === 'client') {
      whereCondition.clientId = { [Op.ne]: null };
    }
    else if (typeEntite === 'fournisseur') 
      {
      whereCondition.fournisseurId = { [Op.ne]: null };
    }

    if (statut) whereCondition.statut = statut;
    if (type_facture) whereCondition.type_facture = type_facture;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows } = await Facture.findAndCountAll({
      where:whereCondition,
      include: [
        { model: db.Client, attributes: ['id', 'nomComplet', 'telephone', 'adresse'] },
        { model: db.Magasin, attributes: ['id', 'nom'] },
        { model: db.Bon,attributes: ['id', 'numero', 'type'] }
      ],
      order: [['date_facture', 'DESC']],
      offset,
      limit: parseInt(limit)
    });
    
    res.json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
};
 */

exports.getFactures = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const { code_structure } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      statut, 
      search = '',
      type_facture,
      typeEntite,  // ← typeEntite dans query params
      startDate, 
      endDate 
    } = req.query;

    // Vérification : l'utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }
    
    console.log('Paramètres de filtres', code_structure, req.query);
    // Vérifier rôle
    const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur" || r.nom === "Administrateur secondaire");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    let whereCondition = { code_structure };
    
    // ========== GESTION DES RÔLES ==========
    if (isAdmin) {
      // Admin -> tout dans la structure
      // Pas de filtre supplémentaire
    }
    else if (isGerant) {
      // Gérant -> uniquement son magasin
      if (!authUser.magasinId) {
        return res.status(400).json({ message: "Ce gérant n'est associé à aucun magasin" });
      }
      whereCondition.magasinId = authUser.magasinId;
    }
    else if (isCaissier || isEmploye) {
      // Caissier/Employé -> uniquement ses ventes
      whereCondition.agentId = authUser.id;
      if (authUser.magasinId) {
        whereCondition.magasinId = authUser.magasinId;
      }
    }
    else {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // ========== FILTRES SUR L'ENTITÉ (CLIENT/FOURNISSEUR) ==========
    if (typeEntite === 'client') {
      whereCondition.clientId = { [Op.ne]: null };
      // Optionnel : exclure les fournisseurId
      whereCondition.fournisseurId = null;
    }
    else if (typeEntite === 'fournisseur') {
      whereCondition.fournisseurId = { [Op.ne]: null };
      // Optionnel : exclure les clientId
      whereCondition.clientId = null;
    }

    // 🔍 FILTRE DE RECHERCHE TEXTUELLE
    if (search) {
      whereCondition[Op.or] = [
        //{ '$Categorie.name$': { [Op.like]: `%${search}%` } },
        { commentaire: { [Op.like]: `%${search}%` } },
        { numero_facture: { [Op.like]: `%${search}%` } }
      ];

      // Recherche par date
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (datePattern.test(search)) {
        const [day, month, year] = search.split('/');
        const searchDate = new Date(`${year}-${month}-${day}`);
        if (!isNaN(searchDate)) {
          whereCondition[Op.or].push(
            literal(`DATE(	date_facture) = '${year}-${month}-${day}'`)
          );
        }
      } 
    }
    
    // ========== FILTRES STANDARDS ==========
    if (statut) whereCondition.statut = statut;
    if (type_facture) whereCondition.type_facture = type_facture;
    
    // ========== FILTRES PAR DATE ==========
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        whereCondition.date_facture = {
          [Op.between]: [start, end]
        };
      }
    }
     console.log('Paramètres de la clause where', whereCondition);
    // ========== PAGINATION ==========
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    
    const { count, rows } = await Facture.findAndCountAll({
      where: whereCondition,
      include: [
        { model: db.Client, attributes: ['id', 'nomComplet', 'telephone', 'adresse','email'] },
        { model: db.Fournisseur, attributes: ['id', 'nomComplet', 'telephone', 'adresse','email'] }, // ← Ajout pour les factures fournisseur
        { model: db.Magasin, attributes: ['id', 'nom'] },
        { model: db.Bon, attributes: ['id', 'numero', 'type'] }
      ],
      order: [['date_facture', 'DESC']],
      offset,
      limit: limitNum,
      distinct: true  // Important pour le count avec includes
    });
    
    //console.log('Facture récupérées ', rows)
    res.json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limitNum),
        limit: limitNum,
        hasNext: parseInt(page) * limitNum < count,
        hasPrev: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Erreur getFactures:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des factures', 
      error: error.message 
    });
  }
};

/**
 * Récupérer une facture par ID
 * GET /api/factures/:id
 */
exports.getFactureById = async (req, res) => {
  try {
    const facture = await Facture.findByPk(req.params.id, {
      include: [
        { model: db.Client },
        { model: db.Magasin},
        { 
          model: db.Panier, 
          include: [{ model: db.ArticlePanier, include: [{ model: db.Produit }] }]
        },
        { model: db.Bon}
      ]
    });
    
    if (!facture) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    
    res.json(facture);
    
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
};

/**
 * Annuler une facture
 * DELETE /api/factures/:id
 */
exports.annulerFacture = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  
  try {
    const facture = await Facture.findByPk(req.params.id, { transaction });
    
    if (!facture) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    
    if (facture.statut === 'annulee') {
      return res.status(400).json({ message: 'Facture déjà annulée' });
    }
    
    // Inverser l'effet sur la dette
    /* const effetDette = facture.type_facture === 'avoir' ? 
      -Math.abs(facture.montant_net) : 
      facture.montant_net; */
    
    //const detteActuelle = await getDetteActuelle(facture.clientId, facture.magasinId);
    //const nouvelleDette = detteActuelle - effetDette;
    
    /* await MagasinClient.update(
      { solde: Math.max(0, nouvelleDette) },
      { where: { clientId: facture.clientId, magasinId: facture.magasinId }, transaction }
    ); */
    
    await facture.update({ statut: 'annulee' }, { transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Facture annulée avec succès' });
    
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
};

// ==================== GENERATION PDF ====================
// ==================== GENERATION PDF ====================

/**
 * Formatage propre des montants - Version robuste
 */
function formatMoney(value) {
  // Convertir en nombre de manière robuste
  let num = 0;
  
  if (typeof value === 'string') {
    // Nettoyer la chaîne : enlever les espaces, remplacer la virgule par un point
    let cleaned = value.trim().replace(/\s/g, '');
    cleaned = cleaned.replace(',', '.');
    num = parseFloat(cleaned) || 0;
  } else if (typeof value === 'number') {
    num = isNaN(value) ? 0 : value;
  } else if (value !== null && value !== undefined) {
    num = parseFloat(value) || 0;
  }
  
  // Formatage français avec espaces comme séparateurs de milliers
  const parties = num.toFixed(0).split('.');
  const partieEntiere = parties[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const centimes = parties[1] ? ',' + parties[1].padEnd(2, '0') : '';
  
  return partieEntiere + centimes + ' FCFA';
}

/**
 * Gestion des sauts de page - Version améliorée
 */
function checkPageBreak(doc, heightNeeded = 50) {
  const bottomMargin = 50;
  const pageHeight = doc.page.height;
  
  if (doc.y + heightNeeded > pageHeight - bottomMargin) {
    doc.addPage();
    doc.y = 50;
    return true;
  }
  return false;
}

/**
 * Récupère le logo de la structure et le convertit en format utilisable par PDFKit
 */
async function getLogoBuffer(structure) {
  if (!structure || !structure.logo) return null;
  
  try {
    // Si le logo est un chemin de fichier local
    const fs = require('fs');
    const path = require('path');
    
    // Vérifier si c'est un chemin de fichier
    if (typeof structure.logo === 'string' && structure.logo.match(/\.(jpg|jpeg|png|gif|bmp)$/i)) {
      const logoPath = path.resolve(__dirname, '../../', structure.logo);
      if (fs.existsSync(logoPath)) {
        return logoPath;
      }
    }
    
    // Si le logo est en base64
    if (typeof structure.logo === 'string' && structure.logo.startsWith('data:image')) {
      // PDFKit accepte directement les dataURL
      return structure.logo;
    }
    
    return null;
  } catch (err) {
    console.error('Erreur chargement logo:', err.message);
    return null;
  }
}

/**
 * Génère le PDF d'une facture avec une mise en page professionnelle
 */
async function generateFacturePDF(factureId) {
  const facture = await Facture.findByPk(factureId, {
    include: [
      { model: db.Client },
      { model: db.Fournisseur },
      { model: db.Magasin },
      {
        model: db.Panier,
        include: [{ model: db.ArticlePanier, include: [{ model: db.Produit }] }]
      },
      { model: db.Bon }
    ]
  });

  if (!facture) {
    throw new Error('Facture non trouvée');
  }

  // Récupérer les informations de la structure
  const structure = await db.Structure.findOne({
    where: { code_structure: facture.code_structure }
  });

  // Récupérer le logo si disponible
  const logoBuffer = await getLogoBuffer(structure);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4',
      layout: 'portrait'
    });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ==================== CONSTANTES ====================
    const PAGE_WIDTH = doc.page.width;
    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = PAGE_WIDTH - 50;
    const CONTENT_WIDTH = PAGE_WIDTH - 100;

    // ==================== EN-TÊTE AVEC LOGO ====================
    const headerTop = doc.y;
    
    // Logo à GAUCHE
    let logoWidth = 0;
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, MARGIN_LEFT, headerTop, { width: 70, height: 70 });
        logoWidth = 80;
      } catch (err) {
        console.error('Erreur insertion logo:', err.message);
      }
    }

    // Informations de la structure (centrées ou décalées pour le logo)
    const titleX = logoWidth > 0 ? MARGIN_LEFT + logoWidth + 10 : MARGIN_LEFT;
    const titleWidth = logoWidth > 0 ? CONTENT_WIDTH - logoWidth - 10 : CONTENT_WIDTH;

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a5276');
    doc.text(structure?.nom_structure || 'ENTREPRISE', titleX, headerTop + 10, {
      width: titleWidth,
      align: 'center'
    });

    doc.fontSize(8).font('Helvetica').fillColor('#555555');
    let infoY = headerTop + 35;

    const structureInfos = [
      structure?.adresse,
      structure?.telephone ? `Tél: ${structure.telephone}` : null,
      structure?.email ? `Email: ${structure.email}` : null,
      structure?.numero_identification_fiscale ? `NINEA: ${structure.numero_identification_fiscale}` : null,
      structure?.registre_commerce ? `RCCM: ${structure.registre_commerce}` : null
    ].filter(Boolean);

    if (structureInfos.length > 0) {
      doc.text(structureInfos.join(' - '), titleX, infoY, {
        width: titleWidth,
        align: 'center'
      });
    }

    // Ligne de séparation
    doc.moveDown(1);
    const lineY = doc.y;
    doc.strokeColor('#1a5276').lineWidth(1.5);
    doc.moveTo(MARGIN_LEFT, lineY).lineTo(MARGIN_RIGHT, lineY).stroke();
    doc.moveDown(1);

    // ==================== TITRE DE LA FACTURE ====================
    const titreMap = {
      commande: 'BON DE COMMANDE',
      vente: 'FACTURE DE VENTE',
      achat: "FACTURE D'ACHAT",
      acompte: "FACTURE D'ACOMPTE",
      avoir: 'AVOIR',
      regularisation: 'FACTURE DE RÉGULARISATION'
    };

    const titre = titreMap[facture.type_facture] || 'FACTURE';
    const estAchat = facture.type_facture === 'achat';
    const estAvoir = facture.type_facture === 'avoir';
    const estCommande = facture.type_facture === 'commande';

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a5276');
    doc.text(titre, MARGIN_LEFT, doc.y, {
      width: CONTENT_WIDTH,
      align: 'center'
    });
    doc.moveDown(2);

    // ==================== CADRE DES INFORMATIONS FACTURE ====================
    const infoBoxY = doc.y;
    const boxHeight = 70;

    doc.rect(MARGIN_LEFT, infoBoxY, CONTENT_WIDTH, boxHeight)
       .fill('#f0f7ff')
       .stroke('#1a5276');

    doc.fillColor('#333333');
    doc.fontSize(9).font('Helvetica');

    const leftColX = MARGIN_LEFT + 15;
    const rightColX = MARGIN_LEFT + CONTENT_WIDTH / 2 + 15;
    let infoOffsetY = infoBoxY + 15;

    doc.text(`N° Facture: ${facture.numero_facture}`, leftColX, infoOffsetY);
    
    // Formatage de la date
    const dateFacture = facture.date_facture ? new Date(facture.date_facture) : new Date();
    doc.text(`Date: ${dateFacture.toLocaleDateString('fr-FR')}`, leftColX, infoOffsetY + 20);
    doc.text(`Magasin: ${facture.Magasin?.nom || '-'}`, leftColX, infoOffsetY + 40);
    
    doc.text(`Type: ${titre}`, rightColX, infoOffsetY);
    
    // Statut de la facture
    const statutColors = {
      emise: '#28a745',
      payee: '#007bff',
      annulee: '#dc3545'
    };
    doc.fillColor(statutColors[facture.statut] || '#6c757d');
    doc.text(`Statut: ${facture.statut?.toUpperCase() || 'ÉMISE'}`, rightColX, infoOffsetY + 20);
    doc.fillColor('#333333');

    doc.y = infoBoxY + boxHeight + 15;

    // ==================== CLIENT / FOURNISSEUR ====================
    checkPageBreak(doc, 100);

    const entiteBoxY = doc.y;
    const entiteBoxHeight = 80;

    doc.rect(MARGIN_LEFT, entiteBoxY, CONTENT_WIDTH, entiteBoxHeight)
       .fill('#f8f9fa')
       .stroke('#cccccc');

    doc.fillColor('#1a5276');
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text(estAchat ? 'FOURNISSEUR' : 'CLIENT', MARGIN_LEFT + 15, entiteBoxY + 10);

    doc.fillColor('#333333');
    doc.fontSize(9).font('Helvetica');

    const entite = estAchat ? facture.Fournisseur : facture.Client;
    const entiteContentY = entiteBoxY + 35;

    if (entite) {
      doc.text(`Nom: ${entite.nomComplet || '-'}`, MARGIN_LEFT + 15, entiteContentY);
      doc.text(`Adresse: ${entite.adresse || '-'}`, MARGIN_LEFT + 15, entiteContentY + 20);
      doc.text(`Téléphone: ${entite.telephone || '-'}`, MARGIN_LEFT + 15, entiteContentY + 40);
      doc.text(`Email: ${entite.email || '-'}`, MARGIN_LEFT + 280, entiteContentY);
      
      if (!estAchat && entite.plafond) {
        doc.text(`Plafond: ${formatMoney(entite.plafond)}`, MARGIN_LEFT + 280, entiteContentY + 20);
      }
    } else {
      doc.text('Informations non disponibles', MARGIN_LEFT + 15, entiteContentY);
    }

    doc.y = entiteBoxY + entiteBoxHeight + 15;

    // ==================== TABLEAU DES ARTICLES ====================
    if (facture.Panier?.ArticlePaniers?.length > 0) {
      checkPageBreak(doc, 60);

      const tableTop = doc.y;
      const colPositions = {
        designation: MARGIN_LEFT + 10,
        quantite: MARGIN_LEFT + 260,
        prixUnitaire: MARGIN_LEFT + 340,
        total: MARGIN_LEFT + 440
      };

      // En-tête du tableau
      doc.rect(MARGIN_LEFT, tableTop, CONTENT_WIDTH, 28).fill('#1a5276');
      doc.fillColor('#ffffff');
      doc.fontSize(9).font('Helvetica-Bold');

      doc.text('DÉSIGNATION', colPositions.designation, tableTop + 10);
      doc.text('QTÉ', colPositions.quantite, tableTop + 10);
      doc.text('PRIX UNITAIRE', colPositions.prixUnitaire, tableTop + 10);
      doc.text('TOTAL', colPositions.total, tableTop + 10);

      doc.fillColor('#333333');
      doc.font('Helvetica');
      
      let currentRowY = tableTop + 35;
      let rowCount = 0;

      for (const article of facture.Panier.ArticlePaniers) {
        // Vérifier l'espace disponible
        if (checkPageBreak(doc, 30)) {
          // Recalculer les positions après saut de page
          currentRowY = doc.y;
          
          // Re-tracer l'en-tête sur la nouvelle page
          doc.rect(MARGIN_LEFT, currentRowY, CONTENT_WIDTH, 28).fill('#1a5276');
          doc.fillColor('#ffffff');
          doc.fontSize(9).font('Helvetica-Bold');
          doc.text('DÉSIGNATION', colPositions.designation, currentRowY + 10);
          doc.text('QTÉ', colPositions.quantite, currentRowY + 10);
          doc.text('PRIX UNITAIRE', colPositions.prixUnitaire, currentRowY + 10);
          doc.text('TOTAL', colPositions.total, currentRowY + 10);
          doc.fillColor('#333333');
          doc.font('Helvetica');
          currentRowY += 35;
        }

        const designation = article.Produit?.designation || 'Produit sans nom';
        const quantite = parseFloat(article.quantite) || 0;
        const prixUnitaire = parseFloat(article.prixUnitaire) || 0;
        const total = quantite * prixUnitaire;

        // Ligne de séparation (sauf première ligne)
        if (rowCount > 0) {
          doc.strokeColor('#eeeeee').lineWidth(0.5);
          doc.moveTo(MARGIN_LEFT, currentRowY - 2)
             .lineTo(MARGIN_RIGHT, currentRowY - 2).stroke();
        }

        doc.text(designation.substring(0, 45), colPositions.designation, currentRowY);
        doc.text(quantite.toString(), colPositions.quantite, currentRowY);
        doc.text(formatMoney(prixUnitaire), colPositions.prixUnitaire, currentRowY);
        doc.text(formatMoney(total), colPositions.total, currentRowY);

        currentRowY += 22;
        doc.y = currentRowY;
        rowCount++;
      }

      // Ligne de fin de tableau
      doc.strokeColor('#1a5276').lineWidth(1);
      doc.moveTo(MARGIN_LEFT, currentRowY + 2)
         .lineTo(MARGIN_RIGHT, currentRowY + 2).stroke();
      
      doc.y = currentRowY + 15;
    }

    // ==================== TOTAUX (avec formatMoney) ====================
    checkPageBreak(doc, 120);

    const totalBoxX = MARGIN_LEFT + CONTENT_WIDTH - 220;
    const totalBoxWidth = 220;
    const totalBoxHeight = 110;

    doc.rect(totalBoxX, doc.y, totalBoxWidth, totalBoxHeight)
       .fill('#f8f9fa')
       .stroke('#cccccc');

    doc.fillColor('#333333');
    doc.fontSize(9).font('Helvetica');

    const montantHT = parseFloat(facture.montant_ht) || 0;
    const montantTVA = parseFloat(facture.montant_tva) || 0;
    const montantTTC = parseFloat(facture.montant_ttc) || 0;
    const montantRemise = parseFloat(facture.montant_remise) || 0;
    const montantNet = parseFloat(facture.montant_net) || 0;

    let totalY = doc.y + 12;

    doc.text('Sous-total HT:', totalBoxX + 15, totalY);
    doc.text(formatMoney(montantHT), totalBoxX + 190, totalY, { align: 'right' });
    totalY += 18;

    doc.text('TVA (18%):', totalBoxX + 15, totalY);
    doc.text(formatMoney(montantTVA), totalBoxX + 190, totalY, { align: 'right' });
    totalY += 18;

    doc.text('Total TTC:', totalBoxX + 15, totalY);
    doc.text(formatMoney(montantTTC), totalBoxX + 190, totalY, { align: 'right' });
    totalY += 18;

    if (montantRemise > 0) {
      doc.text('Remise:', totalBoxX + 15, totalY);
      doc.text(`- ${formatMoney(montantRemise)}`, totalBoxX + 190, totalY, { align: 'right' });
      totalY += 18;
    }

    doc.moveTo(totalBoxX, totalY + 5)
       .lineTo(totalBoxX + totalBoxWidth, totalY + 5).stroke();

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a5276');
    doc.text('NET À PAYER:', totalBoxX + 15, totalY + 12);
    doc.text(formatMoney(montantNet), totalBoxX + 190, totalY + 12, { align: 'right' });

    doc.fillColor('#333333');
    doc.y = totalY + totalBoxHeight + 10;

    // ==================== SITUATION DE LA DETTE (avec formatMoney) ====================
    if (!estCommande) {
      const detteAvant = parseFloat(facture.dette_avant_facture) || 0;
      const detteApres = parseFloat(facture.dette_apres_facture) || 0;

      if (detteAvant > 0 || detteApres > 0) {
        checkPageBreak(doc, 80);

        const detteBoxY = doc.y;
        const detteBoxHeight = 70;

        doc.rect(MARGIN_LEFT, detteBoxY, CONTENT_WIDTH, detteBoxHeight)
           .fill('#fff8e7')
           .stroke('#ffc107');

        doc.fillColor('#856404');
        doc.fontSize(9).font('Helvetica');

        const detteY = detteBoxY + 15;

        doc.text('SITUATION DE LA DETTE', MARGIN_LEFT + 15, detteY);
        
        if (estAvoir) {
          doc.text(`Avoir crédité: ${formatMoney(montantNet)}`, MARGIN_LEFT + 15, detteY + 25);
        } else {
          doc.text(`Dette avant facture: ${formatMoney(detteAvant)}`, MARGIN_LEFT + 15, detteY + 25);
          doc.text(`Dette après facture: ${formatMoney(detteApres)}`, MARGIN_LEFT + 280, detteY + 25);
        }

        doc.fillColor('#333333');
        doc.y = detteBoxY + detteBoxHeight + 10;
      }
    }

    // ==================== COMMENTAIRE ====================
    if (facture.commentaire) {
      checkPageBreak(doc, 40);
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
      doc.text(`Commentaire: ${facture.commentaire}`, MARGIN_LEFT, doc.y);
      doc.fillColor('#333333');
      doc.moveDown();
    }

    // ==================== PIED DE PAGE ====================
    const pageHeight = doc.page.height;
    
    doc.fontSize(7).font('Helvetica').fillColor('#999999');
    
    // Ligne de séparation
    doc.strokeColor('#cccccc').lineWidth(0.5);
    doc.moveTo(MARGIN_LEFT, pageHeight - 45)
       .lineTo(MARGIN_RIGHT, pageHeight - 45).stroke();

    const footerText = `Document généré le ${new Date().toLocaleString('fr-FR')}`;
    doc.text(footerText, MARGIN_LEFT, pageHeight - 35, {
      width: CONTENT_WIDTH,
      align: 'center'
    });

    // Mentions légales
    if (structure) {
      const legalMentions = [
        structure.numero_identification_fiscale ? `NINEA: ${structure.numero_identification_fiscale}` : null,
        structure.registre_commerce ? `RCCM: ${structure.registre_commerce}` : null,
        structure.statut_juridique ? `Statut: ${structure.statut_juridique}` : null
      ].filter(Boolean);

      if (legalMentions.length > 0) {
        doc.text(legalMentions.join(' - '), MARGIN_LEFT, pageHeight - 25, {
          width: CONTENT_WIDTH,
          align: 'center'
        });
      }
    }

    doc.fillColor('#000000');
    doc.end();
  });
}

/**
 * Générer et télécharger le PDF d'une facture
 * GET /api/factures/:id/pdf
 */
exports.downloadFacturePDF = async (req, res) => {
  try {
    const pdfBuffer = await generateFacturePDF(req.params.id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=facture_${req.params.id}.pdf`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF', error: error.message });
  }
};