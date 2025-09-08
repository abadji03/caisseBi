module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define('Stock', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    produitId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantiteTotale: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    quantiteReservee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    seuilAlerte: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 5,
    },
    seuilReapprovisionnement: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 10,
    },
    stockSecurite: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 5,
    },
    dernierPrixAchat: DataTypes.DECIMAL(10, 2),
    prixVenteUnitaire: DataTypes.DECIMAL(10, 2),
    datePeremption: DataTypes.DATE,
    statutStock: {
      type: DataTypes.STRING,
      defaultValue: 'En stock',
    },
    dateDerniereMiseAJour: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  return Stock;
};
