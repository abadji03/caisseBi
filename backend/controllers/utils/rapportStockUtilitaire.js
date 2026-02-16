const db = require('../../models');
const FonctionsUtilitaires  = require('./fonctionsUtilitaires');
const { Op, fn, col } = db.Sequelize;
const { safeNumber } = require('../bonComplet/statutManager');


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

    let debut, fin;
    
    if (periode && periode !== 'personnalisee') {
        // const { debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference);
        // dateCondition = { [Op.between]: [debut, fin] };
          ({ debut, fin } = FonctionsUtilitaires.getPeriodeDates(periode, dateReference));

    } 
    else if (fromDate && toDate) {
        /* const debut = FonctionsUtilitaires.normalizeDate(fromDate, 'start');
        const fin = FonctionsUtilitaires.normalizeDate(toDate, 'end');
        dateCondition = { [Op.between]: [debut, fin] }; */
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

    const where = {
        code_structure,
        [dateField]: dateCondition
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
const calculerIndicateursStocks = async (filters) => {
    const {
        code_structure,
        periode,
        dateReference,
        fromDate,
        toDate,
        magasinId
    } = filters;

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
};

/**
 * Calculer les statistiques détaillées par produit
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

    // Récupérer les stocks et mouvements avec les filtres
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

    // Ajouter la recherche sur les produits
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
        db.MouvementStock.findAll({ 
            where: whereMouvement, 
            raw: true 
        })
    ]);

    // Grouper par produit
    const produitsMap = {};
    stocks.forEach(stock => {
        if (!produitsMap[stock.produitId]) {
            produitsMap[stock.produitId] = {
                produit: stock.Produit,
                stocks: []
            };
        }
        produitsMap[stock.produitId].stocks.push(stock);
    });

    const statsProduits = [];

    for (const produitId in produitsMap) {
        const item = produitsMap[produitId];
        const produit = item.produit;
        const stocksProduit = item.stocks;
        
        // Trier par date
        stocksProduit.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        
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

        // ✅ CORRECTION: Stock initial = stock au début de la période
        const stockInitial = safeNumber(premierStock?.quantiteTotale) || 0;
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
                categoryId: produit.categorieId,
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
};  */
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

exports.calculerIndicateursStocks = calculerIndicateursStocks;
exports.calculerStatsProduits = calculerStatsProduits;
exports.calculerMouvementsPeriode = calculerMouvementsPeriode;
exports.calculerStatsGraphiques = calculerStatsGraphiques;
exports.calculerProduitsSpecifiques = calculerProduitsSpecifiques;
exports.buildWhereStock = buildWhereStock;
