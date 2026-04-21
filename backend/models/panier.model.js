// models/panier.js
//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Panier = sequelize.define('Panier', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalHT: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    typePanier: {
      type: DataTypes.ENUM('produit', 'service', 'mixe'),
      allowNull: false,
      defaultValue: 'produit',
    },
    typeEntite: {
      type: DataTypes.ENUM('client', 'fournisseur','autre'),
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
    remiseGlobale: {
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
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (panier, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          panier.code_structure, 
          'panier',
          options.transaction
        );
        panier.numeroE = numero;
      }
    } */


    hooks: {
      beforeValidate: async (panier, options) => {
        console.log('🔍 beforeValidate hook called', panier.code_structure);
        
        // Définir numeroE avant la validation
        if (!panier.numeroE) {
          try {
            const paniersModel = sequelize.models.Panier;
            if (paniersModel) {
              const count = await paniersModel.count({
                where: { code_structure: panier.code_structure },
                transaction: options.transaction
              });
              panier.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${panier.numeroE}`);
            } else {
              panier.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            panier.numeroE = 1;
          }
        }
      },
      beforeCreate: async (panier, options) => {
        console.log('🎯 beforeCreate hook STARTED', panier.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!panier.numeroE) {
          const paniersModel = sequelize.models.Panier;
          const count = await paniersModel.count({
            where: { code_structure: panier.code_structure },
            transaction: options.transaction
          });
          panier.numeroE = count + 1;
        }
      }
    }
  });

  /* Panier.associate = models => {
    Panier.belongsTo(models.Client, { foreignKey: 'clientId' });
    Panier.belongsTo(models.Bon, { foreignKey: 'bonId' });
    Panier.belongsTo(models.Magasin, { foreignKey: 'magasinId', allowNull: false });
    Panier.belongsTo(models.panier, { foreignKey: 'agentId', allowNull: false });
  }; */

  return Panier;
};
