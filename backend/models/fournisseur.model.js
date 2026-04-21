//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Fournisseur = sequelize.define('Fournisseur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    numeroE: {
      type: DataTypes.INTEGER,
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
    //magasinId: DataTypes.INTEGER,
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (fournisseur, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          fournisseur.code_structure, 
          'fournisseur',
          options.transaction
        );
        fournisseur.numeroE = numero;
      }
    } */

    hooks: {
      beforeValidate: async (fournisseur, options) => {
        console.log('🔍 beforeValidate hook called', fournisseur.code_structure);
        
        // Définir numeroE avant la validation
        if (!fournisseur.numeroE) {
          try {
            const FournisseursModel = sequelize.models.Fournisseur;
            if (FournisseursModel) {
              const count = await FournisseursModel.count({
                where: { code_structure: fournisseur.code_structure },
                transaction: options.transaction
              });
              fournisseur.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${fournisseur.numeroE}`);
            } else {
              fournisseur.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            fournisseur.numeroE = 1;
          }
        }
      },
      beforeCreate: async (fournisseur, options) => {
        console.log('🎯 beforeCreate hook STARTED', fournisseur.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!fournisseur.numeroE) {
          const fournisseursModel = sequelize.models.Fournisseur;
          const count = await fournisseursModel.count({
            where: { code_structure: fournisseur.code_structure },
            transaction: options.transaction
          });
          fournisseur.numeroE = count + 1;
        }
      }
    }
  });

  return Fournisseur;
};
