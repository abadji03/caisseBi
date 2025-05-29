module.exports = (sequelize, DataTypes) => {
    // Définition du modèle Structure
  const Structure = sequelize.define('structure', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nom_structure: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logo: DataTypes.STRING,
    proprietaire: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nombre_magasins: DataTypes.INTEGER,
    type_structure: DataTypes.STRING,
    devise: DataTypes.STRING,
    email: DataTypes.STRING,
    telephone: DataTypes.STRING,
    adresse: DataTypes.STRING,
    numero_identification_fiscale: DataTypes.STRING,
    registre_commerce: DataTypes.STRING,
    statut_juridique: DataTypes.STRING,
    banque: DataTypes.STRING,
    numero_compte: DataTypes.STRING,
    fournisseur_mobile_money: DataTypes.STRING,
    nombre_employes: DataTypes.INTEGER,
    responsable_administratif: DataTypes.STRING,
    horaires_ouverture: DataTypes.STRING,
    jours_fermeture: DataTypes.STRING,
    site_web: DataTypes.STRING,
    reseaux_sociaux: DataTypes.STRING,
    personne_confiance: DataTypes.STRING,
    assurances_souscrites: DataTypes.STRING,
    estActive:{
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    date_creation: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: DataTypes.TEXT,
    code_structure: {
      type: DataTypes.STRING(36),
      //unique: true,
      allowNull: false,
    }
  });
  return Structure;
};
