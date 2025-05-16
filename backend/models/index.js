
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

//Chargement et initialisation du modèle Structure
// On passe l'instance sequelize et le constructeur Sequelize à chaque modèle
db.Structure = require('./structure.model')(sequelize, Sequelize);

//Chargement et initialisation du modèle Users
db.Users = require('./user.model')(sequelize, Sequelize);

//Chargement et initialisation du modèle Magasins
db.Magasin = require("./magasin.model")(sequelize, Sequelize);

//Définition de l'association entre les modèles
//Une structure peut avoir plusieurs utilisateurs (hasMany = 1:N)
db.Structure.hasMany(db.Users, { foreignKey: 'structure_id' });

// Un utilisateur appartient à une seule structure (belongsTo = N:1)
db.Users.belongsTo(db.Structure, { foreignKey: 'structure_id' });

// Relation avec Structure
db.Structure.hasMany(db.Magasin, {
  foreignKey: 'code_structure',
  sourceKey: 'code_structure'
});
db.Magasin.belongsTo(db.Structure, {
  foreignKey: 'code_structure',
  targetKey: 'code_structure'
});

// Relation avec Users
db.Users.hasMany(db.Magasin, { foreignKey: 'responsableId' });
db.Magasin.belongsTo(db.Users, { foreignKey: 'responsableId' });

//Exportation de l’objet `db` contenant Sequelize, la connexion, et tous les modèles
module.exports = db;

