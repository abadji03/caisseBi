module.exports = (sequelize, DataTypes) => {
  const CategoriesProduits = sequelize.define('CategoriesProduits', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    statut: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });

  return CategoriesProduits;
};
