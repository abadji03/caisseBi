const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false,
  define: {
    engine: 'InnoDB',
    freezeTableName: true, // Garde le nom exact du modèle
    underscored: true,     // Utilise snake_case pour les colonnes
    // Pas de tableName ici - laissez Sequelize utiliser le nom du modèle
  }
});

module.exports = sequelize;
