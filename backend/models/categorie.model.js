//const SequenceService = require('../services/sequence.service');
const logger = require('../services/logger.js');

module.exports = (sequelize, DataTypes) => {
  const Categorie = sequelize.define('Categorie', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code_structure: { type: DataTypes.STRING, allowNull: true },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    code: { // Nouveau champ
      type: DataTypes.STRING(50),
      allowNull: false,
      //unique: true,
      defaultValue: 'AUTRE',
      //comment: 'Code métier ex: PAIEMENT_CLIENT, ACHAT_STOCK, FRAIS_GENERAUX'
    },
    description: { type: DataTypes.TEXT },
    type: {
      type: DataTypes.ENUM('DEPENSE', 'RECETTE'),
      defaultValue: 'DEPENSE',
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (categorie, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          categorie.code_structure, 
          'categorie',
          options.transaction
        );
        categorie.numeroE = numero;
      }
    } */

     hooks: {
      beforeValidate: async (categorieProduits, options) => {
        
        // Définir numeroE avant la validation
        if (!categorieProduits.numeroE) {
          try {
            const ClientsModel = sequelize.models.Categorie;
            if (ClientsModel) {
              const count = await ClientsModel.count({
                where: { code_structure: categorieProduits.code_structure },
                transaction: options.transaction
              });
              categorieProduits.numeroE = count + 1;
            } else {
              categorieProduits.numeroE = 1;
            }
          } catch (error) {
            logger.error('categorie.model', '❌ Hook error:', error);
            categorieProduits.numeroE = 1;
          }
        }
      },
      beforeCreate: async (categorieProduit, options) => {
        // Vérifier et régénérer si nécessaire
        if (!categorieProduit.numeroE) {
          const clientsModel = sequelize.models.Categorie;
          const count = await clientsModel.count({
            where: { code_structure: categorieProduit.code_structure },
            transaction: options.transaction
          });
          categorieProduit.numeroE = count + 1;
        }
      }
    }
  });

  return Categorie;
};
