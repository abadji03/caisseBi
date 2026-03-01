const db = require('../../models');
const FonctionsUtilitaires  = require('./fonctionsUtilitaires');
const { Op, fn, col } = db.Sequelize;
//const { safeNumber } = require('../bonComplet/statutManager');
const path = require('path');
const fs = require('fs').promises;
const ejs = require('ejs');


/**
 * Construction condition WHERE pour les stocks
 */
const buildWhereStock = ({
    periode,
    dateReference,
    fromDate,
    toDate,
    code_structure,
    magasinId,
    produitId,
    typeStock = 'stock' // 'stock', 'mouvement', 'reconciliation'
}) => {
    //const { Op } = db.Sequelize;
    
    //let dateCondition;
    let dateField = 'dateDerniereMiseAJour';
    
    if (typeStock === 'mouvement') {
        dateField = 'dateMouvement';
    } else if (typeStock === 'reconciliation') {
        dateField = 'dateReconciliation';
    }

    /* if (periode && periode !== 'personnalisee') {
        // const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
        // dateCondition = { [Op.between]: [debut, fin] };
          ({ debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference));

    } 
    else if (fromDate && toDate) {
        // const debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
        // const fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
        // dateCondition = { [Op.between]: [debut, fin] };
        debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
        fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
    } 
    else {
        // Par défaut: 30 derniers jours
        // const fin = new Date();
        // const debut = new Date();
        // debut.setDate(debut.getDate() - 30);
        // dateCondition = { [Op.between]: [debut, fin] };
        fin = new Date();
        debut = new Date();
        debut.setDate(debut.getDate() - 30);
    }
    const dateCondition = { [Op.between]: [debut, fin] };
 */
    
     const { debut, fin } = FonctionsUtilitaires.buildDateRange(
        periode, dateReference, fromDate, toDate
    );

    const where = {
        code_structure,
        [dateField]: { [Op.between]: [debut, fin] }
    };

    if (magasinId) {
        where.magasinId = magasinId;
    }

    if (produitId) {
        where.produitId = produitId;
    }

    return { where, dateDebut: debut, dateFin: fin }; //{ where, dateDebut: dateCondition[Op.between][0], dateFin: dateCondition[Op.between][1] };
};

// ============================================
// 🟢 FONCTIONS DE CALCUL SPÉCIFIQUES AUX STOCKS
// ============================================

/**
 * Calculer les indicateurs principaux des stocks
 */
