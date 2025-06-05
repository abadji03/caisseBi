module.exports = (sequelize, DataTypes) => {
  const Magasin = sequelize.define("Magasin", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    adresse: DataTypes.STRING,
    ville: DataTypes.STRING,
    telephone: DataTypes.STRING,
    email: DataTypes.STRING,
    responsableId: DataTypes.INTEGER,
    capaciteStock: DataTypes.DECIMAL(10, 2),
    statut: {
      type: DataTypes.ENUM("Actif", "Inactif"),
      defaultValue: "Actif",
    },
    derniereMiseAJour: {
      type: DataTypes.DATE,
    },
  });

  return Magasin;
};
