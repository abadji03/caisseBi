const db = require('../models');
const logger = require('../services/logger.js');
const puppeteer = require('puppeteer-core');
const FonctionsUtilitaires  = require('./utils/fonctionsUtilitaires');
const kpiUtilitaires  = require('./utils/kpiCaisseUtilitaires');
const Panier = db.Panier;
const { Op, fn, col } = db.Sequelize;
// Import ExcelJS
const ExcelJS = require('exceljs');
const HistoriqueService = require('../services/historique.service');
const { findChromePath } = require('../utils/chromeFinder');

/**
 * Portée d'accès aux statistiques KPI (anti-IDOR), appliquée côté serveur :
 *  - Administrateur / Administrateur secondaire / Administrateur Général :
 *      toute la structure (magasinId/agentId libres) ;
 *  - Gérant : forcé à SON magasin (peut filtrer par agent, mais uniquement
 *      parmi les agents de son magasin) ;
 *  - Caissier / Employé : forcé à SES propres ventes (agentId = authUser.id),
 *      aucun agentId/magasinId issu du client n'est honoré.
 * @param {object} authUser req.user (chargé par authenticateToken, avec roles)
 * @param {object} query req.query du client
 * @returns {object} { magasinId, agentId } corrigés selon le rôle
 */
const porteeStatsKPI = (authUser, query = {}) => {
  const nomRoles = (authUser.roles || []).map(r => r.nom);
  const isPrivilege =
    nomRoles.includes('Administrateur') ||
    nomRoles.includes('Administrateur secondaire') ||
    nomRoles.includes('Administrateur Général');
  const isGerant = nomRoles.includes('Gérant');
  const isRestreint = nomRoles.includes('Caissier') || nomRoles.includes('Employé');

  if (isRestreint) {
    return { magasinId: authUser.magasinId || query.magasinId, agentId: authUser.id };
  }
  if (isGerant) {
    return { magasinId: authUser.magasinId || query.magasinId, agentId: query.agentId };
  }
  return { magasinId: query.magasinId, agentId: query.agentId };
};


//..................................... API pour KPI journaliers................................
// KPI caisse dans la journée
exports.getKpiCaisseJour = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    const { magasinId, agentId } = porteeStatsKPI(authUser, req.query);
     // Validation
    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis pour les statistiques journalières' 
      });
    }
    const { debutJournee, finJournee } = FonctionsUtilitaires .getPeriodeJournee();

    const params = {
      code_structure,
      debut:debutJournee,
      fin:finJournee,
      magasinId,
      agentId
    };

    //const data = await getCABaseData(whereCondition);

    const [caVendu, caEncaisse] = await Promise.all([
      kpiUtilitaires.getCAVenduBaseData(params),
      kpiUtilitaires.getCAEncaisseBaseData(params)
    ]);
    //return res.json(data);
    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: 'jour',
      debutJournee,
      finJournee,

      caVendu,
      caEncaisse,

      ecartCA: caVendu.totalVendu - caEncaisse.totalEncaisse
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getKpiCaisseJour:', error);
    res.status(500).json({ error: error.message });
  }
};

// Encaissements par mode + par compte
exports.getEncaissementsParMode = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const { fn, col, Op } = db.Sequelize;
    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({
        error: 'Le paramètre "code_structure" est requis'
      });
    }

    // Détermination période
    let dateCondition;
    let periodeLabel;

    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
      periodeLabel = periode;
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
      periodeLabel = 'jour';
    }

    // Condition panier
    const wherePanier = {
      code_structure,
      typeEntite: { [Op.ne]: 'fournisseur' },
      statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
      dateCreation: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId })
    };

    /* ============================
       1ï¸âƒ£ Encaissements par MÃ‰THODE
       ============================ */
    const paiementsParMethode = await db.Paiement.findAll({
      attributes: [
        'methodePaiement',
        [fn('SUM', col('Paiement.montant')), 'total']
      ],
      where:{
        code_structure,
        date:dateCondition,
        statutPaiement:'validé',
        ...(magasinId && { magasinId }),
      ...(agentId && { agentId })
      },
      include: [{
        model: Panier,
        attributes: [],
        required: false,
        where: wherePanier
      }],
      group: ['methodePaiement'],
      raw: true
    });

    /* ============================
       2ï¸âƒ£ Encaissements par COMPTE
       ============================ */
    const paiementsParCompte = await db.Paiement.findAll({
      attributes: [
        'compte',
        [fn('SUM', col('Paiement.montant')), 'total']
      ],
      where:{
        code_structure,
        date:dateCondition,
        statutPaiement:'validé',
        ...(magasinId && { magasinId }),
      ...(agentId && { agentId })
      },
      include: [{
        model: Panier,
        attributes: [],
        required: false,
        where: wherePanier
      }],
      group: ['compte'],
      raw: true
    });

    const niveau = magasinId ? 'magasin' : 'structure';

    return res.json({
      niveau,
      periode: periodeLabel,
      parMethode: paiementsParMethode,
      parCompte: paiementsParCompte
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getEncaissementsParMode:', error);
    res.status(500).json({ error: error.message });
  }
};


// Remises accordées
exports.getStatsRemises = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const { Op } = db.Sequelize;
    const code_structure = authUser.code_structure;
    // Validation : code_structure toujours requis
    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    // Déterminer les dates selon la période ou le jour courant
    let dateCondition;
    
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [db.Sequelize.Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [db.Sequelize.Op.between]: [debutJournee, finJournee] };
    }
    const whereCondition = {
      code_structure,
      statut: { [db.Sequelize.Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS_SANS_EN_COURS },
      [Op.or]: [
        { remise: { [Op.gt]: 0 } },
        { remiseGlobale: { [Op.gt]: 0 } }
      ],
      typeEntite: { [Op.ne]: 'fournisseur' },
      dateCreation: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };
    const stats = await Panier.findAll({
      attributes: [
        [db.Sequelize.fn('SUM', db.Sequelize.col('remise')), 'totalRemise'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'nombrePaniers']
      ],
      where: whereCondition,
      raw:true
    });

    return res.json(stats[0] || { totalRemise: 0, nombrePaniers: 0 });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getStatsRemises:', error);
    res.status(500).json({ error: error.message });
  }
};

// Avoirs émis (bons de type avoir)
exports.getAvoirs = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const { Op, fn, col } = db.Sequelize;

    const code_structure = authUser.code_structure;

    // Validation : code_structure toujours requis
    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    // Déterminer les dates selon la période ou le jour courant
    let dateCondition;
    
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    // Condition pour les bons de type avoir
    const whereBon = {
      code_structure,
      type: 'avoir',
      typeEntite: 'client',
      dateBon: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    const result = await db.Bon.findAll({
      attributes: [
        [fn('SUM', col('montant_avoir')), 'montantAvoir'],
        [fn('COUNT', col('id')), 'nombreAvoirs']
      ],
      where: whereBon,
      raw:true
    });

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      ...(result[0] || { montantAvoir: 0, nombreAvoirs: 0 })
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getAvoirs:', error);
    res.status(500).json({ error: error.message });
  }
};
// Caisse théorique
exports.getCaisseTheorique = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const { Op } = db.Sequelize;
    const code_structure = authUser.code_structure;

    // -------------------------
    // VALIDATION
    // -------------------------
    if (!code_structure) {
      return res.status(400).json({
        error: 'Le paramètre "code_structure" est requis'
      });
    }

    // -------------------------
    // DATES
    // -------------------------
    let dateCondition;
    if (periode) {
      const { debut, fin } =
        FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } =
        FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    // -------------------------
    // WHERE PANIER (SOURCE TEMPORELLE)
    // -------------------------
    const wherePanier = {
      code_structure,
      typeEntite: { [Op.ne]: 'fournisseur' },
      statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
      dateCreation: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    // -------------------------
    // WHERE PAIEMENT
    // -------------------------
    const wherePaiement = {
      methodePaiement: 'Espèce',
      typePaiement: { [Op.ne]: 'fournisseur' },
      statutPaiement: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS }
    };

    // -------------------------
    // REQUÃŠTE
    // -------------------------
    const totalEspeces = await db.Paiement.sum('montant', {
      where: wherePaiement,
      include: [{
        model: Panier,
        where: wherePanier,
        attributes: []
      }]
    });

    return res.json({
      caisseTheorique: totalEspeces || 0,
      niveau: magasinId ? 'magasin' : 'structure'
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getCaisseTheorique:', error);
    res.status(500).json({ error: error.message });
  }
};

//..................................... API pour KPI par période................................
exports.getStatsCaissePeriode = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const code_structure = authUser.code_structure;

    if (!periode || !code_structure) {
      return res.status(400).json({
        error: 'Les paramètres "periode" et "code_structure" sont requis'
      });
    }

    const { debut, fin } =
      FonctionsUtilitaires.getPeriodeDates(periode, dateReference);

    const params = {
      code_structure,
      debut,
      fin,
      magasinId,
      agentId
    };

    const [caVendu, caEncaisse] = await Promise.all([
      kpiUtilitaires.getCAVenduBaseData(params),
      kpiUtilitaires.getCAEncaisseBaseData(params)
    ]);

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode,
      debut,
      fin,
      caVendu,
      caEncaisse,
      ecartCA: caVendu.totalVendu - caEncaisse.totalEncaisse
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getStatsCaissePeriode:', error);
    res.status(500).json({ error: error.message });
  }
};

//Méthode de calcul des variations
const calculVariation = (actuel, precedent) => {
  if (precedent > 0) {
    return ((actuel - precedent) / precedent) * 100;
  }
  return actuel > 0 ? 100 : 0;
};

exports.getStatsComparatives = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const code_structure = authUser.code_structure;
    // ========================
    // Validation
    // ========================
    if (!periode || !code_structure) {
      return res.status(400).json({
        error: 'Les paramètres "periode" et "code_structure" sont requis'
      });
    }

    // ========================
    // Définition des périodes
    // ========================
    const periodeActuelle =
      FonctionsUtilitaires.getPeriodeDates(periode, dateReference);

    const periodePrecedente =
      FonctionsUtilitaires.getPeriodePrecedente(periode, dateReference);

    // ========================
    // Récupération des données
    // ========================
    const [
      caVenduActuel,
      caVenduPrecedent,
      caEncaisseActuel,
      caEncaissePrecedent
    ] = await Promise.all([
      kpiUtilitaires.getCAVenduBaseData({
        code_structure,
        magasinId,
        agentId,
        debut: periodeActuelle.debut,
        fin: periodeActuelle.fin
      }),
      kpiUtilitaires.getCAVenduBaseData({
        code_structure,
        magasinId,
        agentId,
        debut: periodePrecedente.debut,
        fin: periodePrecedente.fin
      }),
      kpiUtilitaires.getCAEncaisseBaseData({
        code_structure,
        magasinId,
        agentId,
        debut: periodeActuelle.debut,
        fin: periodeActuelle.fin
      }),
      kpiUtilitaires.getCAEncaisseBaseData({
        code_structure,
        magasinId,
        agentId,
        debut: periodePrecedente.debut,
        fin: periodePrecedente.fin
      })
    ]);

    // ========================
    // Variations
    // ========================
    const variationVendu = calculVariation(
      caVenduActuel.totalVendu,
      caVenduPrecedent.totalVendu
    );

    const variationEncaisse = calculVariation(
      caEncaisseActuel.totalEncaisse,
      caEncaissePrecedent.totalEncaisse
    );

    // ========================
    // Réponse
    // ========================
    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode,

      vaCAVendu: {
        actuel: caVenduActuel.totalVendu,
        precedent: caVenduPrecedent.totalVendu,
        variationPourcent: Number(variationVendu.toFixed(2))
      },

      vaCAEncaisse: {
        actuel: caEncaisseActuel.totalEncaisse,
        precedent: caEncaissePrecedent.totalEncaisse,
        variationPourcent: Number(variationEncaisse.toFixed(2))
      }
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getStatsComparatives:', error);
    res.status(500).json({ error: error.message });
  }
};


