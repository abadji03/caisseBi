const db = require('../models');
const logger = require('../services/logger.js');
const FonctionsUtilitaires = require('./utils/fonctionsUtilitaires');
const { Op, fn, col } = db.Sequelize;
const utilitaireRapport  = require('./utils/rapportFinancierUtilitaire');
const ExcelJS = require('exceljs');
const HistoriqueService = require('../services/historique.service'); 





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

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getIndicateursFinanciers:', error);
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

        const code_structure = authUser.code_structure;logger.log('rapportFinancier.controller', '📥 Requête reçue - indicateurs financiers:');logger.log('rapportFinancier.controller', '  - code_structure:', code_structure);logger.log('rapportFinancier.controller', '  - periode:', periode);logger.log('rapportFinancier.controller', '  - fromDate brut:', fromDate);logger.log('rapportFinancier.controller', '  - toDate brut:', toDate);logger.log('rapportFinancier.controller', '  - magasinId:', magasinId);logger.log('rapportFinancier.controller', '  - agentId:', agentId);

        if (!code_structure) {
            return res.status(400).json({
                error: 'Le paramètre "code_structure" est requis'
            });
        }

        // ✅ CORRECTION: Normaliser les dates AVANT de les passer aux fonctions
        let fromDateNormalized, toDateNormalized;
        
        if (fromDate && toDate) {
            fromDateNormalized = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
            toDateNormalized = FonctionsUtilitaires.normalizeDate(toDate, 'end');logger.log('rapportFinancier.controller', '  - fromDate normalisé:', fromDateNormalized.toLocaleString());logger.log('rapportFinancier.controller', '  - toDate normalisé:', toDateNormalized.toLocaleString());
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

    } catch (error) {logger.error('rapportFinancier.controller', '❌ Erreur getIndicateursFinanciers:', error);
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

        const code_structure = authUser.code_structure;logger.log('rapportFinancier.controller', '📥 [Indicateurs] Requête reçue:');logger.log('rapportFinancier.controller', '  - Période:', periode);logger.log('rapportFinancier.controller', '  - FromDate brut:', fromDate);logger.log('rapportFinancier.controller', '  - ToDate brut:', toDate);

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
        };logger.log('rapportFinancier.controller', '  ✅ Dates normalisées:');logger.log('rapportFinancier.controller', '    - FromDate:', filters.fromDate?.toLocaleString());logger.log('rapportFinancier.controller', '    - ToDate:', filters.toDate?.toLocaleString());

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

    } catch (error) {logger.error('rapportFinancier.controller', '❌ Erreur getIndicateursFinanciers:', error);
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

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getRepartitionDepenses:', error);
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

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getRepartitionRecettes:', error);
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

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getStatistiquesModesPaiement:', error);
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

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getDepensesDetaillees:', error);
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

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getRecettesDetaillees:', error);
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
        /* let groupFunction;
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
        } */
        let groupFunction;

        switch (groupBy) {
            case 'semaine':
                // Année + semaine ISO
                groupFunction = fn('YEARWEEK', col('date'), 1);
                break;

            case 'mois':
                // Format YYYY-MM
                groupFunction = fn('DATE_FORMAT', col('date'), '%Y-%m');
                break;

            case 'jour':
            default:
                // Format YYYY-MM-DD
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
        /* const donnees = recettesGroupes.map(rec => {
            const dep = depensesGroupes.find(d => d.periode === rec.periode);
            return {
                periode: rec.periode,
                recettes: parseFloat(rec.montantRecettes || 0),
                nbRecettes: parseInt(rec.nbRecettes || 0),
                depenses: parseFloat(dep?.montantDepenses || 0),
                nbDepenses: parseInt(dep?.nbDepenses || 0),
                benefice: (parseFloat(rec.montantRecettes || 0) - parseFloat(dep?.montantDepenses || 0))
            };
        }); */

        const map = new Map();
        // Ajouter recettes
        recettesGroupes.forEach(rec => {
            map.set(rec.periode, {
                periode: rec.periode,
                recettes: parseFloat(rec.montantRecettes || 0),
                nbRecettes: parseInt(rec.nbRecettes || 0),
                depenses: 0,
                nbDepenses: 0
            });
        });

        // Ajouter dépenses
        depensesGroupes.forEach(dep => {
            if (!map.has(dep.periode)) {
                map.set(dep.periode, {
                    periode: dep.periode,
                    recettes: 0,
                    nbRecettes: 0,
                    depenses: parseFloat(dep.montantDepenses || 0),
                    nbDepenses: parseInt(dep.nbDepenses || 0)
                });
            } else {
                const entry = map.get(dep.periode);
                entry.depenses = parseFloat(dep.montantDepenses || 0);
                entry.nbDepenses = parseInt(dep.nbDepenses || 0);
            }
        });

        // Calcul bénéfice
        const donnees = Array.from(map.values())
            .map(item => ({
                ...item,
                benefice: item.recettes - item.depenses
            }))
            .sort((a, b) => a.periode > b.periode ? 1 : -1);

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            groupBy,
            donnees
        });

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getDonneesEvolutives:', error);
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
            fromDate,
            toDate,
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

        //const donneesPeriodes = [];

        // Récupérer les données pour les N dernières périodes
        /* for (let i = nombrePeriodes - 1; i >= 0; i--) {
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
        } */

        //Déterminer la période de base
        // Si c'est une période personnalisée, on utilise fromDate et toDate
        // Sinon, on utilise la période prédéfinie
        let periodeBase = periode || 'mois';
        let dateRef = dateReference ? new Date(dateReference) : new Date();
        
        // Normaliser la date de référence
        if (dateRef) {
            dateRef = FonctionsUtilitaires.normalizeDate(dateRef, 'start');
        }

        // Déterminer la période actuelle (période 0)
        let periodeActuelle;
        if (fromDate && toDate) {
            // Période personnalisée
            periodeActuelle = {
                debut: FonctionsUtilitaires.normalizeDate(fromDate, 'start'),
                fin: FonctionsUtilitaires.normalizeDate(toDate, 'end')
            };
            periodeBase = 'personnalisee';
        } else {
            // Période prédéfinie
            periodeActuelle = FonctionsUtilitaires.getPeriodeDates(periodeBase, dateRef);
        }logger.log('rapportFinancier.controller', '📊 Période actuelle:', periodeActuelle);

        const donneesPeriodes = [];

        // Récupérer les données pour les N périodes (actuelle + précédentes)
        for (let i = 0; i < nombrePeriodes; i++) {
            let periodeCourante;
            
            if (i === 0) {
                // Période actuelle
                periodeCourante = periodeActuelle;
            } else {
                // Périodes précédentes
                if (fromDate && toDate) {
                    // Pour période personnalisée, on décale la date
                    const startDate = new Date(periodeActuelle.debut);
                    const endDate = new Date(periodeActuelle.fin);
                    const dureePeriode = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                    
                    const startDatePrecedent = new Date(startDate);
                    startDatePrecedent.setDate(startDate.getDate() - (dureePeriode * i));
                    
                    const endDatePrecedent = new Date(startDate);
                    endDatePrecedent.setDate(startDate.getDate() - (dureePeriode * (i-1)) - 1);
                    
                    periodeCourante = { 
                        debut: startDatePrecedent, 
                        fin: endDatePrecedent 
                    };
                } else {
                    // Pour période prédéfinie, on utilise getPeriodePrecedente
                    const datePrecedente = new Date(dateRef);
                    datePrecedente.setMonth(datePrecedente.getMonth() - i);
                    periodeCourante = FonctionsUtilitaires.getPeriodeDates(periodeBase, datePrecedente);
                }
            }

            // Calculer les indicateurs pour cette période
            const filters = {
                code_structure,
                magasinId: magasinIdFinal,
                agentId: agentIdFinal,
                fromDate: periodeCourante.debut,
                toDate: periodeCourante.fin
            };

            const [indicateurs, fluxTresorerie] = await Promise.all([
                utilitaireRapport.calculerIndicateursPrincipaux(filters),
                utilitaireRapport.calculerFluxTresorerie(filters)
            ]);

            // Formater la date pour l'affichage
            const formatDate = (date) => {
                return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            };

            donneesPeriodes.push({
                periode: `P${i + 1}`,
                libelle: i === 0 ? 'Période actuelle' : `Période -${i}`,
                dateRange: `${formatDate(periodeCourante.debut)} - ${formatDate(periodeCourante.fin)}`,
                debut: periodeCourante.debut,
                fin: periodeCourante.fin,
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

    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getDonneesComparatives:', error);
        res.status(500).json({ error: error.message });
    }
};


/**
 * Génère un rapport financier au format PDF
 */
exports.genererRapportPDF = async (req, res) => {
    try {
        const authUser = req.user;
        const clientIp = HistoriqueService.getClientIp(req);

        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        // Récupération des paramètres
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
        }logger.log('rapportFinancier.controller', '📊 Génération PDF financier du', debut, 'au', fin);

        // Récupération des informations de la structure
        const structure = await db.Structure.findOne({
            where: { code_structure }
        });

        // Récupération des informations du magasin
        let magasinNom = null;
        if (magasinIdFinal) {
            const magasin = await db.Magasin.findByPk(magasinIdFinal);
            magasinNom = magasin ? magasin.nom : null;
        }

        // Formatage de la période pour l'affichage
        const periodeAffichage = utilitaireRapport.formatPeriodeAffichage(debut, fin, periode);

        // Paramètres pour les filtres
        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            agentId: agentId ? parseInt(agentId) : null,
            fromDate: debut,
            toDate: fin
        };

        // Récupération de toutes les données en parallèle
        const [
            indicateursPrincipaux,
            repartitionDepenses,
            repartitionRecettes,
            modesPaiementStats,
            depensesDetaillees,
            recettesDetaillees,
            donneesEvolutives,
            donneesComparatives
        ] = await Promise.all([
            // Indicateurs principaux
            utilitaireRapport.calculerIndicateursPrincipaux(filters),

            // Répartition des dépenses
            (async () => {
                const repartition = await exports.getRepartitionDepensesData(filters);
                return repartition;
            })(),

            // Répartition des recettes
            (async () => {
                const repartition = await exports.getRepartitionRecettesData(filters);
                return repartition;
            })(),

            // Statistiques modes de paiement
            (async () => {
                const stats = await exports.getStatistiquesModesPaiementData(filters);
                return stats;
            })(),

            // Détails des dépenses (sans pagination)
            (async () => {
                const depenses = await exports.getDepensesDetailleesData({ ...filters, limit: 1000 });
                return depenses;
            })(),

            // Détails des recettes (sans pagination)
            (async () => {
                const recettes = await exports.getRecettesDetailleesData({ ...filters, limit: 1000 });
                return recettes;
            })(),

            // Données évolutives pour les graphiques
            (async () => {
                const evolution = await exports.getDonneesEvolutivesData({ ...filters, groupBy: 'jour' });
                return evolution;
            })(),

            // Données comparatives sur plusieurs périodes
            (async () => {
                const comparatives = await exports.getDonneesComparativesData(filters);
                return comparatives;
            })()
        ]);

        // Calcul des tendances et évolutions
        const evolutionRecalcul = await utilitaireRapport.calculerEvolutionCA(filters, indicateursPrincipaux);
        const tendancesRecalcul = await utilitaireRapport.calculerTendances(filters, indicateursPrincipaux);
        
        // Calcul du flux de trésorerie
        const fluxTresorerie = await utilitaireRapport.calculerFluxTresorerie(filters);

        // Assemblage des données pour le template
        const indicateursFinanciers = {
            ...indicateursPrincipaux,
            ...evolutionRecalcul,
            fluxTresorerie,
            tendances: tendancesRecalcul
        };

        // Données pour le template
        const templateData = {
            structure,
            utilisateur: authUser,
            magasin: magasinIdFinal,
            magasinNom,
            periodeAffichage,
            indicateursFinanciers,
            repartitionDepenses,
            repartitionRecettes,
            modesPaiementStats,
            depensesDetaillees,
            recettesDetaillees,
            donneesEvolutives,
            donneesComparatives
        };

        // Rendu du template EJS
        const html = await utilitaireRapport.renderEjsTemplate('rapport-financier', templateData);

        // Génération du PDF avec Puppeteer
        const pdf = await utilitaireRapport.generatePDF(html);

        // Enregistrement de l'action dans l'historique
        await HistoriqueService.enregistrerAction(
            authUser.id,
            `Génération d'un rapport financier PDF`,
            clientIp,
            {
                action: 'EXPORT_PDF_FINANCIER',
                params: {
                    magasinId: magasinIdFinal,
                    agentId: agentId ? parseInt(agentId) : null,
                    periode,
                    dateReference,
                    fromDate,
                    toDate,
                    code_structure
                },
                periodeAffichage,
                timestamp: new Date()
            }
        );

        // Envoi du PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=rapport-financier-${Date.now()}.pdf`);
        res.send(pdf);

    } catch (error) {logger.error('rapportFinancier.controller', '❌ Erreur génération PDF financier:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la génération du PDF',
            details: error.message 
        });
    }
};

