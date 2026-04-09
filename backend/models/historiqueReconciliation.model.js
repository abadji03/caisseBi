const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const HistoriqueReconciliation = sequelize.define('HistoriqueReconciliation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ecart: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    note: { type: DataTypes.TEXT },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (historiqueReconciliation, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          historiqueReconciliation.code_structure, 
          'historiqueReconciliation',
          options.transaction
        );
        historiqueReconciliation.numeroE = numero;
      }
    }
  });

  return HistoriqueReconciliation;
};
