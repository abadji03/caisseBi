module.exports = (sequelize, DataTypes) => {
    // Définition du modèle users
  return sequelize.define('users', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telephone: DataTypes.STRING,
    email: {
      type: DataTypes.STRING(50),
      //unique: true,
      allowNull: false,
    },
    password: DataTypes.STRING(200),
    typeUser: DataTypes.STRING,
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    role: DataTypes.STRING,
    adresse: DataTypes.STRING,
    poste: DataTypes.STRING,
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    salaire: DataTypes.DECIMAL(10, 2),
    typeContrat: DataTypes.STRING,
    modePaiementSalaire: DataTypes.STRING,
    photoProfil: DataTypes.TEXT,
    derniereConnexion: DataTypes.DATE,
    structure_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });
};
