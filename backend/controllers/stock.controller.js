const db = require('../models');
const Stock = db.Stock;
const { safeNumber } = require('./bonComplet/statutManager')
//const Produit = db.Produit;  // (si tu as besoin d'inclure les produits dans les requêtes)

// Fonction utilitaire de calcul du statut
function calculerStatut(stock) {
  if (safeNumber(stock.quantiteTotale ) <= safeNumber(stock.seuilAlerte)) {
    return 'Critique';
  } else if (safeNumber(stock.quantiteTotale) <= safeNumber(stock.seuilReapprovisionnement)) {
    return 'À réapprovisionner';
  } else if (safeNumber(stock.quantiteTotale) === 0) {
    return 'En rupture';
  } else {
    return 'En stock';
  }
}

// 1. Créer un stock
exports.createStock = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    // Calcul du statut avant la création
    const statutStock = calculerStatut(req.body);

    const stock = await Stock.create({
      ...req.body,
      statutStock,
    });

    res.status(201).json(stock);
  } catch (error) {
    res.status(500).json({ message: 'Erreur création stock', error });
  }
};

// 2. Mettre à jour un stock
exports.updateStock = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock non trouvé' });

    // On met à jour les valeurs
    await stock.update(req.body);

    // On recalcule le statut après la mise à jour
    const statutStock = calculerStatut(stock);

    await stock.update({ statutStock });

    res.json({ message: 'Stock mis à jour', stock });
  } catch (error) {
    res.status(500).json({ message: 'Erreur mise à jour', error });
  }
};

// 3. Récupérer tous les stocks d'une structure
exports.getStocksByStructure = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { code_structure } = req.params;

    // 🔥 Vérification : l’utilisateur doit appartenir à la structure demandée
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({
        message: "Accès interdit : structure non autorisée"
      });
    }

    // Vérifier rôle
    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");
    const isEmploye = authUser.roles?.some(r => r.nom === "Employé");

    if (!isAdminStructure && !isGerant && !isCaissier && !isEmploye) {
    return res.status(403).json({
      message: "Accès interdit : rôle insuffisant"
    });
}

    // Clause where par défaut (structure)
    let whereClause = {
      code_structure: code_structure
    };

    // 🔹 Si gérant : filtrer par magasin
    if (!isAdminStructure && (isGerant || isCaissier || isEmploye)) {
      if (!authUser.magasinId) {
        return res.status(400).json({
          message: "Ce gérant ou caissier ou employé n’est associé à aucun magasin"
        });
      }

      whereClause.magasinId = authUser.magasinId;
    }
    const stocks = await Stock.findAll({
      where: whereClause,
    });
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération stocks', error });
  }
};

