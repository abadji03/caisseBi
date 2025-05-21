module.exports = (sequelize, DataTypes) => {
  return sequelize.define('permission', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    niveau: { type: DataTypes.TINYINT, defaultValue: 1 },
    type: {
      type: DataTypes.ENUM('view_only', 'edit', 'delete', 'manage_users', 'manage_settings', 'full_access'),
      allowNull: false
    }
  }, {
    // Model options go here
    getterMethods: {
      valeur() {
        switch (this.type) {
          case 'view_only': return 'Consultation uniquement';
          case 'edit': return 'Modification';
          case 'delete': return 'Suppression';
          case 'manage_users': return 'Gestion des utilisateurs';
          case 'manage_settings': return 'Accès aux configurations';
          case 'full_access': return 'Accès total';
          default: return '';
        }
      }
    }
  });
};