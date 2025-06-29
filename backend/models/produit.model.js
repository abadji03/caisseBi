module.exports = (sequelize, DataTypes) => {
  const Produit = sequelize.define("Produit", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categorieId: DataTypes.INTEGER,
    fournisseurId: DataTypes.INTEGER,
    agentId: DataTypes.INTEGER,
    unite: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prixAchatUnitaire: DataTypes.DECIMAL(10, 2),
    prixVenteUnitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    perissable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    description: DataTypes.TEXT,
    codeBarre: {
      type: DataTypes.STRING (50),
      //unique: true,
    },
    image: DataTypes.TEXT,
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }/* ,
    agent: DataTypes.STRING,
    dernierPrixAchat: DataTypes.DECIMAL(10, 2), */
  });

  return Produit;
};
