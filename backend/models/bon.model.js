// models/bon.js
const SequenceService = require('../services/sequence.service');

module.exports = (sequelize, DataTypes) => {
  const Bon = sequelize.define('Bon', {
    // --- Identification ---
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
        'retourné partiellement',
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
      allowNull: true,
    },

    // Calcul automatique : resteAPayer = netAPayer – avance
    resteAPayer: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
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
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    /* hooks: {
      beforeCreate: async (bon, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          bon.code_structure, 
          'bon',
          options.transaction
        );
        bon.numeroE = numero;
      }
    } */
    hooks: {
      beforeValidate: async (bon, options) => {
        // --- Numérotation atomique (séquence par structure) ---
        if (!bon.numeroE) {
          const t = options.transaction;
          try {
            // Séquence initialisée au MAX(numeroE) existant si absente,
            // puis numéro atomique (SELECT ... FOR UPDATE) : évite les
            // collisions sur créations simultanées.
            const { Sequence } = require('../models');
            await SequenceService.initialiserDepuisMax(
              sequelize.models.Bon, 'numeroE', Sequence,
              bon.code_structure, 'bon', t
            );
            bon.numeroE = await SequenceService.getNextNumero(
              sequelize, Sequence, bon.code_structure, 'bon', t
            );
          } catch (error) {
            // Repli : ancien comportement COUNT + 1 (risque de collision,
            // mais ne bloque pas la création si la table Sequence est absente)
            console.error('❌ Hook numeroE Bon error:', error);
            try {
              const count = await sequelize.models.Bon.count({
                where: { code_structure: bon.code_structure },
                transaction: t,
                lock: t ? t.LOCK.UPDATE : undefined,
              });
              bon.numeroE = count + 1;
            } catch (fallbackError) {
              console.error('❌ Hook numeroE Bon fallback error:', fallbackError);
              bon.numeroE = 1;
            }
          }
        }

        // --- Montants dérivés : remplis uniquement s'ils sont absents ---
        // Les endpoints updateNetAPayer / updateResteAPayer mettent à jour
        // ces valeurs explicitement (décrément au fil des paiements) : un
        // recalcul systématique écraserait ce flux. On garantit seulement
        // qu'aucun bon n'est créé avec des montants dérivés nuls/incohérents.
        const num = (v) => {
          const n = parseFloat(v);
          return Number.isFinite(n) ? n : 0;
        };
        if (bon.netAPayer == null) {
          bon.netAPayer = Number(Math.max(0, num(bon.montantTotal) - num(bon.remise)).toFixed(2));
        }
        if (bon.resteAPayer == null) {
          bon.resteAPayer = Number(Math.max(0, num(bon.netAPayer) - num(bon.avance)).toFixed(2));
        }
      },
    }
  });

  return Bon;
};
