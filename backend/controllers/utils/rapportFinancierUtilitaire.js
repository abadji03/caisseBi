const db = require('../../models');
const FonctionsUtilitaires  = require('./fonctionsUtilitaires');
const { Op, fn, col } = db.Sequelize;

/**
 * Calculer les indicateurs financiers principaux
 */
const calculerIndicateursPrincipaux = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId,
        agentId
    } = filters;

    // Déterminer les dates
   /*  let dateCondition;
    if (periode) {
        const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
        dateCondition = { [Op.between]: [debut, fin] };
    } else if (fromDate && toDate) {
        dateCondition = { [Op.between]: [fromDate, toDate] };
    } else {
        // Par défaut, période du jour
        const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
        dateCondition = { [Op.between]: [debutJournee, finJournee] };
    } */

        // ✅ CORRIGÉ - Utiliser buildWhereFinance pour les dates
    const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        agentId,
        type: 'RECETTE'
    });

    const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        agentId,
        type: 'DEPENSE'
    });

    // 1. Calcul du chiffre d'affaires (recettes de catégorie vente)
    const categoriesVente = await db.Categorie.findAll({
        where: {
            code_structure,
            type: 'RECETTE',
            [Op.or]: [
                { name: { [Op.like]: '%vente%' } },
                { name: { [Op.like]: '%ventes%' } },
                { name: { [Op.like]: '%service%' } },
                { name: { [Op.like]: '%services%' } },
                { description: { [Op.like]: '%vente%' } },
                { description: { [Op.like]: '%ventes%' } }
            ]
        },
        attributes: ['id']
    });

    const categoryIdsVente = categoriesVente.map(cat => cat.id);

    const [resultCA, resultAutresRecettes, resultDepenses] = await Promise.all([
        // Chiffre d'affaires
        db.Recette.findOne({
            attributes: [
                [fn('SUM', col('montant')), 'total'],
                [fn('COUNT', col('id')), 'nbTransactions']
            ],
            where: {
                ...whereRecettes,
                //categoryId: categoryIdsVente.length > 0 ? { [Op.in]: categoryIdsVente } : null,
                ...(categoryIdsVente.length > 0 ? { categoryId: { [Op.in]: categoryIdsVente } } : {})
                
            },
            raw: true
        }),

        // Autres recettes (hors ventes)
        db.Recette.findOne({
            attributes: [
                [fn('SUM', col('montant')), 'total'],
                [fn('COUNT', col('id')), 'nbTransactions']
            ],
            where: {
                ...whereRecettes,
                ...(categoryIdsVente.length > 0 ? { categoryId: { [Op.notIn]: categoryIdsVente } } : {}),
            },
            raw: true
        }),

        // Dépenses totales
        db.Depense.findOne({
            attributes: [
                [fn('SUM', col('montant')), 'total'],
                [fn('COUNT', col('id')), 'nbTransactions']
            ],
            where: whereDepenses,
            raw: true
        })
    ]);

    const chiffreAffaires = parseFloat(resultCA?.total || 0);
    const nbVentes = parseInt(resultCA?.nbTransactions || 0);
    const autresRecettes = parseFloat(resultAutresRecettes?.total || 0);
    const nbAutresRecettes = parseInt(resultAutresRecettes?.nbTransactions || 0);
    const totalDepenses = parseFloat(resultDepenses?.total || 0);
    const nbDepenses = parseInt(resultDepenses?.nbTransactions || 0);

    const beneficeNet = (chiffreAffaires + autresRecettes) - totalDepenses;
    const soldeTresorerie = beneficeNet; // Pour simplifier, on utilise le bénéfice net comme solde

    return {
        chiffreAffaires,
        nbVentes,
        autresRecettes,
        nbAutresRecettes,
        totalDepenses,
        nbDepenses,
        beneficeNet,
        soldeTresorerie
    };
};

/**
 * Calculer l'évolution du CA par rapport à la période précédente
 */
const calculerEvolutionCA = async (filters, indicateursActuels) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId,
        agentId
    } = filters;

    let periodePrecedente;
    
    if (periode) {
        // Calculer la période précédente
        periodePrecedente = FonctionsUtilitaires.getPeriodePrecedente(periode, dateReference);
    } 
    else if (fromDate && toDate) {
        // Pour une plage de dates personnalisée, calculer la période précédente de même durée
/*         const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        const dureePeriode = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        const startDatePrecedent = new Date(startDate);
        startDatePrecedent.setDate(startDate.getDate() - dureePeriode);
        
        const endDatePrecedent = new Date(startDate);
        endDatePrecedent.setDate(startDate.getDate() - 1);
         
        periodePrecedente = { debut: startDatePrecedent, fin: endDatePrecedent };*/
        
        periodePrecedente = FonctionsUtilitaires.getPeriodePrecedentePersonnalisee(fromDate, toDate);

    } 
    else {
        // Par défaut, période précédente du jour
        const hier = new Date();
        hier.setDate(hier.getDate() - 1);
        periodePrecedente = FonctionsUtilitaires.getPeriodeDates('jour', hier);
    }

    // Calculer le CA de la période précédente
    const categoriesVente = await db.Categorie.findAll({
        where: {
            code_structure,
            type: 'RECETTE',
            [Op.or]: [
                { name: { [Op.like]: '%vente%' } },
                { name: { [Op.like]: '%ventes%' } },
                { name: { [Op.like]: '%service%' } },
                { name: { [Op.like]: '%services%' } },
                { description: { [Op.like]: '%vente%' } },
                { description: { [Op.like]: '%ventes%' } }
            ]
        },
        attributes: ['id']
    });

    const categoryIdsVente = categoriesVente.map(cat => cat.id);

    const resultCAPrecedent = await db.Recette.findOne({
        attributes: [
            [fn('SUM', col('montant')), 'total']
        ],
        where: {
            code_structure,
            statutRecette: 'validé',
            date: { [Op.between]: [periodePrecedente.debut, periodePrecedente.fin] },
            categoryId: categoryIdsVente.length > 0 ? { [Op.in]: categoryIdsVente } : null,
            ...(magasinId && { magasinId }),
            ...(agentId && { agentId })
        },
        raw: true
    });

    const caPrecedent = parseFloat(resultCAPrecedent?.total || 0);
    const caActuel = indicateursActuels.chiffreAffaires;

    let pourcentage = 0;
    let tendance = 'stable';

    if (caPrecedent > 0) {
        pourcentage = ((caActuel - caPrecedent) / caPrecedent) * 100;
        tendance = caActuel > caPrecedent ? 'hausse' : caActuel < caPrecedent ? 'baisse' : 'stable';
    } else if (caActuel > 0) {
        pourcentage = 100;
        tendance = 'hausse';
    }

    return {
        evolutionCA: {
            pourcentage: Math.round(pourcentage),
            tendance
        },
        periodePrecedenteCA: caPrecedent
    };
};

