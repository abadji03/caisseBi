// models/operation.js
const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Operation = sequelize.define('Operation', {
    code_structure: { type: DataTypes.STRING(50), allowNull: false },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'COMMANDE',
        'VERSEMENT',
        'REGLEMENT',
        'FACTURE',
        'VENTE',
        'TICKET_CAISSE',
        'RETOUR',
        'AVOIR',
        'LIVRAISON'
      ),
      allowNull: false,
    },
    montantPaye: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    resteAPayer: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    moyenPaiement: {
      type: DataTypes.STRING(20), //ENUM('ESPECES', 'MOBILE_MONEY', 'CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE'),
      allowNull: true,
    },
    numeroBon: DataTypes.STRING(30),
    fichier: DataTypes.STRING,
    numeroFacture: DataTypes.STRING(30),
    numeroTicket: DataTypes.STRING(30),
    numeroAvoir: DataTypes.STRING(30),
    numeroVersement: DataTypes.STRING(30),
    numeroRetour: DataTypes.STRING(30),
    statut: {
      type: DataTypes.STRING(20), //ENUM('PAYE', 'PARTIELLEMENT_PAYE', 'IMPAYE', 'ANNULE'),
      allowNull: false,
    },
    dateOperation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    commentaire: DataTypes.TEXT,
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (operation, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          operation.code_structure, 
          'operation',
          options.transaction
        );
        operation.numeroE = numero;
      }
    }
  });

  /* Operation.associate = models => {
    Operation.belongsTo(models.Client, { foreignKey: 'clientId', onDelete: 'SET NULL' });
    Operation.belongsTo(models.Fournisseur, { foreignKey: 'fournisseurId', onDelete: 'SET NULL' });
    Operation.belongsTo(models.User, { foreignKey: 'agentId', onDelete: 'CASCADE' });
    Operation.belongsTo(models.Bon, { foreignKey: 'bonId', onDelete: 'SET NULL' });
    Operation.belongsTo(models.Paiement, { foreignKey: 'paiementId', onDelete: 'SET NULL' });
    Operation.belongsTo(models.Magasin, { foreignKey: 'magasinId', onDelete: 'CASCADE' });
  }; */

  return Operation;
};
