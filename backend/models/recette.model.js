//const SequenceService = require('../services/sequence.service');
const logger = require('../services/logger.js');

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
    /* hooks: {
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
    } */
   hooks: {
      beforeValidate: async (recette, options) => {
        
        // Définir numeroE avant la validation
        if (!recette.numeroE) {
          try {
            const RecettesModel = sequelize.models.Recette;
            if (RecettesModel) {
              const count = await RecettesModel.count({
                where: { code_structure: recette.code_structure },
                transaction: options.transaction
              });
              recette.numeroE = count + 1;
            } else {
              recette.numeroE = 1;
            }
          } catch (error) {
            logger.error('recette.model', '❌ Hook error:', error);
            recette.numeroE = 1;
          }
        }
      },
      beforeCreate: async (recette, options) => {
        // Vérifier et régénérer si nécessaire
        if (!recette.numeroE) {
          const recettesModel = sequelize.models.Recette;
          const count = await recettesModel.count({
            where: { code_structure: recette.code_structure },
            transaction: options.transaction
          });
          recette.numeroE = count + 1;
        }
      }
    }
  });

  return Recette;
};
