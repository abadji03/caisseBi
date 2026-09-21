/**
 * notification.model.ts
 * Modèles TypeScript pour le système de notifications.
 */

export type NotificationType =
  | 'STOCK_RUPTURE'
  | 'STOCK_ALERTE'
  | 'STOCK_REAPPRO'
  | 'STOCK_PEREMPTION'
  | 'BON_EN_ATTENTE'
  | 'PAIEMENT_RETARD'
  | 'RECONCILIATION_ATTENTE'
  | 'VENTE_IMPORTANTE'
  | 'OBJECTIF_ATTEINT'
  | 'RETOUR_MARCHANDISE'
  | 'UTILISATEUR_CREE'
  | 'CONNEXION_SUSPECTE'
  | 'TRANSFERT_RECU'
  | 'REMISE_EXCEPTIONNELLE'
  | 'IMPORT_TERMINE'
  | 'ERREUR_SYSTEME';

export type NotificationPriorite = 'critique' | 'importante' | 'informative';

export interface Notification {
  id: number;
  code_structure: string;
  userId: number | null;
  type: NotificationType;
  priorite: NotificationPriorite;
  titre: string;
  message: string;
  entiteType: string | null;
  entiteId: number | null;
  lienAction: string | null;
  lu: boolean;
  luAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  nonLues: number;
  total: number;
  page: number;
  totalPages: number;
}

export interface NotificationCountResponse {
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Métadonnées d'affichage par type
// ─────────────────────────────────────────────────────────────────────────────
export interface NotificationMeta {
  icone: string;        // Bootstrap icon class
  couleur: string;      // CSS color token
  libelle: string;      // Nom affiché
}

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  STOCK_RUPTURE:          { icone: 'bi-exclamation-octagon-fill', couleur: 'danger',  libelle: 'Rupture de stock'           },
  STOCK_ALERTE:           { icone: 'bi-exclamation-triangle-fill', couleur: 'danger', libelle: 'Stock critique'              },
  STOCK_REAPPRO:          { icone: 'bi-arrow-repeat',              couleur: 'warning', libelle: 'Réapprovisionnement'         },
  STOCK_PEREMPTION:       { icone: 'bi-clock-history',             couleur: 'danger',  libelle: 'Péremption imminente'        },
  BON_EN_ATTENTE:         { icone: 'bi-hourglass-split',           couleur: 'warning', libelle: 'Bon en attente'             },
  PAIEMENT_RETARD:        { icone: 'bi-wallet2',                   couleur: 'warning', libelle: 'Crédit en retard'           },
  RECONCILIATION_ATTENTE: { icone: 'bi-calculator',                couleur: 'warning', libelle: 'Réconciliation en retard'   },
  VENTE_IMPORTANTE:       { icone: 'bi-graph-up-arrow',            couleur: 'success', libelle: 'Vente importante'           },
  OBJECTIF_ATTEINT:       { icone: 'bi-trophy-fill',               couleur: 'success', libelle: 'Objectif atteint'           },
  RETOUR_MARCHANDISE:     { icone: 'bi-arrow-return-left',         couleur: 'info',    libelle: 'Retour marchandise'         },
  UTILISATEUR_CREE:       { icone: 'bi-person-plus-fill',          couleur: 'primary', libelle: 'Nouvel utilisateur'         },
  CONNEXION_SUSPECTE:     { icone: 'bi-shield-exclamation',        couleur: 'danger',  libelle: 'Connexion suspecte'         },
  TRANSFERT_RECU:         { icone: 'bi-box-arrow-in-down',         couleur: 'info',    libelle: 'Transfert reçu'             },
  REMISE_EXCEPTIONNELLE:  { icone: 'bi-percent',                   couleur: 'warning', libelle: 'Remise exceptionnelle'      },
  IMPORT_TERMINE:         { icone: 'bi-cloud-upload-fill',         couleur: 'success', libelle: 'Import terminé'             },
  ERREUR_SYSTEME:         { icone: 'bi-bug-fill',                  couleur: 'danger',  libelle: 'Erreur système'             },
};

/** Retourne l'icône Bootstrap Icon associée à un type */
export function getNotificationIcon(type: NotificationType): string {
  return NOTIFICATION_META[type]?.icone ?? 'bi-bell';
}

/** Retourne la classe CSS Bootstrap de couleur selon la priorité */
export function getPrioriteClass(priorite: NotificationPriorite): string {
  const map: Record<NotificationPriorite, string> = {
    critique:    'danger',
    importante:  'warning',
    informative: 'primary',
  };
  return map[priorite] ?? 'secondary';
}

/** Formater la date relative (ex: "il y a 3 min") */
export function formatDateRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const heures   = Math.floor(diff / 3600000);
  const jours    = Math.floor(diff / 86400000);

  if (minutes < 1)  return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (heures  < 24) return `Il y a ${heures}h`;
  if (jours   < 7)  return `Il y a ${jours} jour${jours > 1 ? 's' : ''}`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