/* const calculerIndicateursStocks = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId
    } = filters;

    // Déterminer la date de fin (pour l'état du stock)
    let dateFinPeriode;
    if (periode && periode !== 'personnalisee') {
        dateFinPeriode = FonctionsUtilitaires.getPeriodeDates(periode, dateReference).fin;
    } else if (toDate) {
        dateFinPeriode = FonctionsUtilitaires.normalizeDate(toDate, 'end');
    } else {
        dateFinPeriode = new Date(); // Date actuelle par défaut
    }

    // 📌 1. ÉTAT DU STOCK À LA DATE DE FIN (indépendant de la période)
    const whereStockFinal = {
        code_structure,
        ...(magasinId && { magasinId }),
        dateDerniereMiseAJour: { [Op.lte]: dateFinPeriode } // Tous les stocks jusqu'à dateFin
    };

    // 1. Récupérer tous les stocks pour la période
    const { where: whereStock } = buildWhereStock({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        typeStock: 'stock'
    });

    const stocks = await db.Stock.findAll({
        where: whereStock,
        include: [{
            model: db.Produit,
            attributes: ['id', 'designation','unite', 'perissable'],
            include: [{
                model: db.CategoriesProduits,
                attributes: ['id', 'nom']
            }]
        }],
        raw: true,
        nest: true
    });

    const stocksFin = await db.Stock.findAll({
        where: whereStockFinal,
        include: [{
            model: db.Produit,
            attributes: ['id', 'designation', 'unite', 'perissable']
        }],
        order: [['dateDerniereMiseAJour', 'DESC']],
        raw: true,
        nest: true
    });
    // Garder seulement le dernier stock pour chaque produit (état à dateFin)
    const dernierStockParProduit = {};
    stocksFin.forEach(stock => {
        if (!dernierStockParProduit[stock.produitId]) {
            dernierStockParProduit[stock.produitId] = stock;
        }
    });

    // 2. Récupérer les mouvements pour la période
    const { where: whereMouvement } = buildWhereStock({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        typeStock: 'mouvement'
    }); 

    const mouvements = await db.MouvementStock.findAll({
        where: whereMouvement,
        raw: true
    });

    // 3. Calculer les indicateurs
    let totalProduits = 0;
    let produitsUniques = 0;
    let produitsEnAlerte = 0;
    let produitsRupture = 0;
    let produitsEnSurStock = 0;
    let produitsAReapprovisionner = 0;
    let produitsPerissable = 0;
    let valeurStockInitial = 0;
    let valeurStockFinal = 0;
    let valeurStockInitialVente = 0;
    let valeurStockFinalVente = 0;

    const dateDebut = periode ? 
        FonctionsUtilitaires.getPeriodeDates(periode, dateReference).debut :
        (fromDate ? FonctionsUtilitaires.normalizeDate(fromDate, 'start') : new Date());
    
    const dateFin = periode ?
        FonctionsUtilitaires.getPeriodeDates(periode, dateReference).fin :
        (toDate ? FonctionsUtilitaires.normalizeDate(toDate, 'end') : new Date());

    // Grouper par produit
    const stocksParProduit = {};
    stocks.forEach(stock => {
        if (!stocksParProduit[stock.produitId]) {
            stocksParProduit[stock.produitId] = {
                produit: stock.Produit,
                stocks: []
            };
        }
        stocksParProduit[stock.produitId].stocks.push(stock);
    });

    produitsUniques = Object.keys(stocksParProduit).length;
    totalProduits = stocks.length;

    // Calculer pour chaque produit
    for (const produitId in stocksParProduit) {
        const item = stocksParProduit[produitId];
        const produit = item.produit;
        const stocksProduit = item.stocks;
        
        // Dernier stock (pour les valeurs finales)
        const dernierStock = stocksProduit.sort((a, b) => 
            new Date(b.dateDerniereMiseAJour) - new Date(a.dateDerniereMiseAJour)
        )[0];

        // Premier stock de la période (pour les valeurs initiales)
        const premierStock = stocksProduit.sort((a, b) => 
            new Date(a.dateDerniereMiseAJour) - new Date(b.dateDerniereMiseAJour)
        )[0];

        // Calculer les entrées et sorties de la période
        const mouvementsProduit = mouvements.filter(m => m.produitId == produitId);
        
       const entrees = mouvementsProduit
            .filter(m => m.typeMouvement === 'Entrée')
            .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0);
            
        const sorties = mouvementsProduit
            .filter(m => m.typeMouvement === 'Sortie')
            .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0); 

        // Stock initial = stock au début de la période
        const stockInitial = premierStock?.quantiteTotale - entrees + sorties || 0;
        
        // Stock final = stock à la fin de la période
        const stockFinal = dernierStock?.quantiteTotale || 0;

        // Valeurs
        const prixAchat = parseFloat(dernierStock?.dernierPrixAchat || 0);
        const prixVente = parseFloat(dernierStock?.prixVenteUnitaire || 0);
        
        valeurStockInitial += stockInitial * prixAchat;
        valeurStockFinal += stockFinal * prixAchat;
        valeurStockInitialVente += stockInitial * (prixVente || prixAchat);
        valeurStockFinalVente += stockFinal * (prixVente || prixAchat);

        // Statuts
        if (stockFinal <= 0) produitsRupture++;
        else if (stockFinal <= (dernierStock?.seuilAlerte || 5)) produitsEnAlerte++;
        else if (stockFinal <= (dernierStock?.seuilReapprovisionnement || 10)) produitsAReapprovisionner++;
        else if (stockFinal > (dernierStock?.stockSecurite || 5) * 3) produitsEnSurStock++;

        if (produit?.perissable) produitsPerissable++;
    }

    return {
        totalProduits,
        produitsUniques,
        produitsEnAlerte,
        produitsRupture,
        produitsEnSurStock,
        produitsAReapprovisionner,
        produitsPerissable,
        valeurStockInitial,
        valeurStockFinal,
        valeurStockInitialVente,
        valeurStockFinalVente,
        dateDebut,
        dateFin
    };
}; */

