/**
 * Codes de permission stables (immuables) — SEULE source de vérité pour le
 * contrôle d'accès. Les libellés français (`nom`) servent uniquement à
 * l'affichage dans l'interface d'administration des rôles.
 *
 * NB : les libellés historiques sont conservés ici uniquement pour la
 * migration (LABEL_TO_CODE) et la compatibilité transitoire du middleware.
 */
const PERMISSIONS = Object.freeze({
  SALES_MANAGE: 'sales.manage', // Gérer les ventes
  SALES_VIEW: 'sales.view', // Voir les ventes
  SALES_EDIT: 'sales.edit', // Modifier les ventes
  CASH_ACCESS: 'cash.access', // Accès à la caisse
  CASH_MANAGE: 'cash.manage', // Gérer la caisse
  PRODUCTS_MANAGE: 'products.manage', // Gérer les produits
  PRODUCTS_VIEW: 'products.view', // Voir les produits
  PRODUCTS_EDIT: 'products.edit', // Modifier les produits
  STOCK_MANAGE: 'stock.manage', // Gérer le stock
  STOCK_VIEW: 'stock.view', // Voir le stock
  STOCK_EDIT: 'stock.edit', // Modifier le stock
  CLIENTS_MANAGE: 'clients.manage', // Gérer les clients
  CLIENTS_VIEW: 'clients.view', // Voir les clients
  CLIENTS_EDIT: 'clients.edit', // Modifier les clients
  SUPPLIERS_MANAGE: 'suppliers.manage', // Gérer les fournisseurs
  SUPPLIERS_VIEW: 'suppliers.view', // Voir les fournisseurs
  SUPPLIERS_EDIT: 'suppliers.edit', // Modifier les fournisseurs
  FINANCE_MANAGE: 'finance.manage', // Gérer les finances
  FINANCE_VIEW: 'finance.view', // Voir les finances
  FINANCE_EDIT: 'finance.edit', // Modifier les finances
  ROLES_MANAGE: 'roles.manage', // Gérer les rôles
  USERS_MANAGE: 'users.manage', // Gérer les utilisateurs
  USERS_VIEW: 'users.view', // Voir les utilisateurs
  USERS_EDIT: 'users.edit', // Modifier un utilisateur
  USERS_DELETE: 'users.delete', // Supprimer un utilisateur
  STORES_MANAGE: 'stores.manage', // Gérer les magasins
  STORES_VIEW: 'stores.view', // Voir les magasins
  STORES_EDIT: 'stores.edit', // Modifier les magasins
  CONFIG_ACCESS: 'config.access', // Accès aux configurations
  REPORTS_VIEW: 'reports.view', // Voir les rapports
  REPORTS_EXPORT: 'reports.export', // Exporter les rapports
  ALL_ACCESS: 'all.access', // Accès total (court-circuit, super-admin)
});

// Libellés historiques -> codes. Utilisé par la migration DB et par
// requirePermission pendant la période de compatibilité.
const LABEL_TO_CODE = Object.freeze({
  'Gérer les ventes': PERMISSIONS.SALES_MANAGE,
  'Voir les ventes': PERMISSIONS.SALES_VIEW,
  'Modifier les ventes': PERMISSIONS.SALES_EDIT,
  'Accès à la caisse': PERMISSIONS.CASH_ACCESS,
  'Gérer la caisse': PERMISSIONS.CASH_MANAGE,
  'Gérer les produits': PERMISSIONS.PRODUCTS_MANAGE,
  'Voir les produits': PERMISSIONS.PRODUCTS_VIEW,
  'Modifier les produits': PERMISSIONS.PRODUCTS_EDIT,
  'Gérer le stock': PERMISSIONS.STOCK_MANAGE,
  'Voir le stock': PERMISSIONS.STOCK_VIEW,
  'Modifier le stock': PERMISSIONS.STOCK_EDIT,
  'Gérer les clients': PERMISSIONS.CLIENTS_MANAGE,
  'Voir les clients': PERMISSIONS.CLIENTS_VIEW,
  'Modifier les clients': PERMISSIONS.CLIENTS_EDIT,
  'Gérer les fournisseurs': PERMISSIONS.SUPPLIERS_MANAGE,
  'Voir les fournisseurs': PERMISSIONS.SUPPLIERS_VIEW,
  'Modifier les fournisseurs': PERMISSIONS.SUPPLIERS_EDIT,
  'Gérer les finances': PERMISSIONS.FINANCE_MANAGE,
  'Voir les finances': PERMISSIONS.FINANCE_VIEW,
  'Modifier les finances': PERMISSIONS.FINANCE_EDIT,
  'Gérer les rôles': PERMISSIONS.ROLES_MANAGE,
  'Gérer les utilisateurs': PERMISSIONS.USERS_MANAGE,
  'Voir les utilisateurs': PERMISSIONS.USERS_VIEW,
  'Modifier un utilisateur': PERMISSIONS.USERS_EDIT,
  'Supprimer un utilisateur': PERMISSIONS.USERS_DELETE,
  'Gérer les magasins': PERMISSIONS.STORES_MANAGE,
  'Voir les magasins': PERMISSIONS.STORES_VIEW,
  'Modifier les magasins': PERMISSIONS.STORES_EDIT,
  'Accès aux configurations': PERMISSIONS.CONFIG_ACCESS,
  'Voir les rapports': PERMISSIONS.REPORTS_VIEW,
  'Exporter les rapports': PERMISSIONS.REPORTS_EXPORT,
  'Accès total': PERMISSIONS.ALL_ACCESS,
});

// Codes -> libellés (affichage / création des permissions manquantes en base).
const CODE_TO_LABEL = Object.freeze(
  Object.fromEntries(Object.entries(LABEL_TO_CODE).map(([label, code]) => [code, label]))
);

module.exports = { PERMISSIONS, LABEL_TO_CODE, CODE_TO_LABEL };
