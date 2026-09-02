// models/paiement.js
//const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Paiement = sequelize.define('Paiement', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numero: {
      type: DataTypes.STRING(30),
    },
    description: DataTypes.TEXT,
    montant: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    /* remise: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    net_a_payer: {
      type: DataTypes.DECIMAL(12, 2),
      get() {
        const montant = this.getDataValue('montant') || 0;
        const remise = this.getDataValue('remise') || 0;
        return montant - remise;
      },
    },
    avance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    reste: {
      type: DataTypes.DECIMAL(12, 2),
      get() {
        const net = this.get('net_a_payer') || 0;
        const avance = this.getDataValue('avance') || 0;
        return net - avance;
      },
    }, */
    compte: {
      type: DataTypes.ENUM('Bon', 'Caisse', 'Mobile Money', 'Banque'),
      defaultValue: 'Caisse',
    },
    /* typeEntite: {
      type: DataTypes.ENUM('client', 'fournisseur'),
      allowNull: false,
      defaultValue: 'fournisseur'
    }, */
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    methodePaiement: DataTypes.ENUM('Espèce', 'Carte', 'Orange Money', 'Wave', 'Chèque', 'Virement', 'Autre'),
    dateMiseAJour: DataTypes.DATE,
    typePaiement: {
      type: DataTypes.ENUM('fournisseur', 'client', 'autre'),
      defaultValue: 'client',
    },
    statutPaiement: {
      type: DataTypes.ENUM('validé', 'annulé'),
      defaultValue: 'validé',
    },
    fichier: DataTypes.TEXT,
    factureId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (paiement, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          paiement.code_structure, 
          'paiement',
          options.transaction
        );
        paiement.numeroE = numero;
      }
    } */

    hooks: {
      beforeValidate: async (paiement, options) => {
        if (paiement.numeroE) return;

        const t = options.transaction;
        try {
          const count = await sequelize.models.Paiement.count({
            where: { code_structure: paiement.code_structure },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
          });
          paiement.numeroE = count + 1;
        } catch (error) {
          console.error('❌ Hook numeroE Paiement error:', error);
          paiement.numeroE = 1;
        }
      },
    }
  });

  /* Paiement.associate = models => {
    Paiement.belongsTo(models.Client, { foreignKey: 'clientId', onDelete: 'SET NULL' });
    Paiement.belongsTo(models.Fournisseur, { foreignKey: 'fournisseurId', onDelete: 'SET NULL' });
    Paiement.belongsTo(models.Bon, { foreignKey: 'bonId', onDelete: 'SET NULL' });
    Paiement.belongsTo(models.Panier, { foreignKey: 'panierId', onDelete: 'SET NULL' });
    Paiement.belongsTo(models.Magasin, { foreignKey: 'magasinId', onDelete: 'CASCADE' });
  }; */

  return Paiement;
};
