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

  /**
   * Formate un numéro métier court et lisible à partir du compteur séquentiel.
   * Exemples : BON-26-0007, PAI-26-0042, FAC-26-0013.
   *
   * Unicité garantie par la combinaison (code_structure, entite) de la
   * séquence : numeroE est strictement croissant par structure, donc le
   * numéro formaté ne peut pas entrer en collision, même d'une année à
   * l'autre (l'année du préfixe est seulement cosmétique).
   */
  static formaterNumero(prefix, annee, numeroE, largeur = 4) {
    const yy = String(annee % 100).padStart(2, '0');
    return `${prefix}-${yy}-${String(numeroE).padStart(largeur, '0')}`;
  }

  /**
   * Récupère le prochain numéro de séquence ET le formate en une seule étape.
   * L'année est prise à la date courante (date de création du document).
   */
  static async getNextNumeroFormate(sequelize, Sequence, code_structure, entite, prefix, transaction = null, largeur = 4) {
    const numeroE = await SequenceService.getNextNumero(sequelize, Sequence, code_structure, entite, transaction);
    return { numeroE, numero: SequenceService.formaterNumero(prefix, new Date().getFullYear(), numeroE, largeur) };
  }

  /**
   * Détecte un numéro "auto-généré" (absent, uuid front, timestamp front).
   * Utilisé pour remplacer le numéro par le format court serveur sur
   * CHAQUE save (création ET mise à jour), sans jamais écraser une
   * référence humaine ou externe fournie par l'utilisateur.
   */
  static estNumeroAuto(prefix, numero) {
    if (!numero) return true;
    // uuid généré par le front : BON-xxxxxxxx-xxxx-...
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(numero).replace(/^[A-Za-z]+-/, ''))) return true;
    // numéro timestamp front : PREFIX-1759878028276-742
    const p = String(prefix).replace(/[.*+?^`{}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + p + '-\\d{13}-\\d+$').test(numero);
  }
}

module.exports = SequenceService;
