const db = require('../models');
const { safeNumber } = require('./bonComplet/statutManager');
const FonctionsUtilitaires  = require('./utils/fonctionsUtilitaires');
const Panier = db.Panier;

// Constantes pour les statuts
const STATUTS_EXCLUS = ['annulé', 'retourné', 'en_cours'];
const STATUTS_EXCLUS_SANS_EN_COURS = ['annulé', 'retourné'];

// Fonction utilitaire pour construire la condition where
const buildWhereCondition = (filters, includeDateRange = true, isPaiement = false) => {
  const { Op } = db.Sequelize;
  const {
    code_structure,
    magasinId,
    agentId,
    periode,
    dateReference,
    statutsExclus = STATUTS_EXCLUS,
    type,
    remise,
    fromDate,
    toDate
  } = filters;

 // Validation : code_structure est obligatoire
  if (!code_structure) {
    throw new Error('Le paramètre "code_structure" est requis');
  }

  const where = {
    code_structure // Toujours requis
  };

  // Gestion des statuts exclus
  if (statutsExclus && statutsExclus.length > 0) {
      if (isPaiement) {
          where.statutPaiement = { [Op.notIn]: statutsExclus }; // Pour la table Paiement
        } 
        else {
          where.statut = { [Op.notIn]: statutsExclus }; // Pour la table Panier
      }
  }

  // Gestion de la période ou de la plage de dates
  if (includeDateRange) {
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires .getPeriodeDates(periode, dateReference);
      where.dateCreation = { [Op.between]: [debut, fin] };
    } else if (fromDate && toDate) {
      where.dateCreation = { [Op.between]: [fromDate, toDate] };
    }
  }

  // Filtres optionnels
  if (magasinId) where.magasinId = magasinId;
  if (agentId) where.agentId = agentId;
  if (type) where.type = type;
  if (remise !== undefined) {
    where.remise = remise;
  }

  return where;
};


const getCAVenduBaseData = async ({
  code_structure,
  debut,
  fin,
  magasinId,
  agentId
}) => {

  const { Op } = db.Sequelize;

  /* =========================
     1️⃣ VENTES CAISSE
  ========================== */
  const paniersCaisse = await Panier.findAll({
    attributes: ['id', 'totalTTC'],
    where: {
      code_structure,
      dateCreation: { [Op.between]: [debut, fin] },
      statut: { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] },
      bonId: null,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId })
    }
  });

  /* =========================
     2️⃣ BONS NORMAUX (vente validée / commande livrée)
  ========================== */
  const paniersBonNormaux = await Panier.findAll({
    attributes: ['id', 'totalTTC'],
    include: [
      {
        model: db.Bon,
        required: true,
        attributes: [],
        where: {
          code_structure,
          typeEntite: 'client',
          dateBon: { [Op.between]: [debut, fin] },
          [Op.or]: [
            { type: 'vente', statutBon: 'validé' },
            { type: 'commande', statutBon: 'livré' }
          ],
          ...(magasinId && { magasinId }),
          ...(agentId && { agentId })
        }
      }
    ],
    where: {
      code_structure,
      statut: { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] }
    }
  });

  /* =========================
     3️⃣ BONS RETOURNÉS PARTIELLEMENT
  ========================== */
  const bonsRetourPartiel = await db.Bon.findAll({
    attributes: ['id', 'netAPayer', 'montantAvoir'],
    where: {
      code_structure,
      typeEntite: 'client',
      statutBon: 'retourné partiellement',
      dateBon: { [Op.between]: [debut, fin] },
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId })
    }
  });

  /* =========================
     4️⃣ CALCUL DES MONTANTS
  ========================== */

  const totalCaisse = paniersCaisse.reduce(
    (sum, p) => sum + (safeNumber(p.totalTTC) || 0),
    0
  );

  const totalBonNormaux = paniersBonNormaux.reduce(
    (sum, p) => sum + (safeNumber(p.totalTTC) || 0),
    0
  );

  const totalRetourPartiel = bonsRetourPartiel.reduce(
    (sum, b) =>
      sum + (
        (safeNumber(b.netAPayer) || 0) -
        (safeNumber(b.montantAvoir) || 0)
      ),
    0
  );

  const totalVendu = totalCaisse + totalBonNormaux + totalRetourPartiel;

  const nombrePaniers =
    paniersCaisse.length +
    paniersBonNormaux.length +
    bonsRetourPartiel.length;

  return {
    totalVendu,
    nombrePaniers,
    ticketMoyenVente:
      nombrePaniers > 0 ? totalVendu / nombrePaniers : 0
  };
};


