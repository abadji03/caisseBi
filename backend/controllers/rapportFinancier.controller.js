const db = require('../models');
const FonctionsUtilitaires = require('./utils/fonctionsUtilitaires');
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
    let dateCondition;
    if (periode) {
        const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
        dateCondition = { [Op.between]: [debut, fin] };
    } else if (fromDate && toDate) {
        dateCondition = { [Op.between]: [fromDate, toDate] };
    } else {
        // Par défaut, période du jour
        const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
        dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

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
                code_structure,
                statutRecette: 'validé',
                date: dateCondition,
                categoryId: categoryIdsVente.length > 0 ? { [Op.in]: categoryIdsVente } : null,
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
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
                code_structure,
                statutRecette: 'validé',
                date: dateCondition,
                ...(categoryIdsVente.length > 0 ? { categoryId: { [Op.notIn]: categoryIdsVente } } : {}),
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            },
            raw: true
        }),

        // Dépenses totales
        db.Depense.findOne({
            attributes: [
                [fn('SUM', col('montant')), 'total'],
                [fn('COUNT', col('id')), 'nbTransactions']
            ],
            where: {
                code_structure,
                statutDepense: 'validé',
                date: dateCondition,
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            },
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
    } else if (fromDate && toDate) {
        // Pour une plage de dates personnalisée, calculer la période précédente de même durée
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        const dureePeriode = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        const startDatePrecedent = new Date(startDate);
        startDatePrecedent.setDate(startDate.getDate() - dureePeriode);
        
        const endDatePrecedent = new Date(startDate);
        endDatePrecedent.setDate(startDate.getDate() - 1);
        
        periodePrecedente = { debut: startDatePrecedent, fin: endDatePrecedent };
    } else {
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

    let dateCondition;
    if (periode) {
        const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
        dateCondition = { [Op.between]: [debut, fin] };
    } else if (fromDate && toDate) {
        dateCondition = { [Op.between]: [fromDate, toDate] };
    } else {
        const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
        dateCondition = { [Op.between]: [debutJournee, finJournee] };
    }

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
    const [recettesPeriod, depensesPeriod] = await Promise.all([
        db.Recette.sum('montant', {
            where: {
                code_structure,
                statutRecette: 'validé',
                date: dateCondition,
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            }
        }),
        db.Depense.sum('montant', {
            where: {
                code_structure,
                statutDepense: 'validé',
                date: dateCondition,
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            }
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
    } else if (fromDate && toDate) {
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        const dureePeriode = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        const startDatePrecedent = new Date(startDate);
        startDatePrecedent.setDate(startDate.getDate() - dureePeriode);
        
        const endDatePrecedent = new Date(startDate);
        endDatePrecedent.setDate(startDate.getDate() - 1);
        
        periodePrecedente = { debut: startDatePrecedent, fin: endDatePrecedent };
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

/**
 * API principale pour les indicateurs financiers
 */
exports.getIndicateursFinanciers = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        // Validation
        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const filters = {
            code_structure,
            magasinId: magasinId ? parseInt(magasinId) : undefined,
            agentId: agentId ? parseInt(agentId) : undefined,
            periode,
            dateReference: dateReference ? new Date(dateReference) : new Date(),
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined
        };

        // Calculer tous les indicateurs en parallèle
        const [indicateursPrincipaux, fluxTresorerie] = await Promise.all([
            calculerIndicateursPrincipaux(filters),
            //calculerEvolutionCA(filters, {}), // On recalcule après
            calculerFluxTresorerie(filters),
            //calculerTendances(filters, {}) // On recalcule après
        ]);

        // Recalculer l'évolution avec les bons indicateurs
        const evolutionRecalcul = await calculerEvolutionCA(filters, indicateursPrincipaux);
        const tendancesRecalcul = await calculerTendances(filters, indicateursPrincipaux);

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            dateDebut: fromDate || (periode ? FonctionsUtilitaires.getPeriodeDates(periode, dateReference).debut : undefined),
            dateFin: toDate || (periode ? FonctionsUtilitaires.getPeriodeDates(periode, dateReference).fin : undefined),
            ...indicateursPrincipaux,
            ...evolutionRecalcul,
            fluxTresorerie,
            tendances: tendancesRecalcul
        });

    } catch (error) {
        console.error('Erreur getIndicateursFinanciers:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour la répartition des dépenses par catégorie
 */
exports.getRepartitionDepenses = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        let dateCondition;
        if (periode) {
            const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } else if (fromDate && toDate) {
            dateCondition = { [Op.between]: [fromDate, toDate] };
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        // Récupérer les catégories de dépenses
        const categories = await db.Categorie.findAll({
            where: {
                code_structure,
                type: 'DEPENSE',
                isActive: true
            },
            attributes: ['id', 'name', 'description']
        });

        // Pour chaque catégorie, calculer les statistiques
        const repartition = await Promise.all(
            categories.map(async (categorie) => {
                const stats = await db.Depense.findOne({
                    attributes: [
                        [fn('SUM', col('montant')), 'montantTotal'],
                        [fn('COUNT', col('id')), 'occurrences']
                    ],
                    where: {
                        code_structure,
                        statutDepense: 'validé',
                        date: dateCondition,
                        categoryId: categorie.id,
                        ...(magasinId && { magasinId }),
                        ...(agentId && { agentId })
                    },
                    raw: true
                });

                return {
                    categorieId: categorie.id,
                    categorieName: categorie.name,
                    montantTotal: parseFloat(stats?.montantTotal || 0),
                    occurrences: parseInt(stats?.occurrences || 0)
                };
            })
        );

        // Filtrer les catégories sans dépenses
        const repartitionFiltree = repartition.filter(item => item.montantTotal > 0);

        // Calculer le total des dépenses pour les pourcentages
        const totalDepenses = repartitionFiltree.reduce((sum, item) => sum + item.montantTotal, 0);

        // Ajouter les pourcentages
        const repartitionAvecPourcentage = repartitionFiltree.map(item => ({
            ...item,
            pourcentage: totalDepenses > 0 ? (item.montantTotal / totalDepenses) * 100 : 0
        }));

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            totalDepenses,
            repartition: repartitionAvecPourcentage
        });

    } catch (error) {
        console.error('Erreur getRepartitionDepenses:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour la répartition des recettes par catégorie
 */
exports.getRepartitionRecettes = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        let dateCondition;
        if (periode) {
            const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } else if (fromDate && toDate) {
            dateCondition = { [Op.between]: [fromDate, toDate] };
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        // Récupérer les catégories de recettes
        const categories = await db.Categorie.findAll({
            where: {
                code_structure,
                type: 'RECETTE',
                isActive: true
            },
            attributes: ['id', 'name', 'description']
        });

        // Pour chaque catégorie, calculer les statistiques
        const repartition = await Promise.all(
            categories.map(async (categorie) => {
                const stats = await db.Recette.findOne({
                    attributes: [
                        [fn('SUM', col('montant')), 'montantTotal'],
                        [fn('COUNT', col('id')), 'occurrences']
                    ],
                    where: {
                        code_structure,
                        statutRecette: 'validé',
                        date: dateCondition,
                        categoryId: categorie.id,
                        ...(magasinId && { magasinId }),
                        ...(agentId && { agentId })
                    },
                    raw: true
                });

                return {
                    categorieId: categorie.id,
                    categorieName: categorie.name,
                    montantTotal: parseFloat(stats?.montantTotal || 0),
                    occurrences: parseInt(stats?.occurrences || 0)
                };
            })
        );

        // Filtrer les catégories sans recettes
        const repartitionFiltree = repartition.filter(item => item.montantTotal > 0);

        // Calculer le total des recettes pour les pourcentages
        const totalRecettes = repartitionFiltree.reduce((sum, item) => sum + item.montantTotal, 0);

        // Ajouter les pourcentages
        const repartitionAvecPourcentage = repartitionFiltree.map(item => ({
            ...item,
            pourcentage: totalRecettes > 0 ? (item.montantTotal / totalRecettes) * 100 : 0
        }));

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            totalRecettes,
            repartition: repartitionAvecPourcentage
        });

    } catch (error) {
        console.error('Erreur getRepartitionRecettes:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour les statistiques des modes de paiement
 */
exports.getStatistiquesModesPaiement = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        let dateCondition;
        if (periode) {
            const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } else if (fromDate && toDate) {
            dateCondition = { [Op.between]: [fromDate, toDate] };
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        // Statistiques pour les recettes
        const statsRecettes = await db.Recette.findAll({
            attributes: [
                'paymentMode',
                [fn('SUM', col('montant')), 'montantTotal'],
                [fn('COUNT', col('id')), 'occurrences']
            ],
            where: {
                code_structure,
                statutRecette: 'validé',
                date: dateCondition,
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            },
            group: ['paymentMode'],
            raw: true
        });

        // Formater les résultats
        const modesPaiement = statsRecettes.map(stat => ({
            mode: stat.paymentMode,
            montantTotal: parseFloat(stat.montantTotal || 0),
            occurrences: parseInt(stat.occurrences || 0)
        }));

        // Calculer le nombre total de transactions pour les pourcentages
        const totalTransactions = modesPaiement.reduce((sum, mode) => sum + mode.occurrences, 0);

        // Ajouter les pourcentages
        const modesAvecPourcentage = modesPaiement.map(mode => ({
            ...mode,
            pourcentage: totalTransactions > 0 ? (mode.occurrences / totalTransactions) * 100 : 0
        }));

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            totalTransactions,
            modesPaiement: modesAvecPourcentage
        });

    } catch (error) {
        console.error('Erreur getStatistiquesModesPaiement:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour les données détaillées des dépenses
 */
exports.getDepensesDetaillees = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate,
            page = 1,
            limit = 10,
            search = '',
            categoryId
        } = req.query;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        let dateCondition;
        if (periode) {
            const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } else if (fromDate && toDate) {
            dateCondition = { [Op.between]: [fromDate, toDate] };
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire la condition de recherche
        const where = {
            code_structure,
            statutDepense: 'validé',
            date: dateCondition,
            ...(magasinId && { magasinId }),
            ...(agentId && { agentId }),
            ...(categoryId && { categoryId })
        };

        // Ajouter la recherche si spécifiée
        if (search) {
            where[Op.or] = [
                { description: { [Op.like]: `%${search}%` } },
                { paymentMode: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await db.Depense.findAndCountAll({
            where,
            include: [{
                model: db.Categorie,
                attributes: ['id', 'name'],
                required: false
            }],
            order: [['date', 'DESC']],
            offset,
            limit: parseInt(limit),
            distinct: true
        });

        // Formater les résultats
        const depenses = rows.map(depense => ({
            id: depense.id,
            date: depense.date,
            montant: depense.montant,
            description: depense.description,
            paymentMode: depense.paymentMode,
            categorie: depense.Categorie ? {
                id: depense.Categorie.id,
                name: depense.Categorie.name
            } : null,
            magasinId: depense.magasinId,
            agentId: depense.agentId
        }));

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            limit: parseInt(limit),
            depenses
        });

    } catch (error) {
        console.error('Erreur getDepensesDetaillees:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour les données détaillées des recettes
 */
exports.getRecettesDetaillees = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate,
            page = 1,
            limit = 10,
            search = '',
            categoryId
        } = req.query;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        let dateCondition;
        if (periode) {
            const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } else if (fromDate && toDate) {
            dateCondition = { [Op.between]: [fromDate, toDate] };
        } else {
            const { debutJournee, finJournee } = FonctionsUtilitaires.getPeriodeJournee();
            dateCondition = { [Op.between]: [debutJournee, finJournee] };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire la condition de recherche
        const where = {
            code_structure,
            statutRecette: 'validé',
            date: dateCondition,
            ...(magasinId && { magasinId }),
            ...(agentId && { agentId }),
            ...(categoryId && { categoryId })
        };

        // Ajouter la recherche si spécifiée
        if (search) {
            where[Op.or] = [
                { description: { [Op.like]: `%${search}%` } },
                { paymentMode: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await db.Recette.findAndCountAll({
            where,
            include: [{
                model: db.Categorie,
                attributes: ['id', 'name'],
                required: false
            }],
            order: [['date', 'DESC']],
            offset,
            limit: parseInt(limit),
            distinct: true
        });

        // Formater les résultats
        const recettes = rows.map(recette => ({
            id: recette.id,
            date: recette.date,
            montant: recette.montant,
            description: recette.description,
            paymentMode: recette.paymentMode,
            categorie: recette.Categorie ? {
                id: recette.Categorie.id,
                name: recette.Categorie.name
            } : null,
            magasinId: recette.magasinId,
            agentId: recette.agentId
        }));

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            total: count,
            page: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            limit: parseInt(limit),
            recettes
        });

    } catch (error) {
        console.error('Erreur getRecettesDetaillees:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour les données évolutives (graphique d'évolution)
 */
exports.getDonneesEvolutives = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode,
            dateReference,
            fromDate,
            toDate,
            groupBy = 'jour' // jour, semaine, mois
        } = req.query;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        let dateCondition;
        if (periode) {
            const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            dateCondition = { [Op.between]: [debut, fin] };
        } else if (fromDate && toDate) {
            dateCondition = { [Op.between]: [fromDate, toDate] };
        } else {
            // Par défaut, dernier mois
            const fin = new Date();
            const debut = new Date();
            debut.setMonth(debut.getMonth() - 1);
            dateCondition = { [Op.between]: [debut, fin] };
        }

        // Déterminer la fonction de groupement
        let groupFunction;
        switch (groupBy) {
            case 'semaine':
                groupFunction = fn('WEEK', col('date'));
                break;
            case 'mois':
                groupFunction = fn('MONTH', col('date'));
                break;
            case 'jour':
            default:
                groupFunction = fn('DATE', col('date'));
                break;
        }

        // Récupérer les données des recettes groupées
        const recettesGroupes = await db.Recette.findAll({
            attributes: [
                [groupFunction, 'periode'],
                [fn('SUM', col('montant')), 'montantRecettes'],
                [fn('COUNT', col('id')), 'nbRecettes']
            ],
            where: {
                code_structure,
                statutRecette: 'validé',
                date: dateCondition,
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            },
            group: [groupFunction],
            order: [[groupFunction, 'ASC']],
            raw: true
        });

        // Récupérer les données des dépenses groupées
        const depensesGroupes = await db.Depense.findAll({
            attributes: [
                [groupFunction, 'periode'],
                [fn('SUM', col('montant')), 'montantDepenses'],
                [fn('COUNT', col('id')), 'nbDepenses']
            ],
            where: {
                code_structure,
                statutDepense: 'validé',
                date: dateCondition,
                ...(magasinId && { magasinId }),
                ...(agentId && { agentId })
            },
            group: [groupFunction],
            order: [[groupFunction, 'ASC']],
            raw: true
        });

        // Fusionner les données
        const donnees = recettesGroupes.map(rec => {
            const dep = depensesGroupes.find(d => d.periode === rec.periode);
            return {
                periode: rec.periode,
                recettes: parseFloat(rec.montantRecettes || 0),
                nbRecettes: parseInt(rec.nbRecettes || 0),
                depenses: parseFloat(dep?.montantDepenses || 0),
                nbDepenses: parseInt(dep?.nbDepenses || 0),
                benefice: (parseFloat(rec.montantRecettes || 0) - parseFloat(dep?.montantDepenses || 0))
            };
        });

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            groupBy,
            donnees
        });

    } catch (error) {
        console.error('Erreur getDonneesEvolutives:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API pour les données comparatives sur plusieurs périodes
 */
exports.getDonneesComparatives = async (req, res) => {
    try {
        const {
            code_structure,
            magasinId,
            agentId,
            periode = 'mois',
            dateReference,
            nombrePeriodes = 3
        } = req.query;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const donneesPeriodes = [];

        // Récupérer les données pour les N dernières périodes
        for (let i = nombrePeriodes - 1; i >= 0; i--) {
            let periodeActuelle;
            
            if (i === 0) {
                // Période actuelle
                periodeActuelle = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
            } else {
                // Périodes précédentes
                const dateRef = dateReference ? new Date(dateReference) : new Date();
                dateRef.setMonth(dateRef.getMonth() - i);
                periodeActuelle = FonctionsUtilitaires.getPeriodeDates(periode, dateRef);
            }

            // Calculer les indicateurs pour cette période
            const filters = {
                code_structure,
                magasinId: magasinId ? parseInt(magasinId) : undefined,
                agentId: agentId ? parseInt(agentId) : undefined,
                fromDate: periodeActuelle.debut,
                toDate: periodeActuelle.fin
            };

            const [indicateurs, fluxTresorerie] = await Promise.all([
                calculerIndicateursPrincipaux(filters),
                calculerFluxTresorerie(filters)
            ]);

            donneesPeriodes.push({
                periode: `P${i + 1}`,
                libelle: i === 0 ? 'Période actuelle' : `Période -${i}`,
                debut: periodeActuelle.debut,
                fin: periodeActuelle.fin,
                ...indicateurs,
                fluxTresorerie
            });
        }

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periodeBase: periode,
            nombrePeriodes,
            donneesPeriodes
        });

    } catch (error) {
        console.error('Erreur getDonneesComparatives:', error);
        res.status(500).json({ error: error.message });
    }
};