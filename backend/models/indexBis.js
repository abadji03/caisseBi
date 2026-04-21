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
db.permission = require('./permission.model')(sequelize, Sequelize);
//Chargement et initialisation du modèle Role
db.role = require('./role.model')(sequelize, Sequelize);
db.HistoriqueStatut = require('./historiqueStatut.model')(sequelize, Sequelize);

db.MagasinFournisseur = require('./magasinFournisseur.model')(sequelize, Sequelize);
db.MagasinClient = require('./magasinClient.model')(sequelize, Sequelize);



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
/* db.Magasin.hasMany(db.Fournisseur, {
  foreignKey: 'magasinId',
});
db.Fournisseur.belongsTo(db.Magasin, {
  foreignKey: 'magasinId',
}); */

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
/* db.Magasin.hasMany(db.Client, {
  foreignKey: 'magasinId',
});
db.Client.belongsTo(db.Magasin, {
  foreignKey: 'magasinId',
}); */

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

db.Magasin.hasMany(db.Reconciliation, { foreignKey: 'magasinId' });
db.Reconciliation.belongsTo(db.Magasin, { foreignKey: 'magasinId' });

db.MouvementStock.belongsTo(db.Reconciliation, { foreignKey: 'reconciliationId' });
db.Reconciliation.hasMany(db.MouvementStock, { foreignKey: 'reconciliationId' });

db.MouvementStock.belongsTo(db.Transfert, { foreignKey: 'transfertId' });
db.Transfert.hasMany(db.MouvementStock, { foreignKey: 'transfertId' });

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
db.Magasin.hasMany(db.Transfert, { foreignKey: 'magasinSource', as: 'TransfertsSortants' });
db.Magasin.hasMany(db.Transfert, { foreignKey: 'magasinDestination',as: 'TransfertsEntrants' });

db.Transfert.belongsTo(db.Magasin, {
  foreignKey: 'magasinSource',
  as: 'MagasinSource'
});

db.Transfert.belongsTo(db.Magasin, {
  foreignKey: 'magasinDestination',
  as: 'MagasinDestination'
});

// Structure
db.Structure.hasMany(db.Transfert, { foreignKey: 'code_structure', sourceKey: 'code_structure' });
db.Transfert.belongsTo(db.Structure, { foreignKey: 'code_structure', targetKey: 'code_structure' });

// Users
db.Users.hasMany(db.Transfert, { foreignKey: 'agentResponsable', as:'TransfertsResponsables' });
db.Users.hasMany(db.Transfert, { foreignKey: 'agentValidation', as:'TransfertsValides' });
// Responsable du transfert
db.Transfert.belongsTo(db.Users, {
  foreignKey: 'agentResponsable',
  as: 'Responsable'
});

// Validateur du transfert
db.Transfert.belongsTo(db.Users, {
  foreignKey: 'agentValidation',
  as: 'Validateur'
});

// Mouvements
//db.MouvementStock.hasMany(db.Transfert, { foreignKey: 'mouvementSortieId' });
//db.MouvementStock.hasMany(db.Transfert, { foreignKey: 'mouvementEntreeId' });

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

// Associations Many-to-Many entre Magasin et Client via table de liaison
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

// Associations Many-to-Many entre Magasin et Fournisseur via table de liaison
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

/* db.MagasinClient.associate = (db) => {
  db.MagasinClient.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
  db.MagasinClient.belongsTo(db.Client, { foreignKey: 'clientId' });
};

db.MagasinFournisseur.associate = (db) => {
  db.MagasinFournisseur.belongsTo(db.Magasin, { foreignKey: 'magasinId' });
  db.MagasinFournisseur.belongsTo(db.Fournisseur, { foreignKey: 'fournisseurId' });
}; */

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

