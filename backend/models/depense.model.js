//const SequenceService = require('../services/sequence.service');
const logger = require('../services/logger.js');

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
    /* hooks: {
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
    } */

    hooks: {
      beforeValidate: async (depense, options) => {
        
        // Définir numeroE avant la validation
        if (!depense.numeroE) {
          try {
            const depensesModel = sequelize.models.Depense;
            if (depensesModel) {
              const count = await depensesModel.count({
                where: { code_structure: depense.code_structure },
                transaction: options.transaction
              });
              depense.numeroE = count + 1;
            } else {
              depense.numeroE = 1;
            }
          } catch (error) {
            logger.error('depense.model', '❌ Hook error:', error);
            depense.numeroE = 1;
          }
        }
      },
      beforeCreate: async (depense, options) => {
        // Vérifier et régénérer si nécessaire
        if (!depense.numeroE) {
          const depensesModel = sequelize.models.Depense;
          const count = await depensesModel.count({
            where: { code_structure: depense.code_structure },
            transaction: options.transaction
          });
          depense.numeroE = count + 1;
        }
      }
    }
  });

  return Depense;
};
