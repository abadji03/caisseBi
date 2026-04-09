const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define('Stock', {
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
      allowNull: true,
    },
    quantiteTotale: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    quantiteReservee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    seuilAlerte: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 5,
    },
    seuilReapprovisionnement: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 10,
    },
    stockSecurite: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 5,
    },
    dernierPrixAchat: DataTypes.DECIMAL(10, 2),
    prixVenteUnitaire: DataTypes.DECIMAL(10, 2),
    datePeremption: DataTypes.DATE,
    statutStock: {
      type: DataTypes.STRING,
      defaultValue: 'En stock',
    },
    dateDerniereMiseAJour: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (stock, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          stock.code_structure, 
          'stock',
          options.transaction
        );
        stock.numeroE = numero;
      }
    }
  });

  return Stock;
};
