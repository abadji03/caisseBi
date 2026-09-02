// services/sequence.service.js
//
// Génère un numéro séquentiel atomique par structure et entité.
// Utilise SELECT ... FOR UPDATE pour éviter les race conditions
// sur les créations simultanées.

class SequenceService {
  static async getNextNumero(sequelize, Sequence, code_structure, entite, transaction = null) {
    if (!code_structure) {
      return 0; // fallback pour l'admin général sans structure
    }

    // Utiliser la transaction fournie ou en créer une dédiée
    const t = transaction || (await sequelize.transaction());

    try {
      let sequence = await Sequence.findOne({
        where: { code_structure, entite },
        transaction: t,
        lock: t.LOCK.UPDATE, // verrou exclusif — évite la race condition
      });

      if (!sequence) {
        sequence = await Sequence.create(
          { code_structure, entite, dernier_numero: 1 },
          { transaction: t }
        );
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
