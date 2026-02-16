const db = require('../models');
const FonctionsUtilitaires  = require('./utils/fonctionsUtilitaires');
const kpiUtilitaires  = require('./utils/kpiCaisseUtilitaires');
const Panier = db.Panier;
const { Op, fn, col } = db.Sequelize;




//..................................... API pour KPI journaliers................................
// KPI caisse dans la journée
exports.getKpiCaisseJour = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const code_structure = authUser.code_structure;
    const { magasinId, agentId } = req.query;
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
    console.error('Erreur getKpiCaisseJour:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
       1️⃣ Encaissements par MÉTHODE
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
       2️⃣ Encaissements par COMPTE
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
    console.error('Erreur getEncaissementsParMode:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getStatsRemises:', error);
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

    const { periode, dateReference, magasinId, agentId } = req.query;
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
        [fn('SUM', col('montantAvoir')), 'montantAvoir'],
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
    console.error('Erreur getAvoirs:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    // REQUÊTE
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
    console.error('Erreur getCaisseTheorique:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getStatsCaissePeriode:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getStatsComparatives:', error);
    res.status(500).json({ error: error.message });
  }
};


// CA par jour (VENDU + ENCAISSÉ)
exports.getCAParJour = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { periode, dateReference, magasinId, agentId } = req.query;
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
       1️⃣ CA VENDU PAR JOUR
       ============================ */
    const caVenduParJour = await db.Panier.findAll({
      attributes: [
        [fn('DATE', col('Bon.dateBon')), 'date'],
        [fn('SUM', col('Panier.totalTTC')), 'total'],
        [fn('COUNT', col('Panier.id')), 'nombrePaniers']
      ],
      include: [{
        model: db.Bon,
        required: true,
        attributes: [],
        where: {
          code_structure,
          typeEntite: { [Op.ne]: 'fournisseur' },
          [Op.or]: [
            { type: 'vente', statutBon: 'validé' },
            { type: 'commande', statutBon: 'livré' }
          ],
          dateBon: { [Op.between]: [debut, fin] },
          ...(magasinId && { magasinId }),
          ...(agentId && { agentId })
        }
      }],
      group: [fn('DATE', col('Bon.dateBon'))],
      order: [[fn('DATE', col('Bon.dateBon')), 'ASC']],
      raw: true
    });

    /* ============================
       2️⃣ CA ENCAISSÉ PAR JOUR
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
    console.error('Erreur getCAParJour:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getKpiCaisse:', error);
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
      Panier.sum('totalTTC', { where: whereStructure }),
      Panier.sum('totalTTC', { where: whereMagasin })
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
    console.error('Erreur compareMagasinVsStructure:', error);
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
        [fn('SUM', col('Panier.totalTTC')), 'totalCA'],
        [fn('COUNT', col('Panier.id')), 'nombrePaniers'],
        [fn('AVG', col('Panier.totalTTC')), 'ticketMoyen']
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
      order: [[fn('SUM', col('totalTTC')), 'DESC']]
    });

    res.json({
      periode,
      debut,
      fin,
      structure: code_structure,
      stats
    });

  } catch (error) {
    console.error('Erreur getStatsStructureParMagasin:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getVentesCredit:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getAvances:', error);
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
    console.error('Erreur getVentesCreditAnnulees:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getVentesCreditAnnulees:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
    console.error('Erreur getVentesCaisseAnnulees:', error);
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

    const { periode, dateReference, magasinId, agentId } = req.query;

    const code_structure = authUser.code_structure;

    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    // Exécuter toutes les requêtes en parallèle
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
            [fn('SUM', col('montantAvoir')), 'montantAvoir'],
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
    console.error('Erreur getToutesStatistiquesSpeciales:', error);
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
    const { periode, dateReference, magasinId, agentId } = req.query;
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
          [fn('SUM', col('totalTTC')), 'totalMontant'],
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
    console.error('Erreur getStatistiquesCommandes:', error);
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

        console.log('📊 Génération rapport vente du', debut.toLocaleString(), 'au', fin.toLocaleString());

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

            // Évolution des ventes par jour
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
                        { '$agent.nom$': { [Op.like]: `%${search}%` } },
                        //{ '$agent.prenom$': { [Op.like]: `%${search}%` } }
                    ];
                    
                    // Recherche par ID de ticket (conversion en nombre)
                    if (!isNaN(search)) {
                        where[Op.or].push({ id: { [Op.eq]: parseInt(search) } });
                    }
                }

                const { count, rows } = await db.Panier.findAndCountAll({
                    where,
                    include: [
                        {
                            model: db.Users,
                            attributes: ['id', 'nom'],
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
                    order: [['dateCreation', 'DESC']],
                    offset,
                    limit: parseInt(limit),
                    distinct: true
                });

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
        const panierMoyen = caData.caVendu.panierMoyen || 0;

        // Évolution par rapport à la période précédente
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
            tendance: chiffreAffairesTTC > caPrecedent.totalVendu ? '↑' : 
                     chiffreAffairesTTC < caPrecedent.totalVendu ? '↓' : '→'
        };

        const evolutionVolume = {
            valeur: caPrecedent.nombrePaniers > 0
                ? Number(((totalVentes - caPrecedent.nombrePaniers) / caPrecedent.nombrePaniers * 100).toFixed(2))
                : 0,
            tendance: totalVentes > caPrecedent.nombrePaniers ? '↑' : 
                     totalVentes < caPrecedent.nombrePaniers ? '↓' : '→'
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
            agent: vente.agent ? {
                id: vente.agent.id,
                nom: vente.agent.nom,
                prenom: vente.agent.prenom
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
            panierMoyen,
            
            // Évolution
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
        console.error('Erreur getRapportVente:', error);
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
                'dateCreation',
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
            order: [['dateCreation', 'DESC']],
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
        console.error('Erreur getDetailsVendeur:', error);
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

                console.log(`🔍 Comparaison - Élément ${elementType}:`, params);

                const caVendu = await kpiUtilitaires.getCAVenduBaseData(params);
                
                return {
                    ca: caVendu.totalVendu || 0,
                    ventes: caVendu.nombrePaniers || 0,
                    ticketMoyen: caVendu.ticketMoyenVente || 0
                };
            } catch (error) {
                console.error(`❌ Erreur pour l'élément ${elementType}:`, error);
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
        console.error('❌ Erreur getComparaison:', error);
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
        console.error('❌ Erreur getOptionsComparaison:', error);
        res.status(500).json({ error: error.message });
    }
};