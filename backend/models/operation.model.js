// models/operation.js
module.exports = (sequelize, DataTypes) => {
  const Operation = sequelize.define('Operation', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    type: {
      type: DataTypes.ENUM('COMMANDE', 'VERSEMENT', 'FACTURE', 'TICKET_CAISSE', 'RETOUR', 'AVOIR', 'LIVRAISON'),
      allowNull: false
    },
    montantPaye: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    moyenPaiement: {
      type: DataTypes.ENUM('ESPECES', 'MOBILE_MONEY', 'CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE'),
      allowNull: false
    },
    numeroBon: DataTypes.STRING,
    numeroFacture: DataTypes.STRING,
    numeroTicket: DataTypes.STRING,
    numeroAvoir: DataTypes.STRING,
    numeroVersement: DataTypes.STRING,
    numeroRetour: DataTypes.STRING,
    statut: {
      type: DataTypes.ENUM('PAYE', 'PARTIELLEMENT_PAYE', 'IMPAYE', 'ANNULE'),
      allowNull: false
    },
    dateOperation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    commentaire: DataTypes.TEXT
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
