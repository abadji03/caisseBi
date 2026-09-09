//const SequenceService = require('../services/sequence.service');
const logger = require('../services/logger.js');

module.exports = (sequelize, DataTypes) => {
  const Magasin = sequelize.define('Magasin', {
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
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    adresse: DataTypes.STRING,
    ville: DataTypes.STRING,
    telephone: DataTypes.STRING,
    email: DataTypes.STRING,
    capaciteStock: DataTypes.DECIMAL(10, 2),
    statut: {
      type: DataTypes.ENUM('Actif', 'Inactif'),
      defaultValue: 'Actif',
    },
    derniereMiseAJour: {
      type: DataTypes.DATE,
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (magasin, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          magasin.code_structure, 
          'magasin',
          options.transaction
        );
        magasin.numeroE = numero;
      }
    } */

    hooks: {
      beforeValidate: async (magasin, options) => {
        
        // Définir numeroE avant la validation
        if (!magasin.numeroE) {
          try {
            const magasinsModel = sequelize.models.Magasin;
            if (magasinsModel) {
              const count = await magasinsModel.count({
                where: { code_structure: magasin.code_structure },
                transaction: options.transaction
              });
              magasin.numeroE = count + 1;
            } else {
              magasin.numeroE = 1;
            }
          } catch (error) {
            logger.error('magasin.model', '❌ Hook error:', error);
            magasin.numeroE = 1;
          }
        }
      },
      beforeCreate: async (magasin, options) => {
        // Vérifier et régénérer si nécessaire
        if (!magasin.numeroE) {
          const magasinsModel = sequelize.models.Magasin;
          const count = await magasinsModel.count({
            where: { code_structure: magasin.code_structure },
            transaction: options.transaction
          });
          magasin.numeroE = count + 1;
        }
      }
    }
  });

  return Magasin;
};
