module.exports = (sequelize, DataTypes) => {
  const HistoriqueConnexions = sequelize.define("HistoriqueConnexions", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ip: { type: DataTypes.STRING(50), allowNull: false }
  });

  return HistoriqueConnexions;
};
