const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const CategoriesProduits = sequelize.define('CategoriesProduits', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    statut: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (categoriesProduits, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          categoriesProduits.code_structure, 
          'categoriesProduits',
          options.transaction
        );
        categoriesProduits.numeroE = numero;
      }
    }
  });

  return CategoriesProduits;
};
