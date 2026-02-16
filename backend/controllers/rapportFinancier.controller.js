const db = require('../models');
const FonctionsUtilitaires = require('./utils/fonctionsUtilitaires');
const { Op, fn, col } = db.Sequelize;
const utilitaireRapport  = require('./utils/rapportFinancierUtilitaire');




/**
 * API principale pour les indicateurs financiers
 */
/* exports.getIndicateursFinanciers = async (req, res) => {
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
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;
        
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
 */
/* exports.getIndicateursFinanciers = async (req, res) => {
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
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;
        
        console.log('📥 Requête reçue - indicateurs financiers:');
        console.log('  - code_structure:', code_structure);
        console.log('  - periode:', periode);
        console.log('  - fromDate brut:', fromDate);
        console.log('  - toDate brut:', toDate);
        console.log('  - magasinId:', magasinId);
        console.log('  - agentId:', agentId);

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        // ✅ CORRECTION: Normaliser les dates AVANT de les passer aux fonctions
        let fromDateNormalized, toDateNormalized;
        
        if (fromDate && toDate) {
            fromDateNormalized = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
            toDateNormalized = FonctionsUtilitaires.normalizeDate(toDate, 'end');
            
            console.log('  - fromDate normalisé:', fromDateNormalized.toLocaleString());
            console.log('  - toDate normalisé:', toDateNormalized.toLocaleString());
        }



        const filters = {
            code_structure,
            magasinId: magasinId ? parseInt(magasinId) : undefined,
            agentId: agentId ? parseInt(agentId) : undefined,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate: fromDateNormalized,
            toDate: toDateNormalized
        };

        // Calculer tous les indicateurs en parallèle
        const [indicateursPrincipaux, fluxTresorerie] = await Promise.all([
            calculerIndicateursPrincipaux(filters),
            calculerFluxTresorerie(filters),
        ]);

        const evolutionRecalcul = await calculerEvolutionCA(filters, indicateursPrincipaux);
        const tendancesRecalcul = await calculerTendances(filters, indicateursPrincipaux);

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            dateDebut: fromDateNormalized || (periode ? FonctionsUtilitaires.getPeriodeDates(periode, dateReference).debut : undefined),
            dateFin: toDateNormalized || (periode ? FonctionsUtilitaires.getPeriodeDates(periode, dateReference).fin : undefined),
            ...indicateursPrincipaux,
            ...evolutionRecalcul,
            fluxTresorerie,
            tendances: tendancesRecalcul
        });

    } catch (error) {
        console.error('❌ Erreur getIndicateursFinanciers:', error);
        res.status(500).json({ error: error.message });
    }
};

 *//**
 
 
 * API pour la répartition des dépenses par catégorie
 */

exports.getIndicateursFinanciers = async (req, res) => {
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
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;
        
        console.log('📥 [Indicateurs] Requête reçue:');
        console.log('  - Période:', periode);
        console.log('  - FromDate brut:', fromDate);
        console.log('  - ToDate brut:', toDate);

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }


        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            agentId: agentIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate: fromDate ? FonctionsUtilitaires.normalizeDate(fromDate, 'start') : undefined,
            toDate: toDate ? FonctionsUtilitaires.normalizeDate(toDate, 'end') : undefined
        };

        console.log('  ✅ Dates normalisées:');
        console.log('    - FromDate:', filters.fromDate?.toLocaleString());
        console.log('    - ToDate:', filters.toDate?.toLocaleString());

        const [indicateursPrincipaux, fluxTresorerie] = await Promise.all([
            utilitaireRapport.calculerIndicateursPrincipaux(filters),
            utilitaireRapport.calculerFluxTresorerie(filters),
        ]);

        const evolutionRecalcul = await utilitaireRapport.calculerEvolutionCA(filters, indicateursPrincipaux);
        const tendancesRecalcul = await utilitaireRapport.calculerTendances(filters, indicateursPrincipaux);

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            dateDebut: filters.fromDate,
            dateFin: filters.toDate,
            ...indicateursPrincipaux,
            ...evolutionRecalcul,
            fluxTresorerie,
            tendances: tendancesRecalcul
        });

    } catch (error) {
        console.error('❌ Erreur getIndicateursFinanciers:', error);
        res.status(500).json({ error: error.message });
    }
};

 /** 
  * API pour la répartition des dépenses par catégorie
 */
 exports.getRepartitionDepenses = async (req, res) => {
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
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

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

        const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            magasinId: magasinIdFinal,
            agentId: agentIdFinal,
            type: 'DEPENSE'
        });

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
                        ...whereDepenses,
                        categoryId: categorie.id,
                        
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
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

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

        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            magasinId: magasinIdFinal,
            agentId: agentIdFinal,
            type: 'RECETTE'
        });

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
                        ...whereRecettes,
                        categoryId: categorie.id,
                        
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
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }
        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            magasinId:magasinIdFinal,
            agentId: agentIdFinal,
            type: 'RECETTE'
        });

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

        // Statistiques pour les recettes
        const statsRecettes = await db.Recette.findAll({
            attributes: [
                'paymentMode',
                [fn('SUM', col('montant')), 'montantTotal'],
                [fn('COUNT', col('id')), 'occurrences']
            ],
            where: whereRecettes,
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
            search = '',
            categoryId
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            magasinId: magasinIdFinal,
            agentId: agentIdFinal,
            type: 'DEPENSE'
        });

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

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire la condition de recherche
        const where = {
            ...whereDepenses,
            ...(categoryId && { categoryId: parseInt(categoryId) }) //...(categoryId && { categoryId })
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
            search = '',
            categoryId
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

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

        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            magasinId: magasinIdFinal,
            agentId:agentIdFinal,
            type: 'RECETTE'
        });

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire la condition de recherche
        const where = {
            ...whereRecettes,
            ...(categoryId && { categoryId: parseInt(categoryId) }) //...(categoryId && { categoryId })
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
            groupBy = 'jour' // jour, semaine, mois
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        /* let dateCondition;
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
        } */
       
        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            magasinId:magasinIdFinal,
            agentId: agentIdFinal,
            type: 'RECETTE'
        });

        const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            magasinId: magasinIdFinal,
            agentId: agentIdFinal,
            type: 'DEPENSE'
        });

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
            where: whereRecettes,
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
            where: whereDepenses,
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
        const authUser = req.user;

        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }
        const {
            magasinId,
            agentId,
            periode = 'mois',
            dateReference,
            nombrePeriodes = 3
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;
        const agentIdFromQuery = agentId ? parseInt(agentId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        let agentIdFinal = agentIdFromQuery;

        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
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
                magasinId: magasinIdFinal,
                agentId: agentIdFinal,
                fromDate: periodeActuelle.debut,
                toDate: periodeActuelle.fin
            };

            const [indicateurs, fluxTresorerie] = await Promise.all([
                utilitaireRapport.calculerIndicateursPrincipaux(filters),
                utilitaireRapport.calculerFluxTresorerie(filters)
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