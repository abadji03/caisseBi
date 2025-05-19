module.exports = (sequelize, DataTypes) => {
  const Fournisseur = sequelize.define("Fournisseur", {
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
    adresse: DataTypes.STRING,
    telephone: DataTypes.STRING,
    email: DataTypes.STRING,
    banque: DataTypes.STRING,
    numeroCompte: DataTypes.STRING,
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    statut: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    montantAPayer: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    termePaiement: DataTypes.STRING,
    termeLivraison: DataTypes.STRING,
    pays: DataTypes.STRING,
    ville: DataTypes.STRING,
    magasinId: DataTypes.INTEGER,
  });

  return Fournisseur;
};
