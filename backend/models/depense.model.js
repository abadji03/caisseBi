const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Depense = sequelize.define('Depense', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    code_structure: { type: DataTypes.STRING, allowNull: false },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    montant: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    paiementId: { type: DataTypes.DECIMAL(12, 2) },
    statutDepense: { type: DataTypes.ENUM('validé', 'annulé'), defaultValue: 'validé' },
    type: {
      type: DataTypes.ENUM('STANDARD', 'STOCK','FRAIS','INVESTISSEMENT'),
      defaultValue: 'STANDARD',
    },
    description: { type: DataTypes.TEXT },
    paymentMode: { type: DataTypes.STRING(50), allowNull: false },
    receipt: { type: DataTypes.STRING },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (depense, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          depense.code_structure, 
          'depense',
          options.transaction
        );
        depense.numeroE = numero;
      }
    }
  });

  return Depense;
};
