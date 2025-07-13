module.exports = (sequelize, DataTypes) => {
  const MouvementStock = sequelize.define("MouvementStock", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false
    },
    ref: {
      type: DataTypes.STRING,
      allowNull: false
    },
    produitId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    stockId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    typeMouvement: {
      type: DataTypes.ENUM("Entrée", "Sortie"),
      allowNull: false
    },
    quantite: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    prixUnitaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    acteurId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    description: DataTypes.TEXT,
    dateMouvement: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  return MouvementStock;
};
