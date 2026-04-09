module.exports = (sequelize, DataTypes) => {
  const HistoriqueActionsUtilisateur = sequelize.define('HistoriqueActionsUtilisateur', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    action: { type: DataTypes.TEXT, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false }, 
    ip: { type: DataTypes.STRING(50) }, // Optionnel : enregistrer l'IP de l'action
    details: { type: DataTypes.JSON } // Optionnel : stocker des détails supplémentaires
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
  });

  return HistoriqueActionsUtilisateur;
};
