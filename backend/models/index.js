//Init de Sequelize
//Importation du module Sequelize
const Sequelize = require('sequelize');

//Importation de la configuration de la base de données (définie dans config/db.js)
const sequelize = require('../config/db');

//Création d’un objet qui contiendra tous les modèles et la connexion Sequelize
const db = {};

//On ajoute Sequelize (la classe) et l'instance sequelize (la connexion) dans l'objet `db`
db.Sequelize = Sequelize;
db.sequelize = sequelize;

/* Chargement des modèles */

//Chargement et initialisation du modèle Structure
// On passe l'instance sequelize et le constructeur Sequelize à chaque modèle
db.Structure = require('./structure.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Users
db.Users = require('./user.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Magasins
db.Magasin = require('./magasin.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Produits
db.Produit = require('./produit.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Fournisseurs
db.Fournisseur = require('./fournisseur.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle CategorieProduit
db.CategoriesProduits = require('./categorieProduit.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Client
db.Client = require('./client.model')(sequelize, Sequelize);
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
db.permission = require('./permission.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Role
db.role = require('./role.model')(sequelize, Sequelize);
db.HistoriqueStatut = require('./historiqueStatut.model')(sequelize, Sequelize);


/* Définition des relations entre les modèles */

//Une structure peut avoir plusieurs utilisateurs (hasMany = 1:N)
db.Structure.hasMany(db.Users, { foreignKey: 'structure_id' });
// Un utilisateur appartient à une seule structure (belongsTo = N:1)
db.Users.belongsTo(db.Structure, { foreignKey: 'structure_id' });
db.Structure.hasMany(db.Users, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Users.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Relation entre Structure et magasins
db.Structure.hasMany(db.Magasin, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Magasin.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Relation entre Users et Magasins
db.Users.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
db.Magasin.hasMany(db.Users, { foreignKey: 'magasinId' });

//Relations Produits, Fournisseur et CatégorieProduits et Structure
// Produit appartient à une Structure
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
db.Produit.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});
// Produit appartient à une catégorie
db.CategoriesProduits.hasMany(db.Produit, { foreignKey: 'categorieId' });
db.Produit.belongsTo(db.CategoriesProduits, { foreignKey: 'categorieId' });
// Produit appartient à un fournisseur
db.Fournisseur.hasMany(db.Produit, { foreignKey: 'fournisseurId' });
db.Produit.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });
// les Produit sont enregistrés par un utilisateur
db.Users.hasMany(db.Produit, { foreignKey: 'agentId' });
db.Produit.belongsTo(db.Users, { foreignKey: 'agentId' });
// Structure a plusieurs fournisseurs
db.Structure.hasMany(db.Fournisseur, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Fournisseur.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});
// Magasin a plusieurs fournisseurs
db.Magasin.hasMany(db.Fournisseur, {
  foreignKey: 'magasinId',
});
db.Fournisseur.belongsTo(db.Magasin, {
  foreignKey: 'magasinId',
});

//Relations Structure, Clients et Magasins
// Structure a plusieurs clients
db.Structure.hasMany(db.Client, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Client.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

// Magasin a plusieurs clients
db.Magasin.hasMany(db.Client, {
  foreignKey: 'magasinId',
});
db.Client.belongsTo(db.Magasin, {
  foreignKey: 'magasinId',
});

//Relation entre Structure, stock et produit
// Produit → Stock
db.Produit.hasMany(db.Stock, { foreignKey: 'produitId' });
db.Stock.belongsTo(db.Produit, { foreignKey: 'produitId' });

// Magasin → Stock
db.Magasin.hasMany(db.Stock, { foreignKey: 'magasinId' });
db.Stock.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Structure → Stock
db.Structure.hasMany(db.Stock, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Stock.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

//Rélations entre Mouveùent_Stock et les tables auxquelles elle est liée
// Liens structure
db.Structure.hasMany(db.MouvementStock, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.MouvementStock.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});
// Liens produits
db.Produit.hasMany(db.MouvementStock, { foreignKey: 'produitId' });
db.MouvementStock.belongsTo(db.Produit, { foreignKey: 'produitId' });

// Liens magasin
db.Magasin.hasMany(db.MouvementStock, { foreignKey: 'magasinId' });
db.MouvementStock.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

// Liens stock
db.Stock.hasMany(db.MouvementStock, { foreignKey: 'stockId' });
db.MouvementStock.belongsTo(db.Stock, { foreignKey: 'stockId' });

// Liens utilisateur (acteur)
db.Users.hasMany(db.MouvementStock, { foreignKey: 'acteurId' });
db.MouvementStock.belongsTo(db.Users, { foreignKey: 'acteurId' });

//Relations entre Reconciliation et Produit
db.Produit.hasMany(db.Reconciliation, { foreignKey: 'produitId' });
db.Reconciliation.belongsTo(db.Produit, { foreignKey: 'produitId' });

db.Users.hasMany(db.Reconciliation, { foreignKey: 'responsable' });
db.Reconciliation.belongsTo(db.Users, { foreignKey: 'responsable' });

db.Structure.hasMany(db.Reconciliation, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.Reconciliation.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

//Relationentre Transfert et les tables auxquelles elle est liée
// Produit
db.Produit.hasMany(db.Transfert, { foreignKey: 'produitId' });
db.Transfert.belongsTo(db.Produit, { foreignKey: 'produitId' });

// Magasins
db.Magasin.hasMany(db.Transfert, { foreignKey: 'magasinSource' });
db.Magasin.hasMany(db.Transfert, { foreignKey: 'magasinDestination' });

// Structure
db.Structure.hasMany(db.Transfert, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Transfert.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

// Users
db.Users.hasMany(db.Transfert, { foreignKey: 'agentResponsable' });
db.Users.hasMany(db.Transfert, { foreignKey: 'agentValidation' });

// Mouvements
db.MouvementStock.hasMany(db.Transfert, { foreignKey: 'mouvementSortieId' });
db.MouvementStock.hasMany(db.Transfert, { foreignKey: 'mouvementEntreeId' });

//Relation entre Catégorie (pour les dépenses et recettes) et structure
db.Structure.hasMany(db.Categorie, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Categorie.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

//Relation entre Dépenses et les autres tables
db.Categorie.hasMany(db.Depense, { foreignKey: 'categoryId' });
db.Depense.belongsTo(db.Categorie, { foreignKey: 'categoryId' });
db.Magasin.hasMany(db.Depense, { foreignKey: 'magasinId' });
db.Depense.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
db.Users.hasMany(db.Depense, { foreignKey: 'agentId' });
db.Depense.belongsTo(db.Users, { foreignKey: 'agentId' });
db.Structure.hasMany(db.Depense, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Depense.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

//Relations entre Recette et les autres tables
db.Categorie.hasMany(db.Recette, { foreignKey: 'categoryId' });
db.Recette.belongsTo(db.Categorie, { foreignKey: 'categoryId' });
db.Magasin.hasMany(db.Recette, { foreignKey: 'magasinId' });
db.Recette.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
db.Users.hasMany(db.Recette, { foreignKey: 'agentId' });
db.Recette.belongsTo(db.Users, { foreignKey: 'agentId' });
db.Structure.hasMany(db.Recette, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Recette.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

//Relation entre HistoriqueReconciliation et les autres
db.Reconciliation.hasMany(db.HistoriqueReconciliation, { foreignKey: 'reconciliationId' });
db.HistoriqueReconciliation.belongsTo(db.Reconciliation, { foreignKey: 'reconciliationId' });
db.Structure.hasMany(db.HistoriqueReconciliation, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.HistoriqueReconciliation.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

//Relation entre HistoriqueActionUtilisateur et les autres tables
db.Users.hasMany(db.HistoriqueActionsUtilisateur, { foreignKey: 'userId' });
db.HistoriqueActionsUtilisateur.belongsTo(db.Users, { foreignKey: 'userId' });

//Relation entre HistoriqueConnexion et Users
db.Users.hasMany(db.HistoriqueConnexions, { foreignKey: 'userId' });
db.HistoriqueConnexions.belongsTo(db.Users, { foreignKey: 'userId' });

//Relation entre Bon et les autres tables
db.Fournisseur.hasMany(db.Bon, { foreignKey: 'fournisseurId' });
db.Bon.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });
db.Client.hasMany(db.Bon, { foreignKey: 'clientId' });
db.Bon.belongsTo(db.Client, { foreignKey: 'clientId' });
db.Users.hasMany(db.Bon, { foreignKey: 'agentId' });
db.Bon.belongsTo(db.Users, { foreignKey: 'agentId' });
db.Magasin.hasMany(db.Bon, { foreignKey: 'magasinId' });
db.Bon.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
db.Structure.hasMany(db.Bon, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Bon.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

//Relation entre Panier et les autres tables
db.Client.hasMany(db.Panier, { foreignKey: 'clientId' });
db.Panier.belongsTo(db.Client, { foreignKey: 'clientId' });
db.Bon.hasOne(db.Panier, { foreignKey: 'bonId' });
db.Panier.belongsTo(db.Bon, { foreignKey: 'bonId' });
db.Magasin.hasMany(db.Panier, { foreignKey: 'magasinId' });
db.Panier.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
db.Users.hasMany(db.Panier, { foreignKey: 'agentId' });
db.Panier.belongsTo(db.Users, { foreignKey: 'agentId' });
db.Structure.hasMany(db.Panier, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Panier.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

//Relation entre ArticlePanier et les autres tables
db.Panier.hasMany(db.ArticlePanier, { foreignKey: 'panierId' });
db.ArticlePanier.belongsTo(db.Panier, { foreignKey: 'panierId' });
db.Produit.hasMany(db.ArticlePanier, { foreignKey: 'produitId' });
db.ArticlePanier.belongsTo(db.Produit, { foreignKey: 'produitId' });
db.Stock.hasMany(db.ArticlePanier, { foreignKey: 'stockId' });
db.ArticlePanier.belongsTo(db.Stock, { foreignKey: 'stockId' });
db.Structure.hasMany(db.ArticlePanier, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure',
});
db.ArticlePanier.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure',
});

//Relations entre Operation et les autres
db.Client.hasMany(db.Operation, { foreignKey: 'clientId' });
db.Operation.belongsTo(db.Client, { foreignKey: 'clientId' });
db.Fournisseur.hasMany(db.Operation, { foreignKey: 'fournisseurId' });
db.Operation.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });
db.Users.hasMany(db.Operation, { foreignKey: 'agentId' });
db.Operation.belongsTo(db.Users, { foreignKey: 'agentId' });
db.Bon.hasMany(db.Operation, { foreignKey: 'bonId' });
db.Operation.belongsTo(db.Bon, { foreignKey: 'bonId' });
db.Paiement.hasMany(db.Operation, { foreignKey: 'paiementId' });
db.Operation.belongsTo(db.Paiement, { foreignKey: 'paiementId' });
db.Magasin.hasMany(db.Operation, { foreignKey: 'magasinId' });
db.Operation.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
db.Structure.hasMany(db.Operation, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Operation.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

//Relations entre Paiement et les autres tables
db.Client.hasMany(db.Paiement, { foreignKey: 'clientId' });
db.Paiement.belongsTo(db.Client, { foreignKey: 'clientId' });

db.Fournisseur.hasMany(db.Paiement, { foreignKey: 'fournisseurId' });
db.Paiement.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });

db.Bon.hasMany(db.Paiement, { foreignKey: 'bonId' });
db.Paiement.belongsTo(db.Bon, { foreignKey: 'bonId' });

db.Panier.hasMany(db.Paiement, { foreignKey: 'panierId' });
db.Paiement.belongsTo(db.Panier, { foreignKey: 'panierId' });

db.Magasin.hasMany(db.Paiement, { foreignKey: 'magasinId' });
db.Paiement.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

db.Users.hasMany(db.Paiement, { foreignKey: 'agentId' });
db.Paiement.belongsTo(db.Users, { foreignKey: 'agentId' });

db.Structure.hasMany(db.Paiement, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Paiement.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

//Relations entre Permission, Role et les autres
// role <-> permission
db.role.belongsToMany(db.permission, { through: 'role_permissions', foreignKey: 'role_id' });
db.permission.belongsToMany(db.role, { through: 'role_permissions', foreignKey: 'permission_id' });

// user <-> role
db.Users.belongsToMany(db.role, { through: 'users_roles', foreignKey: 'user_id' });
db.role.belongsToMany(db.Users, { through: 'users_roles', foreignKey: 'role_id' });

// Relation Bon -> HistoriqueStatut
db.Bon.hasMany(db.HistoriqueStatut, {
  foreignKey: 'bonId',
  as: 'historiques'
});
db.HistoriqueStatut.belongsTo(db.Bon, {
  foreignKey: 'bonId',
  as: 'bons'
});

// Relation Agent -> HistoriqueStatut
db.Users.hasMany(db.HistoriqueStatut, {
  foreignKey: 'agentId',
  as: 'historiques'
});
db.HistoriqueStatut.belongsTo(db.Users, {
  foreignKey: 'agentId',
  as: 'users'
});
//Exportation de l’objet `db` contenant Sequelize, la connexion, et tous les modèles
module.exports = db;