// CA par jour (VENDU + ENCAISSÃ‰)
exports.getCAParJour = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const { fn, col, Op } = db.Sequelize;

    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({
        error: 'Le paramètre "code_structure" est requis'
      });
    }

    // Période par défaut : mois
    const periodToUse = periode || 'mois';
    const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periodToUse, dateReference);

    /* ============================
       1ï¸âƒ£ CA VENDU PAR JOUR
       ============================ */
    const caVenduParJour = await db.Panier.findAll({
      attributes: [
        [fn('DATE', col('Panier.date_creation')), 'date'],
        [fn('SUM', col('Panier.total_t_t_c')), 'total'],
        [fn('COUNT', col('Panier.id')), 'nombrePaniers']
      ],
      where: {
        code_structure,
        typeEntite: { [Op.ne]: 'fournisseur' },
        statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
        dateCreation: { [Op.between]: [debut, fin] },
        ...(magasinId && { magasinId }),
        ...(agentId && { agentId })
      },
      group: [fn('DATE', col('Panier.date_creation'))],
      order: [[fn('DATE', col('Panier.date_creation')), 'ASC']],
      raw: true
    });

    /* ============================
       2ï¸âƒ£ CA ENCAISSÃ‰ PAR JOUR
       ============================ */
    const caEncaisseParJour = await db.Paiement.findAll({
      attributes: [
        [fn('DATE', col('Paiement.date')), 'date'],
        [fn('SUM', col('Paiement.montant')), 'total'],
        [fn('COUNT', col('Paiement.id')), 'nombrePaiements']
      ],
      where: {
        code_structure,
        typePaiement: { [Op.ne]: 'fournisseur' },
        statutPaiement: 'validé',
        date: { [Op.between]: [debut, fin] },
        ...(magasinId && { magasinId }),
        ...(agentId && { agentId })
      },
      group: [fn('DATE', col('Paiement.date'))],
      order: [[fn('DATE', col('Paiement.date')), 'ASC']],
      raw: true
    });

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periodToUse,
      debut,
      fin,
      caVenduParJour,
      caEncaisseParJour
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getCAParJour:', error);
    res.status(500).json({ error: error.message });
  }
};

//..................................... API pour KPI par structure................................
// KPI caisse (alias de getStatsCaissePeriode avec validation de code_structure)
exports.getKpiCaisse = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({ error: 'Le paramètre "code_structure" est requis' });
    }

    if (!periode) {
      return res.status(400).json({ error: 'Le paramètre "periode" est requis' });
    }

    const { debut, fin } = FonctionsUtilitaires .getPeriodeDates(periode, dateReference);
    
    const params = {
      code_structure,
      debut,
      fin,
      magasinId,
      agentId
    };

    //const data = await getCABaseData(whereCondition);

    const [caVendu, caEncaisse] = await Promise.all([
      kpiUtilitaires.getCAVenduBaseData(params),
      kpiUtilitaires.getCAEncaisseBaseData(params)
    ]);
    //return res.json(data);
    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: 'jour',
      debut,
      fin,

      caVendu,
      caEncaisse,

      ecartCA: caVendu.totalVendu - caEncaisse.totalEncaisse
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getKpiCaisse:', error);
    res.status(500).json({ error: error.message });
  }
};

// Comparer le CA d'un magasin vs sa structure
exports.compareMagasinVsStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { periode, dateReference, magasinId } = req.query;
    const code_structure = authUser.code_structure;

    if (!code_structure || !magasinId) {
      return res.status(400).json({ error: 'Les paramètres "code_structure" et "magasinId" sont requis' });
    }

    if (!periode) {
      return res.status(400).json({ error: 'Le paramètre "periode" est requis' });
    }

    const whereStructure = kpiUtilitaires.buildWhereCondition({ periode, dateReference, code_structure });
    const whereMagasin = kpiUtilitaires.buildWhereCondition({ periode, dateReference, code_structure, magasinId });

    const [caStructure, caMagasin] = await Promise.all([
      Panier.sum('total_t_t_c', { where: whereStructure }),
      Panier.sum('total_t_t_c', { where: whereMagasin })
    ]);

    const partMagasin = caStructure && caStructure > 0
      ? (caMagasin / caStructure) * 100
      : 0;

    res.json({
      periode,
      structure: caStructure || 0,
      magasin: caMagasin || 0,
      partMagasin: Number(partMagasin.toFixed(2))
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur compareMagasinVsStructure:', error);
    res.status(500).json({ error: error.message });
  }
};

// Statistiques par magasin pour une structure
exports.getStatsStructureParMagasin = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference } = req.query;
    const { Op, fn, col } = db.Sequelize;

    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({ error: 'Le paramètre "code_structure" est requis' });
    }

    if (!periode) {
      return res.status(400).json({ error: 'Le paramètre "periode" est requis' });
    }

    const { debut, fin } = FonctionsUtilitaires .getPeriodeDates(periode, dateReference);

    const stats = await Panier.findAll({
      attributes: [
        'magasinId',
        [fn('SUM', col('Panier.total_t_t_c')), 'totalCA'],
        [fn('COUNT', col('Panier.id')), 'nombrePaniers'],
        [fn('AVG', col('Panier.total_t_t_c')), 'ticketMoyen']
      ],
      where: {
        code_structure,
        typeEntite: { [Op.ne]: 'fournisseur' },
        statut: { [db.Sequelize.Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
        dateCreation: { [db.Sequelize.Op.between]: [debut, fin] }
      },
      group: ['magasinId'],
      include: [{
        model: db.Magasin,
        attributes: ['id', 'nom'],
        required: true // Assure que seulement les magasins avec des ventes sont inclus
      }],
      order: [[fn('SUM', col('total_t_t_c')), 'DESC']]
    });

    res.json({
      periode,
      debut,
      fin,
      structure: code_structure,
      stats
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getStatsStructureParMagasin:', error);
    res.status(500).json({ error: error.message });
  }
};

//..................................... API pour les ventes à crédit................................

// Ventes à crédit (bons de type vente avec typeEntite client)
exports.getVentesCredit = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    //const { Op,fn,col } = db.Sequelize;

    const code_structure = authUser.code_structure;

     if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    const data = await kpiUtilitaires.getVentesCreditData({ code_structure, periode, dateReference, magasinId, agentId });
    return res.json(data);

    /*// Déterminer les dates
    let dateCondition;
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    // Condition pour les bons de vente à crédit
    const whereBon = {
      code_structure,
      type: 'vente',
      typeEntite: 'client',
      dateBon: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    // Récupérer les IDs des bons de vente à crédit
    const bonsCredit = await db.Bon.findAll({
      attributes: ['id', 'numero'],
      where: whereBon
    });

    const bonIds = bonsCredit.map(bon => bon.id);
    //const bonNumeros = bonsCredit.map(bon => bon.numero);

    let totalMontant = 0;
    let nombrePaniers = 0;

    if (bonIds.length > 0) {
      // Récupérer les paniers associés à ces bons
      const paniersCredit = await Panier.findAll({
        attributes: [
          [fn('SUM', col('totalTTC')), 'totalMontant'],
          [fn('COUNT', col('id')), 'nombrePaniers']
        ],
        where: {
          bonId: { [Op.in]: bonIds },
          statut: { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] }
        },
        raw:true
      });

      const result = paniersCredit[0] || {};
      totalMontant = parseFloat(result.totalMontant) || 0;
      nombrePaniers = parseInt(result.nombrePaniers) || 0;
    }

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      montantCredit: totalMontant,
      nombrePaniersCredit: nombrePaniers,
      nombreBonsCredit: bonIds.length
    });
 */
  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getVentesCredit:', error);
    res.status(500).json({ error: error.message });
  }
};

// Avances (bons avec colonne avance non nulle)
exports.getAvances = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    //const { Op, fn, col } = db.Sequelize;

    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }
    const data = await kpiUtilitaires.getAvancesData({code_structure,periode,dateReference,magasinId,agentId})
    return res.json(data);
    // Déterminer les dates
    /* let dateCondition;
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    // Condition pour les bons avec avance
    const whereBon = {
      code_structure,
      type:'vente',
      typeEntite:'client',
      dateBon: dateCondition,
      avance: { [Op.ne]: null },
      [Op.or]: [
        { avance: { [Op.ne]: 0 } },
        { avance: { [Op.gt]: 0 } }
      ],
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    const result = await db.Bon.findAll({
      attributes: [
        [fn('SUM', col('avance')), 'totalAvances'],
        [fn('COUNT', col('id')), 'nombreAvances'],
        [fn('AVG', col('avance')), 'moyenneAvance']
      ],
      where: whereBon,
      raw:true
    });

    const data = result[0] || {};
    
    // Récupérer les paniers associés à ces avances
    const bonIds = await db.Bon.findAll({
      attributes: ['id'],
      where: whereBon
    }).then(bons => bons.map(b => b.id));

    let nombrePaniers = 0;
    if (bonIds.length > 0) {
      const paniersCount = await Panier.count({
        where: {
          bonId: { [Op.in]: bonIds },
          statut: { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] }
        }
      });
      nombrePaniers = paniersCount;
    }

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      totalAvances: parseFloat(data.totalAvances) || 0,
      nombreAvances: parseInt(data.nombreAvances) || 0,
      nombrePaniersAvecAvance: nombrePaniers,
      moyenneAvance: parseFloat(data.moyenneAvance) || 0
    });
 */
  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getAvances:', error);
    res.status(500).json({ error: error.message });
  }
};