const calculerIndicateursStocks = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId
    } = filters;

    // Déterminer la date de fin (pour l'état du stock)
    let dateFin;
    if (periode && periode !== 'personnalisee') {
        dateFin = FonctionsUtilitaires.getPeriodeDates(periode, dateReference).fin;
    } else if (toDate) {
        dateFin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
    } else {
        dateFin = new Date(); // Date actuelle par défaut
    }

    // 📌 1. ÉTAT DU STOCK À LA DATE DE FIN (indépendant de la période)
    const whereStockFinal = {
        code_structure,
        ...(magasinId && { magasinId }),
        dateDerniereMiseAJour: { [Op.lte]: dateFin } // Tous les stocks jusqu'à dateFin
    };

    const stocksFin = await db.Stock.findAll({
        where: whereStockFinal,
        include: [{
            model: db.Produit,
            attributes: ['id', 'designation', 'unite', 'perissable']
        }],
        order: [['dateDerniereMiseAJour', 'DESC']],
        raw: true,
        nest: true
    });

    // Garder seulement le dernier stock pour chaque produit (état à dateFin)
    const dernierStockParProduit = {};
    stocksFin.forEach(stock => {
        if (!dernierStockParProduit[stock.produitId]) {
            dernierStockParProduit[stock.produitId] = stock;
        }
    });

    // Calculer les indicateurs d'état
    let totalProduits = 0;           // Nombre total de produits en stock (catalogue)
    let produitsUniques = 0;         // Produits distincts en stock
    let produitsEnAlerte = 0;
    let produitsRupture = 0;
    let produitsEnSurStock = 0;
    let produitsAReapprovisionner = 0;
    let produitsPerissable = 0;
    let valeurStockFinal = 0;
    let valeurStockFinalVente = 0;
    let produitsNormaux = 0;

    produitsUniques = Object.keys(dernierStockParProduit).length;
    
    Object.values(dernierStockParProduit).forEach(stock => {
        const quantite = parseFloat(stock.quantiteTotale || 0);
        const prixAchat = parseFloat(stock.dernierPrixAchat || 0);
        const prixVente = parseFloat(stock.prixVenteUnitaire || 0);
        
        totalProduits++; // Chaque stock = 1 produit en catalogue
        
        valeurStockFinal += quantite * prixAchat;
        valeurStockFinalVente += quantite * (prixVente || prixAchat);

        // Statuts basés sur l'état actuel
        /* if (quantite <= 0) produitsRupture++;
        else if (quantite <= (stock.seuilAlerte || 5)) produitsEnAlerte++;
        else if (quantite <= (stock.seuilReapprovisionnement || 10)) produitsAReapprovisionner++;
        else if (quantite > (stock.stockSecurite || 5) * 3) produitsEnSurStock++;

        if (stock.Produit?.perissable) produitsPerissable++; */
        
        if (stock.Produit?.perissable) produitsPerissable++;
        
        // Définir les seuils avec valeurs par défaut cohérentes
        const seuilAlerte = parseFloat(stock.seuilAlerte) || 5;
        const seuilReappro = parseFloat(stock.seuilReapprovisionnement) || 10;
        const stockSecurite = parseFloat(stock.stockSecurite) || 5;
        const seuilSurstock = stockSecurite * 3; // ou une autre règle métier

        // Classification correcte (mutuellement exclusive)
        if (quantite <= 0) {
            // RUPTURE : Stock épuisé
            produitsRupture++;
        } 
        else if (quantite <= seuilAlerte) {
            // ALERTE : Stock critique (mais pas encore 0)
            produitsEnAlerte++;
        } 
        else if (quantite <= seuilReappro) {
            // RÉAPPROVISIONNEMENT : Stock bas mais pas critique
            produitsAReapprovisionner++;
        } 
        else if (quantite >= seuilSurstock) {
            // SURSTOCK : Trop de stock
            produitsEnSurStock++;
        } 
        else {
            // NORMAL : Stock sain (entre seuilReappro et seuilSurstock)
            // À ne pas oublier !
            produitsNormaux++;
        }
    });

    // 📌 2. MOUVEMENTS DE LA PÉRIODE (pour les indicateurs dynamiques)
    const dateDebut = periode ? 
        FonctionsUtilitaires.getPeriodeDates(periode, dateReference).debut :
        (fromDate ? FonctionsUtilitaires.normalizeDate(fromDate, 'start') : new Date());

    const whereMouvement = {
        code_structure,
        ...(magasinId && { magasinId }),
        dateMouvement: { [Op.between]: [dateDebut, dateFin] }
    };

    const mouvements = await db.MouvementStock.findAll({
        where: whereMouvement,
        raw: true
    });

    // Calculer les indicateurs de mouvement
    let totalProduitsVendus = 0;      // Nouvel indicateur
    let totalEntrees = 0;
    let totalSorties = 0;
    let valeurStockInitial = 0;
    let valeurStockInitialVente = 0;

    // Calculer le stock initial (juste avant dateDebut)
    const whereStockInitial = {
        code_structure,
        ...(magasinId && { magasinId }),
        dateDerniereMiseAJour: { [Op.lt]: dateDebut }
    };

    const stocksInit = await db.Stock.findAll({
        where: whereStockInitial,
        order: [['dateDerniereMiseAJour', 'DESC']],
        raw: true
    });

    const dernierStockInitParProduit = {};
    stocksInit.forEach(stock => {
        if (!dernierStockInitParProduit[stock.produitId]) {
            dernierStockInitParProduit[stock.produitId] = stock;
        }
    });

    Object.values(dernierStockInitParProduit).forEach(stock => {
        const quantite = parseFloat(stock.quantiteTotale || 0);
        const prixAchat = parseFloat(stock.dernierPrixAchat || 0);
        const prixVente = parseFloat(stock.prixVenteUnitaire || 0);
        
        valeurStockInitial += quantite * prixAchat;
        valeurStockInitialVente += quantite * (prixVente || prixAchat);
    });

    // Calculer les totaux de mouvements
    mouvements.forEach(m => {
        if (m.typeMouvement === 'Entrée') totalEntrees += parseFloat(m.quantite || 0);
        if (m.typeMouvement === 'Sortie') totalSorties += parseFloat(m.quantite || 0);
    });

    // Produits vendus = produits qui ont eu des sorties dans la période
    const produitsAvecSorties = new Set(
        mouvements
            .filter(m => m.typeMouvement === 'Sortie')
            .map(m => m.produitId)
    );
    totalProduitsVendus = produitsAvecSorties.size;

    return {
        // Indicateurs d'état (à dateFin)
        totalProduits,              // Nombre de produits en stock
        produitsUniques,            // Produits distincts en stock
        produitsEnAlerte,
        produitsRupture,
        produitsEnSurStock,
        produitsAReapprovisionner,
        produitsPerissable,
        valeurStockFinal,
        valeurStockFinalVente,
        produitsNormaux,
        
        // Indicateurs de mouvement (sur la période)
        totalProduitsVendus,        // NOUVEAU : Produits vendus dans la période
        totalEntrees,               // NOUVEAU : Total des entrées
        totalSorties,               // NOUVEAU : Total des sorties
        valeurStockInitial,
        valeurStockInitialVente,
        
        // Métadonnées
        dateDebut,
        dateFin
    };
};
/**
 * Calculer les statistiques détaillées par produit
 */
