//Init de Sequelize
//Importation du module Sequelize
const Sequelize = require('sequelize');

//Importation de la configuration de la base de données (définie dans config/db.js)
const sequelize = require('../config/db');

//Création d'un objet qui contiendra tous les modèles et la connexion Sequelize
const db = {};

//On ajoute Sequelize (la classe) et l'instance sequelize (la connexion) dans l'objet `db`
db.Sequelize = Sequelize;
db.sequelize = sequelize;

/* Chargement des modèles */

// Charger d'abord le modèle Sequence (s'il existe)
try {
  db.Sequence = require('./sequence.model')(sequelize, Sequelize);
} catch (error) {
}

//Chargement et initialisation du modèle Structure
db.Structure = require('./structure.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Users
db.Users = require('./user.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Magasins
db.Magasin = require('./magasin.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Produits
db.Produit = require('./produit.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Client
db.Client = require('./client.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Fournisseurs
db.Fournisseur = require('./fournisseur.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle CategorieProduit
db.CategoriesProduits = require('./categorieProduit.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Stocks
db.Stock = require('./stock.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Mouvement_stock
db.MouvementStock = require('./mouvement_stock.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Reconciliation
db.Reconciliation = require('./reconciliation.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Transfert
db.Transfert = require('./transfert.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Categorie pour les dépenses et recette
db.Categorie = require('./categorie.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Dépense
db.Depense = require('./depense.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Recette
db.Recette = require('./recette.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle HistoriqueReconciliation
db.HistoriqueReconciliation = require('./historiqueReconciliation.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle HistoriqueActionsUtilisateur
db.HistoriqueActionsUtilisateur = require('./historiqueActionsUtilisateur.model')(
  sequelize,
  Sequelize
);
//Chargement et initialisation du modèle HistoriqueConnexions
db.HistoriqueConnexions = require('./historiqueConnexions.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Bon
db.Bon = require('./bon.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Panier
db.Panier = require('./panier.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle ArticlePanier
db.ArticlePanier = require('./articlePanier.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Operation
db.Operation = require('./operation.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Paiement
db.Paiement = require('./paiement.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Permission
db.Permission = require('./permission.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Role
db.Role = require('./role.model')(sequelize, Sequelize);
db.HistoriqueStatut = require('./historiqueStatut.model')(sequelize, Sequelize);

db.MagasinFournisseur = require('./magasinFournisseur.model')(sequelize, Sequelize);
db.MagasinClient = require('./magasinClient.model')(sequelize, Sequelize);

db.Facture = require('./facture.model')(sequelize, Sequelize);

// Notifications utilisateur
db.Notification = require('./notification.model')(sequelize, Sequelize);

/* Définition des relations entre les modèles */

// ========== RELATIONS STRUCTURE ==========
// Une structure peut avoir plusieurs utilisateurs (via code_structure)
db.Structure.hasMany(db.Users, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Users.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs magasins
db.Structure.hasMany(db.Magasin, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Magasin.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs produits
db.Structure.hasMany(db.Produit, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});

// Structure a plusieurs catégories
db.Structure.hasMany(db.CategoriesProduits, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.CategoriesProduits.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs fournisseurs
db.Structure.hasMany(db.Fournisseur, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Fournisseur.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs clients
db.Structure.hasMany(db.Client, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Client.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs stocks
db.Structure.hasMany(db.Stock, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Stock.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs mouvements de stock
db.Structure.hasMany(db.MouvementStock, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.MouvementStock.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs réconciliations
db.Structure.hasMany(db.Reconciliation, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Reconciliation.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs transferts
db.Structure.hasMany(db.Transfert, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Transfert.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

// Structure a plusieurs catégories (dépenses/recettes)
db.Structure.hasMany(db.Categorie, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Categorie.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

// Structure a plusieurs dépenses
db.Structure.hasMany(db.Depense, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Depense.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

// Structure a plusieurs recettes
db.Structure.hasMany(db.Recette, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Recette.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

// Structure a plusieurs historiques de réconciliation
db.Structure.hasMany(db.HistoriqueReconciliation, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.HistoriqueReconciliation.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs bons
db.Structure.hasMany(db.Bon, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Bon.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

// Structure a plusieurs paniers
db.Structure.hasMany(db.Panier, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Panier.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

// Structure a plusieurs articles de panier
db.Structure.hasMany(db.ArticlePanier, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.ArticlePanier.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Structure a plusieurs opérations
db.Structure.hasMany(db.Operation, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Operation.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

// Structure a plusieurs paiements
db.Structure.hasMany(db.Paiement, { 
  foreignKey: 'code_structure', 
  sourceKey: 'code_structure' 
});
db.Paiement.belongsTo(db.Structure, { 
  foreignKey: 'code_structure', 
  targetKey: 'code_structure' 
});

db.Structure.hasMany(db.Facture, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure'
});

db.Facture.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure'
});
// ========== RELATIONS USERS ==========
// Users appartient à un magasin
db.Users.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
db.Magasin.hasMany(db.Users, { foreignKey: 'magasinId' });

// Users a plusieurs produits
db.Users.hasMany(db.Produit, { foreignKey: 'agentId' });
db.Produit.belongsTo(db.Users, { foreignKey: 'agentId' });

// Users a plusieurs mouvements de stock
db.Users.hasMany(db.MouvementStock, { foreignKey: 'acteurId' });
db.MouvementStock.belongsTo(db.Users, { foreignKey: 'acteurId' });

// Users a plusieurs réconciliations
db.Users.hasMany(db.Reconciliation, { foreignKey: 'responsable' });
db.Reconciliation.belongsTo(db.Users, { foreignKey: 'responsable' });

// Users a plusieurs transferts
db.Users.hasMany(db.Transfert, { foreignKey: 'agentResponsable', as: 'TransfertsResponsables' });
db.Users.hasMany(db.Transfert, { foreignKey: 'agentValidation', as: 'TransfertsValides' });
db.Transfert.belongsTo(db.Users, { foreignKey: 'agentResponsable', as: 'Responsable' });
db.Transfert.belongsTo(db.Users, { foreignKey: 'agentValidation', as: 'Validateur' });

// Users a plusieurs dépenses
db.Users.hasMany(db.Depense, { foreignKey: 'agentId' });
db.Depense.belongsTo(db.Users, { foreignKey: 'agentId' });

// Users a plusieurs recettes
db.Users.hasMany(db.Recette, { foreignKey: 'agentId' });
db.Recette.belongsTo(db.Users, { foreignKey: 'agentId' });

// Users a plusieurs historiques d'actions
db.Users.hasMany(db.HistoriqueActionsUtilisateur, { foreignKey: 'userId' });
db.HistoriqueActionsUtilisateur.belongsTo(db.Users, { foreignKey: 'userId' });

// Users a plusieurs historiques de connexions
db.Users.hasMany(db.HistoriqueConnexions, { foreignKey: 'userId' });
db.HistoriqueConnexions.belongsTo(db.Users, { foreignKey: 'userId' });

// Users a plusieurs bons
db.Users.hasMany(db.Bon, { foreignKey: 'agentId' });
db.Bon.belongsTo(db.Users, { foreignKey: 'agentId' });

// Users a plusieurs paniers
db.Users.hasMany(db.Panier, { foreignKey: 'agentId' });
db.Panier.belongsTo(db.Users, { foreignKey: 'agentId' });

// Users a plusieurs opérations
db.Users.hasMany(db.Operation, { foreignKey: 'agentId' });
db.Operation.belongsTo(db.Users, { foreignKey: 'agentId' });

// Users a plusieurs paiements
db.Users.hasMany(db.Paiement, { foreignKey: 'agentId' });
db.Paiement.belongsTo(db.Users, { foreignKey: 'agentId' });

// Users a plusieurs historiques de statut
db.Users.hasMany(db.HistoriqueStatut, { foreignKey: 'agentId', as: 'historiques' });
db.HistoriqueStatut.belongsTo(db.Users, { foreignKey: 'agentId', as: 'users' });

// ========== RELATIONS PRODUITS ==========
// Produit appartient à une catégorie
db.CategoriesProduits.hasMany(db.Produit, { foreignKey: 'categorieId' });
db.Produit.belongsTo(db.CategoriesProduits, { foreignKey: 'categorieId' });

// Produit appartient à un fournisseur
db.Fournisseur.hasMany(db.Produit, { foreignKey: 'fournisseurId' });
db.Produit.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });

// Produit a plusieurs stocks
db.Produit.hasMany(db.Stock, { foreignKey: 'produitId' });
db.Stock.belongsTo(db.Produit, { foreignKey: 'produitId' });

// Produit a plusieurs mouvements de stock
db.Produit.hasMany(db.MouvementStock, { foreignKey: 'produitId' });
db.MouvementStock.belongsTo(db.Produit, { foreignKey: 'produitId' });

// Produit a plusieurs réconciliations
db.Produit.hasMany(db.Reconciliation, { foreignKey: 'produitId' });
db.Reconciliation.belongsTo(db.Produit, { foreignKey: 'produitId' });

// Produit a plusieurs transferts
db.Produit.hasMany(db.Transfert, { foreignKey: 'produitId' });
db.Transfert.belongsTo(db.Produit, { foreignKey: 'produitId' });

// Produit a plusieurs articles de panier
db.Produit.hasMany(db.ArticlePanier, { foreignKey: 'produitId' });
db.ArticlePanier.belongsTo(db.Produit, { foreignKey: 'produitId' });

// ========== RELATIONS MAGASINS ==========
// Magasin a plusieurs stocks
db.Magasin.hasMany(db.Stock, { foreignKey: 'magasinId' });
db.Stock.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs mouvements de stock
db.Magasin.hasMany(db.MouvementStock, { foreignKey: 'magasinId' });
db.MouvementStock.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs réconciliations
db.Magasin.hasMany(db.Reconciliation, { foreignKey: 'magasinId' });
db.Reconciliation.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs transferts
db.Magasin.hasMany(db.Transfert, { foreignKey: 'magasinSource', as: 'TransfertsSortants' });
db.Magasin.hasMany(db.Transfert, { foreignKey: 'magasinDestination', as: 'TransfertsEntrants' });
db.Transfert.belongsTo(db.Magasin, { foreignKey: 'magasinSource', as: 'MagasinSource' });
db.Transfert.belongsTo(db.Magasin, { foreignKey: 'magasinDestination', as: 'MagasinDestination' });

// Magasin a plusieurs dépenses
db.Magasin.hasMany(db.Depense, { foreignKey: 'magasinId' });
db.Depense.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs recettes
db.Magasin.hasMany(db.Recette, { foreignKey: 'magasinId' });
db.Recette.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs bons
db.Magasin.hasMany(db.Bon, { foreignKey: 'magasinId' });
db.Bon.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs paniers
db.Magasin.hasMany(db.Panier, { foreignKey: 'magasinId' });
db.Panier.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs opérations
db.Magasin.hasMany(db.Operation, { foreignKey: 'magasinId' });
db.Operation.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Magasin a plusieurs paiements
db.Magasin.hasMany(db.Paiement, { foreignKey: 'magasinId' });
db.Paiement.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// ========== RELATIONS STOCK ==========
// Stock a plusieurs mouvements de stock
db.Stock.hasMany(db.MouvementStock, { foreignKey: 'stockId' });
db.MouvementStock.belongsTo(db.Stock, { foreignKey: 'stockId' });

// Stock a plusieurs articles de panier
db.Stock.hasMany(db.ArticlePanier, { foreignKey: 'stockId' });
db.ArticlePanier.belongsTo(db.Stock, { foreignKey: 'stockId' });

// ========== RELATIONS RECONCILIATION ==========
// Reconciliation a plusieurs mouvements de stock
db.Reconciliation.hasMany(db.MouvementStock, { foreignKey: 'reconciliationId' });
db.MouvementStock.belongsTo(db.Reconciliation, { foreignKey: 'reconciliationId' });

// Reconciliation a plusieurs historiques
db.Reconciliation.hasMany(db.HistoriqueReconciliation, { foreignKey: 'reconciliationId' });
db.HistoriqueReconciliation.belongsTo(db.Reconciliation, { foreignKey: 'reconciliationId' });

// ========== RELATIONS TRANSFERT ==========
// Transfert a plusieurs mouvements de stock
db.Transfert.hasMany(db.MouvementStock, { foreignKey: 'transfertId' });
db.MouvementStock.belongsTo(db.Transfert, { foreignKey: 'transfertId' });

// ========== RELATIONS CATEGORIE (depenses/recettes) ==========
// Categorie a plusieurs dépenses
db.Categorie.hasMany(db.Depense, { foreignKey: 'categoryId' });
db.Depense.belongsTo(db.Categorie, { foreignKey: 'categoryId' });

// Categorie a plusieurs recettes
db.Categorie.hasMany(db.Recette, { foreignKey: 'categoryId' });
db.Recette.belongsTo(db.Categorie, { foreignKey: 'categoryId' });

// ========== RELATIONS BON ==========
// Bon appartient à un fournisseur ou client
db.Fournisseur.hasMany(db.Bon, { foreignKey: 'fournisseurId' });
db.Bon.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });
db.Client.hasMany(db.Bon, { foreignKey: 'clientId' });
db.Bon.belongsTo(db.Client, { foreignKey: 'clientId' });

// Bon a plusieurs opérations
db.Bon.hasMany(db.Operation, { foreignKey: 'bonId' });
db.Operation.belongsTo(db.Bon, { foreignKey: 'bonId' });

// Bon a plusieurs paiements
db.Bon.hasMany(db.Paiement, { foreignKey: 'bonId' });
db.Paiement.belongsTo(db.Bon, { foreignKey: 'bonId' });

// Bon a plusieurs historiques de statut
db.Bon.hasMany(db.HistoriqueStatut, { foreignKey: 'bonId', as: 'historiques' });
db.HistoriqueStatut.belongsTo(db.Bon, { foreignKey: 'bonId', as: 'bons' });

// ========== RELATIONS PANIER ==========
// Panier appartient à un client
db.Client.hasMany(db.Panier, { foreignKey: 'clientId' });
db.Panier.belongsTo(db.Client, { foreignKey: 'clientId' });

// Panier a un bon
db.Bon.hasOne(db.Panier, { foreignKey: 'bonId' });
db.Panier.belongsTo(db.Bon, { foreignKey: 'bonId' });

// Panier a plusieurs articles
db.Panier.hasMany(db.ArticlePanier, { foreignKey: 'panierId' });
db.ArticlePanier.belongsTo(db.Panier, { foreignKey: 'panierId' });

// Panier a plusieurs paiements
db.Panier.hasMany(db.Paiement, { foreignKey: 'panierId' });
db.Paiement.belongsTo(db.Panier, { foreignKey: 'panierId' });

// ========== RELATIONS OPERATION ==========
// Operation appartient à un client ou fournisseur
db.Client.hasMany(db.Operation, { foreignKey: 'clientId' });
db.Operation.belongsTo(db.Client, { foreignKey: 'clientId' });
db.Fournisseur.hasMany(db.Operation, { foreignKey: 'fournisseurId' });
db.Operation.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });

// Operation appartient à un paiement
db.Paiement.hasMany(db.Operation, { foreignKey: 'paiementId' });
db.Operation.belongsTo(db.Paiement, { foreignKey: 'paiementId' });

// ========== RELATIONS PAIEMENT ==========
// Paiement appartient à un client ou fournisseur
db.Client.hasMany(db.Paiement, { foreignKey: 'clientId' });
db.Paiement.belongsTo(db.Client, { foreignKey: 'clientId' });
db.Fournisseur.hasMany(db.Paiement, { foreignKey: 'fournisseurId' });
db.Paiement.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });

// ========== RELATIONS MANY-TO-MANY ==========
// Magasin <-> Client
db.Magasin.belongsToMany(db.Client, {
  through: db.MagasinClient,
  foreignKey: 'magasinId',
  otherKey: 'clientId',
});

db.Client.belongsToMany(db.Magasin, {
  through: db.MagasinClient,
  foreignKey: 'clientId',
  otherKey: 'magasinId',
});

// Magasin <-> Fournisseur
db.Magasin.belongsToMany(db.Fournisseur, {
  through: db.MagasinFournisseur,
  foreignKey: 'magasinId',
  otherKey: 'fournisseurId',
});

db.Fournisseur.belongsToMany(db.Magasin, {
  through: db.MagasinFournisseur,
  foreignKey: 'fournisseurId',
  otherKey: 'magasinId',
});

// ========== RELATIONS PERMISSIONS & ROLES ==========
// Role <-> Permission
db.Role.belongsToMany(db.Permission, { 
  through: 'role_permissions', 
  foreignKey: 'role_id' 
});
db.Permission.belongsToMany(db.Role, { 
  through: 'role_permissions', 
  foreignKey: 'permission_id' 
});

// User <-> Role
db.Users.belongsToMany(db.Role, { 
  through: 'users_roles', 
  foreignKey: 'user_id' 
});
db.Role.belongsToMany(db.Users, { 
  through: 'users_roles', 
  foreignKey: 'role_id' 
});
//...............Nouvelle table Facture.......................................
db.Client.hasMany(db.Facture, { foreignKey: 'clientId' });
db.Facture.belongsTo(db.Client, { foreignKey: 'clientId' });

db.Magasin.hasMany(db.Facture, { foreignKey: 'magasinId' });
db.Facture.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

db.Fournisseur.hasMany(db.Facture, { foreignKey: 'fournisseurId' });
db.Facture.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });

db.Bon.hasMany(db.Facture, { foreignKey: 'bonId' });
db.Facture.belongsTo(db.Bon, { foreignKey: 'bonId' });

db.Panier.hasMany(db.Facture, { foreignKey: 'panierId' });
db.Facture.belongsTo(db.Panier, { foreignKey: 'panierId' });

/* db.Facture.hasMany(db.Paiement, { foreignKey: 'factureId' });
db.Paiement.belongsTo(db.Facture, { foreignKey: 'factureId' }); */

// ========== RELATIONS NOTIFICATION ==========
db.Users.hasMany(db.Notification, { foreignKey: 'userId', as: 'notifications' });
db.Notification.belongsTo(db.Users, { foreignKey: 'userId', as: 'user' });

//Exportation de l'objet `db` contenant Sequelize, la connexion, et tous les modèles
module.exports = db;