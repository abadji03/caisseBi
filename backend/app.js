// Importation des dépendances de base
const express = require('express');
const path = require('path'); 
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

// Chargement des variables d’environnement depuis le fichier .env
dotenv.config();

// Initialisation de l’application Express
const app = express();

// Middleware pour autoriser les requêtes CORS (utile pour les requêtes frontend ↔ backend)
app.use(cors());

// Middleware pour parser les données JSON envoyées dans le body des requêtes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connexion à la base de données via Sequelize
const db = require('./models');

// Synchronisation des modèles Sequelize avec la base de données
db.sequelize.sync({ alter: true }) // alter: true = ajuste les colonnes sans tout supprimer
  .then(() => {
    console.log("Connexion réussie à la base de données et synchronisation des modèles.");
  })
  .catch((error) => {
    console.error("Erreur lors de la connexion à la base de données :", error);
  });

// Routes principales
// Pour servir les fichiers uploadés statiquement
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const structureRoutes = require('./routers/structure.routes');
app.use('/api/structures', structureRoutes);
app.use('/api/magasins', require('./routers/magasins.routes'));

// Route de base pour tester si le serveur fonctionne
app.get('/', (req, res) => {
  res.send('API Gestion de caisse opérationnelle !');
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
