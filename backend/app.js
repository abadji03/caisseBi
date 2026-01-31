const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const setupSwagger = require('./swagger');


dotenv.config();

const app = express();
app.use(cors());

// Connexion à la base de données
const db = require('./models');
db.sequelize
  .sync({ alter: true })
  .then(() => console.log('Connexion réussie à la base de données.'))
  .catch((error) => console.error('Erreur de connexion DB :', error));

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
