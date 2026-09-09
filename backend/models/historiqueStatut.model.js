const logger = require('../services/logger.js');
// models/historiqueStatut.
//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const HistoriqueStatut = sequelize.define('HistoriqueStatut', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    bonId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ancienStatut: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nouveauStatut: {
      type: DataTypes.STRING,
      allowNull: false
    },
    commentaire: {
      type: DataTypes.STRING,
      allowNull: true
    },
    agentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    code_structure: {
      type: DataTypes.STRING,
      allowNull: false
    },
    /* numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }, */
    dateChangement: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (historiqueStatut, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          historiqueStatut.code_structure, 
          'historiqueStatut',
          options.transaction
        );
        historiqueStatut.numeroE = numero;
      }
    } */

    /* hooks: {
      beforeValidate: async (historiqueStatut, options) => {
        
        // Définir numeroE avant la validation
        if (!historiqueStatut.numeroE) {
          try {
            const HistoriqueStatutModel = sequelize.models.HistoriqueStatut;
            if (HistoriqueStatutModel) {
              const count = await HistoriqueStatutModel.count({
                where: { code_structure: historiqueStatut.code_structure },
                transaction: options.transaction
              });
              historiqueStatut.numeroE = count + 1;
            } else {
              historiqueStatut.numeroE = 1;
            }
          } catch (error) {logger.error('historiqueStatut.model', '❌ Hook error:', error);
            historiqueStatut.numeroE = 1;
          }
        }
      },
      beforeCreate: async (historiqueStatut, options) => {
        // Vérifier et régénérer si nécessaire
        if (!historiqueStatut.numeroE) {
          const HistoriqueStatutModel = sequelize.models.HistoriqueStatut;
          const count = await HistoriqueStatutModel.count({
            where: { code_structure: historiqueStatut.code_structure },
            transaction: options.transaction
          });
          historiqueStatut.numeroE = count + 1;
        }
      }
    } */
  });

  
  return HistoriqueStatut;
};