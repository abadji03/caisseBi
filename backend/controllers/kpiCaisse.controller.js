const db = require('../models');
const FonctionsUtilitaires  = require('./utils/fonctionsUtilitaires');
const Panier = db.Panier;

// Constantes pour les statuts
const STATUTS_EXCLUS = ['annulé', 'retourné', 'en_cours'];
const STATUTS_EXCLUS_SANS_EN_COURS = ['annulé', 'retourné'];

/* // Fonction de validation des paramètres
const validateParams = (params, requirePeriod = false) => {
  const errors = [];
  
  // code_structure est toujours requis
  if (!params.code_structure) {
    errors.push('Le paramètre "code_structure" est requis');
  }
  
  // période est requis pour certaines fonctions
  if (requirePeriod && !params.periode) {
    errors.push('Le paramètre "periode" est requis');
  }
  
  return errors;
};
 */
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

// Fonction pour obtenir les données CA de base
const getCABaseData = async (where) => {
  const [totalCA, nombrePaniers] = await Promise.all([
    Panier.sum('totalTTC', { where }),
    Panier.count({ where })
  ]);

  return {
    totalCA: totalCA || 0,
    nombrePaniers: nombrePaniers || 0,
    ticketMoyen: nombrePaniers > 0 ? (totalCA / nombrePaniers) : 0
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

    const whereCondition = buildWhereCondition({
      code_structure,
      magasinId,
      agentId,
      fromDate: debutJournee,
      toDate: finJournee
    });

    const data = await getCABaseData(whereCondition);

    //return res.json(data);
    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: 'jour',
      ...data
    });

  } catch (error) {
    console.error('Erreur getKpiCaisseJour:', error);
    res.status(500).json({ error: error.message });
  }
};

// Encaissements par mode de paiement
exports.getEncaissementsParMode = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { fn, col } = db.Sequelize;

    // Validation : code_structure toujours requis
    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }
     // Déterminer les dates selon la période ou le jour courant
    let dateCondition;
    let periodeLabel;
    
    if (periode) {
      const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
      dateCondition = { [db.Sequelize.Op.between]: [debut, fin] };
      periodeLabel = periode;
    } 
    else {
      const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
      dateCondition = { [db.Sequelize.Op.between]: [debutJournee, finJournee] };
      periodeLabel = 'jour';
    }
    
    // Condition where pour les Paniers
    const wherePanier = {
      code_structure,
      statut: { [db.Sequelize.Op.notIn]: STATUTS_EXCLUS },
      dateCreation: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };
    
    const paiements = await db.Paiement.findAll({
      attributes: [
        'methodePaiement',
        [fn('SUM', col('montant')), 'total']
      ],
      include: [{
        model: Panier,
        where: wherePanier,
        attributes: []
      }],
      group: ['methodePaiement']
    });

    const niveau = magasinId ? 'magasin' : 'structure';
    return res.json({
      niveau,
      periode: periodeLabel,
      paiements
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

    /* let whereCondition;
    if (periode) {
      whereCondition = buildWhereCondition({
        periode,
        dateReference,
        code_structure,
        magasinId,
        agentId,
        statutsExclus: STATUTS_EXCLUS_SANS_EN_COURS,
        remise: { [db.Sequelize.Op.gt]: 0 }
      });
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires .getPeriodeJournee();
      whereCondition = buildWhereCondition({
        code_structure,
        magasinId,
        agentId,
        fromDate: debutJournee,
        toDate: finJournee,
        statutsExclus: STATUTS_EXCLUS_SANS_EN_COURS,
        remise: { [db.Sequelize.Op.gt]: 0 }
      });
    } */

    const whereCondition = {
      code_structure,
      statut: { [db.Sequelize.Op.notIn]: STATUTS_EXCLUS_SANS_EN_COURS },
      remise: { [db.Sequelize.Op.gt]: 0 },
      dateCreation: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };
    const stats = await Panier.findAll({
      attributes: [
        [db.Sequelize.fn('SUM', db.Sequelize.col('remise')), 'totalRemise'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'nombrePaniers']
      ],
      where: whereCondition
    });

    return res.json(stats[0] || { totalRemise: 0, nombrePaniers: 0 });

  } catch (error) {
    console.error('Erreur getStatsRemises:', error);
    res.status(500).json({ error: error.message });
  }
};

