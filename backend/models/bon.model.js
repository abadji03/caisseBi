// models/bon.js
module.exports = (sequelize, DataTypes) => {
  const Bon = sequelize.define('Bon', {
    code_structure: { type: DataTypes.STRING, allowNull: false },
    numero: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numeroFacture: DataTypes.STRING,
    type: {
      type: DataTypes.ENUM('Livraison', 'Commande', 'Retour', 'Avoir'),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    montantTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    remise: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    netAPayer: {
      type: DataTypes.DECIMAL(12, 2),
      get() {
        const montant = this.getDataValue('montantTotal') || 0;
        const remise = this.getDataValue('remise') || 0;
        return montant - remise;
      },
    },
    resteAPayer: {
      type: DataTypes.DECIMAL(12, 2),
      get() {
        const net = this.get('netAPayer') || 0;
        const avance = this.getDataValue('avance') || 0;
        return net - avance;
      },
    },
    avance: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    dateBon: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    statutBon: {
      type: DataTypes.ENUM(
        'brouillon',
        'commandé',
        'expédié',
        'livré',
        'validé',
        'retourné',
        'facturé',
        'payé',
        'annulé'
      ),
    },
    motifsRetour: DataTypes.TEXT,
    fichier: DataTypes.TEXT,
  });

  /* Bon.associate = models => {
    Bon.belongsTo(models.Fournisseur, { foreignKey: 'fournisseurId' });
    Bon.belongsTo(models.Client, { foreignKey: 'clientId' });
    Bon.belongsTo(models.User, { foreignKey: 'agentId', allowNull: false });
    Bon.belongsTo(models.Magasin, { foreignKey: 'magasinId', allowNull: false });
  }; */

  return Bon;
};