// Ventes à crédit annulées ou retournées (bons de retour)
/* exports.getVentesCreditAnnulees = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op } = db.Sequelize;

    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    // Déterminer les dates
    let dateCondition;
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    // Trouver les bons de retour
    const whereBonRetour = {
      code_structure,
      type: 'retour',
      typeEntite: 'client',
      dateBon: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    // Récupérer les bons de retour et leurs numéros d'origine
    const bonsRetour = await db.Bon.findAll({
      attributes: ['id', 'numero','montantTotal', 'numeroBonOrigine', 'montantAvoir'],
      where: whereBonRetour
    });

    let totalMontantRetour = 0;
    let nombreRetours = 0;
    let nombreRetoursTotaux = 0;
    let nombreRetoursPartiels = 0;
    const retoursDetails = [];

    if (bonsRetour.length > 0) {
      // Pour chaque bon de retour, vérifier le bon d'origine
      for (const bonRetour of bonsRetour) {
        if (bonRetour.numeroBonOrigine) {
          // Trouver le bon d'origine
          const bonOrigine = await db.Bon.findOne({
            where: {
              numero: bonRetour.numeroBonOrigine,
              type: 'vente',
              typeEntite: 'client'
            }
          });

          if (bonOrigine) {
            // Vérifier si c'est un retour total ou partiel
            const montantOrigine = parseFloat(bonOrigine.montantAvoir) ||parseFloat(bonOrigine.montantTotal)|| 0;
            const montantRetour = parseFloat(bonRetour.montantAvoir) ||parseFloat(bonRetour.montantTotal) || 0;
            
            const estRetourTotal = Math.abs(montantOrigine - montantRetour) < 0.01; // Tolérance pour les arrondis
            
            retoursDetails.push({
              numeroRetour: bonRetour.numero,
              numeroOrigine: bonRetour.numeroBonOrigine,
              montantOrigine,
              montantRetour,
              type: estRetourTotal ? 'total' : 'partiel'
            });

            totalMontantRetour += montantRetour;
            nombreRetours++;
            
            if (estRetourTotal) {
              nombreRetoursTotaux++;
            } else {
              nombreRetoursPartiels++;
            }
          }
        }
      }
    }

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      totalMontantRetour,
      nombreRetours,
      nombreRetoursTotaux,
      nombreRetoursPartiels,
      details: retoursDetails
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getVentesCreditAnnulees:', error);
    res.status(500).json({ error: error.message });
  }
};
 */
exports.getVentesCreditAnnulees = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    //const { Op } = db.Sequelize;
    
    const code_structure = authUser.code_structure;
    
    if (!code_structure) {
      return res.status(400).json({
        error: 'Le paramètre "code_structure" est requis'
      });
    }

    const data = await kpiUtilitaires.getVentesCreditAnnuleesData({code_structure,periode,dateReference,magasinId,agentId})
    
    return res.json(data)

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getVentesCreditAnnulees:', error);
    res.status(500).json({ error: error.message });
  }
};

// Ventes en caisse annulées ou retournées
exports.getVentesCaisseAnnulees = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    //const { Op,fn, col } = db.Sequelize;

    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    const data = await kpiUtilitaires.getVentesCaisseAnnuleesData({code_structure,periode,dateReference,magasinId,agentId});

    // Déterminer les dates
    /* let dateCondition;
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    // Condition pour les paniers annulés ou retournés
    const wherePanier = {
      code_structure,
      dateCreation: dateCondition,
      typeEntite:'autre',
      statut: { [Op.in]: ['annulé', 'retourné'] },
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    // 1. Récupérer les statistiques des paniers annulés/retournés
    const statsPaniers = await Panier.findAll({
      attributes: [
        'statut',
        [fn('SUM', col('Panier.totalTTC')), 'totalMontant'],
        [fn('COUNT', col('Panier.id')), 'nombrePaniers']
      ],
      where: wherePanier,
      group: ['statut']
    });

    // 2. Récupérer les paiements annulés associés à ces paniers
    const paniersIds = await Panier.findAll({
      attributes: ['id'],
      where: wherePanier
    }).then(paniers => paniers.map(p => p.id));

    let totalPaiementsAnnules = 0;
    let nombrePaiementsAnnules = 0;

    if (paniersIds.length > 0) {
      const paiementsAnnules = await db.Paiement.findAll({
        attributes: [
          [fn('SUM', col('montant')), 'totalPaiementsAnnules'],
          [fn('COUNT', col('id')), 'nombrePaiementsAnnules']
        ],
        where: {
          panierId: { [Op.in]: paniersIds },
          statutPaiement: 'annulé',
          typePaiement: 'autre'
        },
        raw:true
      });

      const resultPaiements = paiementsAnnules[0] || {};
      totalPaiementsAnnules = parseFloat(resultPaiements.totalPaiementsAnnules) || 0;
      nombrePaiementsAnnules = parseInt(resultPaiements.nombrePaiementsAnnules) || 0;
    }

    // 3. Regrouper les résultats
    const result = {
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      totalPaniersAnnules: 0,
      totalMontantAnnule: 0,
      totalPaniersRetournes: 0,
      totalMontantRetourne: 0,
      totalPaiementsAnnules,
      nombrePaiementsAnnules,
      details: {}
    };

    // Remplir les détails par statut
    statsPaniers.forEach(stat => {
      const statut = stat.dataValues.statut;
      const montant = parseFloat(stat.dataValues.totalMontant) || 0;
      const nombre = parseInt(stat.dataValues.nombrePaniers) || 0;
      
      result.details[statut] = { montant, nombre };
      
      if (statut === 'annulé') {
        result.totalPaniersAnnules = nombre;
        result.totalMontantAnnule = montant;
      } else if (statut === 'retourné') {
        result.totalPaniersRetournes = nombre;
        result.totalMontantRetourne = montant;
      }
    });

    // 4. Calculer les totaux généraux
    result.totalPaniers = result.totalPaniersAnnules + result.totalPaniersRetournes;
    result.totalMontant = result.totalMontantAnnule + result.totalMontantRetourne;
 */
    return res.json(data);

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getVentesCaisseAnnulees:', error);
    res.status(500).json({ error: error.message });
  }
};

// API combinée pour toutes les statistiques spéciales
exports.getToutesStatistiquesSpeciales = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };

    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    // Exécuter toutes les requÃªtes en parallèle
    const [
      avoirs,
      ventesCredit,
      avances,
      ventesCreditAnnulees,
      ventesCaisseAnnulees
    ] = await Promise.all([
      // Appeler la fonction getAvoirs (mais nous devons reconstruire la logique ici)
      (async () => {
        const { Op,fn, col } = db.Sequelize;
        let dateCondition;
        if (periode) {
          const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
          dateCondition = { [Op.between]: [debut, fin] };
        } else {
          const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
          dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        const whereBon = {
          code_structure,
          type: 'avoir',
          typeEntite: 'client',
          dateBon: dateCondition,
          ...(magasinId && { magasinId }),
          ...(agentId && { agentId: agentId })
        };

        const result = await db.Bon.findAll({
          attributes: [
            [fn('SUM', col('montant_avoir')), 'montantAvoir'],
            [fn('COUNT', col('id')), 'nombreAvoirs']
          ],
          where: whereBon
        });

        return result[0] || { montantAvoir: 0, nombreAvoirs: 0 };
      })(),
      
      /* // Appeler la fonction getVentesCredit
      exports.getVentesCredit({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data }),
      
      // Appeler la fonction getAvances
      exports.getAvances({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data }),
      
      // Appeler la fonction getVentesCreditAnnulees
      exports.getVentesCreditAnnulees({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data }),
      
      // Appeler la fonction getVentesCaisseAnnulees
      exports.getVentesCaisseAnnulees({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data }) */
      kpiUtilitaires.getVentesCreditData({ code_structure, periode, dateReference, magasinId, agentId }),
      kpiUtilitaires.getAvancesData({ code_structure, periode, dateReference, magasinId, agentId }),
      kpiUtilitaires.getVentesCreditAnnuleesData({ code_structure, periode, dateReference, magasinId, agentId }),
      kpiUtilitaires.getVentesCaisseAnnuleesData({ code_structure, periode, dateReference, magasinId, agentId })
    ]);

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      avoirs,
      ventesCredit,
      avances,
      ventesCreditAnnulees,
      ventesCaisseAnnulees,
      resume: {
        totalAvoirs: avoirs.montantAvoir || 0,
        totalVentesCredit: ventesCredit.montantCredit || 0,
        totalAvances: avances.totalAvances || 0,
        totalRetours: ventesCreditAnnulees.totalMontantRetour || 0,
        totalAnnulations: ventesCaisseAnnulees.totalMontant || 0
      }
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getToutesStatistiquesSpeciales:', error);
    res.status(500).json({ error: error.message });
  }
};


