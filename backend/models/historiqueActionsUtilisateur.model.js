module.exports = (sequelize, DataTypes) => {
  const HistoriqueActionsUtilisateur = sequelize.define("HistoriqueActionsUtilisateur", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    action: { type: DataTypes.TEXT, allowNull: false }
  });

  return HistoriqueActionsUtilisateur;
};