/* const calculerStatsProduits = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId,
        search = '',
        categoryId,
        statut
    } = filters;
    // Récupérer les stocks et mouvements
    const { where: whereStock } = buildWhereStock({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        typeStock: 'stock'
    });

    const { where: whereMouvement } = buildWhereStock({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        typeStock: 'mouvement'
    });

    if (search) {
        whereStock['$Produit.designation$'] = { [Op.like]: `%${search}%` };
    }
    const [stocks, mouvements] = await Promise.all([
        db.Stock.findAll({
            where: whereStock,
            include: [{
                model: db.Produit,
                attributes: ['id', 'designation', 'categorieId', 'unite', 'perissable'],
                where: {
                    ...(categoryId && { categorieId: categoryId }),
                    ...(search && {
                    [Op.or]: [
                        { designation: { [Op.like]: `%${search}%` } },
                        { unite: { [Op.like]: `%${search}%` } }
                    ]
                    })
                },
                include: [{
                    model: db.CategoriesProduits,
                    attributes: ['id', 'nom']   
                }]
            }],
            raw: true,
            nest: true
        }),
        db.MouvementStock.findAll({ where: whereMouvement, raw: true }),
        db.Produit.findAll({
            where: {
                code_structure,
                ...(search && {
                    [Op.or]: [
                        { designation: { [Op.like]: `%${search}%` } },
                        { unite: { [Op.like]: `%${search}%` } }
                    ]
                })
            }
        })
    ]);

    // const dateDebut = periode ? 
    //     FonctionsUtilitaires.getPeriodeDates(periode, dateReference).debut :
    //     (fromDate ? FonctionsUtilitaires.normalizeDate(fromDate, 'start') : new Date());

    // Grouper par produit
    const statsProduits = [];
    const produitsMap = {};

    stocks.forEach(stock => {
        if (!produitsMap[stock.produitId]) {
            produitsMap[stock.produitId] = {
                produit: stock.Produit || { id: stock.produitId },
                stocks: []
            };
        }
        produitsMap[stock.produitId].stocks.push(stock);
    });

    for (const produitId in produitsMap) {
        const item = produitsMap[produitId];
        const produit = item.produit;
        const stocksProduit = item.stocks;
        
        // Trier par date
        stocksProduit.sort((a, b) => new Date(a.dateDerniereMiseAJour) - new Date(b.dateDerniereMiseAJour));
        
        const dernierStock = stocksProduit[stocksProduit.length - 1];
        const premierStock = stocksProduit[0];

        // Mouvements du produit
        const mouvementsProduit = mouvements.filter(m => m.produitId == produitId);
        
        const entrees = mouvementsProduit
            .filter(m => m.typeMouvement === 'Entrée')
            .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0);
            
        const sorties = mouvementsProduit
            .filter(m => m.typeMouvement === 'Sortie')
            .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0);

        // Stock initial et final
        const stockInitial = safeNumber(premierStock?.quantiteTotale - entrees + sorties) || 0;
        const stockFinal = safeNumber(dernierStock?.quantiteTotale) || 0;
        
        // Prix
        const prixAchat = parseFloat(dernierStock?.dernierPrixAchat || 0);
        const prixVente = parseFloat(dernierStock?.prixVenteUnitaire || 0);

        // Taux de rotation
        const stockMoyen = (stockInitial + stockFinal) / 2;
        const tauxRotation = stockMoyen > 0 ? sorties / stockMoyen : 0;

        // Déterminer le statut
        let statutStock = 'En stock';
        if (stockFinal <= 0) statutStock = 'En rupture';
        else if (stockFinal <= (dernierStock?.seuilAlerte || 5)) statutStock = 'En alerte';

        // Filtrer par statut si nécessaire
        if (statut && statut !== 'Tous' && statutStock !== statut) {
            continue;
        }

        statsProduits.push({
            produitId: parseInt(produitId),
            produit: {
                id: produit.id,
                designation: produit.designation || 'Produit inconnu',
                categoryId: produit.categorieId || 'Non catégorisé',
                categorie: produit.CategoriesProduit?.nom || 'Non catégorisé',
                unite: produit.unite || 'unité',
                perissable: produit.perissable || false
            },
            prixAchat,
            prixVente,
            stockInitial: parseFloat(stockInitial.toFixed(2)),
            valeurStockInitial: parseFloat((stockInitial * prixAchat).toFixed(2)),
            entrees: parseFloat(entrees.toFixed(2)),
            sorties: parseFloat(sorties.toFixed(2)),
            stockFinal: parseFloat(stockFinal.toFixed(2)),
            valeurStockFinal: parseFloat((stockFinal * prixAchat).toFixed(2)),
            tauxRotation: parseFloat(tauxRotation.toFixed(2)),
            statut: statutStock,
            seuilAlerte: dernierStock?.seuilAlerte || 5,
            seuilReapprovisionnement: dernierStock?.seuilReapprovisionnement || 10,
            datePeremption: dernierStock?.datePeremption
        });
        
    }

    return {
        statsProduits,
        total: statsProduits.length
    };
};  
 */