//..................................... API pour KPI journaliers................................
//Statistiques des commandes clients
exports.getStatistiquesCommandes = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = { ...req.query, ...porteeStatsKPI(authUser, req.query) };
    const { Op, fn, col } = db.Sequelize;

    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    // Déterminer les dates
    let dateCondition;
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    // Condition de base pour les commandes
    const whereBase = {
      code_structure,
      type: 'commande',
      typeEntite:'client',
      dateBon: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    // 1. Commandes validées
    const whereCommandesValidees = {
      ...whereBase,
      statutBon: 'validé'
    };

    const commandesValidees = await db.Bon.findAll({
      attributes: ['id', 'numero', 'netAPayer'],
      where: whereCommandesValidees
    });

    // Calcul des statistiques pour les commandes validées
    const statsCommandesValidees = {
      nombre: commandesValidees.length,
      montantTotal: commandesValidees.reduce((sum, cmd) => sum + (parseFloat(cmd.netAPayer) || 0), 0)
    };

    // Récupérer les paniers des commandes validées
    const bonIdsValidees = commandesValidees.map(cmd => cmd.id);
    let nombrePaniersValidees = 0;
    let montantPaniersValidees = 0;

    if (bonIdsValidees.length > 0) {
      const paniersValidees = await Panier.findAll({
        attributes: [
          [fn('SUM', col('total_t_t_c')), 'totalMontant'],
          [fn('COUNT', col('id')), 'nombrePaniers']
        ],
        where: {
          bonId: { [Op.in]: bonIdsValidees },
          statut: 'validé'
        },
        raw: true
      });

      const result = paniersValidees[0] || {};
      montantPaniersValidees = parseFloat(result.totalMontant) || 0;
      nombrePaniersValidees = parseInt(result.nombrePaniers) || 0;
    }

    // 2. Commandes livrées
    const whereCommandesLivrees = {
      ...whereBase,
      statutBon: 'livré'
    };

    const commandesLivrees = await db.Bon.findAll({
      attributes: ['id', 'numero', 'netAPayer'],
      where: whereCommandesLivrees
    });

    // Calcul des statistiques pour les commandes livrées
    const statsCommandesLivrees = {
      nombre: commandesLivrees.length,
      montantTotal: commandesLivrees.reduce((sum, cmd) => sum + (parseFloat(cmd.netAPayer) || 0), 0)
    };

    // 3. Commandes annulées
    const whereCommandesAnnulees = {
      ...whereBase,
      statutBon: 'annulé'
    };

    const commandesAnnulees = await db.Bon.findAll({
      attributes: ['id', 'numero', 'netAPayer'],
      where: whereCommandesAnnulees
    });

    // Calcul des statistiques pour les commandes annulées
    const statsCommandesAnnulees = {
      nombre: commandesAnnulees.length,
      montantTotal: commandesAnnulees.reduce((sum, cmd) => sum + (parseFloat(cmd.netAPayer) || 0), 0)
    };

    const commandesRetournees = await db.Bon.findAll({
      attributes: [
        'id',
        'numero',
        'statutBon',
        'netAPayer',
        'montantAvoir'
      ],
      where: {
        ...whereBase,
        statutBon: { [Op.in]: ['retourné', 'retourné partiellement'] }
      }
    });

    let montantRetoursTotaux = 0;
    let montantRetoursPartiels = 0;
    let nombreRetoursTotaux = 0;
    let nombreRetoursPartiels = 0;

    const detailsRetours = [];

    for (const cmd of commandesRetournees) {
      const estPartiel = cmd.statutBon === 'retourné partiellement';

      const montantRetour = estPartiel
        ? (parseFloat(cmd.montantAvoir) || 0)
        : (parseFloat(cmd.netAPayer) || 0);

      if (estPartiel) {
        montantRetoursPartiels += montantRetour;
        nombreRetoursPartiels++;
      } else {
        montantRetoursTotaux += montantRetour;
        nombreRetoursTotaux++;
      }

      detailsRetours.push({
        numero: cmd.numero,
        type: estPartiel ? 'partiel' : 'total',
        montantRetour
      });
    }

    const statsRetours = {
      montantTotal: montantRetoursTotaux + montantRetoursPartiels,
      nombreTotal: nombreRetoursTotaux + nombreRetoursPartiels,
      nombreRetoursTotaux,
      nombreRetoursPartiels,
      montantRetoursTotaux,
      montantRetoursPartiels,
      details: detailsRetours
    };

    // 5. Taux de conversion (validées vs livrées)
    const tauxConversion = statsCommandesValidees.nombre > 0 
      ? (statsCommandesLivrees.nombre / statsCommandesValidees.nombre) * 100 
      : 0;

    // 6. Taux d'annulation
    const tauxAnnulation = statsCommandesValidees.nombre > 0
      ? (statsCommandesAnnulees.nombre / statsCommandesValidees.nombre) * 100
      : 0;

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      code_structure,
      magasinId,
      agentId,
      
      // Statistiques principales
      commandesValidees: {
        nombre: statsCommandesValidees.nombre,
        montantTotal: statsCommandesValidees.montantTotal,
        nombrePaniers: nombrePaniersValidees,
        montantPaniers: montantPaniersValidees
      },
      
      commandesLivrees: {
        nombre: statsCommandesLivrees.nombre,
        montantTotal: statsCommandesLivrees.montantTotal
      },
      
      commandesAnnulees: {
        nombre: statsCommandesAnnulees.nombre,
        montantTotal: statsCommandesAnnulees.montantTotal
      },
      
      commandesRetournees: statsRetours,
      
      // Indicateurs de performance
      tauxConversion: parseFloat(tauxConversion.toFixed(2)),
      tauxAnnulation: parseFloat(tauxAnnulation.toFixed(2)),
      
      // Synthèse
      synthese: {
        totalCommandes: statsCommandesValidees.nombre + statsCommandesLivrees.nombre + 
                       statsCommandesAnnulees.nombre + statsRetours.nombreTotal,
        montantGlobal: statsCommandesValidees.montantTotal + statsCommandesLivrees.montantTotal + 
                      statsCommandesAnnulees.montantTotal + statsRetours.montantTotal
      },
      
      dateDebut: dateCondition[Op.between] ? dateCondition[Op.between][0] : null,
      dateFin: dateCondition[Op.between] ? dateCondition[Op.between][1] : null
    });

  } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getStatistiquesCommandes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statistiques des commandes',
      details: error.message 
    });
  }
};

//..............................API pour le rapport de ventes............................  
/**
 * API principale pour le rapport de vente
 */
exports.getRapportVente = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate,
            page = 1,
            limit = 10,
            search = ''
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        // Gestion des rôles
        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        //const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        let magasinIdFinal = magasinIdFromQuery;
        //let agentIdFinal = agentIdFromQuery;

        if (isGerant && !isAdmin) {
            magasinIdFinal = authUser.magasinId;
        }

        // Normalisation des dates
        let debut, fin;
        if (periode) {
            const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            debut = dates.debut;
            fin = dates.fin;
        } 
        else if (fromDate && toDate) {
            debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
            fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
        } 
        else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            debut = debutJournee;
            fin = finJournee;
        }

        const params = {
            code_structure,
            debut,
            fin,
            magasinId: magasinIdFinal,
            agentId
        };
logger.log('kpiCaisse.controller', 'ðŸ“Š Génération rapport vente du', debut.toLocaleString(), 'au', fin.toLocaleString());

        // Récupération des clients pour le mapping (optionnel)
        const clients = await db.Client.findAll({
            where: { code_structure },
            attributes: ['id', 'nomComplet']
        });
        const clientsMap = clients.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {});

        // Récupération de toutes les données en parallèle
        const [
            caData,
            evolutionParJour,
            topProduits,
            topClients,
            performanceVendeurs,
            modesPaiement,
            ventesDetail
        ] = await Promise.all([
            // CA et KPI de base
            (async () => {
                const [caVendu, caEncaisse] = await Promise.all([
                    kpiUtilitaires.getCAVenduBaseData(params),
                    kpiUtilitaires.getCAEncaisseBaseData(params)
                ]);
                return { caVendu, caEncaisse };
            })(),

            // Ã‰volution des ventes par jour
            kpiUtilitaires.getEvolutionVentesParJour(params),

            // Top 10 produits
            kpiUtilitaires.getTopProduits(params),

            // Top 10 clients (ceux avec des bons)
            kpiUtilitaires.getTopClients(params),

            // Performance des vendeurs
            kpiUtilitaires.getPerformanceVendeurs(params),


            // Modes de paiement (via les paiements directement)
            (async () => {
                // Récupérer les IDs des paniers de la période
                const paniersIds = await db.Panier.findAll({
                    attributes: ['id'],
                    where: {
                        code_structure,
                        dateCreation: { [Op.between]: [debut, fin] },
                        statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
                        ...(magasinIdFinal && { magasinId: magasinIdFinal }),
                        ...(agentId && { agentId: agentId })
                    },
                    raw: true
                }).then(paniers => paniers.map(p => p.id));

                if (paniersIds.length === 0) {
                    return [];
                }

                const stats = await db.Paiement.findAll({
                    attributes: [
                        'methodePaiement',
                        [fn('SUM', col('montant')), 'montantTotal'],
                        [fn('COUNT', col('id')), 'occurrences']
                    ],
                    where: {
                        panierId: { [Op.in]: paniersIds },
                        statutPaiement: 'validé'
                    },
                    group: ['methodePaiement'],
                    raw: true
                });

                return stats.map(s => ({
                    mode: s.methodePaiement,
                    montantTotal: parseFloat(s.montantTotal) || 0,
                    occurrences: parseInt(s.occurrences) || 0
                }));
            })(),

            // Détails des ventes avec pagination
            (async () => {
                const offset = (parseInt(page) - 1) * parseInt(limit);

                const where = {
                    code_structure,
                    dateCreation: { [Op.between]: [debut, fin] },
                    statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
                    ...(magasinIdFinal && { magasinId: magasinIdFinal }),
                    ...(agentId && { agentId: agentId })
                };

                if (search) {
                    where[Op.or] = [
                        { '$user.nom$': { [Op.like]: `%${search}%` } },
                        { '$client.nomComplet$': { [Op.like]: `%${search}%` } }
                    ];
                    
                    // Recherche par ID de ticket (conversion en nombre)
                    if (!isNaN(search)) {
                        where[Op.or].push({ id: { [Op.eq]: parseInt(search) } });
                    }
                }

                const { count, rows } = await db.Panier.findAndCountAll({
                    where,
                    subQuery: false,
                    include: [
                        {
                            model: db.Users,
                            attributes: ['id', 'nom','email'],
                            required: false
                        },
                        {
                            model: db.Client,
                            attributes: ['id', 'nomComplet'],
                            required: false
                        },
                        {
                            model: db.Paiement,
                            attributes: ['id', 'methodePaiement', 'montant', 'statutPaiement'],
                            required: false
                        },
                        {
                            model: db.ArticlePanier,
                            attributes: ['id', 'quantite', 'produitId', 'totalTTC'],
                            required: false,
                            include: [
                                {
                                    model: db.Produit,
                                    attributes: ['id', 'designation'],
                                    required: false
                                }
                            ]
                        }
                    ],
                    order: [['date_creation', 'DESC']],
                    offset,
                    limit: parseInt(limit),
                    distinct: true
                });
logger.log('kpiCaisse.controller', `ðŸ“¦ Détails ventes: ${count} ventes trouvées, page ${page}/${Math.ceil(count / parseInt(limit))}`) ;
logger.log('kpiCaisse.controller', 'Premier objet:', Object.keys(rows[0] || {}));
                return {
                    ventes: rows,
                    total: count,
                    page: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    limit: parseInt(limit)
                };
            })()
        ]);

        // Calcul des KPI dérivés
        const totalVentes = caData.caVendu.nombrePaniers;
        const chiffreAffairesTTC = caData.caVendu.totalVendu;
        const chiffreAffairesHT = caData.caVendu.totalVenduHT || (caData.caVendu.totalVendu / 1.18);
        
        // Marge bénéficiaire (à partir des données réelles si disponibles)
        let margeBeneficiaire = 0;
        if (topProduits && topProduits.length > 0) {
            margeBeneficiaire = topProduits.reduce((sum, p) => sum + (p.marge || 0), 0);
        } 
        else {
            margeBeneficiaire = chiffreAffairesHT * 0.25; // Approximation
        }
        
        const ticketMoyen = caData.caVendu.ticketMoyenVente;
        //const panierMoyen = caData.caVendu.panierMoyen || 0;

        // Ã‰volution par rapport à la période précédente
        const periodePrecedente = FonctionsUtilitaires.getPeriodePrecedentePersonnalisee(debut, fin);
        const caPrecedent = await kpiUtilitaires.getCAVenduBaseData({
            ...params,
            debut: periodePrecedente.debut,
            fin: periodePrecedente.fin
        });

        const evolutionCA = {
            valeur: caPrecedent.totalVendu > 0 
                ? Number(((chiffreAffairesTTC - caPrecedent.totalVendu) / caPrecedent.totalVendu * 100).toFixed(2))
                : 0,
            tendance: chiffreAffairesTTC > caPrecedent.totalVendu ? 'â†‘' : 
                     chiffreAffairesTTC < caPrecedent.totalVendu ? 'â†“' : 'â†’'
        };

        const evolutionVolume = {
            valeur: caPrecedent.nombrePaniers > 0
                ? Number(((totalVentes - caPrecedent.nombrePaniers) / caPrecedent.nombrePaniers * 100).toFixed(2))
                : 0,
            tendance: totalVentes > caPrecedent.nombrePaniers ? 'â†‘' : 
                     totalVentes < caPrecedent.nombrePaniers ? 'â†“' : 'â†’'
        };

        // Formater les ventes pour le frontend
        const ventesFormatted = ventesDetail.ventes.map(vente => ({
            id: vente.id,
            dateCreation: vente.dateCreation,
            totalTTC: vente.totalTTC,
            totalHT: vente.totalHT,
            statut: vente.statut,
            clientId: vente.clientId,
            clientNom: vente.clientId && clientsMap[vente.clientId] 
                ? clientsMap[vente.clientId].nomComplet 
                : 'Client anonyme',
            agent: vente.user ? {
                id: vente.user.id,
                nom: vente.user.nom,
                email: vente.user.email
            } : null,
            articles: vente.ArticlePaniers ? vente.ArticlePaniers.map(a => ({
                quantite: a.quantite,
                produit: a.Produit ? a.Produit.designation : 'Produit inconnu',
                totalTTC: a.totalTTC
            })) : [],
            nombreArticles: vente.ArticlePaniers ? vente.ArticlePaniers.length : 0,
            paiements: vente.Paiements ? vente.Paiements.map(p => ({
                methodePaiement: p.methodePaiement,
                montant: p.montant,
                statut: p.statutPaiement
            })) : []
        }));
