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
  });
  
  return MagasinFournisseur;
};