const calculerStatsProduits = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId,
        search = '',
        categoryId,
        statut
    } = filters;

    // 📌 1. DÉTERMINER LES DATES DE PÉRIODE
    let dateDebut, dateFin;
    
    if (periode && periode !== 'personnalisee') {
        const dates = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
        dateDebut = dates.debut;
        dateFin = dates.fin;
    } else if (fromDate && toDate) {
        dateDebut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
        dateFin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
    } else {
        dateFin = new Date();
        dateDebut = FonctionsUtilitaires.normalizeDate(
            new Date(dateFin.getFullYear(), dateFin.getMonth(), 1), 
            'start'
        );
    }

    // 📌 2. RÉCUPÉRER TOUS LES PRODUITS DU CATALOGUE
    const whereProduit = {
        code_structure,
        ...(search && {
            [Op.or]: [
                { designation: { [Op.like]: `%${search}%` } },
                { unite: { [Op.like]: `%${search}%` } }
            ]
        }),
        ...(categoryId && { categorieId: categoryId })
    };

    const produits = await db.Produit.findAll({
        where: whereProduit,
        include: [{
            model: db.CategoriesProduits,
            attributes: ['id', 'nom']
        }],
        raw: true,
        nest: true
    });

    // 📌 3. RÉCUPÉRER LE DERNIER STOCK AVANT dateDebut POUR CHAQUE PRODUIT
    // Au lieu de faire une seule requête pour tous, on va utiliser une sous-requête plus efficace
    const [stocksInit, stocksFin] = await Promise.all([
        // Stock initial : dernier stock AVANT dateDebut
        db.Stock.findAll({
            where: {
                code_structure,
                ...(magasinId && { magasinId }),
                dateDerniereMiseAJour: { [Op.lt]: dateDebut }
            },
            order: [['dateDerniereMiseAJour', 'DESC']],
            raw: true
        }),
        
        // Stock final : dernier stock JUSQU'À dateFin
        db.Stock.findAll({
            where: {
                code_structure,
                ...(magasinId && { magasinId }),
                dateDerniereMiseAJour: { [Op.lte]: dateFin }
            },
            include: [{
                model: db.Produit,
                attributes: ['id', 'designation', 'unite', 'perissable']
            }],
            order: [['dateDerniereMiseAJour', 'DESC']],
            raw: true,
            nest: true
        })
    ]);

    // 📌 4. ORGANISER LES STOCKS PAR PRODUIT (garder le dernier)
    const dernierStockInitParProduit = {};
    stocksInit.forEach(stock => {
        if (!dernierStockInitParProduit[stock.produitId] || 
            new Date(stock.dateDerniereMiseAJour) > new Date(dernierStockInitParProduit[stock.produitId].dateDerniereMiseAJour)) {
            dernierStockInitParProduit[stock.produitId] = stock;
        }
    });

    const dernierStockFinalParProduit = {};
    stocksFin.forEach(stock => {
        if (!dernierStockFinalParProduit[stock.produitId] ||
            new Date(stock.dateDerniereMiseAJour) > new Date(dernierStockFinalParProduit[stock.produitId].dateDerniereMiseAJour)) {
            dernierStockFinalParProduit[stock.produitId] = stock;
        }
    });

    // 📌 5. RÉCUPÉRER LES MOUVEMENTS DE LA PÉRIODE
    const mouvements = await db.MouvementStock.findAll({
        where: {
            code_structure,
            ...(magasinId && { magasinId }),
            dateMouvement: { [Op.between]: [dateDebut, dateFin] }
        },
        raw: true
    });

    // 📌 6. CONSTRUIRE LES STATISTIQUES
    const statsProduits = [];

    for (const produit of produits) {
        const produitId = produit.id;
        
        // État du stock à la date de fin
        const stockFinal = dernierStockFinalParProduit[produitId];
        
        // 📌 CORRECTION : Calcul du stock initial
        // Si pas de stock avant dateDebut, on prend le premier stock après dateDebut
        // et on calcule le stock initial = stockFinal - entrées + sorties de la période
        let quantiteInitiale = 0;
        let prixAchatInitial = 0;
        
        if (dernierStockInitParProduit[produitId]) {
            // Cas 1 : Il y a un stock avant dateDebut
            quantiteInitiale = parseFloat(dernierStockInitParProduit[produitId].quantiteTotale || 0);
            prixAchatInitial = parseFloat(dernierStockInitParProduit[produitId].dernierPrixAchat || 0);
        } else if (stockFinal) {
            // Cas 2 : Pas de stock avant mais stock après dateDebut
            // On calcule le stock initial à partir des mouvements de la période
            const mouvementsProduit = mouvements.filter(m => m.produitId == produitId);
            
            const entrees = mouvementsProduit
                .filter(m => m.typeMouvement === 'Entrée')
                .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0);
                
            const sorties = mouvementsProduit
                .filter(m => m.typeMouvement === 'Sortie')
                .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0);
            
            // Formule : StockInitial = StockFinal - Entrées + Sorties
            quantiteInitiale = parseFloat(stockFinal.quantiteTotale || 0) - entrees + sorties;
            
            // Si le résultat est négatif (incohérence), on met à 0
            quantiteInitiale = Math.max(0, quantiteInitiale);
            
            // Prix d'achat : on prend celui du stock final ou on cherche dans les mouvements d'entrée
            prixAchatInitial = parseFloat(stockFinal.dernierPrixAchat || 0);
            
            // Si pas de prix d'achat dans stock final, chercher dans les entrées
            if (prixAchatInitial === 0 && mouvementsProduit.length > 0) {
                const dernierMouvement = mouvementsProduit
                    .filter(m => m.typeMouvement === 'Entrée')
                    .sort((a, b) => new Date(b.dateMouvement) - new Date(a.dateMouvement))[0];
                if (dernierMouvement) {
                    prixAchatInitial = parseFloat(dernierMouvement.prixUnitaire || 0);
                }
            }
        }

        // Mouvements du produit pendant la période
        const mouvementsProduit = mouvements.filter(m => m.produitId == produitId);
        
        const entrees = mouvementsProduit
            .filter(m => m.typeMouvement === 'Entrée')
            .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0);
            
        const sorties = mouvementsProduit
            .filter(m => m.typeMouvement === 'Sortie')
            .reduce((sum, m) => sum + parseFloat(m.quantite || 0), 0);

        // Quantité finale
        const quantiteFinale = stockFinal ? parseFloat(stockFinal.quantiteTotale || 0) : 0;
        
        // Prix (prendre le plus récent disponible)
        const prixAchat = stockFinal ? parseFloat(stockFinal.dernierPrixAchat || 0) : prixAchatInitial;
        const prixVente = stockFinal ? parseFloat(stockFinal.prixVenteUnitaire || 0) : 
                          (dernierStockInitParProduit[produitId] ? parseFloat(dernierStockInitParProduit[produitId].prixVenteUnitaire || 0) : 0);

        // Vérification de cohérence : quantiteInitiale + entrees - sorties devrait ≈ quantiteFinale
        const quantiteCalculee = quantiteInitiale + entrees - sorties;
        if (Math.abs(quantiteCalculee - quantiteFinale) > 0.01) {
            console.warn(`Incohérence pour produit ${produitId}:`, {
                quantiteInitiale,
                entrees,
                sorties,
                quantiteFinale,
                quantiteCalculee
            });
        }

        // Taux de rotation
        const stockMoyen = (quantiteInitiale + quantiteFinale) / 2;
        const tauxRotation = stockMoyen > 0 ? sorties / stockMoyen : 0;

        // Statut basé sur l'état à dateFin
        let statutStock = 'En stock';
        if (quantiteFinale <= 0) statutStock = 'En rupture';
        else if (quantiteFinale <= (stockFinal?.seuilAlerte || 5)) statutStock = 'En alerte';

        // Filtrer par statut
        if (statut && statut !== 'Tous' && statutStock !== statut) {
            continue;
        }

        statsProduits.push({
            produitId: parseInt(produitId),
            produit: {
                id: produit.id,
                designation: produit.designation || 'Produit inconnu',
                categoryId: produit.categorieId || null,
                categorie: produit.CategoriesProduit?.nom || 'Non catégorisé',
                unite: produit.unite || 'unité',
                perissable: produit.perissable || false
            },
            prixAchat: parseFloat(prixAchat.toFixed(2)),
            prixVente: parseFloat(prixVente.toFixed(2)),
            stockInitial: parseFloat(quantiteInitiale.toFixed(2)),
            valeurStockInitial: parseFloat((quantiteInitiale * prixAchat).toFixed(2)),
            entrees: parseFloat(entrees.toFixed(2)),
            sorties: parseFloat(sorties.toFixed(2)),
            stockFinal: parseFloat(quantiteFinale.toFixed(2)),
            valeurStockFinal: parseFloat((quantiteFinale * prixAchat).toFixed(2)),
            tauxRotation: parseFloat(tauxRotation.toFixed(2)),
            statut: statutStock,
            seuilAlerte: stockFinal?.seuilAlerte || 5,
            seuilReapprovisionnement: stockFinal?.seuilReapprovisionnement || 10,
            datePeremption: stockFinal?.datePeremption,
            // Métadonnées
            dateDebut,
            dateFin,
            coherence: {
                attendu: quantiteCalculee,
                reel: quantiteFinale,
                difference: quantiteCalculee - quantiteFinale
            }
        });
    }

    return {
        statsProduits,
        total: statsProduits.length,
        periode: {
            dateDebut,
            dateFin
        }
    };
};
/**
 * Calculer les mouvements de la période
 */
