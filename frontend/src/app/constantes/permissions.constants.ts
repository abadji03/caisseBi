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

/**
 * Libellés historiques associés à chaque code — filet de sécurité de
 * transition : si une session/une base n'a pas encore les codes remplis,
 * hasPermission peut retomber sur le libellé français.
 */
export const CODE_TO_LABEL: Record<string, string> = {
  'sales.manage': 'Gérer les ventes',
  'sales.view': 'Voir les ventes',
  'sales.edit': 'Modifier les ventes',
  'cash.access': 'Accès à la caisse',
  'cash.manage': 'Gérer la caisse',
  'products.manage': 'Gérer les produits',
  'products.view': 'Voir les produits',
  'products.edit': 'Modifier les produits',
  'stock.manage': 'Gérer le stock',
  'stock.view': 'Voir le stock',
  'stock.edit': 'Modifier le stock',
  'clients.manage': 'Gérer les clients',
  'clients.view': 'Voir les clients',
  'clients.edit': 'Modifier les clients',
  'suppliers.manage': 'Gérer les fournisseurs',
  'suppliers.view': 'Voir les fournisseurs',
  'suppliers.edit': 'Modifier les fournisseurs',
  'finance.manage': 'Gérer les finances',
  'finance.view': 'Voir les finances',
  'finance.edit': 'Modifier les finances',
  'roles.manage': 'Gérer les rôles',
  'users.manage': 'Gérer les utilisateurs',
  'users.view': 'Voir les utilisateurs',
  'users.edit': 'Modifier un utilisateur',
  'users.delete': 'Supprimer un utilisateur',
  'stores.manage': 'Gérer les magasins',
  'stores.view': 'Voir les magasins',
  'stores.edit': 'Modifier les magasins',
  'config.access': 'Accès aux configurations',
  'reports.view': 'Voir les rapports',
  'reports.export': 'Exporter les rapports',
  'all.access': 'Accès total',
};