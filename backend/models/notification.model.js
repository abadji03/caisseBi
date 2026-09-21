const logger = require('../services/logger.js');

/**
 * Modèle Notification
 * 
 * Types gérés :
 *   STOCK_RUPTURE          — stock à 0
 *   STOCK_ALERTE           — stock ≤ seuilAlerte
 *   STOCK_REAPPRO          — stock ≤ seuilReapprovisionnement
 *   STOCK_PEREMPTION       — datePeremption ≤ aujourd'hui + 7j
 *   BON_EN_ATTENTE         — bon en_cours depuis > 24h
 *   PAIEMENT_RETARD        — crédit client impayé > X jours
 *   RECONCILIATION_ATTENTE — aucune réconciliation depuis > 7j
 *   VENTE_IMPORTANTE       — vente au-dessus d'un seuil
 *   OBJECTIF_ATTEINT       — CA journalier ≥ objectif
 *   RETOUR_MARCHANDISE     — panier retourné
 *   UTILISATEUR_CREE       — nouveau compte utilisateur
 *   CONNEXION_SUSPECTE     — tentatives échouées ≥ 3
 *   TRANSFERT_RECU         — transfert inter-magasins reçu
 *   REMISE_EXCEPTIONNELLE  — remise > seuil configuré
 *   IMPORT_TERMINE         — import CSV/Excel terminé
 *   ERREUR_SYSTEME         — erreur technique
 */

module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code_structure: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Structure propriétaire de la notification',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Destinataire précis (null = tous les admins/gérants de la structure)",
    },
    type: {
      type: DataTypes.ENUM(
        'STOCK_RUPTURE',
        'STOCK_ALERTE',
        'STOCK_REAPPRO',
        'STOCK_PEREMPTION',
        'BON_EN_ATTENTE',
        'PAIEMENT_RETARD',
        'RECONCILIATION_ATTENTE',
        'VENTE_IMPORTANTE',
        'OBJECTIF_ATTEINT',
        'RETOUR_MARCHANDISE',
        'UTILISATEUR_CREE',
        'CONNEXION_SUSPECTE',
        'TRANSFERT_RECU',
        'REMISE_EXCEPTIONNELLE',
        'IMPORT_TERMINE',
        'ERREUR_SYSTEME'
      ),
      allowNull: false,
    },
    priorite: {
      type: DataTypes.ENUM('critique', 'importante', 'informative'),
      defaultValue: 'informative',
      comment: 'critique = rouge, importante = orange, informative = bleu',
    },
    titre: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Données contextuelles (entité concernée)
    entiteType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Ex: produit, bon, client, magasin, user',
    },
    entiteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID de l'entité concernée",
    },
    // Route de navigation cible au clic
    lienAction: {
      type: DataTypes.STRING(300),
      allowNull: true,
      comment: "Route Angular à ouvrir au clic (ex: /caisse-bi/stocks)",
    },
    lu: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    luAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Données supplémentaires en JSON libre
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Données contextuelles supplémentaires (quantite, seuilAlerte, magasin...)',
    },
  }, {
    tableName: 'notification',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['code_structure', 'lu'] },
      { fields: ['user_id', 'lu'] },
      { fields: ['type'] },
      { fields: ['created_at'] },
    ],
  });

  return Notification;
};
