//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nomComplet: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: DataTypes.STRING,
    telephone: DataTypes.STRING,
    adresse: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    dateMiseAJour: DataTypes.DATE,
    solde_total: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    estEmploye: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    plafond: DataTypes.DECIMAL(12, 2),
    //montantANousPayer: DataTypes.DECIMAL(12, 2),
    statut: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    //magasinId: DataTypes.INTEGER,
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (client, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          client.code_structure, 
          'client',
          options.transaction
        );
        client.numeroE = numero;
      }
    } */

     hooks: {
      beforeValidate: async (client, options) => {
        console.log('🔍 beforeValidate hook called', client.code_structure);
        
        // Définir numeroE avant la validation
        if (!client.numeroE) {
          try {
            const ClientsModel = sequelize.models.Client;
            if (ClientsModel) {
              const count = await ClientsModel.count({
                where: { code_structure: client.code_structure },
                transaction: options.transaction
              });
              client.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${client.numeroE}`);
            } else {
              client.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            client.numeroE = 1;
          }
        }
      },
      beforeCreate: async (client, options) => {
        console.log('🎯 beforeCreate hook STARTED', client.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!client.numeroE) {
          const clientsModel = sequelize.models.Client;
          const count = await clientsModel.count({
            where: { code_structure: client.code_structure },
            transaction: options.transaction
          });
          client.numeroE = count + 1;
        }
      }
    }
  });

  return Client;
};