const getCAEncaisseBaseData = async ({
  code_structure,
  debut,
  fin,
  magasinId,
  agentId
}) => {

  const { fn, col, Op } = db.Sequelize;

  const result = await db.Paiement.findOne({
    attributes: [
      [fn('SUM', col('Paiement.montant')), 'totalEncaisse'],
      [fn('COUNT', col('Paiement.id')), 'nombrePaiements']
    ],
    /* include: [
      {
        model: Panier,
        required: false,
        attributes: [],
        where:{
          code_structure,
          typeEntite: { [Op.ne]: 'fournisseur' },
              ...(magasinId && { magasinId }),
              ...(agentId && { agentId })
        },
        include: [
          {
            model: db.Bon,
            required: false,
            attributes: [],
            where: {
              code_structure,
              typeEntite: { [Op.ne]: 'fournisseur' },
              ...(magasinId && { magasinId }),
              ...(agentId && { agentId })
            }
          }
        ]
      }
    ], */
    where: {
      code_structure,
      statutPaiement: 'validé',
      typePaiement: { [Op.ne]: 'fournisseur' },
      date: { [Op.between]: [debut, fin] },
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId })
    },
    raw: true
  });

  const totalEncaisse = Number(result?.totalEncaisse || 0);
  const nombrePaiements = Number(result?.nombrePaiements || 0);

  return {
    totalEncaisse,
    nombrePaiements,
    ticketMoyenEncaisse:
      nombrePaiements > 0 ? totalEncaisse / nombrePaiements : 0
  };
};


//..................................... API pour KPI journaliers................................
// KPI caisse dans la journée
exports.getKpiCaisseJour = async (req, res) => {
  try {
    const { code_structure, magasinId, agentId } = req.query;
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
      getCAVenduBaseData(params),
      getCAEncaisseBaseData(params)
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { fn, col, Op } = db.Sequelize;

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
      statut: { [Op.notIn]: STATUTS_EXCLUS },
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op } = db.Sequelize;
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
      statut: { [db.Sequelize.Op.notIn]: STATUTS_EXCLUS_SANS_EN_COURS },
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op, fn, col } = db.Sequelize;

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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op } = db.Sequelize;

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
      statut: { [Op.notIn]: STATUTS_EXCLUS },
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
      statutPaiement: { [Op.notIn]: STATUTS_EXCLUS }
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;

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
      getCAVenduBaseData(params),
      getCAEncaisseBaseData(params)
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;

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
      getCAVenduBaseData({
        code_structure,
        magasinId,
        agentId,
        debut: periodeActuelle.debut,
        fin: periodeActuelle.fin
      }),
      getCAVenduBaseData({
        code_structure,
        magasinId,
        agentId,
        debut: periodePrecedente.debut,
        fin: periodePrecedente.fin
      }),
      getCAEncaisseBaseData({
        code_structure,
        magasinId,
        agentId,
        debut: periodeActuelle.debut,
        fin: periodeActuelle.fin
      }),
      getCAEncaisseBaseData({
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { fn, col, Op } = db.Sequelize;

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
    const { code_structure, periode, dateReference, magasinId, agentId } = req.query;

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
      getCAVenduBaseData(params),
      getCAEncaisseBaseData(params)
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
    const { periode, dateReference, code_structure, magasinId } = req.query;

    if (!code_structure || !magasinId) {
      return res.status(400).json({ error: 'Les paramètres "code_structure" et "magasinId" sont requis' });
    }

    if (!periode) {
      return res.status(400).json({ error: 'Le paramètre "periode" est requis' });
    }

    const whereStructure = buildWhereCondition({ periode, dateReference, code_structure });
    const whereMagasin = buildWhereCondition({ periode, dateReference, code_structure, magasinId });

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
    const { periode, dateReference, code_structure } = req.query;
    const { Op, fn, col } = db.Sequelize;

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
        statut: { [db.Sequelize.Op.notIn]: STATUTS_EXCLUS },
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op,fn,col } = db.Sequelize;

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

  } catch (error) {
    console.error('Erreur getVentesCredit:', error);
    res.status(500).json({ error: error.message });
  }
};