/**
 * Calculer le flux de trésorerie
 */
const calculerFluxTresorerie = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId,
        agentId
    } = filters;

    /* let dateCondition;
    if (periode) {
        const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
        dateCondition = { [Op.between]: [debut, fin] };
    } else if (fromDate && toDate) {
        dateCondition = { [Op.between]: [fromDate, toDate] };
    } else {
        const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
        dateCondition = { [Op.between]: [debutJournee, finJournee] };
    } */

    // 1. Solde initial (toutes les transactions AVANT la période)
    const debutPeriode = periode ? 
        FonctionsUtilitaires.getPeriodeDates(periode, dateReference).debut : 
        new Date(fromDate || FonctionsUtilitaires.getPeriodeJournee().debutJournee);

    const [soldeInitialRecettes, soldeInitialDepenses] = await Promise.all([
        db.Recette.sum('montant', {
            where: {
                code_structure,
                statutRecette: 'validé',
                date: { [Op.lt]: debutPeriode },
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            }
        }),
        db.Depense.sum('montant', {
            where: {
                code_structure,
                statutDepense: 'validé',
                date: { [Op.lt]: debutPeriode },
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            }
        })
    ]);

    const soldeInitial = (soldeInitialRecettes || 0) - (soldeInitialDepenses || 0);

     // 2. Recettes et dépenses de la période
    const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
        periode, dateReference, fromDate, toDate,
        code_structure, magasinId, agentId,
        type: 'RECETTE'
    });

    const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
        periode, dateReference, fromDate, toDate,
        code_structure, magasinId, agentId,
        type: 'DEPENSE'
    });

    const [recettesPeriod, depensesPeriod] = await Promise.all([
        db.Recette.sum('montant', {
            where: whereRecettes
        }),
        db.Depense.sum('montant', {
            where: whereDepenses
        })
    ]);

    const soldeFinal = soldeInitial + (recettesPeriod || 0) - (depensesPeriod || 0);

    return {
        soldeInitial,
        recettesPeriod: recettesPeriod || 0,
        depensesPeriod: depensesPeriod || 0,
        soldeFinal
    };
};

/**
 * Calculer les tendances financières
 */
const calculerTendances = async (filters, indicateursActuels) => {
    const {
        periode,
        dateReference,
        fromDate,
        toDate,
    } = filters;

    // Récupérer les données de la période précédente
    let periodePrecedente;
    if (periode) {
        periodePrecedente = FonctionsUtilitaires.getPeriodePrecedente(periode, dateReference);
    } 
    else if (fromDate && toDate) {
        /* const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        const dureePeriode = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        const startDatePrecedent = new Date(startDate);
        startDatePrecedent.setDate(startDate.getDate() - dureePeriode);
        
        const endDatePrecedent = new Date(startDate);
        endDatePrecedent.setDate(startDate.getDate() - 1);
        
        periodePrecedente = { debut: startDatePrecedent, fin: endDatePrecedent }; */ 

        periodePrecedente = FonctionsUtilitaires.getPeriodePrecedentePersonnalisee(fromDate, toDate);



    } else {
        const hier = new Date();
        hier.setDate(hier.getDate() - 1);
        periodePrecedente = FonctionsUtilitaires.getPeriodeDates('jour', hier);
    }

    // Calculer les indicateurs de la période précédente
    const indicateursPrecedents = await calculerIndicateursPrincipaux({
        ...filters,
        fromDate: periodePrecedente.debut,
        toDate: periodePrecedente.fin,
        periode: null // On utilise les dates directement
    });

    // Calculer les évolutions
    const calculerEvolution = (actuel, precedent) => {
        if (precedent === 0) return { valeur: 0, tendance: '→' };
        const variation = ((actuel - precedent) / precedent) * 100;
        const tendance = variation > 0 ? '↑' : variation < 0 ? '↓' : '→';
        return { valeur: Math.round(variation), tendance };
    };

    return {
        evolutionCA: calculerEvolution(
            indicateursActuels.chiffreAffaires,
            indicateursPrecedents.chiffreAffaires
        ),
        evolutionBenefices: calculerEvolution(
            indicateursActuels.beneficeNet,
            indicateursPrecedents.beneficeNet
        ),
        evolutionCouts: calculerEvolution(
            indicateursActuels.totalDepenses,
            indicateursPrecedents.totalDepenses
        )
    };
};

exports.calculerEvolutionCA = calculerEvolutionCA;
exports.calculerFluxTresorerie = calculerFluxTresorerie;
exports.calculerTendances = calculerTendances;
exports.calculerIndicateursPrincipaux = calculerIndicateursPrincipaux