const calculerMouvementsPeriode = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId,
        page = 1,
        limit = 10,
        search = '',
        typeMouvement
    } = filters;

    const { where } = buildWhereStock({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        typeStock: 'mouvement'
    });

    // Ajouter les filtres supplémentaires
    if (typeMouvement) {
        where.typeMouvement = typeMouvement;
    }

    if (search) {
        where[Op.or] = [
            { ref: { [Op.like]: `%${search}%` } },
            { description: { [Op.like]: `%${search}%` } },
            { '$Produit.designation$': { [Op.like]: `%${search}%` } },
            { '$Magasin.nom$': { [Op.like]: `%${search}%` } } // ✅ Ajouter recherche par magasin

        ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await db.MouvementStock.findAndCountAll({
        where,
        include: [
            {
                model: db.Produit,
                attributes: ['id', 'designation', 'unite']
            },
            {
                model: db.Magasin,
                attributes: ['id', 'nom']
            },
            {
                model: db.Users,
                attributes: ['id', 'nom']
            }
        ],
        order: [['dateMouvement', 'DESC']],
        offset,
        limit: parseInt(limit),
        distinct: true
    });

    const mouvements = rows.map(mvt => ({
        id: mvt.id,
        ref: mvt.ref,
        produitId: mvt.produitId,
        produit: mvt.Produit?.designation || 'Produit inconnu',
        magasinId: mvt.magasinId,
        magasin: mvt.Magasin?.nom || 'Magasin inconnu',
        typeMouvement: mvt.typeMouvement,
        quantite: parseFloat(mvt.quantite),
        prixUnitaire: parseFloat(mvt.prixUnitaire),
        prixTotal: parseFloat(mvt.quantite) * parseFloat(mvt.prixUnitaire),
        dateMouvement: mvt.dateMouvement,
        description: mvt.description,
        acteurId: mvt.acteurId,
        acteur: mvt.user?.nom ||'Inconnu'
    }));

    //console.log(Object.keys(rows[0].dataValues));


    return {
        mouvements,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit))
    };
};

