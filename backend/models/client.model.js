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
    solde: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    estEmploye: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    plafond: DataTypes.DECIMAL(12, 2),
    montantANousPayer: DataTypes.DECIMAL(12, 2),
    statut: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    //magasinId: DataTypes.INTEGER,
  });

  return Client;
};
