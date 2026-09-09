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
  CASH_ACCESS: 'cash.access', // Accès à la caisse
  PRODUCTS_MANAGE: 'products.manage', // Gérer les produits
  STOCK_MANAGE: 'stock.manage', // Gérer le stock
  CLIENTS_MANAGE: 'clients.manage', // Gérer les clients
  SUPPLIERS_MANAGE: 'suppliers.manage', // Gérer les fournisseurs
  FINANCE_MANAGE: 'finance.manage', // Gérer les finances
  ROLES_MANAGE: 'roles.manage', // Gérer les rôles
  USERS_MANAGE: 'users.manage', // Gérer les utilisateurs
  STORES_MANAGE: 'stores.manage', // Gérer les magasins
  CONFIG_ACCESS: 'config.access', // Accès aux configurations
  ALL_ACCESS: 'all.access', // Accès total (court-circuit, super-admin)
});

// Libellés historiques -> codes. Utilisé par la migration DB et par
// requirePermission pendant la période de compatibilité.
const LABEL_TO_CODE = Object.freeze({
  'Gérer les ventes': PERMISSIONS.SALES_MANAGE,
  'Accès à la caisse': PERMISSIONS.CASH_ACCESS,
  'Gérer les produits': PERMISSIONS.PRODUCTS_MANAGE,
  'Gérer le stock': PERMISSIONS.STOCK_MANAGE,
  'Gérer les clients': PERMISSIONS.CLIENTS_MANAGE,
  'Gérer les fournisseurs': PERMISSIONS.SUPPLIERS_MANAGE,
  'Gérer les finances': PERMISSIONS.FINANCE_MANAGE,
  'Gérer les rôles': PERMISSIONS.ROLES_MANAGE,
  'Gérer les utilisateurs': PERMISSIONS.USERS_MANAGE,
  'Gérer les magasins': PERMISSIONS.STORES_MANAGE,
  'Accès aux configurations': PERMISSIONS.CONFIG_ACCESS,
  'Accès total': PERMISSIONS.ALL_ACCESS,
});

// Codes -> libellés (affichage / création des permissions manquantes en base).
const CODE_TO_LABEL = Object.freeze(
  Object.fromEntries(Object.entries(LABEL_TO_CODE).map(([label, code]) => [code, label]))
);

module.exports = { PERMISSIONS, LABEL_TO_CODE, CODE_TO_LABEL };
