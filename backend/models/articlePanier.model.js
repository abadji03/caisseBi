// models/articlePanier.js
const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const ArticlePanier = sequelize.define('ArticlePanier', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
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

  },{
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (articlePanier, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          articlePanier.code_structure, 
          'articlePanier',
          options.transaction
        );
        articlePanier.numeroE = numero;
      }
    }
  });


  return ArticlePanier;
};
