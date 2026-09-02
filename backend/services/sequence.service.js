// services/sequence.service.js
//
// Génère un numéro séquentiel atomique par structure et entité.
// Utilise SELECT ... FOR UPDATE pour éviter les race conditions
// sur les créations simultanées.

class SequenceService {
  /**
   * Initialise une séquence manquante à partir de la valeur MAX existante
   * de la table source. Évite que la première utilisation de la séquence
   * reparte à 1 et entre en collision avec les données déjà en base.
   */
  static async initialiserDepuisMax(sourceModel, champ, Sequence, code_structure, entite, transaction = null) {
    if (!code_structure || !sourceModel || !Sequence) return;

    const t = transaction || (await sourceModel.sequelize.transaction());

    try {
      const existante = await Sequence.findOne({
        where: { code_structure, entite },
        transaction: t,
        lock: t.LOCK ? t.LOCK.UPDATE : undefined,
      });
      if (existante) {
        if (!transaction) await t.commit();
        return;
      }

      const maxActuel = await sourceModel.max(champ, {
        where: { code_structure },
        transaction: t,
      });

      await Sequence.create(
        { code_structure, entite, dernier_numero: maxActuel || 0 },
        { transaction: t }
      );

      if (!transaction) await t.commit();
    } catch (error) {
      if (!transaction) await t.rollback();
      throw error;
    }
  }

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
