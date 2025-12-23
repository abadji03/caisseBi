// models/panier.js
module.exports = (sequelize, DataTypes) => {
  const Panier = sequelize.define('Panier', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    totalHT: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    typeEntite: {
      type: DataTypes.ENUM('client', 'fournisseur'),
      allowNull: false,
      defaultValue: 'fournisseur'
    },
    tva: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    tauxTVA: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    remise: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    totalTTC: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    statut: {
      type: DataTypes.ENUM('en_cours', 'validé', 'annulé','retourné'),
      defaultValue: 'en_cours',
    },
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    dateMiseAJour: {
      type: DataTypes.DATE,
    },
    detailsVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  /* Panier.associate = models => {
    Panier.belongsTo(models.Client, { foreignKey: 'clientId' });
    Panier.belongsTo(models.Bon, { foreignKey: 'bonId' });
    Panier.belongsTo(models.Magasin, { foreignKey: 'magasinId', allowNull: false });
    Panier.belongsTo(models.User, { foreignKey: 'agentId', allowNull: false });
  }; */

  return Panier;
};
