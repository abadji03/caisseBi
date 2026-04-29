

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
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fournisseurId: {
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
    
    // Type de facture
    /* type_facture: {
      type: DataTypes.ENUM('vente', 'achat', 'avoir', 'acompte', 'regularisation'),
      defaultValue: 'vente'
    }, */

    type_facture: {
      type: DataTypes.ENUM(
        'commande',    // Bon de commande (engagement)
        'vente',       // Facture de vente (client doit payer)
        'achat',       // Facture d'achat (fournisseur doit être payé)
        //'acompte',     // Acompte (paiement anticipé)
        'avoir',       // Avoir (annulation/réduction)
        'regularisation' // Régularisation (correction)
      ),
      defaultValue: 'vente'
    },
    
    // Montants
    montant_ht: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    montant_tva: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    montant_ttc: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    montant_remise: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    montant_net: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    
    // Gestion des dettes cumulées
    dette_avant_facture: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Dette du client avant cette facture'
    },
    dette_apres_facture: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Dette du client après cette facture'
    },
    
    // Statuts
    statut: {
      type: DataTypes.ENUM('brouillon', 'emise', 'annulee'),
      defaultValue: 'brouillon'
    },
    
    date_facture: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    // date_echeance: {
    //   type: DataTypes.DATE,
    // },
    
    commentaire: {
      type: DataTypes.TEXT,
    },
    
    // Métadonnées
    generated_by: {
      type: DataTypes.STRING,
      comment: 'Agent qui a généré la facture'
    },
    pdf_path: {
      type: DataTypes.STRING,
      comment: 'Chemin du fichier PDF généré'
    }

  }, {
    timestamps: true,
    underscored: true,
    hooks: {
      beforeValidate: async (facture, options) => {
        if (!facture.numeroE) {
          try {
            const count = await sequelize.models.Facture.count({
              where: { code_structure: facture.code_structure },
              transaction: options.transaction
            });
            facture.numeroE = count + 1;
            facture.numero_facture = `FAC-${facture.code_structure}-${String(facture.numeroE).padStart(6, '0')}`;
          } catch (error) {
            console.error('❌ Hook error:', error);
            facture.numeroE = 1;
            facture.numero_facture = `FAC-${facture.code_structure}-000001`;
          }
        }
      }
    }
  });

  return Facture;
};