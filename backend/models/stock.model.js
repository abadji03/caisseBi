//const SequenceService = require('../services/sequence.service');

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
    /* hooks: {
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
    } */

    hooks: {
      beforeValidate: async (stock, options) => {
        console.log('🔍 beforeValidate hook called', stock.code_structure);
        
        // Définir numeroE avant la validation
        if (!stock.numeroE) {
          try {
            const StocksModel = sequelize.models.Stock;
            if (StocksModel) {
              const count = await StocksModel.count({
                where: { code_structure: stock.code_structure },
                transaction: options.transaction
              });
              stock.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${stock.numeroE}`);
            } else {
              stock.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            stock.numeroE = 1;
          }
        }
      },
      beforeCreate: async (stock, options) => {
        console.log('🎯 beforeCreate hook STARTED', stock.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!stock.numeroE) {
          const stocksModel = sequelize.models.Stock;
          const count = await stocksModel.count({
            where: { code_structure: stock.code_structure },
            transaction: options.transaction
          });
          stock.numeroE = count + 1;
        }
      }
    }
  });

  return Stock;
};