// Avances (bons avec colonne avance non nulle)
exports.getAvances = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op, fn, col } = db.Sequelize;

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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op } = db.Sequelize;

    if (!code_structure) {
      return res.status(400).json({
        error: 'Le paramètre "code_structure" est requis'
      });
    }

    /* =========================
       1️⃣ PÉRIODE
    ========================== */
    let dateCondition;
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [Op.between]: [debut, fin] };
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

    /* =========================
       2️⃣ BONS DE VENTE RETOURNÉS
    ========================== */
    const bons = await db.Bon.findAll({
      attributes: [
        'id',
        'numero',
        'statutBon',
        'netAPayer',
        'montantAvoir'
      ],
      where: {
        code_structure,
        typeEntite: 'client',
        type: 'vente',
        statutBon: { [Op.in]: ['retourné', 'retourné partiellement'] },
        dateBon: dateCondition,
        ...(magasinId && { magasinId }),
        ...(agentId && { agentId })
      }
    });

    /* =========================
       3️⃣ AGRÉGATION
    ========================== */
    let totalMontantRetour = 0;
    let nombreRetoursTotaux = 0;
    let nombreRetoursPartiels = 0;

    const details = bons.map(bon => {
      const estPartiel = bon.statutBon === 'retourné partiellement';

      const montant = estPartiel
        ? safeNumber(bon.montantAvoir)
        : safeNumber(bon.netAPayer);

      totalMontantRetour += montant;

      estPartiel ? nombreRetoursPartiels++ : nombreRetoursTotaux++;

      return {
        numeroBon: bon.numero,
        type: estPartiel ? 'partiel' : 'total',
        montant
      };
    });

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      totalMontantRetour,
      nombreRetours: bons.length,
      nombreRetoursTotaux,
      nombreRetoursPartiels,
      details
    });

  } catch (error) {
    console.error('Erreur getVentesCreditAnnulees:', error);
    res.status(500).json({ error: error.message });
  }
};

// Ventes en caisse annulées ou retournées
exports.getVentesCaisseAnnulees = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op,fn, col } = db.Sequelize;

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

    return res.json(result);

  } catch (error) {
    console.error('Erreur getVentesCaisseAnnulees:', error);
    res.status(500).json({ error: error.message });
  }
};

// API combinée pour toutes les statistiques spéciales
exports.getToutesStatistiquesSpeciales = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;

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
      
      // Appeler la fonction getVentesCredit
      exports.getVentesCredit({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data }),
      
      // Appeler la fonction getAvances
      exports.getAvances({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data }),
      
      // Appeler la fonction getVentesCreditAnnulees
      exports.getVentesCreditAnnulees({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data }),
      
      // Appeler la fonction getVentesCaisseAnnulees
      exports.getVentesCaisseAnnulees({ query: { periode, dateReference, code_structure, magasinId, agentId } }, { json: (data) => data })
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
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { Op, fn, col } = db.Sequelize;

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

    // 4. Commandes retournées (avec gestion des retours partiels)
    // D'abord, les commandes avec statut retourné
    /* const whereCommandesRetournees = {
      ...whereBase,
      statutBon: 'retourné'
    };

    const commandesRetournees = await db.Bon.findAll({
      attributes: ['id', 'numero', 'montantTotal'],
      where: whereCommandesRetournees
    });

    let montantRetoursCommandes = commandesRetournees.reduce((sum, cmd) => sum + (parseFloat(cmd.montantTotal) || 0), 0);
    let nombreRetoursCommandes = commandesRetournees.length;

    // Ensuite, traiter les bons de retour client (retours partiels)
    const whereBonsRetour = {
      code_structure,
      type: 'retour',
      typeEntite: 'client',
      dateBon: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    const bonsRetourClient = await db.Bon.findAll({
      attributes: ['id', 'numero', 'montantTotal', 'numeroBonOrigine', 'montantAvoir'],
      where: whereBonsRetour
    });

    let montantRetoursPartiels = 0;
    let nombreRetoursPartiels = 0;
    let montantRetoursTotaux = montantRetoursCommandes;
    let nombreRetoursTotaux = nombreRetoursCommandes;

    // Traitement des retours partiels
    const retoursPartielsDetails = [];
    
    for (const bonRetour of bonsRetourClient) {
      if (bonRetour.numeroBonOrigine) {
        // Vérifier si la commande d'origine existe
        const bonOrigine = await db.Bon.findOne({
          where: {
            numero: bonRetour.numeroBonOrigine,
            type: 'commande'
          }
        });

        if (bonOrigine) {
          const montantOrigine = parseFloat(bonOrigine.montantTotal) || 0;
          const montantRetour = parseFloat(bonRetour.montantAvoir) || parseFloat(bonRetour.montantTotal) || 0;
          
          // Si le montant du retour est inférieur au montant d'origine, c'est un retour partiel
          if (montantRetour > 0 && montantRetour < montantOrigine) {
            montantRetoursPartiels += montantRetour;
            nombreRetoursPartiels++;
            
            retoursPartielsDetails.push({
              numeroRetour: bonRetour.numero,
              numeroOrigine: bonRetour.numeroBonOrigine,
              montantOrigine,
              montantRetour,
              type: 'partiel'
            });
          }
        }
      }
    }

    // Total des retours (complets + partiels)
    const statsRetours = {
      montantTotal: montantRetoursTotaux + montantRetoursPartiels,
      nombreTotal: nombreRetoursTotaux + nombreRetoursPartiels,
      nombreRetoursTotaux,
      nombreRetoursPartiels,
      montantRetoursPartiels,
      montantRetoursTotaux,
      detailsPartiels: retoursPartielsDetails
    }; */

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