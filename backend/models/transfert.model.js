//const SequenceService = require('../services/sequence.service');
const logger = require('../services/logger.js');

module.exports = (sequelize, DataTypes) => {
  const Transfert = sequelize.define('Transfert', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code_structure: { type: DataTypes.STRING(38), allowNull: false },
    reference: { type: DataTypes.STRING(50), allowNull: false },
    produitId: { type: DataTypes.INTEGER, allowNull: false },
    quantite: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    magasinSource: { type: DataTypes.INTEGER, allowNull: false },
    magasinDestination: { type: DataTypes.INTEGER, allowNull: false },
    dateTransfert: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    statut: {
      type: DataTypes.ENUM('En attente', 'Validé', 'Refusé'),
      defaultValue: 'En attente',
    },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    motif: { type: DataTypes.TEXT },
    agentResponsable: { type: DataTypes.INTEGER, allowNull: false },
    dateValidation: { type: DataTypes.DATE },
    agentValidation: { type: DataTypes.INTEGER },
    // mouvementSortieId: { type: DataTypes.INTEGER },
    // mouvementEntreeId: { type: DataTypes.INTEGER },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (transfert, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          transfert.code_structure, 
          'transfert',
          options.transaction
        );
        transfert.numeroE = numero;
      }
    } */
   
      hooks: {
      beforeValidate: async (transfert, options) => {
        
        // Définir numeroE avant la validation
        if (!transfert.numeroE) {
          try {
            const TransfertsModel = sequelize.models.Transfert;
            if (TransfertsModel) {
              const count = await TransfertsModel.count({
                where: { code_structure: transfert.code_structure },
                transaction: options.transaction
              });
              transfert.numeroE = count + 1;
            } else {
              transfert.numeroE = 1;
            }
          } catch (error) {
            logger.error('transfert.model', '❌ Hook error:', error);
            transfert.numeroE = 1;
          }
        }
      },
      beforeCreate: async (transfert, options) => {
        // Vérifier et régénérer si nécessaire
        if (!transfert.numeroE) {
          const TransfertsModel = sequelize.models.Transfert;
          const count = await TransfertsModel.count({
            where: { code_structure: transfert.code_structure },
            transaction: options.transaction
          });
          transfert.numeroE = count + 1;
        }
      }
    }
  });

  return Transfert;
};
