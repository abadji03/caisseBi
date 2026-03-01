module.exports = (sequelize, DataTypes) => {
  const Reconciliation = sequelize.define('Reconciliation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    produitId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    magasinId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stockTheorique: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    stockPhysique: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    ecart: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // Calculé manuellement en JS
    },
    dateReconciliation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    responsable: {
      type: DataTypes.STRING,
    },
    note: {
      type: DataTypes.TEXT,
    },
    statut: {
      type: DataTypes.ENUM('validé', 'annulé'),
      defaultValue: 'validé',
    },
  });

  return Reconciliation;
};
