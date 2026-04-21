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
        console.log('🔍 beforeValidate hook called', user.code_structure);
        
        // Définir numeroE avant la validation
        if (!user.numeroE) {
          try {
            const UsersModel = sequelize.models.users;
            if (UsersModel) {
              const count = await UsersModel.count({
                where: { code_structure: user.code_structure },
                transaction: options.transaction
              });
              user.numeroE = count + 1;
              console.log(`✅ Generated numeroE in beforeValidate: ${user.numeroE}`);
            } else {
              user.numeroE = 1;
            }
          } catch (error) {
            console.error('❌ Hook error:', error);
            user.numeroE = 1;
          }
        }
      },
      beforeCreate: async (user, options) => {
        console.log('🎯 beforeCreate hook STARTED', user.numeroE);
        // Vérifier et régénérer si nécessaire
        if (!user.numeroE) {
          const UsersModel = sequelize.models.users;
          const count = await UsersModel.count({
            where: { code_structure: user.code_structure },
            transaction: options.transaction
          });
          user.numeroE = count + 1;
        }
      }
    }
  });
};