// Avoirs émis
exports.getAvoirs = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;

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

    /* let whereCondition;
    if (periode) {
      whereCondition = buildWhereCondition({
        periode,
        dateReference,
        code_structure,
        magasinId,
        agentId,
        //type: 'avoir',
        statutsExclus: [] // Pas d'exclusion de statut pour les avoirs
      });
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires .getPeriodeJournee();
      whereCondition = buildWhereCondition({
        code_structure,
        magasinId,
        agentId,
        fromDate: debutJournee,
        toDate: finJournee,
        //type: 'avoir',
        statutsExclus: []
      });
    } */

    const whereCondition = {
      code_structure,
      // type: 'avoir', // Si vous avez une colonne type
      dateCreation: dateCondition,
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    const result = await Panier.findAll({
      attributes: [
        [db.Sequelize.fn('SUM', db.Sequelize.col('totalTTC')), 'montantAvoir'],
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'nombreAvoirs']
      ],
      where: whereCondition
    });

    return res.json(result[0] || { montantAvoir: 0, nombreAvoirs: 0 });

  } catch (error) {
    console.error('Erreur getAvoirs:', error);
    res.status(500).json({ error: error.message });
  }
};

// Caisse théorique
/* exports.getCaisseTheorique = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;

    let whereCondition;
    if (periode) {
      whereCondition = buildWhereCondition({
        periode,
        dateReference,
        code_structure,
        magasinId,
        statutsExclus: STATUTS_EXCLUS,
        agentId
      },false,true);
    } else {
      const { debutJournee, finJournee } = FonctionsUtilitaires .getPeriodeJournee();
      whereCondition = buildWhereCondition({
        code_structure,
        magasinId,
        agentId,
        fromDate: debutJournee,
        toDate: finJournee
      });
    }

    const totalEspeces = await db.Paiement.sum('montant', {
      where: {
        methodePaiement: 'Espèce',
        ...whereCondition
      }
    });

    return res.json({
      caisseTheorique: totalEspeces || 0
    });

  } catch (error) {
    console.error('Erreur getCaisseTheorique:', error);
    res.status(500).json({ error: error.message });
  }
};
 */
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
// KPI caisse par période
exports.getStatsCaissePeriode = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;

   /*  if (!periode) {
      return res.status(400).json({ error: 'Le paramètre "periode" est requis' });
    } */
    // Validation

    const errors = [];
    if (!periode) errors.push('Le paramètre "periode" est requis');
    if (!code_structure) errors.push('Le paramètre "code_structure" est requis');
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const { debut, fin } = FonctionsUtilitaires .getPeriodeDates(periode, dateReference);
    //const whereCondition = buildWhereCondition({ periode, dateReference, code_structure, magasinId, agentId });

    const whereCondition = {
      code_structure,
      statut: { [db.Sequelize.Op.notIn]: STATUTS_EXCLUS },
      dateCreation: { [db.Sequelize.Op.between]: [debut, fin] },
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };
    const data = await getCABaseData(whereCondition);

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode,
      debut,
      fin,
      ...data
    });

  } catch (error) {
    console.error('Erreur getStatsCaissePeriode:', error);
    res.status(500).json({ error: error.message });
  }
};

