//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const MouvementStock = sequelize.define('MouvementStock', {
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
    ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    produitId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    uniteStock: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stockId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    typeMouvement: {
      type: DataTypes.ENUM('Entrée', 'Sortie'),
      allowNull: false,
    },
    quantite: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    prixUnitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    acteurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transfertId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reconciliationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('validé', 'annulé'),
      defaultValue: 'validé',
    },
    description: DataTypes.TEXT,
    dateMouvement: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (mouvementStock, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          mouvementStock.code_structure, 
          'mouvementSock',
          options.transaction
        );
        mouvementStock.numeroE = numero;
      }
    } */

    hooks: {
      beforeValidate: async (mouvementStock, options) => {
        if (mouvementStock.numeroE) return;

        const t = options.transaction;
        try {
          const count = await sequelize.models.MouvementStock.count({
            where: { code_structure: mouvementStock.code_structure },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
          });
          mouvementStock.numeroE = count + 1;
        } catch (error) {
          console.error('❌ Hook numeroE MouvementStock error:', error);
          mouvementStock.numeroE = 1;
        }
      },
    }
  });

  return MouvementStock;
};
