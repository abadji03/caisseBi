// models/historiqueStatut.
const SequenceService = require('../services/sequence.service');

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
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dateChangement: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },{
    tableName: 'historique_statuts',
    timestamps: true
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
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
    }
  });

  /* HistoriqueStatut.associate = (models) => {
    // Un historique appartient à un bon
    HistoriqueStatut.belongsTo(models.Bon, {
      foreignKey: 'bonId',
      as: 'bon'
    });

    // Un historique appartient à un agent (celui qui change le statut)
    HistoriqueStatut.belongsTo(models.Users, {
      foreignKey: 'agentId',
      as: 'agent'
    });
  };
 */
  return HistoriqueStatut;
};