// Comparatif CA période actuelle vs période précédente
exports.getStatsComparatives = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;

    // Validation
    const errors = [];
    if (!periode) errors.push('Le paramètre "periode" est requis');
    if (!code_structure) errors.push('Le paramètre "code_structure" est requis');
    
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const periodeActuelle = FonctionsUtilitaires .getPeriodeDates(periode, dateReference);
    const periodePrecedente = FonctionsUtilitaires .getPeriodePrecedente(periode, dateReference);

    const buildWhere = (dates) => ({
      code_structure,
      statut: { [db.Sequelize.Op.notIn]: STATUTS_EXCLUS },
      dateCreation: { [db.Sequelize.Op.between]: [dates.debut, dates.fin] },
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    });

    const [actuel, precedent] = await Promise.all([
      Panier.sum('totalTTC', { where: buildWhere(periodeActuelle) }),
      Panier.sum('totalTTC', { where: buildWhere(periodePrecedente) })
    ]);

    const variation = precedent
      ? ((actuel - precedent) / precedent) * 100
      : (actuel ? 100 : 0);

    res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode,
      actuel: actuel || 0,
      precedent: precedent || 0,
      variationPourcent: Number(variation.toFixed(2))
    });

  } catch (error) {
    console.error('Erreur getStatsComparatives:', error);
    res.status(500).json({ error: error.message });
  }
};

// CA par jour
exports.getCAParJour = async (req, res) => {
  try {
    const { periode, dateReference, code_structure, magasinId, agentId } = req.query;
    const { fn, col } = db.Sequelize;

    // Validation : code_structure toujours requis
    if (!code_structure) {
      return res.status(400).json({ 
        error: 'Le paramètre "code_structure" est requis' 
      });
    }

    // Par défaut, on prend le mois en cours si aucune période n'est spécifiée
    const periodToUse = periode || 'mois';
    const { debut, fin } = FonctionsUtilitaires .getPeriodeDates(periodToUse, dateReference);

    /* const whereCondition = buildWhereCondition({
      fromDate: debut,
      toDate: fin,
      code_structure,
      magasinId,
      agentId,
      statutsExclus: STATUTS_EXCLUS_SANS_EN_COURS
    }); */

    const whereCondition = {
      code_structure,
      statut: { [db.Sequelize.Op.notIn]: STATUTS_EXCLUS_SANS_EN_COURS },
      dateCreation: { [db.Sequelize.Op.between]: [debut, fin] },
      ...(magasinId && { magasinId }),
      ...(agentId && { agentId: agentId })
    };

    const data = await Panier.findAll({
      attributes: [
        [fn('DATE', col('dateCreation')), 'date'],
        [fn('SUM', col('totalTTC')), 'total'],
        [fn('COUNT', col('id')), 'nombrePaniers']
      ],
      where: whereCondition,
      group: [fn('DATE', col('dateCreation'))],
      order: [[fn('DATE', col('dateCreation')), 'ASC']]
    });

    res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periodToUse,
      debut,
      fin,
      data
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
    const whereCondition = buildWhereCondition({ periode, dateReference, code_structure, magasinId, agentId });

    const data = await getCABaseData(whereCondition);

    return res.json({
      niveau: magasinId ? 'magasin' : 'structure',
      periode,
      debut,
      fin,
      ...data
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
    const { fn, col } = db.Sequelize;

    if (!code_structure) {
      return res.status(400).json({ error: 'Le paramètre "code_structure" est requis' });
    }

    if (!periode) {
      return res.status(400).json({ error: 'Le paramètre "periode" est requis' });
    }

    const { debut, fin } = FonctionsUtilitaires .getPeriodeDates(periode, dateReference);

    /* const stats = await Panier.findAll({
      attributes: [
        'magasinId',
        [fn('SUM', col('Panier.totalTTC')), 'totalCA'],
        [fn('COUNT', col('Panier.id')), 'nombrePaniers'],
        [fn('AVG', col('Panier.totalTTC')), 'ticketMoyen']
      ],
      where: buildWhereCondition({
        fromDate: debut,
        toDate: fin,
        code_structure
      }),
      group: ['magasinId'],
      include: [{
        model: db.Magasin,
        attributes: ['id', 'nom']
      }],
      order: [[fn('SUM', col('totalTTC')), 'DESC']]
    }); */

    const stats = await Panier.findAll({
      attributes: [
        'magasinId',
        [fn('SUM', col('Panier.totalTTC')), 'totalCA'],
        [fn('COUNT', col('Panier.id')), 'nombrePaniers'],
        [fn('AVG', col('Panier.totalTTC')), 'ticketMoyen']
      ],
      where: {
        code_structure,
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