logger.log('kpiCaisse.controller', 'ðŸ“Š Performance vendeurs récupérée',performanceVendeurs);
        // Formatage de la réponse
        return res.json({
            niveau: magasinIdFinal ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            dateDebut: debut,
            dateFin: fin,
            dateGeneration: new Date(),
            
            // KPI principaux
            totalVentes,
            chiffreAffairesTTC,
            chiffreAffairesHT,
            margeBeneficiaire,
            ticketMoyen,
            //panierMoyen,
            
            // Ã‰volution
            evolutionCA,
            evolutionVolume,
            
            // Données détaillées
            evolutionParJour,
            statmodesPaiement: modesPaiement,
            topProduits,
            topClients,
            vendeursPerformance: performanceVendeurs,
            
            // Détails des ventes avec pagination
            ventes: ventesFormatted,
            pagination: {
                total: ventesDetail.total,
                page: ventesDetail.page,
                totalPages: ventesDetail.totalPages,
                limit: ventesDetail.limit
            }
        });

    } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getRapportVente:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour les détails d'un vendeur
 */
exports.getDetailsVendeur = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const { vendeurId } = req.params;
        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;


        if (!vendeurId) {
            return res.status(400).json({ error: 'vendeurId requis' });
        }

        const code_structure = authUser.code_structure;

        // Gestion des rôles
        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        let magasinIdFinal = magasinId ? parseInt(magasinId) : null;

        if (isGerant && !isAdmin) {
            magasinIdFinal = authUser.magasinId;
        }

        // Normalisation des dates
        let debut, fin;
        if (periode) {
            const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            debut = dates.debut;
            fin = dates.fin;
        } else if (fromDate && toDate) {
            debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
            fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            debut = debutJournee;
            fin = finJournee;
        }

        // Récupérer les informations du vendeur
        const vendeur = await db.Users.findByPk(vendeurId, {
            attributes: ['id', 'nom', 'email']
        });

        if (!vendeur) {
            return res.status(404).json({ error: 'Vendeur non trouvé' });
        }

        // Récupérer les statistiques du vendeur via la fonction utilitaire corrigée
        const stats = await kpiUtilitaires.getStatsVendeurDetails({
            code_structure,
            debut,
            fin,
            vendeurId: parseInt(vendeurId),
            magasinId: magasinIdFinal
        });

        // Récupérer les détails des ventes du vendeur pour le tableau
        const ventesVendeur = await db.Panier.findAll({
            attributes: [
                'id',
                'date_creation',
                'totalTTC',
                'totalHT',
                'clientId',
                'statut'
            ],
            where: {
                code_structure,
                dateCreation: { [Op.between]: [debut, fin] },
                statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
                agentId: parseInt(vendeurId),
                ...(magasinIdFinal && { magasinId: magasinIdFinal })
            },
            include: [
                {
                    model: db.ArticlePanier,
                    attributes: ['id', 'quantite', 'totalTTC'],
                    required: false,
                    include: [
                        {
                            model: db.Produit,
                            attributes: ['id', 'designation'],
                            required: false
                        }
                    ]
                },
                {
                    model: db.Paiement,
                    attributes: ['id', 'methodePaiement', 'montant'],
                    required: false
                }
            ],
            order: [['date_creation', 'DESC']],
            limit: 20 // Limiter aux 20 dernières ventes
        });

        // Récupérer les clients pour le mapping
        const clients = await db.Client.findAll({
            where: { code_structure },
            attributes: ['id', 'nomComplet']
        });
        const clientsMap = clients.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {});

        // Formater les ventes
        const ventesFormatted = ventesVendeur.map(vente => ({
            id: vente.id,
            dateCreation: vente.dateCreation,
            totalTTC: vente.totalTTC,
            client: vente.clientId && clientsMap[vente.clientId] 
                ? clientsMap[vente.clientId].nomComplet 
                : 'Client anonyme',
            nombreArticles: vente.ArticlePaniers ? vente.ArticlePaniers.length : 0,
            paiements: vente.Paiements ? vente.Paiements.map(p => p.methodePaiement).join(', ') : 'Non spécifié',
            statut: vente.statut
        }));

        return res.json({
            vendeur: {
                id: vendeur.id,
                nom: vendeur.nom,
                prenom: vendeur.prenom,
                email: vendeur.email
            },
            periode: periode || 'personnalisée',
            dateDebut: debut,
            dateFin: fin,
            stats,
            evolution: stats.evolution || [], // Déjà inclus dans stats
            ventes: ventesFormatted
        });

    } catch (error) {
logger.error('kpiCaisse.controller', 'Erreur getDetailsVendeur:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour la comparaison (magasins, vendeurs, périodes)
 */
exports.getComparaison = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            type, // 'periode', 'vendeur', 'magasin'
            element1,
            element2,
            periode,
            dateReference,
            fromDate,
            toDate,
            magasinId,
            agentId
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!type || !element1 || !element2) {
            return res.status(400).json({ 
                error: 'type, element1 et element2 sont requis' 
            });
        }

        // Gestion des rôles
        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        let magasinIdFinal = magasinId ? parseInt(magasinId) : null;

        if (isGerant && !isAdmin) {
            magasinIdFinal = authUser.magasinId;
        }

        // Fonction pour récupérer les données d'un élément
        const getDataForElement = async (elementValue, elementType) => {
            let params = {
                code_structure,
                magasinId: magasinIdFinal,
                agentId: agentId ? parseInt(agentId) : null
            };

            try {
                if (elementType === 'periode') {
                    // Pour les périodes, elementValue est un JSON stringifié
                    const dates = JSON.parse(elementValue);
                    params.debut = FonctionsUtilitaires.normalizeDate(dates.debut, 'start');
                    params.fin = FonctionsUtilitaires.normalizeDate(dates.fin, 'end');
                } 
                else if (elementType === 'magasin') {
                    params.magasinId = parseInt(elementValue);
                    // Utiliser la période de référence ou les dates personnalisées
                    if (periode) {
                        const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
                        params.debut = dates.debut;
                        params.fin = dates.fin;
                    } 
                    else if (fromDate && toDate) {
                        params.debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
                        params.fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
                    } 
                    else {
                        const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
                        params.debut = debutJournee;
                        params.fin = finJournee;
                    }
                } else if (elementType === 'vendeur') {
                    params.agentId = parseInt(elementValue);
                    if (periode) {
                        const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
                        params.debut = dates.debut;
                        params.fin = dates.fin;
                    } else if (fromDate && toDate) {
                        params.debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
                        params.fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
                    } else {
                        const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
                        params.debut = debutJournee;
                        params.fin = finJournee;
                    }
                }
logger.log('kpiCaisse.controller', `ðŸ” Comparaison - Ã‰lément ${elementType}:`, params);

                const caVendu = await kpiUtilitaires.getCAVenduBaseData(params);
                
                return {
                    ca: caVendu.totalVendu || 0,
                    ventes: caVendu.nombrePaniers || 0,
                    ticketMoyen: caVendu.ticketMoyenVente || 0
                };
            } catch (error) {
logger.error('kpiCaisse.controller', `âŒ Erreur pour l'élément ${elementType}:`, error);
                return { ca: 0, ventes: 0, ticketMoyen: 0 };
            }
        };

        // Récupérer les données pour les deux éléments
        const [data1, data2] = await Promise.all([
            getDataForElement(element1, type),
            getDataForElement(element2, type)
        ]);

        return res.json({
            type,
            ca1: data1.ca,
            ca2: data2.ca,
            ventes1: data1.ventes,
            ventes2: data2.ventes,
            ticketMoyen1: data1.ticketMoyen,
            ticketMoyen2: data2.ticketMoyen
        });

    } catch (error) {
logger.error('kpiCaisse.controller', 'âŒ Erreur getComparaison:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour obtenir les options de comparaison
 */
exports.getOptionsComparaison = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const { type } = req.query;
        const code_structure = authUser.code_structure;

        let options = [];

        if (type === 'magasin') {
            const magasins = await db.Magasin.findAll({
                where: { 
                    code_structure, 
                    statut: true 
                },
                attributes: ['id', 'nom'],
                order: [['nom', 'ASC']]
            });
            options = magasins.map(m => ({
                value: m.id.toString(),
                label: m.nom
            }));
        } 
        else if (type === 'vendeur') {
            const vendeurs = await db.Users.findAll({
                where: { 
                    code_structure,
                    status: true
                    // Note: La recherche par rôle dépend de votre structure
                },
                attributes: ['id', 'nom'],
                order: [['nom', 'ASC']]
            });
            options = vendeurs.map(v => ({
                value: v.id.toString(),
                label: `${v.nom}`.trim()
            }));
        } 
        else if (type === 'periode') {
            // Générer des périodes prédéfinies
            const aujourdhui = new Date();
            
            // Aujourd'hui
            const debutAujourdhui = new Date(aujourdhui);
            debutAujourdhui.setHours(0, 0, 0, 0);
            const finAujourdhui = new Date(aujourdhui);
            finAujourdhui.setHours(23, 59, 59, 999);
            
            // Hier
            const hier = new Date(aujourdhui);
            hier.setDate(hier.getDate() - 1);
            const debutHier = new Date(hier);
            debutHier.setHours(0, 0, 0, 0);
            const finHier = new Date(hier);
            finHier.setHours(23, 59, 59, 999);
            
            // Cette semaine (lundi à dimanche)
            const debutSemaine = new Date(aujourdhui);
            const jour = aujourdhui.getDay();
            const diff = jour === 0 ? 6 : jour - 1; // Ajustement pour lundi
            debutSemaine.setDate(aujourdhui.getDate() - diff);
            debutSemaine.setHours(0, 0, 0, 0);
            
            const finSemaine = new Date(debutSemaine);
            finSemaine.setDate(debutSemaine.getDate() + 6);
            finSemaine.setHours(23, 59, 59, 999);
            
            // Semaine dernière
            const debutSemaineDerniere = new Date(debutSemaine);
            debutSemaineDerniere.setDate(debutSemaineDerniere.getDate() - 7);
            const finSemaineDerniere = new Date(finSemaine);
            finSemaineDerniere.setDate(finSemaineDerniere.getDate() - 7);
            
            // Ce mois
            const debutMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
            debutMois.setHours(0, 0, 0, 0);
            const finMois = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0);
            finMois.setHours(23, 59, 59, 999);
            
            // Mois dernier
            const debutMoisDernier = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
            debutMoisDernier.setHours(0, 0, 0, 0);
            const finMoisDernier = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 0);
            finMoisDernier.setHours(23, 59, 59, 999);

            options = [
                {
                    value: JSON.stringify({ debut: debutAujourdhui, fin: finAujourdhui }),
                    label: "Aujourd'hui"
                },
                {
                    value: JSON.stringify({ debut: debutHier, fin: finHier }),
                    label: "Hier"
                },
                {
                    value: JSON.stringify({ debut: debutSemaine, fin: finSemaine }),
                    label: "Cette semaine"
                },
                {
                    value: JSON.stringify({ debut: debutSemaineDerniere, fin: finSemaineDerniere }),
                    label: "Semaine dernière"
                },
                {
                    value: JSON.stringify({ debut: debutMois, fin: finMois }),
                    label: "Ce mois"
                },
                {
                    value: JSON.stringify({ debut: debutMoisDernier, fin: finMoisDernier }),
                    label: "Mois dernier"
                }
            ];
        }

        res.json(options);

    } catch (error) {
logger.error('kpiCaisse.controller', 'âŒ Erreur getOptionsComparaison:', error);
        res.status(500).json({ error: error.message });
    }
};

