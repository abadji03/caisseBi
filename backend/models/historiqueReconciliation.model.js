module.exports = (sequelize, DataTypes) => {
  const HistoriqueReconciliation = sequelize.define('HistoriqueReconciliation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    code_structure: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    ecart: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    note: { type: DataTypes.TEXT },
  });

  return HistoriqueReconciliation;
};
