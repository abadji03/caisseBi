module.exports = (sequelize, DataTypes) => {
  const Categorie = sequelize.define('Categorie', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code_structure: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    type: {
      type: DataTypes.ENUM('DEPENSE', 'RECETTE'),
      defaultValue: 'DEPENSE',
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  });

  return Categorie;
};
