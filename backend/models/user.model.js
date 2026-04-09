const SequenceService = require('../services/sequence.service');

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
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
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
    numeroE: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: true,
    },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
    hooks: {
      beforeCreate: async (user, options) => {
        const { sequelize, Sequence } = require('../models');
        const numero = await SequenceService.getNextNumero(
          sequelize,
          Sequence,
          user.code_structure, 
          'user',
          options.transaction
        );
        user.numeroE = numero;
      }
    }
  });
};