/* INSERT INTO categories (name, description, type, is_active, numero_e, created_at, updated_at) VALUES

-- =========================
-- 💰 RECETTES
-- =========================

-- VENTES
('Vente de produits', 'Revenus issus de la vente de produits', 'RECETTE', true, 1, NOW(), NOW()),
('Vente de services', 'Revenus issus de prestations de services', 'RECETTE', true, 2, NOW(), NOW()),
('Vente mixte', 'Vente combinée produits et services', 'RECETTE', true, 3, NOW(), NOW()),

-- CLIENTS
('Paiement client', 'Encaissement de facture client', 'RECETTE', true, 4, NOW(), NOW()),
('Acompte client', 'Avance reçue d’un client', 'RECETTE', true, 5, NOW(), NOW()),
('Règlement partiel client', 'Paiement partiel client', 'RECETTE', true, 6, NOW(), NOW()),
('Paiement client en retard', 'Encaissement tardif client', 'RECETTE', true, 7, NOW(), NOW()),

-- AUTRES RECETTES
('Frais de livraison facturés', 'Frais de livraison payés par client', 'RECETTE', true, 8, NOW(), NOW()),
('Frais de service', 'Frais supplémentaires facturés', 'RECETTE', true, 9, NOW(), NOW()),
('Commissions gagnées', 'Revenus de commissions', 'RECETTE', true, 10, NOW(), NOW()),

-- FINANCIER
('Intérêts bancaires', 'Revenus générés par comptes bancaires', 'RECETTE', true, 11, NOW(), NOW()),
('Gains de change', 'Bénéfices sur conversion de devise', 'RECETTE', true, 12, NOW(), NOW()),
('Revenus d’investissement', 'Revenus liés aux investissements', 'RECETTE', true, 13, NOW(), NOW()),

-- EXCEPTIONNEL
('Don reçu', 'Aide financière ou don', 'RECETTE', true, 14, NOW(), NOW()),
('Remboursement fournisseur', 'Remboursement reçu d’un fournisseur', 'RECETTE', true, 15, NOW(), NOW()),
('Avoir récupéré', 'Avoir récupéré auprès d’un fournisseur', 'RECETTE', true, 16, NOW(), NOW()),
('Correction caisse positive', 'Ajustement positif de caisse', 'RECETTE', true, 17, NOW(), NOW()),


-- =========================
-- 💸 DEPENSES
-- =========================

-- STOCK
('Achat marchandises', 'Achat de produits pour stock', 'DEPENSE', true, 18, NOW(), NOW()),
('Réapprovisionnement stock', 'Ajout de stock', 'DEPENSE', true, 19, NOW(), NOW()),
('Transport marchandise', 'Transport des marchandises', 'DEPENSE', true, 20, NOW(), NOW()),
('Frais de douane', 'Taxes douanières', 'DEPENSE', true, 21, NOW(), NOW()),

-- OPÉRATIONNEL
('Loyer', 'Paiement du local', 'DEPENSE', true, 22, NOW(), NOW()),
('Électricité', 'Facture électricité', 'DEPENSE', true, 23, NOW(), NOW()),
('Eau', 'Facture eau', 'DEPENSE', true, 24, NOW(), NOW()),
('Internet', 'Connexion internet', 'DEPENSE', true, 25, NOW(), NOW()),
('Téléphone', 'Frais téléphoniques', 'DEPENSE', true, 26, NOW(), NOW()),

-- RH
('Salaires', 'Paiement des employés', 'DEPENSE', true, 27, NOW(), NOW()),
('Primes', 'Bonus employés', 'DEPENSE', true, 28, NOW(), NOW()),
('Avances employés', 'Avances sur salaire', 'DEPENSE', true, 29, NOW(), NOW()),
('Charges sociales', 'Cotisations sociales', 'DEPENSE', true, 30, NOW(), NOW()),

-- FOURNISSEURS
('Paiement fournisseur', 'Règlement fournisseur', 'DEPENSE', true, 31, NOW(), NOW()),
('Acompte fournisseur', 'Avance fournisseur', 'DEPENSE', true, 32, NOW(), NOW()),

-- LOGISTIQUE
('Carburant', 'Frais carburant', 'DEPENSE', true, 33, NOW(), NOW()),
('Entretien véhicule', 'Maintenance véhicule', 'DEPENSE', true, 34, NOW(), NOW()),
('Livraison', 'Frais de livraison', 'DEPENSE', true, 35, NOW(), NOW()),

-- ADMIN
('Fournitures bureau', 'Matériel bureau', 'DEPENSE', true, 36, NOW(), NOW()),
('Impression', 'Frais impression', 'DEPENSE', true, 37, NOW(), NOW()),
('Logiciels et abonnements', 'Outils et SaaS', 'DEPENSE', true, 38, NOW(), NOW()),

-- FINANCIER
('Frais bancaires', 'Frais de banque', 'DEPENSE', true, 39, NOW(), NOW()),
('Commissions mobile money', 'Frais paiement mobile', 'DEPENSE', true, 40, NOW(), NOW()),
('Intérêts crédit', 'Intérêts sur emprunts', 'DEPENSE', true, 41, NOW(), NOW()),

-- INVESTISSEMENT
('Achat matériel', 'Équipement', 'DEPENSE', true, 42, NOW(), NOW()),
('Achat équipement', 'Investissement matériel', 'DEPENSE', true, 43, NOW(), NOW()),

-- TAXES
('TVA payée', 'Taxe TVA', 'DEPENSE', true, 44, NOW(), NOW()),
('Impôt société', 'Impôt entreprise', 'DEPENSE', true, 45, NOW(), NOW()),
('Taxes locales', 'Taxes diverses', 'DEPENSE', true, 46, NOW(), NOW()),

-- PERTES
('Produits périmés', 'Perte stock périssable', 'DEPENSE', true, 47, NOW(), NOW()),
('Casse ou perte', 'Produits endommagés', 'DEPENSE', true, 48, NOW(), NOW()),
('Vol', 'Perte par vol', 'DEPENSE', true, 49, NOW(), NOW()),

-- EXCEPTIONNEL
('Don effectué', 'Don versé', 'DEPENSE', true, 50, NOW(), NOW()),
('Pénalité', 'Amendes et pénalités', 'DEPENSE', true, 51, NOW(), NOW()),
('Correction caisse négative', 'Ajustement négatif de caisse', 'DEPENSE', true, 52, NOW(), NOW());

-- ============================================
-- MISE À JOUR DE LA COLONNE CODE
-- Basée sur les noms des catégories existantes
-- ============================================

UPDATE categorie SET code = 'VENTE_PRODUITS' WHERE name = 'Vente de produits' AND code = 'AUTRE';
UPDATE categorie SET code = 'VENTE_SERVICES' WHERE name = 'Vente de services' AND code = 'AUTRE';
UPDATE categorie SET code = 'VENTE_MIXTE' WHERE name = 'Vente mixte' AND code = 'AUTRE';
UPDATE categorie SET code = 'PAIEMENT_CLIENT' WHERE name = 'Paiement client' AND code = 'AUTRE';
UPDATE categorie SET code = 'ACOMPTE_CLIENT' WHERE name = 'Acompte client' AND code = 'AUTRE';
UPDATE categorie SET code = 'REGLEMENT_PARTIEL_CLIENT' WHERE name = 'Règlement partiel client' AND code = 'AUTRE';
UPDATE categorie SET code = 'PAIEMENT_CLIENT_RETARD' WHERE name = 'Paiement client en retard' AND code = 'AUTRE';
UPDATE categorie SET code = 'FRAIS_LIVRAISON' WHERE name = 'Frais de livraison facturés' AND code = 'AUTRE';
UPDATE categorie SET code = 'FRAIS_SERVICE' WHERE name = 'Frais de service' AND code = 'AUTRE';
UPDATE categorie SET code = 'COMMISSIONS' WHERE name = 'Commissions gagnées' AND code = 'AUTRE';
UPDATE categorie SET code = 'INTERETS_BANCAIRES' WHERE name = 'Intérêts bancaires' AND code = 'AUTRE';
UPDATE categorie SET code = 'GAINS_CHANGE' WHERE name = 'Gains de change' AND code = 'AUTRE';
UPDATE categorie SET code = 'REVENUS_INVESTISSEMENT' WHERE name = 'Revenus d’investissement' AND code = 'AUTRE';
UPDATE categorie SET code = 'DON_REÇU' WHERE name = 'Don reçu' AND code = 'AUTRE';
UPDATE categorie SET code = 'REMBOURSEMENT_FOURNISSEUR' WHERE name = 'Remboursement fournisseur' AND code = 'AUTRE';
UPDATE categorie SET code = 'AVOIR_RECUPERE' WHERE name = 'Avoir récupéré' AND code = 'AUTRE';
UPDATE categorie SET code = 'CORRECTION_CAISSE_POSITIVE' WHERE name = 'Correction caisse positive' AND code = 'AUTRE';
UPDATE categorie SET code = 'ACHAT_MARCHANDISES' WHERE name = 'Achat marchandises' AND code = 'AUTRE';
UPDATE categorie SET code = 'REAPPROVISIONNEMENT_STOCK' WHERE name = 'Réapprovisionnement stock' AND code = 'AUTRE';
UPDATE categorie SET code = 'TRANSPORT_MARCHANDISE' WHERE name = 'Transport marchandise' AND code = 'AUTRE';
UPDATE categorie SET code = 'FRAIS_DOUANE' WHERE name = 'Frais de douane' AND code = 'AUTRE';
UPDATE categorie SET code = 'LOYER' WHERE name = 'Loyer' AND code = 'AUTRE';
UPDATE categorie SET code = 'ELECTRICITE' WHERE name = 'Électricité' AND code = 'AUTRE';
UPDATE categorie SET code = 'EAU' WHERE name = 'Eau' AND code = 'AUTRE';
UPDATE categorie SET code = 'INTERNET' WHERE name = 'Internet' AND code = 'AUTRE';
UPDATE categorie SET code = 'TELEPHONE' WHERE name = 'Téléphone' AND code = 'AUTRE';
UPDATE categorie SET code = 'SALAIRES' WHERE name = 'Salaires' AND code = 'AUTRE';
UPDATE categorie SET code = 'PRIMES' WHERE name = 'Primes' AND code = 'AUTRE';
UPDATE categorie SET code = 'AVANCES_EMPLOYES' WHERE name = 'Avances employés' AND code = 'AUTRE';
UPDATE categorie SET code = 'CHARGES_SOCIALES' WHERE name = 'Charges sociales' AND code = 'AUTRE';
UPDATE categorie SET code = 'PAIEMENT_FOURNISSEUR' WHERE name = 'Paiement fournisseur' AND code = 'AUTRE';
UPDATE categorie SET code = 'ACOMPTE_FOURNISSEUR' WHERE name = 'Acompte fournisseur' AND code = 'AUTRE';
UPDATE categorie SET code = 'CARBURANT' WHERE name = 'Carburant' AND code = 'AUTRE';
UPDATE categorie SET code = 'ENTRETIEN_VEHICULE' WHERE name = 'Entretien véhicule' AND code = 'AUTRE';
UPDATE categorie SET code = 'LIVRAISON' WHERE name = 'Livraison' AND code = 'AUTRE';
UPDATE categorie SET code = 'FOURNITURES_BUREAU' WHERE name = 'Fournitures bureau' AND code = 'AUTRE';
UPDATE categorie SET code = 'IMPRESSION' WHERE name = 'Impression' AND code = 'AUTRE';
UPDATE categorie SET code = 'LOGICIELS_ABONNEMENTS' WHERE name = 'Logiciels et abonnements' AND code = 'AUTRE';
UPDATE categorie SET code = 'FRAIS_BANCAIRES' WHERE name = 'Frais bancaires' AND code = 'AUTRE';
UPDATE categorie SET code = 'COMMISSIONS_MOBILE_MONEY' WHERE name = 'Commissions mobile money' AND code = 'AUTRE';
UPDATE categorie SET code = 'INTERETS_CREDIT' WHERE name = 'Intérêts crédit' AND code = 'AUTRE';
UPDATE categorie SET code = 'ACHAT_MATERIEL' WHERE name = 'Achat matériel' AND code = 'AUTRE';
UPDATE categorie SET code = 'ACHAT_EQUIPEMENT' WHERE name = 'Achat équipement' AND code = 'AUTRE';
UPDATE categorie SET code = 'TVA_PAYEE' WHERE name = 'TVA payée' AND code = 'AUTRE';
UPDATE categorie SET code = 'IMPOT_SOCIETE' WHERE name = 'Impôt société' AND code = 'AUTRE';
UPDATE categorie SET code = 'TAXES_LOCALES' WHERE name = 'Taxes locales' AND code = 'AUTRE';
UPDATE categorie SET code = 'PRODUITS_PERIMES' WHERE name = 'Produits périmés' AND code = 'AUTRE';
UPDATE categorie SET code = 'CASSE_PERTE' WHERE name = 'Casse ou perte' AND code = 'AUTRE';
UPDATE categorie SET code = 'VOL' WHERE name = 'Vol' AND code = 'AUTRE';
UPDATE categorie SET code = 'DON_EFFECTUE' WHERE name = 'Don effectué' AND code = 'AUTRE';
UPDATE categorie SET code = 'PENALITE' WHERE name = 'Pénalité' AND code = 'AUTRE';
UPDATE categorie SET code = 'CORRECTION_CAISSE_NEGATIVE' WHERE name = 'Correction caisse négative' AND code = 'AUTRE';

INSERT INTO roles (nom, created_at, updated_at) VALUES
('Administrateur Général', NOW(), NOW()),
('Administrateur', NOW(), NOW()),
('Administrateur secondaire', NOW(), NOW()),
('Gérant', NOW(), NOW()),
('Caissier', NOW(), NOW()),
('Employé', NOW(), NOW());




INSERT INTO permissions (nom, niveau, type, created_at, updated_at) VALUES

-- USERS
('Voir les utilisateurs', 1, 'view_only', NOW(), NOW()),
('Modifier un utilisateur', 2, 'edit', NOW(), NOW()),
('Supprimer un utilisateur', 3, 'delete', NOW(), NOW()),
('Gérer les utilisateurs', 4, 'manage_users', NOW(), NOW()),
('Gérer les rôles', 4, 'manage_users', NOW(), NOW()),

-- RAPPORTS
('Voir les rapports', 1, 'view_only', NOW(), NOW()),
('Exporter les rapports', 2, 'edit', NOW(), NOW()),

-- VENTES
('Voir les ventes', 1, 'view_only', NOW(), NOW()),
('Modifier les ventes', 2, 'edit', NOW(), NOW()),
('Gérer les ventes', 3, 'edit', NOW(), NOW()),

-- CAISSE
('Accès à la caisse', 1, 'view_only', NOW(), NOW()),
('Gérer la caisse', 3, 'edit', NOW(), NOW()),

-- CLIENTS
('Voir les clients', 1, 'view_only', NOW(), NOW()),
('Modifier les clients', 2, 'edit', NOW(), NOW()),
('Gérer les clients', 3, 'edit', NOW(), NOW()),

-- STOCK
('Voir le stock', 1, 'view_only', NOW(), NOW()),
('Modifier le stock', 2, 'edit', NOW(), NOW()),
('Gérer le stock', 3, 'edit', NOW(), NOW()),

-- PRODUITS
('Voir les produits', 1, 'view_only', NOW(), NOW()),
('Modifier les produits', 2, 'edit', NOW(), NOW()),
('Gérer les produits', 3, 'edit', NOW(), NOW()),

-- FOURNISSEURS
('Voir les fournisseurs', 1, 'view_only', NOW(), NOW()),
('Modifier les fournisseurs', 2, 'edit', NOW(), NOW()),
('Gérer les fournisseurs', 3, 'edit', NOW(), NOW()),

-- FINANCES
('Voir les finances', 1, 'view_only', NOW(), NOW()),
('Modifier les finances', 2, 'edit', NOW(), NOW()),
('Gérer les finances', 3, 'edit', NOW(), NOW()),

-- MAGASINS
('Voir les magasins', 1, 'view_only', NOW(), NOW()),
('Modifier les magasins', 2, 'edit', NOW(), NOW()),
('Gérer les magasins', 3, 'edit', NOW(), NOW()),

-- PARAMÈTRES
('Accès aux configurations', 4, 'manage_settings', NOW(), NOW()),

-- FULL ACCESS
('Accès total', 5, 'full_access', NOW(), NOW());
 */
//Exportation de l’objet `db` contenant Sequelize, la connexion, et tous les modèles
module.exports = db;
