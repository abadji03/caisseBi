const logger = require('../services/logger.js');
// models/paiement.js
const SequenceService = require('../services/sequence.service');

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
        if (paiement.numeroE) {
          // Mise à jour : le front peut renvoyer son ancien numéro junk dans
          // un spread (paiementExistant.update({...paiement})) — on le
          // re-sérialise toujours au format serveur, jamais l'inverse.
          if (SequenceService.estNumeroAuto('PAI', paiement.numero)) {
            paiement.numero = SequenceService.formaterNumero('PAI', new Date().getFullYear(), paiement.numeroE);
          }
          return;
        }

        const t = options.transaction;
        try {
          // Numérotation atomique par séquence (SELECT ... FOR UPDATE),
          // initialisée au MAX(numeroE) existant si absente. Remplace
          // l'ancien COUNT + 1 (risque de collision) et le numéro long
          // généré côté client (timestamp + random).
          const { Sequence } = require('../models');
          await SequenceService.initialiserDepuisMax(
            sequelize.models.Paiement, 'numeroE', Sequence,
            paiement.code_structure, 'paiement', t
          );
          const { numeroE, numero } = await SequenceService.getNextNumeroFormate(
            sequelize, Sequence, paiement.code_structure, 'paiement', 'PAI', t
          );
          paiement.numeroE = numeroE;
          // Le serveur est la source de vérité : numéro court PAI-26-0001.
          paiement.numero = numero;
        } catch (error) {
          logger.error('paiement.model', '❌ Hook numeroE Paiement error:', error);
          paiement.numeroE = 1;
          paiement.numero = SequenceService.formaterNumero('PAI', new Date().getFullYear(), 1);
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
