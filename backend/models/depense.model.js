module.exports = (sequelize, DataTypes) => {
  const Depense = sequelize.define('Depense', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    code_structure: { type: DataTypes.STRING, allowNull: false },
    montant: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    type: {
      type: DataTypes.ENUM('STANDARD', 'STOCK'),
      defaultValue: 'STANDARD',
    },
    description: { type: DataTypes.TEXT },
    paymentMode: { type: DataTypes.STRING(50), allowNull: false },
    receipt: { type: DataTypes.STRING },
  });

  return Depense;
};
