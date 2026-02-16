const FonctionsUtilitaires = require('./utils/fonctionsUtilitaires');
const utilitaireRapport  = require('./utils/rapportStockUtilitaire');


// ============================================
// 🟢 APIS PRINCIPALES
// ============================================

/**
 * API 1: Indicateurs globaux des stocks
 */
exports.getIndicateursStocks = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        console.log('📥 [Indicateurs Stocks] Requête reçue:', {
            periode,
            fromDate,
            toDate,
            magasinId
        });

        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate,
            toDate
        };

        const indicateurs = await utilitaireRapport.calculerIndicateursStocks(filters);

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            dateDebut: indicateurs.dateDebut,
            dateFin: indicateurs.dateFin,
            ...indicateurs
        });

    } catch (error) {
        console.error('❌ Erreur getIndicateursStocks:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API 2: Statistiques détaillées par produit
 */
exports.getStatsProduits = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate,
            page = 1,
            limit = 10,
            search = '',
            categoryId,
            statut
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate,
            toDate,
            page,
            limit,
            search,
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            statut
        };

        const { statsProduits, total } = await utilitaireRapport.calculerStatsProduits(filters);

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const paginatedProduits = statsProduits.slice(offset, offset + parseInt(limit));

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            limit: parseInt(limit),
            produits: paginatedProduits,
            items: paginatedProduits 
        });

    } catch (error) {
        console.error('❌ Erreur getStatsProduits:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API 3: Mouvements de la période
 */
exports.getMouvementsPeriode = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate,
            page = 1,
            limit = 10,
            search = '',
            typeMouvement
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate,
            toDate,
            page,
            limit,
            search,
            typeMouvement
        };

        const resultats = await utilitaireRapport.calculerMouvementsPeriode(filters);

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            ...resultats,
            items: resultats.mouvements // Pour compatibilité avec pagination frontend
        });

    } catch (error) {
        console.error('❌ Erreur getMouvementsPeriode:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API 4: Statistiques pour graphiques
 */
exports.getStatsGraphiques = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate,
            toDate
        };

        const statsGraphiques = await utilitaireRapport.calculerStatsGraphiques(filters);

        return res.json({
            niveau: magasinIdFinal ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            ...statsGraphiques
        });

    } catch (error) {
        console.error('❌ Erreur getStatsGraphiques:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API 5: Produits en situations particulières
 */
exports.getProduitsSpecifiques = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate,
            toDate
        };

        const produitsSpecifiques = await utilitaireRapport.calculerProduitsSpecifiques(filters);

        // Formater les résultats pour l'affichage
        const formaterProduit = (stock) => ({
            produitId: stock.produitId,
            designation: stock.Produit?.designation || 'Produit inconnu',
            magasinId: stock.magasinId,
            quantite: parseFloat(stock.quantiteTotale || 0),
            seuilAlerte: parseFloat(stock.seuilAlerte || 5),
            seuilReapprovisionnement: parseFloat(stock.seuilReapprovisionnement || 10),
            datePeremption: stock.datePeremption,
            dateDerniereMiseAJour: stock.dateDerniereMiseAJour
        });

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            produitsRupture: produitsSpecifiques.produitsRupture.map(formaterProduit),
            produitsAlerte: produitsSpecifiques.produitsAlerte.map(formaterProduit),
            produitsAReapprovisionner: produitsSpecifiques.produitsAReapprovisionner.map(formaterProduit),
            produitsSurStock: produitsSpecifiques.produitsSurStock.map(formaterProduit),
            produitsPeremption: produitsSpecifiques.produitsPeremption.map(formaterProduit),
            produitsRecents: produitsSpecifiques.produitsRecents.map(formaterProduit),
            produitsRotationLente: produitsSpecifiques.produitsRotationLente.map(formaterProduit)
        });

    } catch (error) {
        console.error('❌ Erreur getProduitsSpecifiques:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API 6: Rapport complet des stocks (tout-en-un)
 */
exports.getRapportCompletStocks = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate,
            pageProduits = 1,
            pageMouvements = 1,
            limit = 10,
            search = ''
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate,
            toDate,
            page: pageProduits,
            limit,
            search
        };

        console.log('📥 [Rapport Complet Stocks] Génération...');

        // Exécuter toutes les requêtes en parallèle
        const [indicateurs, statsProduits, mouvements, graphiques, produitsSpecifiques] = await Promise.all([
            utilitaireRapport.calculerIndicateursStocks(filters),
            utilitaireRapport.calculerStatsProduits({ ...filters, page: pageProduits, limit }),
            utilitaireRapport.calculerMouvementsPeriode({ ...filters, page: pageMouvements, limit }),
            utilitaireRapport.calculerStatsGraphiques(filters),
            utilitaireRapport.calculerProduitsSpecifiques(filters)
        ]);

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            dateGeneration: new Date(),
            indicateurs,
            produits: {
                items: statsProduits.statsProduits.slice(0, parseInt(limit)),
                produits: statsProduits.statsProduits.slice(0, parseInt(limit)), // ✅ Ajouter
                total: statsProduits.total,
                page: parseInt(pageProduits),
                totalPages: Math.ceil(statsProduits.total / parseInt(limit))
            },
            mouvements: {
                items: mouvements.mouvements,
                mouvements: mouvements.mouvements,
                total: mouvements.total,
                page: parseInt(pageMouvements),
                totalPages: mouvements.totalPages
            },
            graphiques,
            produitsSpecifiques: {
                produitsRupture: produitsSpecifiques.produitsRupture.length,
                produitsAlerte: produitsSpecifiques.produitsAlerte.length,
                produitsAReapprovisionner: produitsSpecifiques.produitsAReapprovisionner.length,
                produitsSurStock: produitsSpecifiques.produitsSurStock.length,
                produitsPeremption: produitsSpecifiques.produitsPeremption.length,
                produitsRecents: produitsSpecifiques.produitsRecents.length,
                produitsRotationLente: produitsSpecifiques.produitsRotationLente.length,
                details: {
                    rupture: produitsSpecifiques.produitsRupture.slice(0, 20),
                    alerte: produitsSpecifiques.produitsAlerte.slice(0, 20),
                    peremption: produitsSpecifiques.produitsPeremption.slice(0, 20)
                }
            }
        });

    } catch (error) {
        console.error('❌ Erreur getRapportCompletStocks:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * API 7: Export des données (pour CSV/Excel)
 */
exports.exportDonneesStocks = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate,
            format = 'json'
        } = req.query;

        const code_structure = authUser.code_structure;

        if (!code_structure) {
            return res.status(400).json({ error: 'code_structure requis' });
        }

        const magasinIdFromQuery = magasinId ? parseInt(magasinId) : null;

        const isAdmin = authUser.roles?.some(r => r.nom === "Administrateur");
        const isGerant = authUser.roles?.some(r => r.nom === "Gérant");

        // magasin final
        let magasinIdFinal = magasinIdFromQuery;

        // agent final
        // ✅ Gérant => uniquement son magasin
        if (isGerant && !isAdmin) {
        magasinIdFinal = authUser.magasinId;
        }

        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference: dateReference ? FonctionsUtilitaires.normalizeDate(dateReference, 'start') : new Date(),
            fromDate,
            toDate,
            page: 1,
            limit: 10000 // Pour l'export, on prend tout
        };

        const [indicateurs, statsProduits, mouvements] = await Promise.all([
            utilitaireRapport.calculerIndicateursStocks(filters),
            utilitaireRapport.calculerStatsProduits(filters),
            utilitaireRapport.calculerMouvementsPeriode({ ...filters, limit: 10000 })
        ]);

        const exportData = {
            indicateurs,
            produits: statsProduits.statsProduits,
            mouvements: mouvements.mouvements,
            dateGeneration: new Date(),
            periode: periode || 'personnalisée',
            dateDebut: indicateurs.dateDebut,
            dateFin: indicateurs.dateFin
        };

        if (format === 'json') {
            return res.json(exportData);
        } else {
            // Pour CSV, on peut retourner un format différent
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=export-stocks.json');
            return res.json(exportData);
        }

    } catch (error) {
        console.error('❌ Erreur exportDonneesStocks:', error);
        res.status(500).json({ error: error.message });
    }
};