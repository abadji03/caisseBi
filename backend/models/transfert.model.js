module.exports = (sequelize, DataTypes) => {
  const Transfert = sequelize.define('Transfert', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code_structure: { type: DataTypes.STRING(38), allowNull: false },
    reference: { type: DataTypes.STRING(50), allowNull: false },
    produitId: { type: DataTypes.INTEGER, allowNull: false },
    quantite: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    magasinSource: { type: DataTypes.INTEGER, allowNull: false },
    magasinDestination: { type: DataTypes.INTEGER, allowNull: false },
    dateTransfert: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    statut: {
      type: DataTypes.ENUM('En attente', 'Validé', 'Refusé'),
      defaultValue: 'En attente',
    },
    motif: { type: DataTypes.TEXT },
    agentResponsable: { type: DataTypes.INTEGER, allowNull: false },
    dateValidation: { type: DataTypes.DATE },
    agentValidation: { type: DataTypes.INTEGER },
    // mouvementSortieId: { type: DataTypes.INTEGER },
    // mouvementEntreeId: { type: DataTypes.INTEGER },
  });

  return Transfert;
};
