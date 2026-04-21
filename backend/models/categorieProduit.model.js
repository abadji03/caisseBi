//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const CategoriesProduits = sequelize.define('CategoriesProduits', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    statut: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (categoriesProduits, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          categoriesProduits.code_structure, 
          'categoriesProduits',
          options.transaction
        );
        categoriesProduits.numeroE = numero;
      }
    } */

    hooks: {
      beforeValidate: async (categorieProduits, options) => {
        console.log('🔍 beforeValidate hook called', categorieProduits.code_structure);
        
        // Définir numeroE avant la validation
        if (!categorieProduits.numeroE) {
          try {
            const ClientsModel = sequelize.models.CategoriesProduits;
            if (ClientsModel) {
              const count = await ClientsModel.count({
                where: { code_structure: categorieProduits.code_structure },
                transaction: options.transaction
              });
              categorieProduits.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${categorieProduits.numeroE}`);
            } else {
              categorieProduits.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            categorieProduits.numeroE = 1;
          }
        }
      },
      beforeCreate: async (categorieProduit, options) => {
        console.log('🎯 beforeCreate hook STARTED', categorieProduit.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!categorieProduit.numeroE) {
          const clientsModel = sequelize.models.CategoriesProduits;
          const count = await clientsModel.count({
            where: { code_structure: categorieProduit.code_structure },
            transaction: options.transaction
          });
          categorieProduit.numeroE = count + 1;
        }
      }
    }
  });

  return CategoriesProduits;
};
