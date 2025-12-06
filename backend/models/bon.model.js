// models/bon.js
module.exports = (sequelize, DataTypes) => {
  const Bon = sequelize.define('Bon', {
    // --- Identification ---
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    code_structure: {
      type: DataTypes.STRING,
      allowNull: false
    },

    numero: {
      type: DataTypes.STRING,
      allowNull: false
    },

    numeroFacture: {
      type: DataTypes.STRING
    },

    dateBon: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    // --- Structure & Entité ---
    type: {
      type: DataTypes.ENUM(
        'commande',
        'livraison',
        'retour',
        'avoir',
        'vente',
      ),
    },

    typeEntite: {
      type: DataTypes.ENUM('client', 'fournisseur'),
      allowNull: false
    },

    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    fournisseurId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    // --- Description & Documents ---
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    fichier: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // --- Références croisées ---
    numeroBonOrigine: {
      type: DataTypes.STRING(30),
      allowNull: true
    },

    referenceExterne: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // --- Statut du bon ---
    statutBon: {
      type: DataTypes.ENUM(
        'brouillon',
        'validé',
        'livré',
        'retourné',
        'facturé',
        'annulé'
      ),
      allowNull: false,
      defaultValue: 'brouillon'
    },

    // --- Retours & Avoirs ---
    motifsRetour: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    montantAvoir: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },

    // --- Montants financiers ---
    montantTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },

    remise: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },

    avance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },

    // Calcul automatique : netAPayer = montantTotal – remise
    netAPayer: {
      type: DataTypes.DECIMAL(12, 2),
      get() {
        const total = parseFloat(this.getDataValue('montantTotal')) || 0;
        const remise = parseFloat(this.getDataValue('remise')) || 0;
        return (total - remise).toFixed(2);
      }
    },

    // Calcul automatique : resteAPayer = netAPayer – avance
    resteAPayer: {
      type: DataTypes.DECIMAL(12, 2),
      get() {
        const net = parseFloat(this.get('netAPayer')) || 0;
        const avance = parseFloat(this.getDataValue('avance')) || 0;
        return (net - avance).toFixed(2);
      }
    },

    // --- Paiement ---
    conditionsPaiement: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    delaiPaiement: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    // --- Logistique ---
    dateLivraisonPrevue: {
      type: DataTypes.DATE,
      allowNull: true
    },

    dateLivraisonReelle: {
      type: DataTypes.DATE,
      allowNull: true
    },

    pointLivraison: {
      type: DataTypes.STRING,
      allowNull: true
    },

    transporteur: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // --- Relations internes ---
    agentId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  });

  return Bon;
};