//...........................Génération de rapport PDF....................
/**
 * Génère un rapport de vente au format PDF
 */
exports.genererRapportPDF = async (req, res) => {
    try {
        const authUser = req.user;
        const clientIp = HistoriqueService.getClientIp(req); // Récupérer l'IP

        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        // Récupération des paramètres de la requÃªte
        const {
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate,
            //comparaisonType,    
            //comparaisonElement1, 
            //comparaisonElement2, 
            comparaisonLabels,   
            comparaisonData      
        } = req.query;

        const code_structure = authUser.code_structure;

        // Gestion des rôles
        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        let magasinIdFinal = magasinId ? parseInt(magasinId) : null;

        // Si c'est un gérant, on force son magasin
        if (isGerant && !isAdmin) {
            magasinIdFinal = authUser.magasinId;
        }

        // Normalisation des dates
        let debut, fin;
        if (periode) {
            const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            debut = dates.debut;
            fin = dates.fin;
        } else if (fromDate && toDate) {
            debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
            fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            debut = debutJournee;
            fin = finJournee;
        }

        // Formatage de la période pour l'affichage
        const periodeAffichage = formatPeriodeAffichage(debut, fin, periode);

        // Récupération des informations de la structure
        const structure = await db.Structure.findOne({
            where: { code_structure }
        });

        // Récupération des informations du magasin si sélectionné
        let magasinNom = null;
        if (magasinIdFinal) {
            const magasin = await db.Magasin.findByPk(magasinIdFinal);
            magasinNom = magasin ? magasin.nom : null;
        }

        // Récupération des informations du vendeur si sélectionné
        let vendeurNom = null;
        if (agentId) {
            const vendeur = await db.Users.findByPk(agentId);
            vendeurNom = vendeur ? vendeur.nom : null;
        }

        // Paramètres pour les requÃªtes
        const params = {
            code_structure,
            debut,
            fin,
            magasinId: magasinIdFinal,
            agentId: agentId ? parseInt(agentId) : null
        };
logger.log('kpiCaisse.controller', 'ðŸ“Š Génération rapport PDF du', debut, 'au', fin);

        // Récupération des données
        const [
            caData,
            evolutionParJour,
            topProduits,
            topClients,
            performanceVendeurs,
            modesPaiement,
            ventesDetail
        ] = await Promise.all([
            // CA et KPI de base
            (async () => {
                const [caVendu, caEncaisse] = await Promise.all([
                    kpiUtilitaires.getCAVenduBaseData(params),
                    kpiUtilitaires.getCAEncaisseBaseData(params)
                ]);
                return { caVendu, caEncaisse };
            })(),

            // Ã‰volution des ventes par jour
            kpiUtilitaires.getEvolutionVentesParJour(params),

            // Top 10 produits
            kpiUtilitaires.getTopProduits(params),

            // Top 10 clients
            kpiUtilitaires.getTopClients(params),

            // Performance des vendeurs
            kpiUtilitaires.getPerformanceVendeurs(params),

            // Modes de paiement
            (async () => {
                const paniersIds = await db.Panier.findAll({
                    attributes: ['id'],
                    where: {
                        code_structure,
                        dateCreation: { [Op.between]: [debut, fin] },
                        statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
                        ...(magasinIdFinal && { magasinId: magasinIdFinal }),
                        ...(agentId && { agentId: parseInt(agentId) })
                    },
                    raw: true
                }).then(paniers => paniers.map(p => p.id));

                if (paniersIds.length === 0) return [];

                const stats = await db.Paiement.findAll({
                    attributes: [
                        'methodePaiement',
                        [db.Sequelize.fn('SUM', db.Sequelize.col('montant')), 'montantTotal'],
                        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'occurrences']
                    ],
                    where: {
                        panierId: { [Op.in]: paniersIds },
                        statutPaiement: 'validé'
                    },
                    group: ['methodePaiement'],
                    raw: true
                });

                return stats.map(s => ({
                    mode: s.methodePaiement,
                    montantTotal: parseFloat(s.montantTotal) || 0,
                    occurrences: parseInt(s.occurrences) || 0
                }));
            })(),

            // Détails des ventes (limité à 50 pour le PDF)
            (async () => {
                const where = {
                    code_structure,
                    dateCreation: { [Op.between]: [debut, fin] },
                    statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
                    ...(magasinIdFinal && { magasinId: magasinIdFinal }),
                    ...(agentId && { agentId: parseInt(agentId) })
                };

                const rows = await db.Panier.findAll({
                    where,
                    include: [
                        {
                            model: db.Users,
                            attributes: ['id', 'nom', 'email'],
                            required: false
                        },
                        {
                            model: db.Client,
                            attributes: ['id', 'nomComplet'],
                            required: false
                        },
                        {
                            model: db.Paiement,
                            attributes: ['id', 'methodePaiement', 'montant', 'statutPaiement'],
                            required: false
                        },
                        {
                            model: db.ArticlePanier,
                            attributes: ['id', 'quantite'],
                            required: false
                        }
                    ],
                    order: [['date_creation', 'DESC']],
                    limit: 50
                });

                // Récupération des clients pour le mapping
                const clients = await db.Client.findAll({
                    where: { code_structure },
                    attributes: ['id', 'nomComplet']
                });
                const clientsMap = clients.reduce((acc, c) => {
                    acc[c.id] = c;
                    return acc;
                }, {});

                const ventesFormatted = rows.map(vente => ({
                    id: vente.id,
                    dateCreation: vente.dateCreation,
                    totalTTC: vente.totalTTC,
                    statut: vente.statut,
                    clientNom: vente.clientId && clientsMap[vente.clientId] 
                        ? clientsMap[vente.clientId].nomComplet 
                        : 'Client anonyme',
                    agent: vente.user ? { nom: vente.user.nom } : null,
                    nombreArticles: vente.ArticlePaniers ? vente.ArticlePaniers.length : 0,
                    paiements: vente.Paiements ? vente.Paiements.map(p => ({
                        methodePaiement: p.methodePaiement,
                        montant: p.montant
                    })) : []
                }));

                return ventesFormatted;
            })()
        ]);

        // Calcul des KPI dérivés
        const totalVentes = caData.caVendu.nombrePaniers;
        const chiffreAffairesTTC = caData.caVendu.totalVendu;
        const chiffreAffairesHT = caData.caVendu.totalVenduHT || (caData.caVendu.totalVendu / 1.18);
        
        let margeBeneficiaire = 0;
        if (topProduits && topProduits.length > 0) {
            margeBeneficiaire = topProduits.reduce((sum, p) => sum + (p.marge || 0), 0);
        } else {
            margeBeneficiaire = chiffreAffairesHT * 0.25; // Approximation
        }
        
        const ticketMoyen = caData.caVendu.ticketMoyenVente;

        let parsedComparaisonData = null;
        let parsedComparaisonLabels = null;

        if (comparaisonData) {
            try {
                // Si comparaisonData est déjà un objet (passé en POST), on l'utilise directement
                if (typeof comparaisonData === 'object') {
                    parsedComparaisonData = comparaisonData;
                } 
                // Sinon, on essaie de le parser
                else {
                    parsedComparaisonData = JSON.parse(comparaisonData);
                }
logger.log('kpiCaisse.controller', 'âœ… Données comparaison parsées:', parsedComparaisonData);
            } catch (e) {
logger.error('kpiCaisse.controller', 'âŒ Erreur parsing comparaisonData:', e.message);
                // Ne pas bloquer la génération du PDF, juste ignorer la comparaison
                parsedComparaisonData = null;
            }
        }

        if (comparaisonLabels) {
            try {
                if (typeof comparaisonLabels === 'object') {
                    parsedComparaisonLabels = comparaisonLabels;
                } else {
                    parsedComparaisonLabels = JSON.parse(comparaisonLabels);
                }
            } catch (e) {
logger.error('kpiCaisse.controller', 'âŒ Erreur parsing comparaisonLabels:', e.message);
                parsedComparaisonLabels = ['Ã‰lément 1', 'Ã‰lément 2'];
            }
        }


        // Données pour le template
        const templateData = {
            structure,
            utilisateur: authUser,
            magasin: magasinIdFinal,
            magasinNom,
            vendeur: agentId,
            vendeurNom,
            periodeAffichage,
            totalVentes,
            chiffreAffairesTTC,
            chiffreAffairesHT,
            margeBeneficiaire,
            ticketMoyen,
            statmodesPaiement: modesPaiement,
            topProduits,
            topClients,
            vendeursPerformance: performanceVendeurs,
            ventes: ventesDetail,
            evolutionParJour,
            rapportData: {
                pagination: {
                    total: ventesDetail.length,
                    page: 1,
                    totalPages: 1,
                    limit: 50
                }
            },
            // AJOUTER LES DONNÃ‰ES DE COMPARAISON SI ELLES EXISTENT
            comparaisonData: parsedComparaisonData,
            comparaisonLabels: parsedComparaisonLabels
        };

        // Rendu du template EJS
        const html = await renderEjsTemplate('rapport-vente', templateData);

        // Génération du PDF avec Puppeteer
        const pdf = await generatePDF(html);

        // ENREGISTRER L'HISTORIQUE DE L'EXPORTATION PDF
        const periodeText = formatPeriodeAffichage(debut, fin, periode);
        const magasinText = magasinNom || (magasinIdFinal ? `Magasin ID: ${magasinIdFinal}` : 'Tous les magasins');
        const vendeurText = vendeurNom || (agentId ? `Vendeur ID: ${agentId}` : 'Tous les vendeurs');
        
        const exportDetails = {
            type: 'EXPORT_PDF',
            periode: periodeText,
            dateDebut: debut,
            dateFin: fin,
            magasinId: magasinIdFinal,
            magasinNom: magasinText,
            agentId: agentId,
            agentNom: vendeurText,
            parametres: {
                periode,
                dateReference,
                fromDate,
                toDate,
                magasinId,
                agentId,
                comparaisonType: req.query.comparaisonType,
                comparaisonElement1: req.query.comparaisonElement1,
                comparaisonElement2: req.query.comparaisonElement2
            },
            stats: {
                totalVentes,
                chiffreAffairesTTC,
                ticketMoyen
            }
        };

        await HistoriqueService.enregistrerAction(
            authUser.id,
            `Export PDF du rapport de vente - ${periodeText} - ${magasinText}`,
            clientIp,
            exportDetails
        );

        // Envoi du PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=rapport-vente-${Date.now()}.pdf`);
        res.send(pdf);

    } catch (error) {
logger.error('kpiCaisse.controller', 'âŒ Erreur génération PDF:', error);
        // Enregistrer l'erreur dans l'historique
        if (req.user) {
            await HistoriqueService.enregistrerAction(
                req.user.id,
                `Erreur lors de la génération du PDF du rapport de vente`,
                HistoriqueService.getClientIp(req),
                {
                    type: 'PDF_ERROR',
                    error: error.message,
                    stack: error.stack
                }
            );
        }
        res.status(500).json({ 
            error: 'Erreur lors de la génération du PDF',
            details: error.message 
        });
    }
};

