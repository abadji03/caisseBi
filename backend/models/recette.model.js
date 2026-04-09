const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Recette = sequelize.define('Recette', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    montant: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    description: { type: DataTypes.TEXT },
    paymentMode: { type: DataTypes.STRING(36), allowNull: false },
    receipt: { type: DataTypes.STRING },
    statutRecette: { type: DataTypes.ENUM('validé', 'annulé'), defaultValue: 'validé' },
    paiementId: { type: DataTypes.DECIMAL(12, 2) },
    code_structure: { type: DataTypes.STRING(50), allowNull: false },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (recette, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          recette.code_structure, 
          'recette',
          options.transaction
        );
        recette.numeroE = numero;
      }
    }
  });

  return Recette;
};
