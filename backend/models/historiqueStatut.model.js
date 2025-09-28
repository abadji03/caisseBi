// models/historiqueStatut.js
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
    dateChangement: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },{
    tableName: 'historique_statuts',
    timestamps: true
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