/**
 * Calculer les statistiques pour les graphiques
 */
/**
 * Calculer les statistiques pour les graphiques
 */
const calculerStatsGraphiques = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId
    } = filters;

    // 1. Évolution du stock dans le temps
    const { where: whereMouvement } = buildWhereStock({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        typeStock: 'mouvement'
    });

    const mouvements = await db.MouvementStock.findAll({
        attributes: [
            [fn('DATE', col('dateMouvement')), 'date'],
            //[fn('SUM', fn('IF', col('typeMouvement'), 'Entrée', col('quantite'), 0)), 'entrees'],
            //[fn('SUM', fn('IF', col('typeMouvement'), 'Sortie', col('quantite'), 0)), 'sorties']
            [
                fn('SUM',
                    db.Sequelize.literal(`CASE WHEN typeMouvement = 'Entrée' THEN quantite ELSE 0 END`)
                ),
                'entrees'
            ],

            [
                fn('SUM',
                    db.Sequelize.literal(`CASE WHEN typeMouvement = 'Sortie' THEN quantite ELSE 0 END`)
                ),
                'sorties'
            ]
        ],
        where: whereMouvement,
        group: [fn('DATE', col('dateMouvement'))],
        order: [[fn('DATE', col('dateMouvement')), 'ASC']],
        raw: true
    });

    // 2. Répartition par catégorie
    const repartitionCategories = await db.MouvementStock.findAll({
        attributes: [
            //[col('Produit.categorieId'), 'categorie'],
            [col('Produit->CategoriesProduit.nom'), 'categorieNom'],
            [fn('SUM', col('quantite')), 'quantite'],
            [fn("COUNT", db.Sequelize.literal("DISTINCT Produit.id")), 'nombreProduits']
        ],
        where: {
            /* code_structure,
            ...(magasinId && { magasinId }) */
            ...whereMouvement,       // applique les filtres de date
            typeMouvement: 'Sortie'  // ou 'Entrée' selon ce que tu veux mesurer
        },
        include: [{
            model: db.Produit,
            attributes: [],
            include:[{model:db.CategoriesProduits, attributes:['id','nom']}]
        }],
        group: [
            //col('Produit.categorieId'),
            col('Produit->CategoriesProduit.id'),
            col('Produit->CategoriesProduit.nom')
            ],
        raw: true
    });

    // 3. Top produits les plus vendus
    const topProduits = await db.MouvementStock.findAll({
        attributes: [
            'produitId',
            [fn('SUM', col('quantite')), 'quantiteVendue'],
            [fn('COUNT', col('MouvementStock.id')), 'totalSorties'],
            //[fn('SUM', fn('IF', col('typeMouvement'), 'Sortie', col('quantite'), 0)), 'totalSorties']
        /* [
                fn('SUM',
                    db.Sequelize.literal(`CASE WHEN typeMouvement = 'Sortie' THEN quantite ELSE 0 END`)
                ),
                'totalSorties'
            ] */
        ],
        where: {
            ...whereMouvement,
            typeMouvement: 'Sortie'
        },
        group: [
            'produitId',
            'Produit.id',
            'Produit.designation',
            'Produit.categorieId',
            'Produit->CategoriesProduit.id',
            'Produit->CategoriesProduit.nom'
        ],
        order: [[fn('SUM', col('quantite')), 'DESC']],
        limit: 10,
        include: [{
            model: db.Produit,
            attributes: ['id', 'designation', 'categorieId'],
            include: [{
                model: db.CategoriesProduits,
                attributes: ['id', 'nom']
            }]
        }],
        raw: true,
        nest: true
    });

    return {
        evolution: mouvements.map(m => ({
            date: m.date,
            entrees: parseFloat(m.entrees || 0),
            sorties: parseFloat(m.sorties || 0),
            solde: parseFloat((m.entrees || 0) - (m.sorties || 0))
        })),
        repartitionCategories: repartitionCategories.map(r => ({
            //categorieId: r.categorieId,
            categorie: r.categorieNom  || 'Non catégorisé',
            quantite: parseFloat(r.quantite || 0),
            nombreProduits: parseInt(r.nombreProduits || 0)
        })),
        topProduits: topProduits.map(p => ({
            produitId: p.produitId,
            designation: p.Produit?.designation || 'Produit inconnu',
            categorie: p.Produit?.CategoriesProduit?.nom || 'Non catégorisé',
            quantiteVendue: parseFloat(p.quantiteVendue || 0),
            totalSorties: parseInt(p.totalSorties || 0)
        }))
    };
};

/**
 * Calculer les produits en situation particulière
 */
