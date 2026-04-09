const SequenceService = require('../services/sequence.service');

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
    /* solde: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    }, */
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
    magasinId: DataTypes.INTEGER,
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
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
    }
  });

  return Client;
};
