const db = require('../../models');
const logger = require('../../services/logger.js');
const FonctionsUtilitaires  = require('./fonctionsUtilitaires');
const { Op, fn, col } = db.Sequelize;
const path = require('path');
const fs = require('fs').promises;
const ejs = require('ejs');

// Fonction pour formater la période
const formatPeriodeAffichage = (debut, fin, periodeType) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    
    if (periodeType === 'jour') {
        return `Journée du ${debut.toLocaleDateString('fr-FR', options)}`;
    } else if (periodeType === 'semaine') {
        return `Semaine du ${debut.toLocaleDateString('fr-FR', options)} au ${fin.toLocaleDateString('fr-FR', options)}`;
    } else if (periodeType === 'mois') {
        return `Mois de ${debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    } else {
        return `Période du ${debut.toLocaleDateString('fr-FR', options)} au ${fin.toLocaleDateString('fr-FR', options)}`;
    }
}

// Rendu du template EJS
const renderEjsTemplate = async (templateName, data) =>{
    // Trouver la racine du projet (backend)
    // Part du fichier actuel (utils/rapportStockUtilitaire.js) et remonte
    const currentDir = __dirname; // .../backend/controllers/utils
    const backendRoot = path.resolve(currentDir, '..', '..'); // Remonte de 2 niveaux : utils -> controllers -> backend
    
    // Chemin correct vers le dossier views à la racine du backend
    const viewsPath = path.join(backendRoot, 'views');
    const templatePath = path.join(viewsPath, `${templateName}.ejs`);logger.log('rapportFinancierUtilitaire', '📁 Backend root:', backendRoot);logger.log('rapportFinancierUtilitaire', '📁 Views path:', viewsPath);logger.log('rapportFinancierUtilitaire', '📁 Template path:', templatePath);
    
    // Vérifier que le dossier views existe
    try {
        await fs.access(viewsPath);logger.log('rapportFinancierUtilitaire', '✅ Dossier views trouvé');
    } catch (error) {logger.log('rapportFinancierUtilitaire', error);
        throw new Error(`Le dossier views n'existe pas: ${viewsPath}`);
    }
    
    // Vérifier que le template existe
    try {
        await fs.access(templatePath);logger.log('rapportFinancierUtilitaire', '✅ Template trouvé');
    } catch (error) {logger.log('rapportFinancierUtilitaire', error)
        throw new Error(`Template ${templateName}.ejs non trouvé: ${templatePath}`);
    }
    
    return new Promise((resolve, reject) => {
        ejs.renderFile(templatePath, data, { async: false }, (err, str) => {
            if (err) {logger.error('rapportFinancierUtilitaire', '❌ Erreur rendu EJS:', err);
                reject(err);
            } else {logger.log('rapportFinancierUtilitaire', '✅ Rendu EJS réussi');
                resolve(str);
            }
        });
    });
}

// Génération PDF avec Puppeteer
const generatePDF = async (html)=> {
    const puppeteer = require('puppeteer-core');
    let browser = null;
    
    try {
        // Chemin vers Chrome (à adapter selon votre système)
        const chromePaths = [
            //'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            //'/usr/bin/google-chrome',
            //'/usr/bin/chromium-browser',
            //'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        ];

        let executablePath = null;
        for (const path of chromePaths) {
            try {
                await require('fs').promises.access(path);
                executablePath = path;
                break;
            } catch (e) {logger.log('rapportFinancierUtilitaire', 'Erreur',e)
            }
        }

        if (!executablePath) {
            throw new Error('Chrome/Chromium non trouvé');
        }

        browser = await puppeteer.launch({
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });

        const page = await browser.newPage();
        
        await page.setContent(html, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 1,
        });
        
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                bottom: '20mm',
                left: '15mm',
                right: '15mm'
            },
            landscape: false,
            scale: 0.9,
            displayHeaderFooter: false,
            preferCSSPageSize: true
        });

        return pdf;

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
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
        type: 'RECETTE',
        statut: 'validé'
    });

    const whereDepenses = FonctionsUtilitaires.buildWhereFinance({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        agentId,
        type: 'DEPENSE',
        statut: 'validé'
    });

    // 1. Calcul du chiffre d'affaires (recettes de catégorie vente)
    const categoriesVente = await db.Categorie.findAll({
        where: {
            code_structure,
            type: 'RECETTE',
            [Op.or]: [
                { name: { [Op.like]: '%vente%' } },
                { name: { [Op.like]: '%service%' } },
                { description: { [Op.like]: '%vente%' } },
                { description: { [Op.like]: '%service%' } },
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
                { name: { [Op.like]: '%service%' } },
                { description: { [Op.like]: '%vente%' } },
                { description: { [Op.like]: '%service%' } },
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
exports.calculerIndicateursPrincipaux = calculerIndicateursPrincipaux;
exports.formatPeriodeAffichage = formatPeriodeAffichage;
exports.renderEjsTemplate = renderEjsTemplate;
exports.generatePDF = generatePDF;