const calculerProduitsSpecifiques = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId
    } = filters;

    const { where: whereStock } = buildWhereStock({
        periode,
        dateReference,
        fromDate,
        toDate,
        code_structure,
        magasinId,
        typeStock: 'stock'
    });

    const stocks = await db.Stock.findAll({
        where: whereStock,
        include: [{
            model: db.Produit,
            attributes: ['id', 'designation', 'perissable']
        }],
        raw: true,
        nest: true
    });

    const aujourdhui = new Date();
    const quinzeJours = 15 * 24 * 60 * 60 * 1000;
    const trenteJours = 30 * 24 * 60 * 60 * 1000;

    const produitsRupture = [];
    const produitsAlerte = [];
    const produitsAReapprovisionner = [];
    const produitsSurStock = [];
    const produitsPeremption = [];
    const produitsRecents = [];
    const produitsRotationLente = [];

    // Grouper par produit pour avoir le dernier stock
    const stocksParProduit = {};
    stocks.forEach(stock => {
        if (!stocksParProduit[stock.produitId] || 
            new Date(stock.dateDerniereMiseAJour) > new Date(stocksParProduit[stock.produitId].dateDerniereMiseAJour)) {
            stocksParProduit[stock.produitId] = stock;
        }
    });

    for (const produitId in stocksParProduit) {
        const stock = stocksParProduit[produitId];
        const quantite = parseFloat(stock.quantiteTotale || 0);
        const seuilAlerte = parseFloat(stock.seuilAlerte || 5);
        const seuilReappro = parseFloat(stock.seuilReapprovisionnement || 10);
        const stockSecurite = parseFloat(stock.stockSecurite || 5);

        if (quantite <= 0) {
            produitsRupture.push(stock);
        } else if (quantite <= seuilAlerte) {
            produitsAlerte.push(stock);
        } else if (quantite <= seuilReappro) {
            produitsAReapprovisionner.push(stock);
        } else if (quantite > stockSecurite * 3) {
            produitsSurStock.push(stock);
        }

        if (stock.Produit?.perissable && stock.datePeremption) {
            const datePeremption = new Date(stock.datePeremption);
            const diff = datePeremption.getTime() - aujourdhui.getTime();
            if (diff <= quinzeJours && diff > 0) {
                produitsPeremption.push(stock);
            }
        }

        const dateMaj = new Date(stock.dateDerniereMiseAJour);
        if (aujourdhui.getTime() - dateMaj.getTime() <= trenteJours) {
            produitsRecents.push(stock);
        }
    }

    // Calculer la rotation lente via les mouvements
    const { where: whereMouvement } = buildWhereStock({
        periode: 'mois',
        dateReference: new Date(),
        code_structure,
        magasinId,
        typeStock: 'mouvement'
    });

    const mouvements = await db.MouvementStock.findAll({
        attributes: [
            'produitId',
            //[fn('SUM', fn('IF', col('typeMouvement'), 'Sortie', col('quantite'), 0)), 'totalSorties']
            [
                fn('SUM',
                    db.Sequelize.literal(`CASE WHEN typeMouvement = 'Sortie' THEN quantite ELSE 0 END`)
                ),
                'totalSorties'
            ]
        ],
        where: {
            ...whereMouvement,
            typeMouvement: 'Sortie'
        },
        group: ['produitId'],
        raw: true
    });

    const ventesParProduit = {};
    mouvements.forEach(m => {
        ventesParProduit[m.produitId] = parseFloat(m.totalSorties || 0);
    });

    Object.values(stocksParProduit).forEach(stock => {
        if ((ventesParProduit[stock.produitId] || 0) < 5) {
            produitsRotationLente.push(stock);
        }
    });

    return {
        produitsRupture,
        produitsAlerte,
        produitsAReapprovisionner,
        produitsSurStock,
        produitsPeremption,
        produitsRecents,
        produitsRotationLente
    };
};


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
    const templatePath = path.join(viewsPath, `${templateName}.ejs`);
    
    console.log('📁 Backend root:', backendRoot);
    console.log('📁 Views path:', viewsPath);
    console.log('📁 Template path:', templatePath);
    
    // Vérifier que le dossier views existe
    try {
        await fs.access(viewsPath);
        console.log('✅ Dossier views trouvé');
    } catch (error) {
        console.log(error);
        throw new Error(`Le dossier views n'existe pas: ${viewsPath}`);
    }
    
    // Vérifier que le template existe
    try {
        await fs.access(templatePath);
        console.log('✅ Template trouvé');
    } catch (error) {
        console.log(error)
        throw new Error(`Template ${templateName}.ejs non trouvé: ${templatePath}`);
    }
    
    return new Promise((resolve, reject) => {
        ejs.renderFile(templatePath, data, { async: false }, (err, str) => {
            if (err) {
                console.error('❌ Erreur rendu EJS:', err);
                reject(err);
            } else {
                console.log('✅ Rendu EJS réussi');
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
            } catch (e) {
                console.log('Erreur',e)
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

exports.calculerIndicateursStocks = calculerIndicateursStocks;
exports.calculerStatsProduits = calculerStatsProduits;
exports.calculerMouvementsPeriode = calculerMouvementsPeriode;
exports.calculerStatsGraphiques = calculerStatsGraphiques;
exports.calculerProduitsSpecifiques = calculerProduitsSpecifiques;
exports.buildWhereStock = buildWhereStock;
exports.formatPeriodeAffichage = formatPeriodeAffichage;
exports.generatePDF = generatePDF;
exports.renderEjsTemplate = renderEjsTemplate;
