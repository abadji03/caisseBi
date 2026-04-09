module.exports = (sequelize, DataTypes) => {
  const MagasinFournisseur = sequelize.define('MagasinFournisseur', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fournisseurId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Informations spécifiques à la relation
    solde: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    /* dateDebutRelation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    conditionsPaiement: DataTypes.STRING,
    estActif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    } */
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
  });
  
  return MagasinFournisseur;
};