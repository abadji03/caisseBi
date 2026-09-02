//const SequenceService = require('../services/sequence.service');

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
      //unique:'email' ,
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
      //defaultValue: 0
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
      beforeValidate: async (user, options) => {
        if (user.numeroE) return;

        const t = options.transaction;
        try {
          const count = await sequelize.models.users.count({
            where: { code_structure: user.code_structure },
            transaction: t,
            lock: t ? t.LOCK.UPDATE : undefined,
          });
          user.numeroE = count + 1;
        } catch (error) {
          console.error('❌ Hook numeroE users error:', error);
          user.numeroE = 1;
        }
      },
    }
  });
};
