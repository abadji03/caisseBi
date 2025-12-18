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
    prixUnitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
     // 🔹 Remise
    remise: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    // 🔹 TVA
    tauxTVA: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    // 🔹 Montants calculés (historisation)
    montantRemise: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalHT: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    montantTVA: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalTTC: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

  });


  return ArticlePanier;
};
