// models/articlePanier.js
module.exports = (sequelize, DataTypes) => {
  const ArticlePanier = sequelize.define('ArticlePanier', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    quantite: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    prixVenteUnitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    prixAchatUnitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  });

  /* ArticlePanier.associate = models => {
    ArticlePanier.belongsTo(models.Panier, { foreignKey: 'panierId', onDelete: 'CASCADE' });
    ArticlePanier.belongsTo(models.Produit, { foreignKey: 'produitId', onDelete: 'CASCADE' });
    ArticlePanier.belongsTo(models.Stock, { foreignKey: 'stockId', onDelete: 'SET NULL' });
  }; */

  return ArticlePanier;
};
