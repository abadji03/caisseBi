const { safeNumber } = require('../bonComplet/statutManager');
const db = require('../../models');
const Panier = db.Panier;
const FonctionsUtilitaires  = require('./fonctionsUtilitaires');
const { Op, fn, col,literal  } = db.Sequelize;




// Constantes pour les statuts
const STATUTS_EXCLUS = ['annulé', 'retourné', 'en_cours'];
const STATUTS_EXCLUS_SANS_EN_COURS = ['annulé', 'retourné'];

// Fonction utilitaire pour construire la condition where
const buildWhereCondition = (filters, includeDateRange = true, isPaiement = false) => {
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
      const debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
      const fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
      where.dateCreation = { [Op.between]: [debut, fin] };
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

  // ✅ Utiliser les dates normalisées
  const dateDebut = FonctionsUtilitaires.normalizeDate(debut, 'start');
  const dateFin = FonctionsUtilitaires.normalizeDate(fin, 'end');
  /* =========================
     1️⃣ VENTES CAISSE
  ========================== */
  const paniersCaisse = await Panier.findAll({
    attributes: ['id', 'totalTTC'],
    where: {
      code_structure,
      dateCreation: { [Op.between]: [dateDebut, dateFin] },
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
          dateBon: { [Op.between]: [dateDebut, dateFin] },
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
     Règle de gestion : un retour (total ou partiel) DÉDUIT du chiffre
     d'affaires — il ne génère pas de recette. Pour un bon partiellement
     retourné, seule la partie restante (netAPayer - montantAvoir) compte.
  ========================== */
  const bonsRetourPartiel = await db.Bon.findAll({
    attributes: ['id', 'netAPayer', 'montantAvoir'],
    where: {
      code_structure,
      typeEntite: 'client',
      statutBon: 'retourné partiellement',
      dateBon: { [Op.between]: [dateDebut, dateFin] },
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

  // Le ticket moyen doit refléter des PANIERS réels : pour les bons
  // partiellement retournés on compte leurs paniers, pas les bons.
  const bonsPartielIds = bonsRetourPartiel.map(b => b.id);
  const nbPaniersRetourPartiel = bonsPartielIds.length
    ? await Panier.count({
        where: {
          bonId: { [Op.in]: bonsPartielIds },
          statut: { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] }
        }
      })
    : 0;

  const nombrePaniers =
    paniersCaisse.length +
    paniersBonNormaux.length +
    nbPaniersRetourPartiel;

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


  const dateDebut = FonctionsUtilitaires.normalizeDate(debut, 'start');
  const dateFin = FonctionsUtilitaires.normalizeDate(fin, 'end');

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
      date: { [Op.between]: [dateDebut, dateFin] },
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

// 1. Créez des fonctions de service réutilisables
// Extrayez la logique de getVentesCredit
const getVentesCreditData = async ({ code_structure, periode, dateReference, magasinId, agentId }) => {
  const { Op, fn, col } = db.Sequelize;

  let dateCondition;
  if (periode) {
    const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
    dateCondition = { [Op.between]: [debut, fin] };
  } else {
    const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
    dateCondition = { [Op.between]: [debutJournee, finJournee] };
  }

  // Règle de gestion : un panier lié à un bon est une vente à CRÉDIT.
  // Les bons brouillons (non finalisés) et annulés ne génèrent pas de créance.
  const whereBon = {
    code_structure,
    type: 'vente',
    typeEntite: 'client',
    statutBon: { [Op.notIn]: ['annulé', 'brouillon'] },
    dateBon: dateCondition,
    ...(magasinId && { magasinId }),
    ...(agentId && { agentId })
  };

  const bonsCredit = await db.Bon.findAll({
    attributes: ['id', 'numero'],
    where: whereBon
  });

  const bonIds = bonsCredit.map(bon => bon.id);

  let totalMontant = 0;
  let nombrePaniers = 0;

  if (bonIds.length > 0) {
    const paniersCredit = await Panier.findAll({
      attributes: [
        [fn('SUM', col('total_t_t_c')), 'totalMontant'],
        [fn('COUNT', col('id')), 'nombrePaniers']
      ],
      where: {
        bonId: { [Op.in]: bonIds },
        statut: { [Op.notIn]: ['annulé', 'retourné', 'en_cours'] }
      },
      raw: true
    });

    const result = paniersCredit[0] || {};
    totalMontant = parseFloat(result.totalMontant) || 0;
    nombrePaniers = parseInt(result.nombrePaniers) || 0;
  }

  return {
    niveau: magasinId ? 'magasin' : 'structure',
    periode: periode || 'jour',
    montantCredit: totalMontant,
    nombrePaniersCredit: nombrePaniers,
    nombreBonsCredit: bonIds.length
  };
};

// Faites de même pour les autres fonctions...
const getAvancesData = async ({ code_structure, periode, dateReference, magasinId, agentId }) => {
  
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

    return {
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      totalAvances: parseFloat(data.totalAvances) || 0,
      nombreAvances: parseInt(data.nombreAvances) || 0,
      nombrePaniersAvecAvance: nombrePaniers,
      moyenneAvance: parseFloat(data.moyenneAvance) || 0
    };

};

const getVentesCreditAnnuleesData = async ({ code_structure, periode, dateReference, magasinId, agentId }) => {
  
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
      include: [{
        model: db.Panier,
        attributes: ['id', 'totalTTC'],
        required: false
      }],
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
       NB : le montant du bon (netAPayer / montantAvoir) peut être à 0
       quand le bon de retour est créé par le flux caisse — on retombe
       alors sur le totalTTC du panier rattaché.
    ========================== */
    let totalMontantRetour = 0;
    let nombreRetoursTotaux = 0;
    let nombreRetoursPartiels = 0;

    const details = bons.map(bon => {
      const estPartiel = bon.statutBon === 'retourné partiellement';

      const montant = estPartiel
        ? safeNumber(bon.montantAvoir) || safeNumber(bon.Panier?.totalTTC)
        : safeNumber(bon.netAPayer) || safeNumber(bon.Panier?.totalTTC);

      totalMontantRetour += montant;

      estPartiel ? nombreRetoursPartiels++ : nombreRetoursTotaux++;

      return {
        numeroBon: bon.numero,
        type: estPartiel ? 'partiel' : 'total',
        montant
      };
    });

    return {
      niveau: magasinId ? 'magasin' : 'structure',
      periode: periode || 'jour',
      totalMontantRetour,
      nombreRetours: bons.length,
      nombreRetoursTotaux,
      nombreRetoursPartiels,
      details
    };
};

const getVentesCaisseAnnuleesData = async ({ code_structure, periode, dateReference, magasinId, agentId }) => {
  

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
        [fn('SUM', col('Panier.total_t_t_c')), 'totalMontant'],
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

    return result;

};

//......................Nouvelles fonctions pour les KPIs caisse pour le rapport de vente............................//
// À ajouter dans kpiCaisseUtilitaires.js

/**
 * Calculer le top 10 des produits vendus
 */
const getTopProduits = async ({ code_structure, debut, fin, magasinId, agentId, limit = 10 }) => {
    
    const result = await db.ArticlePanier.findAll({
        attributes: [
            'produitId',
            [fn('SUM', col('ArticlePanier.quantite')), 'quantite'],
            [fn('SUM', col('ArticlePanier.total_t_t_c')), 'ca'],
            [fn('SUM', col('ArticlePanier.montant_remise')), 'totalRemise'],
            [fn('COUNT', col('ArticlePanier.panier_id')), 'nombreVentes']
        ],
        include: [
            {
                model: db.Panier,
                required: true,
                where: {
                    code_structure,
                    dateCreation: { [Op.between]: [debut, fin] },
                    statut: { [Op.notIn]: STATUTS_EXCLUS },
                    ...(magasinId && { magasinId }),
                    ...(agentId && { agentId })
                },
                attributes: []
            },
            {
                model: db.Produit,
                required: true,
                attributes: ['id', 'designation', 'prixVenteUnitaire', 'prixAchatUnitaire']
            }
        ],
        group: ['produitId', 'Produit.id'],
        order: [[literal('ca'), 'DESC']],
        limit: parseInt(limit),
        raw: true,
        nest: true
    });

    // Calculer la marge pour chaque produit
    return await Promise.all(result.map(async (item) => {
        // Récupérer le prix d'achat moyen pour calculer la marge
        const produit = item.Produit;
        const quantite = parseFloat(item.quantite) || 0;
        const ca = parseFloat(item.ca) || 0;
        
        // Calcul de la marge (CA - (quantité * prix d'achat))
        const marge = produit.prixAchatUnitaire 
            ? ca - (quantite * parseFloat(produit.prixAchatUnitaire))
            : ca * 0.25; // Approximation si pas de prix d'achat
        
        return {
            produit: {
                id: produit.id,
                designation: produit.designation,
                prixVenteUnitaire: parseFloat(produit.prixVenteUnitaire) || 0
            },
            quantite: quantite,
            ca: ca,
            marge: marge,
            nombreVentes: parseInt(item.nombreVentes) || 0
        };
    }));
};

/**
 * Calculer le top 10 des clients (uniquement ceux avec des bons)
 */
const getTopClients = async ({ code_structure, debut, fin, magasinId, agentId, limit = 10 }) => {
    
    // Récupérer les paniers avec clientId (ceux liés à des bons)
    const result = await db.Panier.findAll({
        attributes: [
            'clientId',
            [fn('COUNT', col('Panier.id')), 'nbAchats'],
            [fn('SUM', col('Panier.total_t_t_c')), 'ca'],
            [fn('MAX', col('Panier.date_creation')), 'dernierAchat']
        ],
        where: {
            code_structure,
            dateCreation: { [Op.between]: [debut, fin] },
            statut: { [Op.notIn]: STATUTS_EXCLUS },
            clientId: { [Op.ne]: null }, // Seulement les paniers avec client
            ...(magasinId && { magasinId }),
            ...(agentId && { agentId })
        },
        include: [
            {
                model: db.Client,
                required: true,
                attributes: ['id', 'nomComplet', 'telephone', 'email']
            }
        ],
        group: ['clientId', 'Client.id'],
        order: [[literal('ca'), 'DESC']],
        limit: parseInt(limit),
        raw: true,
        nest: true
    });

    return result.map(item => ({
        client: item.Client || { id: null, nomComplet: 'Client anonyme' },
        nbAchats: parseInt(item.nbAchats) || 0,
        ca: parseFloat(item.ca) || 0,
        dernierAchat: item.dernierAchat
    }));
};

/**
 * Calculer la performance des vendeurs
 */
const getPerformanceVendeurs = async ({ code_structure, debut, fin, magasinId }) => {
    
    const result = await db.Panier.findAll({
        attributes: [
            'agentId',
            [fn('COUNT', col('Panier.id')), 'nbVentes'],
            [fn('SUM', col('Panier.total_h_t')), 'caHT'],
            [fn('SUM', col('Panier.total_t_t_c')), 'caTTC'],
            [fn('AVG', col('Panier.total_t_t_c')), 'ticketMoyen'],
            //[fn('AVG', col('Panier->ArticlePanier.quantite')), 'panierMoyen']
        ],
        where: {
            code_structure,
            dateCreation: { [Op.between]: [debut, fin] },
            statut: { [Op.notIn]: STATUTS_EXCLUS },
            agentId: { [Op.ne]: null },
            ...(magasinId && { magasinId })
        },
        include: [
            {
                model: db.Users,
                required: true,
                attributes: ['id', 'nom', 'email']
            }
        ],
        group: ['agentId', 'user.id'],
        order: [[literal('caTTC'), 'DESC']],
        raw: true,
        nest: true
    });

    //console.log('Résultat brut performance vendeurs:', result);
    return result.map(item => ({
        vendeur: item.user,
        nbVentes: parseInt(item.nbVentes) || 0,
        caHT: parseFloat(item.caHT) || 0,
        caTTC: parseFloat(item.caTTC) || 0,
        ticketMoyen: parseFloat(item.ticketMoyen) || 0,
        //panierMoyen: parseFloat(item.panierMoyen) || 0
    }));
};
/**
 * Calculer l'évolution des ventes par jour
 */
const getEvolutionVentesParJour = async ({ code_structure, debut, fin, magasinId, agentId }) => {
    
    const result = await db.Panier.findAll({
        attributes: [
            [fn('DATE', col('date_creation')), 'date'],
            [fn('COUNT', col('id')), 'nombreVentes'],
            [fn('SUM', col('total_t_t_c')), 'ca']
        ],
        where: {
            code_structure,
            dateCreation: { [Op.between]: [debut, fin] },
            statut: { [Op.notIn]: STATUTS_EXCLUS },
            ...(magasinId && { magasinId }),
            ...(agentId && { agentId })
        },
        group: [fn('DATE', col('date_creation'))],
        order: [[fn('DATE', col('date_creation')), 'ASC']],
        raw: true
    });

    return result.map(item => ({
        date: item.date,
        nombreVentes: parseInt(item.nombreVentes) || 0,
        ca: parseFloat(item.ca) || 0
    }));
};

/**
 * Calculer les statistiques pour un vendeur spécifique
 */
const getStatsVendeurDetails = async ({ code_structure, debut, fin, vendeurId, magasinId }) => {
    
    // 1. Informations générales
    const statsGenerales = await db.Panier.findOne({
        attributes: [
            [fn('COUNT', col('id')), 'totalVentes'],
            [fn('SUM', col('total_h_t')), 'chiffreAffairesHT'],
            [fn('SUM', col('total_t_t_c')), 'chiffreAffairesTTC'],
            [fn('AVG', col('total_t_t_c')), 'ticketMoyen'],
            //[fn('AVG', col('Panier->ArticlePanier.quantite')), 'panierMoyen']
        ],
        where: {
            code_structure,
            dateCreation: { [Op.between]: [debut, fin] },
            statut: { [Op.notIn]: STATUTS_EXCLUS },
            agentId: vendeurId,
            ...(magasinId && { magasinId })
        },
        raw: true
    });

    // 2. Récupérer les IDs des paniers du vendeur
    const paniersIds = await db.Panier.findAll({
        attributes: ['id'],
        where: {
            code_structure,
            dateCreation: { [Op.between]: [debut, fin] },
            statut: { [Op.notIn]: STATUTS_EXCLUS },
            agentId: vendeurId,
            ...(magasinId && { magasinId })
        },
        raw: true
    }).then(paniers => paniers.map(p => p.id));

    // 3. Top produits du vendeur (via ArticlePanier)
    let topProduits = [];
    if (paniersIds.length > 0) {
        topProduits = await db.ArticlePanier.findAll({
            attributes: [
                'produitId',
                [fn('SUM', col('ArticlePanier.quantite')), 'quantite'],
                [fn('SUM', col('ArticlePanier.total_t_t_c')), 'ca']
            ],
            include: [
                {
                    model: db.Produit,
                    required: true,
                    attributes: ['id', 'designation']
                }
            ],
            where: {
                panierId: { [Op.in]: paniersIds }
            },
            group: ['produitId', 'Produit.id'],
            order: [[literal('ca'), 'DESC']],
            limit: 5,
            raw: true,
            nest: true
        });
    }

    // 4. Modes de paiement du vendeur
    let modesPaiement = [];
    if (paniersIds.length > 0) {
        modesPaiement = await db.Paiement.findAll({
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
    }

    // 5. Évolution des ventes du vendeur (pour le graphique)
    const evolution = await db.Panier.findAll({
        attributes: [
            [fn('DATE', col('date_creation')), 'date'],
            [fn('COUNT', col('id')), 'nombreVentes'],
            [fn('SUM', col('total_t_t_c')), 'ca']
        ],
        where: {
            code_structure,
            dateCreation: { [Op.between]: [debut, fin] },
            statut: { [Op.notIn]: STATUTS_EXCLUS },
            agentId: vendeurId,
            ...(magasinId && { magasinId })
        },
        group: [fn('DATE', col('date_creation'))],
        order: [[fn('DATE', col('date_creation')), 'ASC']],
        raw: true
    });

    return {
        totalVentes: parseInt(statsGenerales?.totalVentes) || 0,
        chiffreAffairesHT: parseFloat(statsGenerales?.chiffreAffairesHT) || 0,
        chiffreAffairesTTC: parseFloat(statsGenerales?.chiffreAffairesTTC) || 0,
        ticketMoyen: parseFloat(statsGenerales?.ticketMoyen) || 0,
        //panierMoyen: parseFloat(statsGenerales?.panierMoyen) || 0,
        topProduits: topProduits.map(p => ({
            produit: p.Produit,
            quantite: parseInt(p.quantite) || 0,
            ca: parseFloat(p.ca) || 0
        })),
        modesPaiement: modesPaiement.map(m => ({
            mode: m.methodePaiement,
            montantTotal: parseFloat(m.montantTotal) || 0,
            occurrences: parseInt(m.occurrences) || 0
        })),
        evolution
    };
};

exports.getTopProduits = getTopProduits;
exports.getTopClients = getTopClients;
exports.getPerformanceVendeurs = getPerformanceVendeurs;
exports.getEvolutionVentesParJour = getEvolutionVentesParJour;
exports.getStatsVendeurDetails = getStatsVendeurDetails;
exports.getVentesCreditData = getVentesCreditData;
exports.getAvancesData = getAvancesData;
exports.buildWhereCondition = buildWhereCondition;
exports.getCAEncaisseBaseData = getCAEncaisseBaseData;
exports.getVentesCaisseAnnuleesData = getVentesCaisseAnnuleesData;
exports.getVentesCreditAnnuleesData = getVentesCreditAnnuleesData;
exports.getCAVenduBaseData = getCAVenduBaseData;
exports.STATUTS_EXCLUS = STATUTS_EXCLUS;
exports.STATUTS_EXCLUS_SANS_EN_COURS = STATUTS_EXCLUS_SANS_EN_COURS;