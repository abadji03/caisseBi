const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Reconciliation = sequelize.define('Reconciliation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    produitId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stockTheorique: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stockPhysique: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    ecart: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // Calculé manuellement en JS
    },
    dateReconciliation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    responsable: {
      type: DataTypes.INTEGER,
    },
    note: {
      type: DataTypes.TEXT,
    },
    statut: {
      type: DataTypes.ENUM('validé', 'annulé'),
      defaultValue: 'validé',
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (reconciliation, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          reconciliation.code_structure, 
          'reconciliation',
          options.transaction
        );
        reconciliation.numeroE = numero;
      }
    }
  });

  return Reconciliation;
};
