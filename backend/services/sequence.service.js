/* // services/sequenceService.js
//const { sequelize, Sequence } = require('../models');

class SequenceService {
  static async getNextNumero(sequelize, Sequence,code_structure, entite) {
    return await sequelize.transaction(async (t) => {

        let sequence = await Sequence.findOne({
        where: { code_structure, entite },
        transaction: t,
        lock: t.LOCK.UPDATE // 🔥 vrai lock
        });

        if (!sequence) {
        sequence = await Sequence.create({
            code_structure,
            entite,
            dernier_numero: 1
        }, { transaction: t });

        return 1;
        }

        sequence.dernier_numero += 1;
        await sequence.save({ transaction: t });

        return sequence.dernier_numero;
    });
    }
}

module.exports = SequenceService; */
class SequenceService {
  static async getNextNumero(sequelize, Sequence, code_structure, entite, transaction = null) {

    // 🔥 utiliser transaction existante ou en créer une
    const t = transaction || await sequelize.transaction();

    try {
      let sequence = await Sequence.findOne({
        where: { code_structure, entite },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!sequence) {
        sequence = await Sequence.create({
          code_structure,
          entite,
          dernier_numero: 1
        }, { transaction: t });

        if (!transaction) await t.commit();
        return 1;
      }

      sequence.dernier_numero += 1;
      await sequence.save({ transaction: t });

      if (!transaction) await t.commit();

      return sequence.dernier_numero;

    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  }
}

module.exports = SequenceService; 