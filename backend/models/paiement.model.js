// models/paiement.js
module.exports = (sequelize, DataTypes) => {
  const Paiement = sequelize.define('Paiement', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    numero: {
      type: DataTypes.STRING,
    },
    description: DataTypes.TEXT,
    montant: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    remise: {
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
    },
    compte: {
      type: DataTypes.ENUM('Bon', 'Caisse', 'Mobile Money', 'Banque'),
      defaultValue: 'Caisse'
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    methodePaiement: DataTypes.INTEGER, // À lier à une table si tu en as une
    dateMiseAJour: DataTypes.DATE,
    typePaiement: {
      type: DataTypes.ENUM('fournisseur', 'client'),
      defaultValue: 'client'
    },
    fichier: DataTypes.TEXT
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