/**
 * Fonction pour rendre un template EJS
 */
async function renderEjsTemplate(templateName, data) {
    const ejs = require('ejs');
    const path = require('path');
    
    const templatePath = path.join(__dirname, '..', 'views', `${templateName}.ejs`);
    
    return new Promise((resolve, reject) => {
        ejs.renderFile(templatePath, data, { async: false }, (err, str) => {
            if (err) reject(err);
            else resolve(str);
        });
    });
}

/**
 * Fonction pour générer un PDF à partir de HTML
 */
async function generatePDF(html) {
    let browser = null;
    
    try {
        const executablePath = await findChromePath();

        browser = await puppeteer.launch({
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        const page = await browser.newPage();
        
        // Configuration de la page
        //await page.setContent(html, { waitUntil: 'networkidle0' });
        // Configuration de la page avec des dimensions adaptées
        await page.setContent(html, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // Définir la taille de la viewport pour correspondre au format A4
        await page.setViewport({
            width: 1200,  // Largeur en pixels pour A4
            height: 1600, // Hauteur approximative
            deviceScaleFactor: 1,
        });
        
        // Génération du PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                bottom: '20mm',
                left: '15mm',
                right: '15mm'
            },
            landscape: false, // Mode portrait (plus adapté pour les rapports)
            scale: 0.9,       // Réduire légèrement pour éviter les débordements
            displayHeaderFooter: false,
            preferCSSPageSize: true // Utiliser les dimensions CSS
        });

        return pdf;

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Formate la période pour l'affichage
 */
function formatPeriodeAffichage(debut, fin, periodeType) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    
    if (periodeType === 'jour') {
        return `Journée du ${debut.toLocaleDateString('fr-FR', options)}`;
    } else if (periodeType === 'semaine') {
        return `Semaine du ${debut.toLocaleDateString('fr-FR', options)} au ${fin.toLocaleDateString('fr-FR', options)}`;
    } else if (periodeType === 'mois') {
        return `Mois de ${debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    } else {
        return `Période du ${debut.toLocaleDateString('fr-FR', options)} au ${fin.toLocaleDateString('fr-FR', options)}`;
    }
}

/**
 * API de test pour voir le rendu HTML (sans PDF)
 */
exports.testRapportHTML = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        // Données de test
        const structure = {
            nom_structure: "Entreprise Test SARL",
            adresse: "Dakar, Sénégal",
            telephone: "+221 77 123 45 67",
            email: "contact@test.com",
            code_structure: "STR-001",
            logo: null
        };

        const templateData = {
            structure,
            utilisateur: { nom: "Admin Test" },
            magasin: -1,
            magasinNom: null,
            vendeur: -1,
            vendeurNom: null,
            periodeAffichage: "Période du 01/02/2026 au 21/02/2026",
            totalVentes: 156,
            chiffreAffairesTTC: 2456789,
            chiffreAffairesHT: 2082025,
            margeBeneficiaire: 520506,
            ticketMoyen: 15748,
            statmodesPaiement: [
                { mode: "Espèces", montantTotal: 1500000, occurrences: 98 },
                { mode: "Carte", montantTotal: 756789, occurrences: 45 },
                { mode: "Mobile Money", montantTotal: 200000, occurrences: 13 }
            ],
            topProduits: [
                { produit: { designation: "Produit A", prixVenteUnitaire: 5000 }, quantite: 45, ca: 225000, marge: 45000, nombreVentes: 23 },
                { produit: { designation: "Produit B", prixVenteUnitaire: 3500 }, quantite: 38, ca: 133000, marge: 26600, nombreVentes: 19 }
            ],
            topClients: [
                { client: { nomComplet: "Client 1" }, nbAchats: 12, ca: 180000, dernierAchat: new Date() },
                { client: { nomComplet: "Client 2" }, nbAchats: 8, ca: 120000, dernierAchat: new Date() }
            ],
            vendeursPerformance: [
                { vendeur: { nom: "Vendeur 1" }, nbVentes: 45, caHT: 450000, caTTC: 531000, ticketMoyen: 11800 },
                { vendeur: { nom: "Vendeur 2" }, nbVentes: 38, caHT: 380000, caTTC: 448400, ticketMoyen: 11800 }
            ],
            ventes: [
                { id: 1, dateCreation: new Date(), clientNom: "Client Test", nombreArticles: 3, totalTTC: 15000, 
                  paiements: [{ methodePaiement: "Espèces", montant: 15000 }], agent: { nom: "Vendeur 1" }, statut: "validé" }
            ],
            evolutionParJour: [],
            rapportData: { pagination: { total: 1, page: 1, totalPages: 1, limit: 50 } }
        };

        const html = await renderEjsTemplate('rapport-vente', templateData);
        
        res.send(html);

    } catch (error) {
logger.error('kpiCaisse.controller', 'âŒ Erreur test HTML:', error);
        res.status(500).json({ error: error.message });
    }
};

//..................Exporter les données vers Excel......................

/**
 * Exporte le rapport de vente au format Excel
 */
exports.exportRapportExcel = async (req, res) => {
    try {
        const authUser = req.user;
        const clientIp = HistoriqueService.getClientIp(req); // Récupérer l'IP

        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        // Récupération des paramètres (comme pour le PDF)
        const {
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        // Gestion des rôles
        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        let magasinIdFinal = magasinId ? parseInt(magasinId) : null;

        if (isGerant && !isAdmin) {
            magasinIdFinal = authUser.magasinId;
        }

        // Normalisation des dates
        let debut, fin;
        if (periode) {
            const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            debut = dates.debut;
            fin = dates.fin;
        } else if (fromDate && toDate) {
            debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
            fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            debut = debutJournee;
            fin = finJournee;
        }

        const params = {
            code_structure,
            debut,
            fin,
            magasinId: magasinIdFinal,
            agentId: agentId ? parseInt(agentId) : null
        };
logger.log('kpiCaisse.controller', 'ðŸ“Š Génération Excel du', debut, 'au', fin);

        // Récupération des données (similaire au PDF mais sans limite)
        const [
            caData,
            topProduits,
            topClients,
            performanceVendeurs,
            modesPaiement,
            ventesDetail,
            structure,
            magasin,
            vendeur
        ] = await Promise.all([
            // CA et KPI de base
            (async () => {
                const [caVendu, caEncaisse] = await Promise.all([
                    kpiUtilitaires.getCAVenduBaseData(params),
                    kpiUtilitaires.getCAEncaisseBaseData(params)
                ]);
                return { caVendu, caEncaisse };
            })(),

            // Top produits (sans limite pour Excel)
            kpiUtilitaires.getTopProduits({ ...params, limit: 100 }),

            // Top clients
            kpiUtilitaires.getTopClients(params),

            // Performance vendeurs
            kpiUtilitaires.getPerformanceVendeurs(params),

            // Modes de paiement
            (async () => {
                const paniersIds = await db.Panier.findAll({
                    attributes: ['id'],
                    where: {
                        code_structure,
                        dateCreation: { [Op.between]: [debut, fin] },
                        statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
                        ...(magasinIdFinal && { magasinId: magasinIdFinal }),
                        ...(agentId && { agentId: parseInt(agentId) })
                    },
                    raw: true
                }).then(paniers => paniers.map(p => p.id));

                if (paniersIds.length === 0) return [];

                const stats = await db.Paiement.findAll({
                    attributes: [
                        'methodePaiement',
                        [fn('SUM', col('montant')), 'montantTotal'],
                        [fn('COUNT', col('id')), 'occurrences']
                    ],
                    where: {
                        panierId: { [Op.in]: paniersIds },
                        statutPaiement: 'validé'
                    },
                    group: ['methodePaiement'],
                    raw: true
                });

                return stats.map(s => ({
                    mode: s.methodePaiement,
                    montantTotal: parseFloat(s.montantTotal) || 0,
                    occurrences: parseInt(s.occurrences) || 0
                }));
            })(),

            // Toutes les ventes (sans pagination pour Excel)
            (async () => {
                const where = {
                    code_structure,
                    dateCreation: { [Op.between]: [debut, fin] },
                    statut: { [Op.notIn]: kpiUtilitaires.STATUTS_EXCLUS },
                    ...(magasinIdFinal && { magasinId: magasinIdFinal }),
                    ...(agentId && { agentId: parseInt(agentId) })
                };

                const rows = await db.Panier.findAll({
                    where,
                    include: [
                        {
                            model: db.Users,
                            attributes: ['id', 'nom', 'email'],
                            required: false
                        },
                        {
                            model: db.Client,
                            attributes: ['id', 'nomComplet'],
                            required: false
                        },
                        {
                            model: db.Paiement,
                            attributes: ['id', 'methodePaiement', 'montant', 'statutPaiement'],
                            required: false
                        },
                        {
                            model: db.ArticlePanier,
                            attributes: ['id', 'quantite', 'produitId'],
                            required: false,
                            include: [
                                {
                                    model: db.Produit,
                                    attributes: ['id', 'designation', 'prixVenteUnitaire'],
                                    required: false
                                }
                            ]
                        }
                    ],
                    order: [['date_creation', 'DESC']]
                });

                const clients = await db.Client.findAll({
                    where: { code_structure },
                    attributes: ['id', 'nomComplet']
                });
                const clientsMap = clients.reduce((acc, c) => {
                    acc[c.id] = c;
                    return acc;
                }, {});

                return rows.map(vente => ({
                    id: vente.id,
                    dateCreation: vente.dateCreation,
                    totalTTC: vente.totalTTC,
                    totalHT: vente.totalHT,
                    statut: vente.statut,
                    clientNom: vente.clientId && clientsMap[vente.clientId] 
                        ? clientsMap[vente.clientId].nomComplet 
                        : 'Client anonyme',
                    agent: vente.user ? { nom: vente.user.nom } : null,
                    articles: vente.ArticlePaniers || [],
                    paiements: vente.Paiements || []
                }));
            })(),

            // Informations structure
            db.Structure.findOne({ where: { code_structure } }),

            // Info magasin si sélectionné
            magasinIdFinal ? db.Magasin.findByPk(magasinIdFinal) : null,

            // Info vendeur si sélectionné
            agentId ? db.Users.findByPk(agentId, { attributes: ['id', 'nom'] }) : null
        ]);

        // Calcul des KPI
        const totalVentes = caData.caVendu.nombrePaniers;
        const chiffreAffairesTTC = caData.caVendu.totalVendu;
        const chiffreAffairesHT = caData.caVendu.totalVenduHT || (caData.caVendu.totalVendu / 1.18);
        const ticketMoyen = caData.caVendu.ticketMoyenVente;

        let margeBeneficiaire = 0;
        if (topProduits && topProduits.length > 0) {
            margeBeneficiaire = topProduits.reduce((sum, p) => sum + (p.marge || 0), 0);
        }

        // Création du workbook Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = structure?.nom_structure || 'Application';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Styles
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } },
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            }
        };

        const titleStyle = {
            font: { bold: true, size: 16, color: { argb: 'FF0D6EFD' } },
            alignment: { horizontal: 'center' }
        };

        // ==================== FEUILLE RÃ‰SUMÃ‰ ====================
        const summarySheet = workbook.addWorksheet('Résumé');

        // Titre
        summarySheet.mergeCells('A1:F2');
        const titleCell = summarySheet.getCell('A1');
        titleCell.value = 'RAPPORT DE VENTE';
        titleCell.style = titleStyle;
        summarySheet.getRow(1).height = 40;

        // Informations générales
        summarySheet.addRow([]);
        summarySheet.addRow(['Informations générales']).font = { bold: true, size: 14 };
        
        const infoData = [
            ['Structure', structure?.nom_structure || 'N/A'],
            ['Période', formatPeriodeAffichage(debut, fin, periode)],
            ['Magasin', magasin ? magasin.nom : (magasinIdFinal ? 'Magasin sélectionné' : 'Tous')],
            ['Vendeur', vendeur ? vendeur.nom : (agentId ? 'Vendeur sélectionné' : 'Tous')],
            ['Date génération', new Date().toLocaleString('fr-FR')],
            ['Responsable', authUser.nom || 'Système']
        ];

        infoData.forEach(([label, value]) => {
            const row = summarySheet.addRow([label, value]);
            row.getCell(1).font = { bold: true };
        });

        summarySheet.addRow([]);

        // Indicateurs clés
        summarySheet.addRow(['INDICATEURS CLÃ‰S']).font = { bold: true, size: 14 };
        summarySheet.addRow([]);

        const kpiHeaders = ['Indicateur', 'Valeur', 'Détail'];
        summarySheet.addRow(kpiHeaders).eachCell(cell => {
            cell.style = headerStyle;
        });

        const kpiRows = [
            ['Total ventes', totalVentes, `${totalVentes} transactions`],
            ['CA TTC', `${chiffreAffairesTTC.toLocaleString('fr-FR')} F CFA`, ''],
            ['CA HT', `${chiffreAffairesHT.toLocaleString('fr-FR')} F CFA`, ''],
            ['Marge', `${margeBeneficiaire.toLocaleString('fr-FR')} F CFA`, 
             chiffreAffairesHT > 0 ? `${((margeBeneficiaire / chiffreAffairesHT) * 100).toFixed(2)}%` : '0%'],
            ['Ticket moyen', `${ticketMoyen.toLocaleString('fr-FR')} F CFA`, '']
        ];

        kpiRows.forEach(row => summarySheet.addRow(row));

        // ==================== FEUILLE MODES DE PAIEMENT ====================
        const paymentSheet = workbook.addWorksheet('Modes de paiement');
        
        paymentSheet.addRow(['RÃ‰PARTITION DES MODES DE PAIEMENT']).font = { bold: true, size: 14 };
        paymentSheet.addRow([]);

        const paymentHeaders = ['Mode', 'Montant (F CFA)', 'Transactions', '%'];
        paymentSheet.addRow(paymentHeaders).eachCell(cell => cell.style = headerStyle);

        modesPaiement.forEach(mode => {
            const pourcentage = chiffreAffairesTTC > 0 ? 
                ((mode.montantTotal / chiffreAffairesTTC) * 100).toFixed(1) : '0';
            
            paymentSheet.addRow([
                mode.mode,
                mode.montantTotal.toLocaleString('fr-FR'),
                mode.occurrences,
                `${pourcentage}%`
            ]);
        });

        // ==================== FEUILLE TOP PRODUITS ====================
        const productsSheet = workbook.addWorksheet('Top produits');
        
        productsSheet.addRow(['TOP PRODUITS']).font = { bold: true, size: 14 };
        productsSheet.addRow([]);

        const productHeaders = ['Produit', 'Quantité', 'Prix unitaire', 'CA TTC', 'Marge', '% Marge'];
        productsSheet.addRow(productHeaders).eachCell(cell => cell.style = headerStyle);

        topProduits.forEach(produit => {
            const margePourcentage = produit.ca > 0 ? 
                ((produit.marge / produit.ca) * 100).toFixed(1) : '0';
            
            productsSheet.addRow([
                produit.produit.designation,
                produit.quantite,
                `${produit.produit.prixVenteUnitaire.toLocaleString('fr-FR')} F CFA`,
                `${produit.ca.toLocaleString('fr-FR')} F CFA`,
                `${produit.marge.toLocaleString('fr-FR')} F CFA`,
                `${margePourcentage}%`
            ]);
        });

        // ==================== FEUILLE TOP CLIENTS ====================
        const clientsSheet = workbook.addWorksheet('Top clients');
        
        clientsSheet.addRow(['TOP CLIENTS']).font = { bold: true, size: 14 };
        clientsSheet.addRow([]);

        const clientHeaders = ['Client', 'Achats', 'CA TTC', 'Dernier achat'];
        clientsSheet.addRow(clientHeaders).eachCell(cell => cell.style = headerStyle);

        topClients.forEach(client => {
            clientsSheet.addRow([
                client.client.nomComplet || 'Client anonyme',
                client.nbAchats,
                `${client.ca.toLocaleString('fr-FR')} F CFA`,
                client.dernierAchat ? new Date(client.dernierAchat).toLocaleDateString('fr-FR') : '-'
            ]);
        });

        // ==================== FEUILLE PERFORMANCE VENDEURS ====================
        const sellersSheet = workbook.addWorksheet('Performance vendeurs');
        
        sellersSheet.addRow(['PERFORMANCE DES VENDEURS']).font = { bold: true, size: 14 };
        sellersSheet.addRow([]);

        const sellerHeaders = ['Vendeur', 'Ventes', 'CA HT', 'CA TTC', 'Ticket moyen'];
        sellersSheet.addRow(sellerHeaders).eachCell(cell => cell.style = headerStyle);

        performanceVendeurs.forEach(v => {
            sellersSheet.addRow([
                v.vendeur?.nom || 'Inconnu',
                v.nbVentes,
                `${v.caHT.toLocaleString('fr-FR')} F CFA`,
                `${v.caTTC.toLocaleString('fr-FR')} F CFA`,
                `${v.ticketMoyen.toLocaleString('fr-FR')} F CFA`
            ]);
        });

        // ==================== FEUILLE DÃ‰TAIL DES VENTES ====================
        const detailsSheet = workbook.addWorksheet('Détail des ventes');
        
        detailsSheet.addRow(['DÃ‰TAIL DES TRANSACTIONS']).font = { bold: true, size: 14 };
        detailsSheet.addRow([]);

        const detailHeaders = [
            'Date', 'NÂ° Ticket', 'Client', 'Articles', 'Total TTC', 
            'Mode paiement', 'Vendeur', 'Statut'
        ];
        detailsSheet.addRow(detailHeaders).eachCell(cell => cell.style = headerStyle);

        ventesDetail.forEach(vente => {
            const paiementStr = vente.paiements?.length > 0 
                ? vente.paiements.map(p => `${p.methodePaiement}: ${p.montant.toLocaleString('fr-FR')}`).join('; ')
                : 'Non spécifié';

            detailsSheet.addRow([
                new Date(vente.dateCreation).toLocaleDateString('fr-FR'),
                vente.id,
                vente.clientNom || '-',
                vente.articles.length,
                `${vente.totalTTC.toLocaleString('fr-FR')} F CFA`,
                paiementStr,
                vente.agent?.nom || '-',
                vente.statut || '-'
            ]);
        });

        // Ajustement automatique des largeurs de colonnes
        [summarySheet, paymentSheet, productsSheet, clientsSheet, sellersSheet, detailsSheet].forEach(sheet => {
            sheet.columns.forEach((column) => {
                let maxLength = 10;
                column.eachCell({ includeEmpty: true }, cell => {
                    const cellValue = cell.value ? cell.value.toString() : '';
                    maxLength = Math.max(maxLength, cellValue.length);
                });
                column.width = Math.min(maxLength + 2, 50);
            });
        });

        // Génération du buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // ENREGISTRER L'HISTORIQUE DE L'EXPORTATION
        const periodeText = formatPeriodeAffichage(debut, fin, periode);
        const magasinText = magasin ? magasin.nom : (magasinIdFinal ? `Magasin ID: ${magasinIdFinal}` : 'Tous les magasins');
        const vendeurText = vendeur ? vendeur.nom : (agentId ? `Vendeur ID: ${agentId}` : 'Tous les vendeurs');
        
        // Préparer les détails de l'export
        const exportDetails = {
            type: 'EXPORT_EXCEL',
            periode: periodeText,
            dateDebut: debut,
            dateFin: fin,
            magasinId: magasinIdFinal,
            magasinNom: magasinText,
            agentId: agentId,
            agentNom: vendeurText,
            parametres: {
                periode,
                dateReference,
                fromDate,
                toDate,
                magasinId,
                agentId
            },
            stats: {
                totalVentes,
                chiffreAffairesTTC,
                ticketMoyen,
                nombreLignes: ventesDetail.length
            }
        };

        await HistoriqueService.enregistrerAction(
            authUser.id,
            `Export Excel du rapport de vente - ${periodeText} - ${magasinText}`,
            clientIp,
            exportDetails
        );

        // Envoi du fichier
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=rapport-vente-${Date.now()}.xlsx`);
        res.send(buffer);

    } catch (error) {
logger.error('kpiCaisse.controller', 'âŒ Erreur export Excel:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'export Excel',
            details: error.message 
        });
    }
};