exports.getStocksByStructureBis = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { code_structure } = req.params;
    
    // Paramètres de pagination et filtres
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      statut = '',
      perissable = '',
      alerte = '',
      tri = 'designation_asc'
    } = req.query;

    // Vérification des droits
    if (authUser.code_structure !== code_structure) {
      return res.status(403).json({ message: "Accès interdit" });
    }

    const isAdminStructure = authUser.roles?.some(r => r.nom === "Administrateur");
    const isGerant = authUser.roles?.some(r => r.nom === "Gérant");
    const isCaissier = authUser.roles?.some(r => r.nom === "Caissier");

    if (!isAdminStructure && !isGerant && !isCaissier) {
      return res.status(403).json({ message: "Accès interdit : rôle insuffisant" });
    }

    // Clause WHERE pour les stocks
    let stockWhere = { code_structure };

    // Filtrer par magasin selon le rôle
    if (!isAdminStructure && (isGerant || isCaissier) && authUser.magasinId) {
      stockWhere.magasinId = authUser.magasinId;
    } /* else if (magasinId) {
      stockWhere.magasinId = magasinId;
    }
 */
    // Récupérer tous les stocks avec leurs produits
    const stocks = await Stock.findAll({
      where: stockWhere,
      include: [
        { 
          model: db.Produit, 
          attributes: ['id', 'designation', 'perissable', 'prixAchatUnitaire', 'prixVenteUnitaire']
        },
        { 
          model: db.Magasin, 
          attributes: ['id', 'nom'] 
        }
      ]
    });

    // Enrichir les données et calculer les métriques
    const stocksEnrichis = stocks.map(stock => {
      const quantiteDisponible = safeNumber(stock.quantiteTotale) - (safeNumber(stock.quantiteReservee) || 0);
      const joursAvantPeremption = safeNumber(stock.datePeremption) 
        ? Math.ceil((new Date(stock.datePeremption) - new Date()) / (1000 * 60 * 60 * 24))
        : null;
      
      const niveauAlerte = quantiteDisponible <= safeNumber(stock.seuilAlerte) ? 'Critique' :
                          quantiteDisponible <= safeNumber(stock.seuilReapprovisionnement) ? 'Attention' : 'Normal';

      return {
        id: stock.id,
        produitId: stock.produitId,
        produitDesignation: stock.Produit?.designation || 'Inconnu',
        produitPerissable: stock.Produit?.perissable || false,
        magasinId: stock.magasinId,
        magasinNom: stock.Magasin?.nom || 'Inconnu',
        quantiteTotale: safeNumber(stock.quantiteTotale),
        quantiteReservee: safeNumber(stock.quantiteReservee) || 0,
        quantiteDisponible,
        seuilAlerte: safeNumber(stock.seuilAlerte),
        seuilReapprovisionnement: safeNumber(stock.seuilReapprovisionnement),
        datePeremption: stock.datePeremption,
        joursAvantPeremption,
        statutStock: stock.statutStock,
        niveauAlerte,
        valeurStock: (stock.quantiteTotale * (stock.Produit?.prixAchatUnitaire || 0)) || 0,
        dateDerniereMiseAJour: stock.dateDerniereMiseAJour
      };
    });

    // Filtrer selon les critères
    let filteredStocks = stocksEnrichis;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredStocks = filteredStocks.filter(s => 
        s.produitDesignation.toLowerCase().includes(searchLower) ||
        s.magasinNom.toLowerCase().includes(searchLower) ||
        s.statutStock.toLowerCase().includes(searchLower)
      );
    }

    if (statut && statut !== 'tous') {
      filteredStocks = filteredStocks.filter(s => s.statutStock === statut);
    }

    if (alerte === 'oui') {
      filteredStocks = filteredStocks.filter(s => 
        s.niveauAlerte === 'Critique' || s.niveauAlerte === 'Attention'
      );
    }

    if (perissable === 'oui') {
      filteredStocks = filteredStocks.filter(s => s.produitPerissable);
    } else if (perissable === 'non') {
      filteredStocks = filteredStocks.filter(s => !s.produitPerissable);
    }

    // Tri
    const [triChamp, triOrdre] = tri.split('_');
    filteredStocks.sort((a, b) => {
      let aVal = a[triChamp] || '';
      let bVal = b[triChamp] || '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (triOrdre === 'desc') {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
    });

    // Statistiques globales
    const statsGlobales = {
      totalProduits: filteredStocks.length,
      valeurTotaleStock: filteredStocks.reduce((sum, s) => sum + safeNumber(s.valeurStock), 0),
      produitsEnAlerte: filteredStocks.filter(s => s.niveauAlerte !== 'Normal').length,
      produitsCritiques: filteredStocks.filter(s => s.niveauAlerte === 'Critique').length,
      produitsPerissables: filteredStocks.filter(s => s.produitPerissable).length,
      produitsPerimes: filteredStocks.filter(s => s.joursAvantPeremption < 0).length,
      produitsBientotPerimes: filteredStocks.filter(s => 
        s.joursAvantPeremption > 0 && s.joursAvantPeremption <= 7
      ).length,
      quantiteTotale: filteredStocks.reduce((sum, s) => sum + safeNumber(s.quantiteTotale), 0),
      quantiteDisponibleTotale: filteredStocks.reduce((sum, s) => sum + safeNumber(s.quantiteDisponible), 0),
      quantiteReserveeTotale: filteredStocks.reduce((sum, s) => sum + safeNumber(s.quantiteReservee), 0)
    };

    // Pagination
    const totalItems = filteredStocks.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedStocks = filteredStocks.slice(offset, offset + parseInt(limit));
    const totalPages = Math.ceil(totalItems / parseInt(limit));

    res.json({
      stocks: paginatedStocks,
      statsGlobales,
      pagination: {
        total: totalItems,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Erreur dashboard stock:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
};
// 4. Récupérer le stock d'un produit (très demandé)
exports.getStockByProduitId = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const stock = await Stock.findOne({
      where: { produitId: req.params.produitId },
    });
    if (!stock) return res.status(404).json({ message: 'Aucun stock trouvé pour ce produit' });

    res.json(stock);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération stock produit', error });
  }
};

// 5. Supprimer un stock (optionnel)
exports.deleteStock = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock non trouvé' });

    await stock.destroy();
    res.json({ message: 'Stock supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur suppression', error });
  }
};


exports.adjustQuantiteTotale = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { variation } = req.body; // variation attendue : nombre (positif ou négatif)
    if (typeof variation !== 'number') {
      return res.status(400).json({ message: 'La variation doit être un nombre' });
    }

    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock non trouvé' });

    const nouvelleQuantite = parseFloat(stock.quantiteTotale) + variation;
    if (nouvelleQuantite < 0) {
      return res.status(400).json({ message: 'La quantité totale ne peut pas être négative' });
    }

    //await stock.update({ quantiteTotale: nouvelleQuantite });

    // Recalcul du statut
    const nouveauStatut = calculerStatut({ ...stock.dataValues, quantiteTotale: nouvelleQuantite });
    //await stock.update({ statutStock: nouveauStatut });
    //Update unique (meilleure pratique)
    await stock.update({
      quantiteTotale: nouvelleQuantite,
      statutStock: nouveauStatut,
      dateDerniereMiseAJour: new Date()
    });

    res.json({ message: 'Quantité totale ajustée avec succès', stock });
  } catch (error) {
    res.status(500).json({ message: 'Erreur ajustement quantité totale', error });
  }
};

exports.adjustQuantiteReservee = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    const { variation } = req.body;
    if (typeof variation !== 'number') {
      return res.status(400).json({ message: 'La variation doit être un nombre' });
    }

    const stock = await Stock.findByPk(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock non trouvé' });

    const nouvelleReserve = parseFloat(stock.quantiteReservee || 0) + variation;
    if (nouvelleReserve < 0) {
      return res.status(400).json({ message: 'La quantité réservée ne peut pas être négative' });
    }

    await stock.update({ quantiteReservee: nouvelleReserve });

    res.json({ message: 'Quantité réservée ajustée avec succès', stock });
  } catch (error) {
    res.status(500).json({ message: 'Erreur ajustement quantité réservée', error });
  }
};
