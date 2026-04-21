//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Produit = sequelize.define('Produit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
      //unique: true
    },
    numeroE: {
      type: DataTypes.INTEGER,
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
    statut: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    perissable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    description: DataTypes.TEXT,
    codeBarre: {
      type: DataTypes.STRING(50),
      //unique: true,
    },
    tauxTVA: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    image: DataTypes.TEXT,
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    } /* ,
    agent: DataTypes.STRING,
    dernierPrixAchat: DataTypes.DECIMAL(10, 2), */,
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (produit, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          produit.code_structure, 
          'produit',
          options.transaction
        );
        produit.numeroE = numero;
      }
    } */

    hooks: {
      beforeValidate: async (produit, options) => {
        console.log('🔍 beforeValidate hook called', produit.code_structure);
        
        // Définir numeroE avant la validation
        if (!produit.numeroE) {
          try {
            const ProduitsModel = sequelize.models.Produit;
            if (ProduitsModel) {
              const count = await ProduitsModel.count({
                where: { code_structure: produit.code_structure },
                transaction: options.transaction
              });
              produit.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${produit.numeroE}`);
            } else {
              produit.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            produit.numeroE = 1;
          }
        }
      },
      beforeCreate: async (produit, options) => {
        console.log('🎯 beforeCreate hook STARTED', produit.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!produit.numeroE) {
          const produitsModel = sequelize.models.Produit;
          const count = await produitsModel.count({
            where: { code_structure: produit.code_structure },
            transaction: options.transaction
          });
          produit.numeroE = count + 1;
        }
      }
    }
  });

  return Produit;
};
