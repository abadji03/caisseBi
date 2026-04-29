const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const setupSwagger = require('./swagger');

dotenv.config();

const app = express();
app.use(cors());
// Configuration d'EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connexion à la base de données
const db = require('./models');
//const initAdmin = require('./controllers/initAdmin'); 

/* db.sequelize
  .sync({ alter: true })
  .then(() => console.log('Connexion réussie à la base de données.'))
  .catch((error) => console.error('Erreur de connexion DB :', error)); */

// Fonction pour réinitialiser complètement la base de données
/* const resetAndSyncDatabase = async () => {
  try {
    console.log('🔄 Début de la réinitialisation de la base de données...');
    
    // Désactiver les contraintes de clés étrangères
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Supprimer toutes les tables
    await db.sequelize.drop();
    console.log('✅ Toutes les tables ont été supprimées');
    
    // Réactiver les contraintes
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    // Recréer toutes les tables
    await db.sequelize.sync({ force: true });
    console.log('✅ Toutes les tables ont été recréées avec succès');
    
    // Vous pouvez ajouter ici des données initiales si nécessaire
    // await seedInitialData();
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation :', error);
  }
}; */

// Fonction pour synchroniser normalement (sans suppression)
const syncDatabase = async () => {
  try {
    console.log('🔄 Synchronisation de la base de données...');
    await db.sequelize.sync({ alter: true });
    //await db.sequelize.sync();
    console.log('✅ Connexion réussie à la base de données.');
    // ✅ IMPORTANT : créer admin après sync
    //await initAdmin();
  } catch (error) {
    console.error('❌ Erreur de connexion DB :', error);
  }
};

// Choisissez le mode :
// Mode 1: Réinitialisation complète (supprime et recrée tout)
//resetAndSyncDatabase();

// Mode 2: Synchronisation normale (préserve les données)
syncDatabase();


//Ensuite les body parsers (après routes avec upload)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Servir les images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Autres routes normales
//Routes AVANT express.json() si elles utilisent `multipart/form-data`
app.use('/api/produits', require('./routers/produits.routes'));
app.use('/api/structures', require('./routers/structure.routes'));
app.use('/api/magasins', require('./routers/magasins.routes'));
app.use('/api/fournisseurs', require('./routers/fournisseurs.routes'));
app.use('/api/categories-produits', require('./routers/categoriesProduits.routes'));
app.use('/api/clients', require('./routers/clients.routes'));
app.use('/api/stocks', require('./routers/stocks.routes'));
app.use('/api/reconciliations', require('./routers/reconciliations.routes'));
app.use('/api/transferts', require('./routers/transfert.routes'));
app.use('/api/categories', require('./routers/categorie.routes'));
app.use('/api/depenses', require('./routers/depense.routes'));
app.use('/api/reccetes', require('./routers/recette.routes'));
app.use('/api/historiques-reconciliations', require('./routers/historiqueReconciliation.routes'));
app.use(
  '/api/historique-actions-utilisateur',
  require('./routers/historiqueActionsUtilisateur.routes')
);
app.use('/api/historiques-connexions', require('./routers/historiqueConnexions.routes'));
app.use('/api/historiques-connexions-actions', require('./routers/historiqueConnexionAction.routes'));
app.use('/api/bons', require('./routers/bon.routes'));
app.use('/api/paniers', require('./routers/panier.routes'));
app.use('/api/articles-panier', require('./routers/articlePanier.routes'));
app.use('/api/operations', require('./routers/operation.routes'));
app.use('/api/paiements', require('./routers/paiement.routes'));
app.use('/api/users', require('./routers/users.routes'));
app.use('/api/permissions', require('./routers/permission.routes'));
app.use('/api/roles', require('./routers/role.routes'));
app.use('/api/mouvements-stock', require('./routers/mouvementStock.routes'));
app.use('/api/user-roles', require('./routers/user-role.routes'));
app.use('/api/role-permissions', require('./routers/role-permission.routes'));
app.use('/api/auth', require('./routers/auth.routes'));
app.use('/api/bons-complet', require('./routers/bonComplet.routes')); 
app.use('/api/historique-status', require('./routers/historiqueStatut.routes'));
app.use('/api/categories', require('./routers/categorie.routes'));
app.use('/api/depenses', require('./routers/depense.routes'));
app.use('/api/recettes', require('./routers/recette.routes'));
app.use('/api/kpi-caisse', require('./routers/kpiCaisse.routes'));
app.use('/api/rapport-financier', require('./routers/rapportFinancier.routes'));
app.use('/api/rapport-stock', require('./routers/rapportsStocks.routes'));
app.use('/api/logs', require('./routers/logger.routes'));
app.use('/api/factures', require('./routers/facture.routes'));
app.use('/api/imports', require('./routers/import.routes'));




// Test route
app.get('/', (req, res) => {
  res.send('API Gestion de caisse opérationnelle !');
});

// Swagger
setupSwagger(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