/**
 * Récupère les données de répartition des dépenses
 */
exports.getRepartitionDepensesData = async (filters) => {
    try {
        const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
            ...filters,
            type: 'DEPENSE'
        });

        const categories = await db.Categorie.findAll({
            where: {
                code_structure: filters.code_structure,
                type: 'DEPENSE',
                isActive: true
            },
            attributes: ['id', 'name']
        });

        const repartition = await Promise.all(
            categories.map(async (categorie) => {
                const stats = await db.Depense.findOne({
                    attributes: [
                        [fn('SUM', col('montant')), 'montantTotal'],
                        [fn('COUNT', col('id')), 'occurrences']
                    ],
                    where: {
                        ...whereDepenses,
                        categoryId: categorie.id
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

        const repartitionFiltree = repartition.filter(item => item.montantTotal > 0);
        const totalDepenses = repartitionFiltree.reduce((sum, item) => sum + item.montantTotal, 0);

        const repartitionAvecPourcentage = repartitionFiltree.map(item => ({
            ...item,
            pourcentage: totalDepenses > 0 ? (item.montantTotal / totalDepenses) * 100 : 0
        }));

        return {
            totalDepenses,
            repartition: repartitionAvecPourcentage
        };
    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getRepartitionDepensesData:', error);
        return { totalDepenses: 0, repartition: [] };
    }
};

/**
 * Récupère les données de répartition des recettes
 */
exports.getRepartitionRecettesData = async (filters) => {
    try {
        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            ...filters,
            type: 'RECETTE'
        });

        const categories = await db.Categorie.findAll({
            where: {
                code_structure: filters.code_structure,
                type: 'RECETTE',
                isActive: true
            },
            attributes: ['id', 'name']
        });

        const repartition = await Promise.all(
            categories.map(async (categorie) => {
                const stats = await db.Recette.findOne({
                    attributes: [
                        [fn('SUM', col('montant')), 'montantTotal'],
                        [fn('COUNT', col('id')), 'occurrences']
                    ],
                    where: {
                        ...whereRecettes,
                        categoryId: categorie.id
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

        const repartitionFiltree = repartition.filter(item => item.montantTotal > 0);
        const totalRecettes = repartitionFiltree.reduce((sum, item) => sum + item.montantTotal, 0);

        const repartitionAvecPourcentage = repartitionFiltree.map(item => ({
            ...item,
            pourcentage: totalRecettes > 0 ? (item.montantTotal / totalRecettes) * 100 : 0
        }));

        return {
            totalRecettes,
            repartition: repartitionAvecPourcentage
        };
    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getRepartitionRecettesData:', error);
        return { totalRecettes: 0, repartition: [] };
    }
};

/**
 * Récupère les statistiques des modes de paiement
 */
exports.getStatistiquesModesPaiementData = async (filters) => {
    try {
        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            ...filters,
            type: 'RECETTE'
        });

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

        const modesPaiement = statsRecettes.map(stat => ({
            mode: stat.paymentMode,
            montantTotal: parseFloat(stat.montantTotal || 0),
            occurrences: parseInt(stat.occurrences || 0),
            pourcentage: 0 // Sera calculé après
        }));

        const totalTransactions = modesPaiement.reduce((sum, mode) => sum + mode.occurrences, 0);

        modesPaiement.forEach(mode => {
            mode.pourcentage = totalTransactions > 0 ? (mode.occurrences / totalTransactions) * 100 : 0;
        });

        return {
            totalTransactions,
            modesPaiement
        };
    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getStatistiquesModesPaiementData:', error);
        return { totalTransactions: 0, modesPaiement: [] };
    }
};

/**
 * Récupère les détails des dépenses
 */
exports.getDepensesDetailleesData = async (filters) => {
    try {
        const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
            ...filters,
            type: 'DEPENSE'
        });

        const { count, rows } = await db.Depense.findAndCountAll({
            where: whereDepenses,
            include: [{
                model: db.Categorie,
                attributes: ['id', 'name'],
                required: false
            }],
            order: [['date', 'DESC']],
            limit: filters.limit || 1000,
            offset: filters.offset || 0
        });

        const depenses = rows.map(depense => ({
            id: depense.id,
            date: depense.date,
            montant: depense.montant,
            description: depense.description,
            paymentMode: depense.paymentMode,
            categorie: depense.Categorie ? {
                id: depense.Categorie.id,
                name: depense.Categorie.name
            } : null
        }));

        return {
            total: count,
            depenses
        };
    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getDepensesDetailleesData:', error);
        return { total: 0, depenses: [] };
    }
};

/**
 * Récupère les détails des recettes
 */
exports.getRecettesDetailleesData = async (filters) => {
    try {
        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            ...filters,
            type: 'RECETTE'
        });

        const { count, rows } = await db.Recette.findAndCountAll({
            where: whereRecettes,
            include: [{
                model: db.Categorie,
                attributes: ['id', 'name'],
                required: false
            }],
            order: [['date', 'DESC']],
            limit: filters.limit || 1000,
            offset: filters.offset || 0
        });

        const recettes = rows.map(recette => ({
            id: recette.id,
            date: recette.date,
            montant: recette.montant,
            description: recette.description,
            paymentMode: recette.paymentMode,
            categorie: recette.Categorie ? {
                id: recette.Categorie.id,
                name: recette.Categorie.name
            } : null
        }));

        return {
            total: count,
            recettes
        };
    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getRecettesDetailleesData:', error);
        return { total: 0, recettes: [] };
    }
};

/**
 * Récupère les données évolutives
 */
exports.getDonneesEvolutivesData = async (filters) => {
    try {
        const { groupBy = 'jour' } = filters;

         // 1. Récupérer toutes les dates de la période
        const dateDebut = filters.fromDate;
        const dateFin = filters.toDate;
        
        // 2. Générer un tableau de toutes les dates entre dateDebut et dateFin
        const toutesLesDates = [];
        let dateCourante = new Date(dateDebut);
        while (dateCourante <= dateFin) {
            toutesLesDates.push(new Date(dateCourante));
            dateCourante.setDate(dateCourante.getDate() + 1);
        }

        const whereRecettes = FonctionsUtilitaires.buildWhereFinance({
            ...filters,
            type: 'RECETTE'
        });

        const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
            ...filters,
            type: 'DEPENSE'
        });

        let groupFunction;
        /* switch (groupBy) {
            case 'semaine':
                groupFunction = fn('WEEK', col('date'));
                break;
            case 'mois':
                groupFunction = fn('MONTH', col('date'));
                break;
            default:
                groupFunction = fn('DATE', col('date'));
        } */
        switch (groupBy) {
            case 'semaine':
                // Année + semaine ISO
                groupFunction = fn('YEARWEEK', col('date'), 1);
                break;
            case 'mois':
                // Format YYYY-MM
                groupFunction = fn('DATE_FORMAT', col('date'), '%Y-%m');
                break;
            case 'jour':
            default:
                // Format YYYY-MM-DD
                groupFunction = fn('DATE', col('date'));
                break;
        }

        const [recettesGroupes, depensesGroupes] = await Promise.all([
            db.Recette.findAll({
                attributes: [
                    [groupFunction, 'periode'],
                    [fn('SUM', col('montant')), 'montantRecettes'],
                    [fn('COUNT', col('id')), 'nbRecettes']
                ],
                where: whereRecettes,
                group: [groupFunction],
                order: [[groupFunction, 'ASC']],
                raw: true
            }),
            db.Depense.findAll({
                attributes: [
                    [groupFunction, 'periode'],
                    [fn('SUM', col('montant')), 'montantDepenses'],
                    [fn('COUNT', col('id')), 'nbDepenses']
                ],
                where: whereDepenses,
                group: [groupFunction],
                order: [[groupFunction, 'ASC']],
                raw: true
            })
        ]);

        /* const donnees = recettesGroupes.map(rec => {
            const dep = depensesGroupes.find(d => d.periode === rec.periode);
            return {
                periode: rec.periode,
                recettes: parseFloat(rec.montantRecettes || 0),
                nbRecettes: parseInt(rec.nbRecettes || 0),
                depenses: parseFloat(dep?.montantDepenses || 0),
                nbDepenses: parseInt(dep?.nbDepenses || 0),
                benefice: (parseFloat(rec.montantRecettes || 0) - parseFloat(dep?.montantDepenses || 0))
            };
        }); */
// 🔴 FUSION DES DONNÉES avec Map (IDENTIQUE à l'API)
        const map = new Map();
         // Ajouter les recettes
        recettesGroupes.forEach(rec => {
            map.set(rec.periode, {
                periode: rec.periode,
                recettes: parseFloat(rec.montantRecettes || 0),
                nbRecettes: parseInt(rec.nbRecettes || 0),
                depenses: 0,
                nbDepenses: 0
            });
        });

        // Ajouter les dépenses
        depensesGroupes.forEach(dep => {
            if (!map.has(dep.periode)) {
                map.set(dep.periode, {
                    periode: dep.periode,
                    recettes: 0,
                    nbRecettes: 0,
                    depenses: parseFloat(dep.montantDepenses || 0),
                    nbDepenses: parseInt(dep.nbDepenses || 0)
                });
            } else {
                const entry = map.get(dep.periode);
                entry.depenses = parseFloat(dep.montantDepenses || 0);
                entry.nbDepenses = parseInt(dep.nbDepenses || 0);
            }
        });

        // Calculer le bénéfice et trier
        const donnees = Array.from(map.values())
            .map(item => ({
                ...item,
                benefice: item.recettes - item.depenses
            }))
            .sort((a, b) => a.periode > b.periode ? 1 : -1);


        return {
            groupBy,
            donnees
        };
    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getDonneesEvolutivesData:', error);
        return { groupBy: 'jour', donnees: [] };
    }
};

