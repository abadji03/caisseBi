const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Facture = sequelize.define('Facture', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    numero_facture: {
      type: DataTypes.STRING,
      allowNull: false,
      //unique: 'numero_facture'
    },

    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },

    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    bonId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    panierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    montant_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },

    montant_paye: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },

    reste_a_payer: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },

    statut: {
      type: DataTypes.ENUM('Payée', 'Partielle', 'Impayée'),
      defaultValue: 'Impayée'
    },

    mode_paiement: {
      type: DataTypes.STRING,
    },

    date_facture: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    date_echeance: {
      type: DataTypes.DATE,
    },

    commentaire: {
      type: DataTypes.TEXT,
    }

  }, {
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (facture, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          facture.code_structure, 
          'facture',
          options.transaction
        );
        facture.numeroE = numero;
      }
    }
  });

  return Facture;
};