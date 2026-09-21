const FonctionsUtilitaires = require('./utils/fonctionsUtilitaires');
const logger = require('../services/logger.js');
const utilitaireRapport  = require('./utils/rapportStockUtilitaire');
const db = require('../models');
// Importer ExcelJS
const ExcelJS = require('exceljs');
const HistoriqueService = require('../services/historique.service');



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
logger.log('rapportStock.controller', '📥 [Indicateurs Stocks] Requête reçue:', {
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
logger.error('rapportStock.controller', '❌ Erreur getIndicateursStocks:', error);
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

        return res.json({
            niveau: magasinId ? 'magasin' : 'structure',
            periode: periode || 'personnalisée',
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            limit: parseInt(limit),
            produits: statsProduits,
            items: statsProduits
        });

    } catch (error) {
logger.error('rapportStock.controller', '❌ Erreur getStatsProduits:', error);
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
logger.error('rapportStock.controller', '❌ Erreur getMouvementsPeriode:', error);
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
logger.error('rapportStock.controller', '❌ Erreur getStatsGraphiques:', error);
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
logger.error('rapportStock.controller', '❌ Erreur getProduitsSpecifiques:', error);
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
logger.log('rapportStock.controller', '📥 [Rapport Complet Stocks] Génération...');

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
logger.error('rapportStock.controller', '❌ Erreur getRapportCompletStocks:', error);
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
        const clientIp = HistoriqueService.getClientIp(req);
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

        // ✅ ENREGISTRER L'HISTORIQUE
        await HistoriqueService.enregistrerAction(
            authUser.id,
            `Export données stocks - ${magasinIdFinal ? `Magasin ID: ${magasinIdFinal}` : 'Tous magasins'} - Format: ${format}`,
            clientIp,
            {
                action: 'EXPORT_STOCK_DATA',
                filters: {
                    magasinId: magasinIdFinal,
                    periode,
                    fromDate,
                    toDate,
                    format
                },
                counts: {
                    produits: statsProduits.statsProduits?.length || 0,
                    mouvements: mouvements.mouvements?.length || 0
                }
            }
        );
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
        } else if (format === 'csv') {
            // Génération d'un vrai CSV pour les produits et mouvements
            const lignesCSV = [];

            // En-tête produits
            lignesCSV.push('=== PRODUITS ===');
            lignesCSV.push([
                'Produit', 'Catégorie', 'Prix Achat', 'Prix Vente',
                'Stock Initial', 'Entrées', 'Sorties', 'Stock Final',
                'Valeur Stock Final', 'Taux Rotation', 'Statut'
            ].map(h => `"${h}"`).join(','));

            (exportData.produits || []).forEach(p => {
                lignesCSV.push([
                    p.produit?.designation || '',
                    p.produit?.categorie || '',
                    p.prixAchat || 0,
                    p.prixVente || 0,
                    p.stockInitial || 0,
                    p.entrees || 0,
                    p.sorties || 0,
                    p.stockFinal || 0,
                    p.valeurStockFinal || 0,
                    p.tauxRotation || 0,
                    p.statut || ''
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
            });

            // En-tête mouvements
            lignesCSV.push('');
            lignesCSV.push('=== MOUVEMENTS ===');
            lignesCSV.push([
                'Date', 'Produit', 'Type', 'Quantité', 'Référence', 'Motif'
            ].map(h => `"${h}"`).join(','));

            (exportData.mouvements || []).forEach(m => {
                lignesCSV.push([
                    m.dateMouvement ? new Date(m.dateMouvement).toLocaleDateString('fr-FR') : '',
                    m.produit?.designation || m.produitId || '',
                    m.typeMouvement || '',
                    m.quantite || 0,
                    m.reference || '',
                    m.motif || ''
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
            });

            const csvContent = '\uFEFF' + lignesCSV.join('\r\n'); // BOM UTF-8 pour Excel
            const filename = `export-stocks-${new Date().toISOString().slice(0, 10)}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            return res.send(csvContent);
        } else {
            return res.json(exportData);
        }

    } catch (error) {
logger.error('rapportStock.controller', '❌ Erreur exportDonneesStocks:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Génère un rapport de stock au format PDF
 */
exports.genererRapportStockPDF = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }
        const clientIp = HistoriqueService.getClientIp(req);
        // Récupération des paramètres
        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate,
            categorie,
            statut
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
        if (periode && periode !== 'personnalisee') {
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
        const periodeAffichage = utilitaireRapport.formatPeriodeAffichage(debut, fin, periode);

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

        // Paramètres pour les requêtes
        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference,
            fromDate,
            toDate,
            page: 1,
            limit: 50 // Limiter pour le PDF
        };
logger.log('rapportStock.controller', '📊 Génération PDF Rapport Stock du', debut, 'au', fin);

        // Récupération des données
        const [
            indicateurs,
            statsProduits,
            mouvements,
            graphiques,
            produitsSpecifiques
        ] = await Promise.all([
            utilitaireRapport.calculerIndicateursStocks(filters),
            utilitaireRapport.calculerStatsProduits({ 
                ...filters, 
                limit: 50,
                categoryId: categorie && categorie !== 'all' ? parseInt(categorie) : undefined,
                statut: statut && statut !== 'all' ? statut : undefined
            }),
            utilitaireRapport.calculerMouvementsPeriode({ 
                ...filters, 
                limit: 50 
            }),
            utilitaireRapport.calculerStatsGraphiques(filters),
            utilitaireRapport.calculerProduitsSpecifiques(filters)
        ]);

        // Récupérer le nom de la catégorie si sélectionnée
        let categorieNom = null;
        if (categorie && categorie !== 'all') {
            const cat = await db.CategoriesProduits.findByPk(parseInt(categorie));
            categorieNom = cat ? cat.nom : null;
        }

        // Données pour le template
        const templateData = {
            structure,
            utilisateur: authUser,
            magasin: magasinIdFinal,
            magasinNom,
            categorie: categorie || 'all',
            categorieNom,
            statut: statut || 'all',
            periodeAffichage,
            indicateursStocks: indicateurs,
            indicateurs: indicateurs,
            produits: {
                items: statsProduits.statsProduits || [],
                total: statsProduits.total || 0
            },
            mouvements: {
                items: mouvements.mouvements || [],
                total: mouvements.total || 0
            },
            graphiques,
            produitsSpecifiques: {
                produitsRupture: produitsSpecifiques.produitsRupture || [],
                produitsAlerte: produitsSpecifiques.produitsAlerte || [],
                produitsAReapprovisionner: produitsSpecifiques.produitsAReapprovisionner || [],
                produitsSurStock: produitsSpecifiques.produitsSurStock || [],
                produitsPeremption: produitsSpecifiques.produitsPeremption || [],
                produitsRecents: produitsSpecifiques.produitsRecents || [],
                produitsRotationLente: produitsSpecifiques.produitsRotationLente || []
            }
        };

        // Rendu du template EJS
        const html = await utilitaireRapport.renderEjsTemplate('rapport-stock', templateData);

        // Génération du PDF
        const pdf = await utilitaireRapport.generatePDF(html);

        // ✅ ENREGISTRER L'HISTORIQUE AVANT GÉNÉRATION
        await HistoriqueService.enregistrerAction(
            authUser.id,
            `Génération PDF rapport stock - ${magasinIdFinal ? `Magasin ID: ${magasinIdFinal}` : 'Tous magasins'}`,
            clientIp,
            {
                action: 'GENERATE_STOCK_PDF',
                filters: {
                    magasinId: magasinIdFinal,
                    periode,
                    fromDate,
                    toDate,
                    categorie,
                    statut
                }
            }
        );

        // Envoi du PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=rapport-stock-${Date.now()}.pdf`);
        res.send(pdf);

    } catch (error) {
logger.error('rapportStock.controller', '❌ Erreur génération PDF Rapport Stock:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la génération du PDF',
            details: error.message 
        });
    }
};


/**
 * Exporte le rapport de stock au format Excel
 */
exports.exportRapportStockExcel = async (req, res) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return res.status(401).json({ message: "Non authentifié" });
        }

        const clientIp = HistoriqueService.getClientIp(req);

        // Récupération des paramètres
        const {
            magasinId,
            periode,
            dateReference,
            fromDate,
            toDate,
            categorie,
            statut
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
        if (periode && periode !== 'personnalisee') {
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
        const periodeAffichage = utilitaireRapport.formatPeriodeAffichage(debut, fin, periode);

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

        // Récupération du nom de la catégorie si sélectionnée
        let categorieNom = null;
        if (categorie && categorie !== 'all') {
            const cat = await db.CategoriesProduits.findByPk(parseInt(categorie));
            categorieNom = cat ? cat.nom : null;
        }

        // Paramètres pour les requêtes (sans limite pour Excel)
        const filters = {
            code_structure,
            magasinId: magasinIdFinal,
            periode,
            dateReference,
            fromDate,
            toDate,
            page: 1,
            limit: 10000 // Pour l'export, on prend tout
        };
logger.log('rapportStock.controller', '📊 Export Excel Rapport Stock du', debut, 'au', fin);

        // Récupération des données
        const [
            indicateurs,
            statsProduits,
            mouvements,
            graphiques,
            produitsSpecifiques
        ] = await Promise.all([
            utilitaireRapport.calculerIndicateursStocks(filters),
            utilitaireRapport.calculerStatsProduits({ 
                ...filters, 
                limit: 10000,
                categoryId: categorie && categorie !== 'all' ? parseInt(categorie) : undefined,
                statut: statut && statut !== 'all' ? statut : undefined
            }),
            utilitaireRapport.calculerMouvementsPeriode({ 
                ...filters, 
                limit: 10000 
            }),
            utilitaireRapport.calculerStatsGraphiques(filters),
            utilitaireRapport.calculerProduitsSpecifiques(filters)
        ]);

        // Création du workbook Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = structure?.nom_structure || 'Application de Gestion';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Styles
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF198754' } }, // Vert pour stock
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' }
            }
        };

        // ==================== FEUILLE RÉSUMÉ ====================
        const summarySheet = workbook.addWorksheet('Résumé');

        // Titre
        summarySheet.mergeCells('A1:F2');
        const titleCell = summarySheet.getCell('A1');
        titleCell.value = 'RAPPORT DES STOCKS';
        titleCell.font = { bold: true, size: 20, color: { argb: 'FF198754' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(1).height = 40;

        // Informations générales
        summarySheet.addRow([]);
        summarySheet.addRow(['Informations générales']).font = { bold: true, size: 14 };
        
        const infoData = [
            ['Structure', structure?.nom_structure || 'N/A'],
            ['Période', periodeAffichage],
            ['Magasin', magasinNom || (magasinIdFinal ? 'Magasin sélectionné' : 'Tous les magasins')],
            ['Catégorie', categorieNom || (categorie && categorie !== 'all' ? 'Catégorie sélectionnée' : 'Toutes les catégories')],
            ['Statut', statut && statut !== 'all' ? statut : 'Tous les statuts'],
            ['Date génération', new Date().toLocaleString('fr-FR')],
            ['Responsable', authUser.nom || 'Système']
        ];

        infoData.forEach(([label, value]) => {
            const row = summarySheet.addRow([label, value]);
            row.getCell(1).font = { bold: true };
        });

        summarySheet.addRow([]);

        // Indicateurs clés
        summarySheet.addRow(['INDICATEURS CLÉS']).font = { bold: true, size: 14 };
        summarySheet.addRow([]);

        const kpiHeaders = ['Indicateur', 'Valeur', 'Détail'];
        summarySheet.addRow(kpiHeaders).eachCell(cell => {
            cell.style = headerStyle;
        });

        const kpiRows = [
            ['Produits en stock', indicateurs.totalProduits || 0, `${indicateurs.produitsNormaux || 0} normaux, ${indicateurs.produitsUniques || 0} uniques`],
            ['Valeur stock initial (achat)', `${(indicateurs.valeurStockInitial || 0).toLocaleString('fr-FR')} F CFA`, `Vente: ${(indicateurs.valeurStockInitialVente || 0).toLocaleString('fr-FR')} F CFA`],
            ['Valeur stock final (achat)', `${(indicateurs.valeurStockFinal || 0).toLocaleString('fr-FR')} F CFA`, `Vente: ${(indicateurs.valeurStockFinalVente || 0).toLocaleString('fr-FR')} F CFA`],
            ['Produits entrés/sortis', indicateurs.totalProduitsVendus || 0, `Entrées: ${indicateurs.totalEntrees || 0}, Sorties: ${indicateurs.totalSorties || 0}`],
            ['Produits en rupture', indicateurs.produitsRupture || 0, ''],
            ['Produits en alerte', indicateurs.produitsEnAlerte || 0, ''],
            ['Produits à réapprovisionner', indicateurs.produitsAReapprovisionner || 0, ''],
            ['Produits en surstock', indicateurs.produitsEnSurStock || 0, ''],
            ['Produits périssables', indicateurs.produitsPerissable || 0, '']
        ];

        kpiRows.forEach(row => summarySheet.addRow(row));

        // ==================== FEUILLE PRODUITS ====================
        const productsSheet = workbook.addWorksheet('Produits en stock');

        productsSheet.addRow(['LISTE DES PRODUITS']).font = { bold: true, size: 14 };
        productsSheet.addRow([]);

        const productHeaders = [
            'Produit', 'Catégorie', 'Unité', 'Prix Achat', 'Prix Vente',
            'Stock Initial', 'Val. Initiale', 'Entrées', 'Sorties',
            'Stock Final', 'Val. Finale', 'Taux Rotation', 'Statut',
            'Seuil Alerte', 'Seuil Réappro', 'Date Péremption'
        ];
        productsSheet.addRow(productHeaders).eachCell(cell => cell.style = headerStyle);

        if (statsProduits && statsProduits.statsProduits && statsProduits.statsProduits.length > 0) {
            statsProduits.statsProduits.forEach(produit => {
                productsSheet.addRow([
                    produit.produit?.designation || 'N/A',
                    produit.produit?.categorie || 'Non catégorisé',
                    produit.produit?.unite || '-',
                    (produit.prixAchat || 0).toLocaleString('fr-FR') + ' F CFA',
                    (produit.prixVente || 0).toLocaleString('fr-FR') + ' F CFA',
                    produit.stockInitial || 0,
                    (produit.valeurStockInitial || 0).toLocaleString('fr-FR') + ' F CFA',
                    produit.entrees || 0,
                    produit.sorties || 0,
                    produit.stockFinal || 0,
                    (produit.valeurStockFinal || 0).toLocaleString('fr-FR') + ' F CFA',
                    (produit.tauxRotation || 0).toFixed(2),
                    produit.statut || 'Inconnu',
                    produit.seuilAlerte || 5,
                    produit.seuilReapprovisionnement || 10,
                    produit.datePeremption ? new Date(produit.datePeremption).toLocaleDateString('fr-FR') : '-'
                ]);
            });
        }

        // ==================== FEUILLE MOUVEMENTS ====================
        const movementsSheet = workbook.addWorksheet('Mouvements');

        movementsSheet.addRow(['LISTE DES MOUVEMENTS POUR LA PERIODE']).font = { bold: true, size: 14 };
        movementsSheet.addRow([]);

        const movementHeaders = [
            'Référence', 'Produit', 'Magasin', 'Type', 'Quantité',
            'Prix Unitaire', 'Prix Total', 'Date', 'Description', 'Responsable'
        ];
        movementsSheet.addRow(movementHeaders).eachCell(cell => cell.style = headerStyle);

        if (mouvements && mouvements.mouvements && mouvements.mouvements.length > 0) {
            mouvements.mouvements.forEach(mvt => {
                movementsSheet.addRow([
                    mvt.ref || '-',
                    mvt.produit || 'N/A',
                    mvt.magasin || 'N/A',
                    mvt.typeMouvement || '-',
                    mvt.quantite || 0,
                    (mvt.prixUnitaire || 0).toLocaleString('fr-FR') + ' F CFA',
                    (mvt.prixTotal || 0).toLocaleString('fr-FR') + ' F CFA',
                    mvt.dateMouvement ? new Date(mvt.dateMouvement).toLocaleDateString('fr-FR') : '-',
                    mvt.description || '-',
                    mvt.acteur || '-'
                ]);
            });
        }

        // ==================== FEUILLE STATISTIQUES ====================
        const statsSheet = workbook.addWorksheet('Statistiques');

        // Top produits
        statsSheet.addRow(['TOP 10 PRODUITS LES PLUS VENDUS']).font = { bold: true, size: 14 };
        statsSheet.addRow([]);

        const topHeaders = ['Produit', 'Catégorie', 'Quantité vendue', 'Nombre de sorties'];
        statsSheet.addRow(topHeaders).eachCell(cell => cell.style = headerStyle);

        if (graphiques && graphiques.topProduits && graphiques.topProduits.length > 0) {
            graphiques.topProduits.forEach(produit => {
                statsSheet.addRow([
                    produit.designation || 'N/A',
                    produit.categorie || 'Non catégorisé',
                    produit.quantiteVendue || 0,
                    produit.totalSorties || 0
                ]);
            });
        }

        statsSheet.addRow([]);
        statsSheet.addRow([]);

        // Répartition par catégorie
        statsSheet.addRow(['RÉPARTITION PAR CATÉGORIE']).font = { bold: true, size: 14 };
        statsSheet.addRow([]);

        const repartHeaders = ['Catégorie', 'Quantité', 'Nombre de produits'];
        statsSheet.addRow(repartHeaders).eachCell(cell => cell.style = headerStyle);

        if (graphiques && graphiques.repartitionCategories && graphiques.repartitionCategories.length > 0) {
            graphiques.repartitionCategories.forEach(cat => {
                statsSheet.addRow([
                    cat.categorie || 'Non catégorisé',
                    cat.quantite || 0,
                    cat.nombreProduits || 0
                ]);
            });
        }

        // ==================== FEUILLE PRODUITS SPÉCIFIQUES ====================
        const specialSheet = workbook.addWorksheet('Alertes');

        // Initialiser produitsSpecifiques à un objet vide si null
        const safeProduitsSpecifiques = produitsSpecifiques || {};

        // Afficher toutes les propriétés disponibles pour déboguer
logger.log('rapportStock.controller', 'Propriétés disponibles dans produitsSpecifiques:', Object.keys(safeProduitsSpecifiques));

        // Fonction utilitaire pour formater une ligne de produit
        function formatProduitRow(p) {
            return {
                designation: p.designation || p.Produit?.designation || 'N/A',
                quantite: p.quantite || p.quantiteTotale || 0,
                seuilAlerte: p.seuilAlerte || 5,
                seuilReappro: p.seuilReapprovisionnement || 10,
                stockSecurite: p.stockSecurite || 5,
                datePeremption: p.datePeremption,
                dateMaj: p.dateDerniereMiseAJour || p.updatedAt
            };
        }

        // PRODUITS EN SURSTOCK
        if (safeProduitsSpecifiques.produitsSurStock && safeProduitsSpecifiques.produitsSurStock.length > 0) {
            specialSheet.addRow(['PRODUITS EN SURSTOCK']).font = { bold: true, size: 14, color: { argb: 'FF212529' } };
            specialSheet.addRow([]);
            
            const surstockHeaders = ['Produit', 'Quantité', 'Stock sécurité'];
            specialSheet.addRow(surstockHeaders).eachCell(cell => cell.style = headerStyle);
            
            safeProduitsSpecifiques.produitsSurStock.slice(0, 50).forEach(p => {
                const row = formatProduitRow(p);
                specialSheet.addRow([
                    row.designation,
                    row.quantite,
                    row.stockSecurite
                ]);
            });
            
            specialSheet.addRow([]);
        }

        // PRODUITS RÉCENTS
        if (safeProduitsSpecifiques.produitsRecents && safeProduitsSpecifiques.produitsRecents.length > 0) {
            specialSheet.addRow(['PRODUITS RÉCEMMENT MIS À JOUR']).font = { bold: true, size: 14, color: { argb: 'FF198754' } };
            specialSheet.addRow([]);
            
            const recentsHeaders = ['Produit', 'Quantité', 'Dernière mise à jour'];
            specialSheet.addRow(recentsHeaders).eachCell(cell => cell.style = headerStyle);
            
            safeProduitsSpecifiques.produitsRecents.slice(0, 50).forEach(p => {
                const row = formatProduitRow(p);
                specialSheet.addRow([
                    row.designation,
                    row.quantite,
                    row.dateMaj ? new Date(row.dateMaj).toLocaleDateString('fr-FR') : '-'
                ]);
            });
            
            specialSheet.addRow([]);
        }

        // PRODUITS À ROTATION LENTE
        if (safeProduitsSpecifiques.produitsRotationLente && safeProduitsSpecifiques.produitsRotationLente.length > 0) {
            specialSheet.addRow(['PRODUITS À ROTATION LENTE']).font = { bold: true, size: 14, color: { argb: 'FFFFC107' } };
            specialSheet.addRow([]);
            
            const rotationHeaders = ['Produit', 'Quantité', 'Seuil alerte'];
            specialSheet.addRow(rotationHeaders).eachCell(cell => cell.style = headerStyle);
            
            safeProduitsSpecifiques.produitsRotationLente.slice(0, 50).forEach(p => {
                const row = formatProduitRow(p);
                specialSheet.addRow([
                    row.designation,
                    row.quantite,
                    row.seuilAlerte
                ]);
            });
            
            specialSheet.addRow([]);
        }

        // PRODUITS PROCHES DE PÉREMPTION
        if (safeProduitsSpecifiques.produitsPeremption && safeProduitsSpecifiques.produitsPeremption.length > 0) {
            specialSheet.addRow(['PRODUITS PROCHES DE PÉREMPTION']).font = { bold: true, size: 14, color: { argb: 'FF0D6EFD' } };
            specialSheet.addRow([]);
            
            const peremptionHeaders = ['Produit', 'Quantité', 'Date péremption'];
            specialSheet.addRow(peremptionHeaders).eachCell(cell => cell.style = headerStyle);
            
            safeProduitsSpecifiques.produitsPeremption.slice(0, 50).forEach(p => {
                const row = formatProduitRow(p);
                specialSheet.addRow([
                    row.designation,
                    row.quantite,
                    row.datePeremption ? new Date(row.datePeremption).toLocaleDateString('fr-FR') : '-'
                ]);
            });
            
            specialSheet.addRow([]);
        }

        // PRODUITS EN RUPTURE (si cette propriété existe)
        if (safeProduitsSpecifiques.produitsRupture && safeProduitsSpecifiques.produitsRupture.length > 0) {
            specialSheet.addRow(['PRODUITS EN RUPTURE']).font = { bold: true, size: 14, color: { argb: 'FFDC3545' } };
            specialSheet.addRow([]);
            
            const ruptureHeaders = ['Produit', 'Quantité', 'Seuil alerte'];
            specialSheet.addRow(ruptureHeaders).eachCell(cell => cell.style = headerStyle);
            
            safeProduitsSpecifiques.produitsRupture.slice(0, 50).forEach(p => {
                const row = formatProduitRow(p);
                specialSheet.addRow([
                    row.designation,
                    row.quantite,
                    row.seuilAlerte
                ]);
            });
            
            specialSheet.addRow([]);
        }

        // PRODUITS EN ALERTE (si cette propriété existe)
        if (safeProduitsSpecifiques.produitsAlerte && safeProduitsSpecifiques.produitsAlerte.length > 0) {
            specialSheet.addRow(['PRODUITS EN ALERTE']).font = { bold: true, size: 14, color: { argb: 'FFFFC107' } };
            specialSheet.addRow([]);
            
            const alerteHeaders = ['Produit', 'Quantité', 'Seuil alerte'];
            specialSheet.addRow(alerteHeaders).eachCell(cell => cell.style = headerStyle);
            
            safeProduitsSpecifiques.produitsAlerte.slice(0, 50).forEach(p => {
                const row = formatProduitRow(p);
                specialSheet.addRow([
                    row.designation,
                    row.quantite,
                    row.seuilAlerte
                ]);
            });
            
            specialSheet.addRow([]);
        }

        // PRODUITS À RÉAPPROVISIONNER (si cette propriété existe)
        if (safeProduitsSpecifiques.produitsAReapprovisionner && safeProduitsSpecifiques.produitsAReapprovisionner.length > 0) {
            specialSheet.addRow(['PRODUITS À RÉAPPROVISIONNER']).font = { bold: true, size: 14, color: { argb: 'FFFFC107' } };
            specialSheet.addRow([]);
            
            const reapproHeaders = ['Produit', 'Quantité', 'Seuil réappro'];
            specialSheet.addRow(reapproHeaders).eachCell(cell => cell.style = headerStyle);
            
            safeProduitsSpecifiques.produitsAReapprovisionner.slice(0, 50).forEach(p => {
                const row = formatProduitRow(p);
                specialSheet.addRow([
                    row.designation,
                    row.quantite,
                    row.seuilReappro
                ]);
            });
            
            specialSheet.addRow([]);
        }

        // Si aucune alerte, ajouter un message
        if (!safeProduitsSpecifiques.produitsSurStock?.length && 
            !safeProduitsSpecifiques.produitsRecents?.length && 
            !safeProduitsSpecifiques.produitsRotationLente?.length &&
            !safeProduitsSpecifiques.produitsPeremption?.length &&
            !safeProduitsSpecifiques.produitsRupture?.length &&
            !safeProduitsSpecifiques.produitsAlerte?.length &&
            !safeProduitsSpecifiques.produitsAReapprovisionner?.length) {
            specialSheet.addRow(['AUCUNE ALERTE']).font = { bold: true, size: 14, color: { argb: 'FF198754' } };
            specialSheet.addRow([]);
            specialSheet.addRow(['Tous les stocks sont dans une situation normale.']).alignment = { horizontal: 'center' };
        }

        // Ajustement automatique des largeurs de colonnes
        [summarySheet, productsSheet, movementsSheet, statsSheet, specialSheet].forEach(sheet => {
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

        // ✅ ENREGISTRER L'HISTORIQUE AVANT EXPORT
        await HistoriqueService.enregistrerAction(
            authUser.id,
            `Export Excel rapport stock - ${magasinIdFinal ? `Magasin ID: ${magasinIdFinal}` : 'Tous magasins'}`,
            clientIp,
            {
                action: 'EXPORT_STOCK_EXCEL',
                filters: {
                    magasinId: magasinIdFinal,
                    periode,
                    fromDate,
                    toDate,
                    categorie,
                    statut
                }
            }
        );

        // Envoi du fichier
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=rapport-stock-${Date.now()}.xlsx`);
        res.send(buffer);

    } catch (error) {
logger.error('rapportStock.controller', '❌ Erreur export Excel Rapport Stock:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'export Excel',
            details: error.message 
        });
    }
};