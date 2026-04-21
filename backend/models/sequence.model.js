// models/sequence.js
module.exports = (sequelize, DataTypes) => {
  const Sequence = sequelize.define('Sequence', {
    code_structure: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    entite: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    dernier_numero: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  }, {
    timestamps: false,
    underscored: true,
    engine: 'InnoDB',
    indexes: [
        {
        //unique: true,
        fields: ['code_structure', 'entite']
        }
    ]
  });

  return Sequence;
};