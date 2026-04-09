module.exports = (sequelize, DataTypes) => {
  const HistoriqueConnexions = sequelize.define('HistoriqueConnexions', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ip: { type: DataTypes.STRING(50), allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    // Pas de tableName - utilise 'Magasin' comme nom de table
    // freezeTableName: true est déjà dans la config globale
    timestamps: true,
    underscored: true, // Convertit automatiquement camelCase en snake_case
  });

  return HistoriqueConnexions;
};
