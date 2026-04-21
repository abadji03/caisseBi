//const SequenceService = require('../services/sequence.service');

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
    /* hooks: {
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
    } */

    hooks: {
      beforeValidate: async (transfert, options) => {
        console.log('🔍 beforeValidate hook called', transfert.code_structure);
        
        // Définir numeroE avant la validation
        if (!transfert.numeroE) {
          try {
            const HistoriqueReconsModel = sequelize.models.HistoriqueReconciliation;
            if (HistoriqueReconsModel) {
              const count = await HistoriqueReconsModel.count({
                where: { code_structure: transfert.code_structure },
                transaction: options.transaction
              });
              transfert.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${transfert.numeroE}`);
            } else {
              transfert.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            transfert.numeroE = 1;
          }
        }
      },
      beforeCreate: async (user, options) => {
        console.log('🎯 beforeCreate hook STARTED', user.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!user.numeroE) {
          const UsersModel = sequelize.models.Users;
          const count = await UsersModel.count({
            where: { code_structure: user.code_structure },
            transaction: options.transaction
          });
          user.numeroE = count + 1;
        }
      }
    }
  });

  return HistoriqueReconciliation;
};
