/**
 * Codes de permission stables — alignés sur backend/constants/permissions.js.
 * Les codes sont les seuls identifiants du contrôle d'accès ; les libellés
 * français ne servent qu'à l'affichage (voir l'écran Rôles & Permissions).
 */
export const PERMISSIONS = {
  // Permissions utilisateurs
  VIEW_USERS: 'users.manage',
  EDIT_USER: 'users.manage',
  DELETE_USER: 'users.manage',
  MANAGE_USERS: 'users.manage',
  MANAGE_ROLES: 'roles.manage',

  // Permissions rapports
  VIEW_REPORTS: 'finance.manage',
  EXPORT_REPORTS: 'finance.manage',

  // Permissions ventes
  VIEW_SALES: 'sales.manage',
  EDIT_SALES: 'sales.manage',
  MANAGE_SALES: 'sales.manage',

  // Permissions caisse
  ACCESS_CASHIER: 'cash.access',
  MANAGE_CASHIER: 'sales.manage',

  // Permissions clients
  VIEW_CLIENTS: 'clients.manage',
  EDIT_CLIENTS: 'clients.manage',
  MANAGE_CLIENTS: 'clients.manage',

  // Permissions stock
  VIEW_STOCK: 'stock.manage',
  EDIT_STOCK: 'stock.manage',
  MANAGE_STOCK: 'stock.manage',

  // Permissions produits
  VIEW_PRODUCTS: 'products.manage',
  EDIT_PRODUCTS: 'products.manage',
  MANAGE_PRODUCTS: 'products.manage',

  // Permissions fournisseurs
  VIEW_SUPPLIERS: 'suppliers.manage',
  EDIT_SUPPLIERS: 'suppliers.manage',
  MANAGE_SUPPLIERS: 'suppliers.manage',

  // Permissions finances
  VIEW_FINANCE: 'finance.manage',
  EDIT_FINANCE: 'finance.manage',
  MANAGE_FINANCE: 'finance.manage',

  // Permissions magasins
  VIEW_STORES: 'stores.manage',
  EDIT_STORES: 'stores.manage',
  MANAGE_STORES: 'stores.manage',

  // Permissions paramètres
  MANAGE_SETTINGS: 'config.access',
  FULL_ACCESS: 'all.access'
} as const;