/**
 * Récupère les données comparatives
 */
exports.getDonneesComparativesData = async (filters) => {
    try {
        const { periode = 'mois', nombrePeriodes = 3 } = filters;
        const donneesPeriodes = [];

        for (let i = nombrePeriodes - 1; i >= 0; i--) {
            let periodeActuelle;
            
            if (i === 0) {
                periodeActuelle = { debut: filters.fromDate, fin: filters.toDate };
            } else {
                const dateRef = new Date(filters.fromDate);
                dateRef.setMonth(dateRef.getMonth() - i);
                const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateRef);
                periodeActuelle = { debut: dates.debut, fin: dates.fin };
            }

            const filtersPeriode = {
                ...filters,
                fromDate: periodeActuelle.debut,
                toDate: periodeActuelle.fin
            };

            const indicateurs = await utilitaireRapport.calculerIndicateursPrincipaux(filtersPeriode);
            const fluxTresorerie = await utilitaireRapport.calculerFluxTresorerie(filtersPeriode);

            donneesPeriodes.push({
                periode: `P${i + 1}`,
                libelle: i === 0 ? 'Période actuelle' : `Période -${i}`,
                debut: periodeActuelle.debut,
                fin: periodeActuelle.fin,
                ...indicateurs,
                fluxTresorerie
            });
        }

        return {
            periodeBase: periode,
            nombrePeriodes,
            donneesPeriodes
        };
    } catch (error) {logger.error('rapportFinancier.controller', 'Erreur getDonneesComparativesData:', error);
        return { periodeBase: 'mois', nombrePeriodes: 0, donneesPeriodes: [] };
    }
};


