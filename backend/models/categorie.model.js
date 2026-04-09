const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Categorie = sequelize.define('Categorie', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code_structure: { type: DataTypes.STRING, allowNull: true },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    type: {
      type: DataTypes.ENUM('DEPENSE', 'RECETTE'),
      defaultValue: 'DEPENSE',
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (categorie, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          categorie.code_structure, 
          'categorie',
          options.transaction
        );
        categorie.numeroE = numero;
      }
    }
  });

  return Categorie;
};
