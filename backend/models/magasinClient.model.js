module.exports = (sequelize, DataTypes) => {
  const MagasinClient = sequelize.define('MagasinClient', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Informations spécifiques à la relation
    solde: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    /* datePremierAchat: DataTypes.DATE,
    estFidele: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    estActif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    } */
  });
  
  return MagasinClient;
};