/**
 * Exporte le rapport financier au format Excel
 */
exports.exportRapportExcel = async (req, res) => {
    try {
        const authUser = req.user;
        const clientIp = HistoriqueService.getClientIp(req);

        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        // Récupération des paramètres
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
        }logger.log('rapportFinancier.controller', '📊 Export Excel financier du', debut, 'au', fin);

        // Récupération des informations de la structure
        const structure = await db.Structure.findOne({
            where: { code_structure }
        });

        // Récupération des informations du magasin
        let magasinNom = null;
        if (magasinIdFinal) {
            const magasin = await db.Magasin.findByPk(magasinIdFinal);
            magasinNom = magasin ? magasin.nom : null;
        }

        // Récupération des informations du vendeur
        let agentNom = null;
        if (agentId) {
            const agent = await db.Users.findByPk(agentId);
            agentNom = agent ? agent.nom : null;
        }

        // Formatage de la période pour l'affichage
        const periodeAffichage = utilitaireRapport.formatPeriodeAffichage(debut, fin, periode);

        // Paramètres pour les filtres
        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            agentId: agentId ? parseInt(agentId) : null,
            fromDate: debut,
            toDate: fin
        };

        // Récupération de toutes les données en parallèle
        const [
            indicateursPrincipaux,
            repartitionDepenses,
            repartitionRecettes,
            modesPaiementStats,
            depensesDetaillees,
            recettesDetaillees,
            donneesEvolutives,
            donneesComparatives
        ] = await Promise.all([
            // Indicateurs principaux
            utilitaireRapport.calculerIndicateursPrincipaux(filters),

            // Répartition des dépenses
            exports.getRepartitionDepensesData(filters),

            // Répartition des recettes
            exports.getRepartitionRecettesData(filters),

            // Statistiques modes de paiement
            exports.getStatistiquesModesPaiementData(filters),

            // Détails des dépenses (sans pagination)
            exports.getDepensesDetailleesData({ ...filters, limit: 10000 }),

            // Détails des recettes (sans pagination)
            exports.getRecettesDetailleesData({ ...filters, limit: 10000 }),

            // Données évolutives
            exports.getDonneesEvolutivesData({ ...filters, groupBy: 'jour' }),

            // Données comparatives
            exports.getDonneesComparativesData({ ...filters, nombrePeriodes: 6 })
        ]);

        // Calcul des tendances et évolutions
        const evolutionRecalcul = await utilitaireRapport.calculerEvolutionCA(filters, indicateursPrincipaux);
        const tendancesRecalcul = await utilitaireRapport.calculerTendances(filters, indicateursPrincipaux);
        const fluxTresorerie = await utilitaireRapport.calculerFluxTresorerie(filters);

        // Assemblage des indicateurs
        const indicateursFinanciers = {
            ...indicateursPrincipaux,
            ...evolutionRecalcul,
            fluxTresorerie,
            tendances: tendancesRecalcul
        };

        // ============================================
        // CRÉATION DU WORKBOOK EXCEL
        // ============================================
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

        // ============================================
        // FEUILLE 1 : RÉSUMÉ
        // ============================================
        const summarySheet = workbook.addWorksheet('Résumé');

        // Titre
        summarySheet.mergeCells('A1:F2');
        summarySheet.getCell('A1').value = 'RAPPORT FINANCIER';
        summarySheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FF0D6EFD' } };
        summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(1).height = 40;

        // Informations générales
        summarySheet.addRow([]);
        summarySheet.addRow(['INFORMATIONS GÉNÉRALES']);
        summarySheet.getRow(4).font = { bold: true, size: 14 };

        const infoData = [
            ['Structure', structure?.nom_structure || 'N/A'],
            ['Période', periodeAffichage],
            ['Magasin', magasinNom || (magasinIdFinal ? 'Magasin sélectionné' : 'Tous')],
            ['Agent', agentNom || (agentId ? 'Agent sélectionné' : 'Tous')],
            ['Date génération', new Date().toLocaleString('fr-FR')],
            ['Responsable', authUser.nom || 'Système']
        ];

        infoData.forEach(([label, value], index) => {
            const row = summarySheet.getRow(6 + index);
            row.getCell(1).value = label;
            row.getCell(1).font = { bold: true };
            row.getCell(2).value = value;
        });

        summarySheet.addRow([]);

        // Indicateurs clés
        summarySheet.addRow(['INDICATEURS CLÉS']);
        summarySheet.getRow(13).font = { bold: true, size: 14 };

        const kpiHeaders = ['Indicateur', 'Valeur', 'Détail'];
        const kpiHeaderRow = summarySheet.addRow(kpiHeaders);
        kpiHeaderRow.eachCell(cell => cell.style = headerStyle);

        const marge = indicateursFinanciers.chiffreAffaires + indicateursFinanciers.autresRecettes;
        const margePourcentage = marge > 0 ? ((indicateursFinanciers.beneficeNet / marge) * 100).toFixed(1) : '0';

        const kpiRows = [
            ['Chiffre d\'affaires', `${indicateursFinanciers.chiffreAffaires.toLocaleString('fr-FR')} F CFA`, `${indicateursFinanciers.nbVentes || 0} transactions`],
            ['Autres recettes', `${indicateursFinanciers.autresRecettes.toLocaleString('fr-FR')} F CFA`, `${indicateursFinanciers.nbAutresRecettes || 0} transactions`],
            ['Total dépenses', `${indicateursFinanciers.totalDepenses.toLocaleString('fr-FR')} F CFA`, `${indicateursFinanciers.nbDepenses || 0} transactions`],
            ['Bénéfice net', `${indicateursFinanciers.beneficeNet.toLocaleString('fr-FR')} F CFA`, `Marge: ${margePourcentage}%`]
        ];

        kpiRows.forEach(row => summarySheet.addRow(row));

        // Évolution du CA
        summarySheet.addRow([]);
        summarySheet.addRow(['ÉVOLUTION DU CHIFFRE D\'AFFAIRES']);
        summarySheet.getRow(20).font = { bold: true, size: 14 };

        const evolutionHeaders = ['Période précédente', 'Période actuelle', 'Variation', 'Tendance'];
        const evolutionHeaderRow = summarySheet.addRow(evolutionHeaders);
        evolutionHeaderRow.eachCell(cell => cell.style = headerStyle);

        const evolutionData = [
            [
                `${indicateursFinanciers.periodePrecedenteCA?.toLocaleString('fr-FR') || 0} F CFA`,
                `${indicateursFinanciers.chiffreAffaires.toLocaleString('fr-FR')} F CFA`,
                `${Math.abs(indicateursFinanciers.evolutionCA?.pourcentage || 0)}%`,
                indicateursFinanciers.evolutionCA?.tendance || 'stable'
            ]
        ];

        evolutionData.forEach(row => summarySheet.addRow(row));

        // ============================================
        // FEUILLE 2 : FLUX DE TRÉSORERIE
        // ============================================
        const tresorerieSheet = workbook.addWorksheet('Flux Trésorerie');

        tresorerieSheet.addRow(['FLUX DE TRÉSORERIE']);
        tresorerieSheet.getRow(1).font = { bold: true, size: 14 };
        tresorerieSheet.addRow([]);

        const tresorerieHeaders = ['Indicateur', 'Montant (F CFA)'];
        const tresorerieHeaderRow = tresorerieSheet.addRow(tresorerieHeaders);
        tresorerieHeaderRow.eachCell(cell => cell.style = headerStyle);

        const tresorerieRows = [
            ['Solde initial', indicateursFinanciers.fluxTresorerie?.soldeInitial || 0],
            ['Entrées (Recettes)', indicateursFinanciers.fluxTresorerie?.recettesPeriod || 0],
            ['Sorties (Dépenses)', indicateursFinanciers.fluxTresorerie?.depensesPeriod || 0],
            ['Solde final', indicateursFinanciers.fluxTresorerie?.soldeFinal || 0]
        ];

        tresorerieRows.forEach(([label, value]) => {
            const row = tresorerieSheet.addRow([label, value.toLocaleString('fr-FR')]);
            if (label.includes('final')) {
                row.getCell(2).font = { bold: true };
            }
        });

        // ============================================
        // FEUILLE 3 : RÉPARTITION DES DÉPENSES
        // ============================================
        const depensesSheet = workbook.addWorksheet('Répartition Dépenses');

        depensesSheet.addRow(['RÉPARTITION DES DÉPENSES PAR CATÉGORIE']);
        depensesSheet.getRow(1).font = { bold: true, size: 14 };
        depensesSheet.addRow([]);

        const depensesHeaders = ['Catégorie', 'Montant (F CFA)', 'Transactions', '%'];
        const depensesHeaderRow = depensesSheet.addRow(depensesHeaders);
        depensesHeaderRow.eachCell(cell => cell.style = headerStyle);

        if (repartitionDepenses?.repartition?.length > 0) {
            repartitionDepenses.repartition.forEach(cat => {
                depensesSheet.addRow([
                    cat.categorieName,
                    cat.montantTotal.toLocaleString('fr-FR'),
                    cat.occurrences || 0,
                    `${cat.pourcentage.toFixed(1)}%`
                ]);
            });

            depensesSheet.addRow([]);
            const totalRow = depensesSheet.addRow([
                'TOTAL',
                repartitionDepenses.totalDepenses.toLocaleString('fr-FR'),
                repartitionDepenses.repartition.reduce((sum, c) => sum + (c.occurrences || 0), 0),
                '100%'
            ]);
            totalRow.eachCell(cell => cell.font = { bold: true });
        } else {
            depensesSheet.addRow(['Aucune donnée disponible']);
        }

        // ============================================
        // FEUILLE 4 : RÉPARTITION DES RECETTES
        // ============================================
        const recettesSheet = workbook.addWorksheet('Répartition Recettes');

        recettesSheet.addRow(['RÉPARTITION DES RECETTES PAR CATÉGORIE']);
        recettesSheet.getRow(1).font = { bold: true, size: 14 };
        recettesSheet.addRow([]);

        const recettesHeaders = ['Catégorie', 'Montant (F CFA)', 'Transactions', '%'];
        const recettesHeaderRow = recettesSheet.addRow(recettesHeaders);
        recettesHeaderRow.eachCell(cell => cell.style = headerStyle);

        if (repartitionRecettes?.repartition?.length > 0) {
            repartitionRecettes.repartition.forEach(cat => {
                recettesSheet.addRow([
                    cat.categorieName,
                    cat.montantTotal.toLocaleString('fr-FR'),
                    cat.occurrences || 0,
                    `${cat.pourcentage.toFixed(1)}%`
                ]);
            });

            recettesSheet.addRow([]);
            const totalRow = recettesSheet.addRow([
                'TOTAL',
                repartitionRecettes.totalRecettes.toLocaleString('fr-FR'),
                repartitionRecettes.repartition.reduce((sum, c) => sum + (c.occurrences || 0), 0),
                '100%'
            ]);
            totalRow.eachCell(cell => cell.font = { bold: true });
        } else {
            recettesSheet.addRow(['Aucune donnée disponible']);
        }

        // ============================================
        // FEUILLE 5 : MODES DE PAIEMENT
        // ============================================
        const paiementSheet = workbook.addWorksheet('Modes de Paiement');

        paiementSheet.addRow(['STATISTIQUES DES MODES DE PAIEMENT']);
        paiementSheet.getRow(1).font = { bold: true, size: 14 };
        paiementSheet.addRow([]);

        const paiementHeaders = ['Mode', 'Montant (F CFA)', 'Transactions', '%'];
        const paiementHeaderRow = paiementSheet.addRow(paiementHeaders);
        paiementHeaderRow.eachCell(cell => cell.style = headerStyle);

        if (modesPaiementStats?.modesPaiement?.length > 0) {
            modesPaiementStats.modesPaiement.forEach(mode => {
                paiementSheet.addRow([
                    mode.mode,
                    mode.montantTotal.toLocaleString('fr-FR'),
                    mode.occurrences,
                    `${mode.pourcentage.toFixed(1)}%`
                ]);
            });

            paiementSheet.addRow([]);
            const totalRow = paiementSheet.addRow([
                'TOTAL',
                modesPaiementStats.modesPaiement.reduce((sum, m) => sum + m.montantTotal, 0).toLocaleString('fr-FR'),
                modesPaiementStats.totalTransactions,
                '100%'
            ]);
            totalRow.eachCell(cell => cell.font = { bold: true });
        }

        // ============================================
        // FEUILLE 6 : ÉVOLUTION JOURNALIÈRE
        // ============================================
        if (donneesEvolutives?.donnees?.length > 0) {
            const evolutionSheet = workbook.addWorksheet('Évolution');

            evolutionSheet.addRow(['ÉVOLUTION JOURNALIÈRE DES FLUX']);
            evolutionSheet.getRow(1).font = { bold: true, size: 14 };
            evolutionSheet.addRow([]);

            const evolutionHeaders = ['Période', 'Recettes', 'Dépenses', 'Bénéfice'];
            const evolutionHeaderRow = evolutionSheet.addRow(evolutionHeaders);
            evolutionHeaderRow.eachCell(cell => cell.style = headerStyle);

            donneesEvolutives.donnees.slice(0, 100).forEach(d => {
                const date = new Date(d.periode);
                evolutionSheet.addRow([
                    date.toLocaleDateString('fr-FR'),
                    d.recettes.toLocaleString('fr-FR'),
                    d.depenses.toLocaleString('fr-FR'),
                    d.benefice.toLocaleString('fr-FR')
                ]);
            });

            const totalRecettes = donneesEvolutives.donnees.reduce((sum, d) => sum + d.recettes, 0);
            const totalDepenses = donneesEvolutives.donnees.reduce((sum, d) => sum + d.depenses, 0);
            const totalBenefice = donneesEvolutives.donnees.reduce((sum, d) => sum + d.benefice, 0);

            evolutionSheet.addRow([]);
            const totalEvolutionRow = evolutionSheet.addRow([
                'TOTAL',
                totalRecettes.toLocaleString('fr-FR'),
                totalDepenses.toLocaleString('fr-FR'),
                totalBenefice.toLocaleString('fr-FR')
            ]);
            totalEvolutionRow.eachCell(cell => cell.font = { bold: true });
        }

        // ============================================
        // FEUILLE 7 : COMPARAISON PÉRIODES
        // ============================================
        if (donneesComparatives?.donneesPeriodes?.length > 0) {
            const comparatifSheet = workbook.addWorksheet('Comparatif Périodes');

            comparatifSheet.addRow(['COMPARAISON SUR PLUSIEURS PÉRIODES']);
            comparatifSheet.getRow(1).font = { bold: true, size: 14 };
            comparatifSheet.addRow([]);

            const comparatifHeaders = ['Période', 'CA', 'Dépenses', 'Bénéfice'];
            const comparatifHeaderRow = comparatifSheet.addRow(comparatifHeaders);
            comparatifHeaderRow.eachCell(cell => cell.style = headerStyle);

            donneesComparatives.donneesPeriodes.forEach(p => {
                comparatifSheet.addRow([
                    p.libelle,
                    p.chiffreAffaires.toLocaleString('fr-FR'),
                    p.totalDepenses.toLocaleString('fr-FR'),
                    p.beneficeNet.toLocaleString('fr-FR')
                ]);
            });
        }

        // ============================================
        // FEUILLE 8 : DÉTAIL DES DÉPENSES
        // ============================================
        if (depensesDetaillees?.depenses?.length > 0) {
            const detailDepensesSheet = workbook.addWorksheet('Détail Dépenses');

            detailDepensesSheet.addRow(['DÉTAIL DES DÉPENSES']);
            detailDepensesSheet.getRow(1).font = { bold: true, size: 14 };
            detailDepensesSheet.addRow([]);

            const detailHeaders = ['Date', 'Catégorie', 'Montant', 'Mode', 'Description'];
            const detailHeaderRow = detailDepensesSheet.addRow(detailHeaders);
            detailHeaderRow.eachCell(cell => cell.style = headerStyle);

            depensesDetaillees.depenses.slice(0, 1000).forEach(dep => {
                detailDepensesSheet.addRow([
                    new Date(dep.date).toLocaleDateString('fr-FR'),
                    dep.categorie?.name || 'Non classé',
                    dep.montant.toLocaleString('fr-FR'),
                    dep.paymentMode || '-',
                    dep.description || '-'
                ]);
            });

            const totalDepensesMontant = depensesDetaillees.depenses.reduce((sum, d) => sum + Number(d.montant), 0);
            detailDepensesSheet.addRow([]);
            const totalDepRow = detailDepensesSheet.addRow([
                'TOTAL', '', totalDepensesMontant.toLocaleString('fr-FR'), '', ''
            ]);
            totalDepRow.getCell(3).font = { bold: true };
        }

        // ============================================
        // FEUILLE 9 : DÉTAIL DES RECETTES
        // ============================================
        if (recettesDetaillees?.recettes?.length > 0) {
            const detailRecettesSheet = workbook.addWorksheet('Détail Recettes');

            detailRecettesSheet.addRow(['DÉTAIL DES RECETTES']);
            detailRecettesSheet.getRow(1).font = { bold: true, size: 14 };
            detailRecettesSheet.addRow([]);

            const detailRecHeaders = ['Date', 'Catégorie', 'Montant', 'Mode', 'Description'];
            const detailRecHeaderRow = detailRecettesSheet.addRow(detailRecHeaders);
            detailRecHeaderRow.eachCell(cell => cell.style = headerStyle);

            recettesDetaillees.recettes.slice(0, 1000).forEach(rec => {
                detailRecettesSheet.addRow([
                    new Date(rec.date).toLocaleDateString('fr-FR'),
                    rec.categorie?.name || 'Non classé',
                    rec.montant.toLocaleString('fr-FR'),
                    rec.paymentMode || '-',
                    rec.description || '-'
                ]);
            });

            const totalRecettesMontant = recettesDetaillees.recettes.reduce((sum, r) => sum + Number(r.montant), 0);
            detailRecettesSheet.addRow([]);
            const totalRecRow = detailRecettesSheet.addRow([
                'TOTAL', '', totalRecettesMontant.toLocaleString('fr-FR'), '', ''
            ]);
            totalRecRow.getCell(3).font = { bold: true };
        }

        // ============================================
        // AJUSTEMENT DES COLONNES
        // ============================================
        workbook.eachSheet(sheet => {
            sheet.columns.forEach(column => {
                let maxLength = 10;
                column.eachCell({ includeEmpty: true }, cell => {
                    const cellValue = cell.value ? cell.value.toString() : '';
                    maxLength = Math.max(maxLength, cellValue.length);
                });
                column.width = Math.min(maxLength + 2, 50);
            });
        });

        const exportParams = {
            magasinId: magasinIdFinal,
            agentId: agentId ? parseInt(agentId) : null,
            periode,
            dateReference,
            fromDate,
            toDate,
            code_structure,
            periodeAffichage,
            nombreLignesDepenses: depensesDetaillees?.depenses?.length || 0,
            nombreLignesRecettes: recettesDetaillees?.recettes?.length || 0
        };

        await HistoriqueService.enregistrerAction(
            authUser.id,
            `Export du rapport financier Excel - Période: ${periodeAffichage}`,
            clientIp,
            {
                action: 'EXPORT_EXCEL_FINANCIER',
                params: exportParams,
                indicateurs: {
                    chiffreAffaires: indicateursFinanciers.chiffreAffaires,
                    beneficeNet: indicateursFinanciers.beneficeNet,
                    totalDepenses: indicateursFinanciers.totalDepenses
                },
                timestamp: new Date()
            }
        );
        // Génération du buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Envoi du fichier
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=rapport-financier-${Date.now()}.xlsx`);
        res.send(buffer);

    } catch (error) {logger.error('rapportFinancier.controller', '❌ Erreur export Excel financier:', error);
        // Enregistrement de l'erreur dans l'historique
        if (req.user) {
            await HistoriqueService.enregistrerAction(
                req.user.id,
                `Échec d'export du rapport financier Excel: ${error.message}`,
                HistoriqueService.getClientIp(req),
                {
                    action: 'EXPORT_EXCEL_FINANCIER_ERROR',
                    error: error.message,
                    stack: error.stack,
                    params: req.query
                }
            );
        }
        res.status(500).json({ 
            error: 'Erreur lors de l\'export Excel',
            details: error.message 
        });
    }
};