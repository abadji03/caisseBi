import { NavigationItem } from '../modeles/user.model';

/**
 * Configuration unique de la navigation (sidebar).
 * Chaque item/enfant déclare les rôles autorisés ; le filtrage est fait
 * dans AuthService.getNavigationItems(). Les routes restent l'autorité
 * réelle (guards dans app.routes.ts) — ce filtre ne fait que masquer.
 */
const ADMIN = 'Administrateur';
const ADMIN_SEC = 'Administrateur secondaire';
const GERANT = 'Gérant';
const CAISSIER = 'Caissier';
const EMPLOYE = 'Employé';
const ADMIN_GENERAL = 'Administrateur Général';

const TOUS_SAUF_CAISSIER = [ADMIN, ADMIN_SEC, GERANT, EMPLOYE];
const GESTIONNAIRES = [ADMIN, ADMIN_SEC, GERANT];

export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    label: 'Accueil',
    icon: 'bi bi-house-door',
    route: '/caisse-bi/overview',
    titre: 'Accueil',
    sousTitre: 'Vue d\'ensemble',
    roles: TOUS_SAUF_CAISSIER,
    children: [
      { label: 'Vue d\'ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d\'ensemble', roles: TOUS_SAUF_CAISSIER },
    ],
  },
  {
    label: 'Ventes',
    icon: 'bi-cash-stack',
    route: '/caisse-bi/ventes',
    titre: 'Ventes',
    sousTitre: 'Gestion des ventes',
    roles: [...TOUS_SAUF_CAISSIER, CAISSIER],
    children: [
      { label: 'Ventes', route: '/caisse-bi/ventes', titre: 'Ventes', sousTitre: 'Gestion des ventes', roles: [...TOUS_SAUF_CAISSIER, CAISSIER] },
      { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse', roles: [...GESTIONNAIRES, CAISSIER, EMPLOYE] },
      { label: 'Clients', route: '/caisse-bi/client', titre: 'Ventes', sousTitre: 'Gestion des clients', roles: [...GESTIONNAIRES, CAISSIER] },
    ],
  },
  {
    label: 'Stock & Inventaire',
    icon: 'bi-box',
    route: '/caisse-bi/entrees-sorties',
    titre: 'Stock & Inventaire',
    sousTitre: 'Gestion des entrées/sorties',
    roles: GESTIONNAIRES,
    children: [
      { label: 'Entrées/Sorties', route: '/caisse-bi/entrees-sorties', titre: 'Stock & Inventaire', sousTitre: 'Gestion des entrées/sorties', roles: GESTIONNAIRES },
      { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock & Inventaire', sousTitre: 'Gestion du stock', roles: GESTIONNAIRES },
      { label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock & Inventaire', sousTitre: 'Gestion du catalogue', roles: GESTIONNAIRES },
    ],
  },
  {
    label: 'Stock',
    icon: 'bi-box',
    route: '/caisse-bi/stock',
    titre: 'Stock',
    sousTitre: 'Consultation du stock',
    roles: [CAISSIER, EMPLOYE],
    children: [
      { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock', sousTitre: 'Consultation du stock', roles: [CAISSIER, EMPLOYE] },
    ],
  },
  {
    label: 'Finance',
    icon: 'bi-wallet',
    route: '/caisse-bi/finance',
    titre: 'Finance',
    sousTitre: 'Gestion financière',
    roles: GESTIONNAIRES,
    children: [
      { label: 'Gestion Financière', route: '/caisse-bi/finance', titre: 'Finance', sousTitre: 'Gestion financière', roles: GESTIONNAIRES },
      { label: 'Fournisseurs', route: '/caisse-bi/fournisseur', titre: 'Finance', sousTitre: 'Gestion des fournisseurs', roles: GESTIONNAIRES },
    ],
  },
  {
    label: 'Rapports',
    icon: 'bi-graph-up',
    route: '/caisse-bi/rapport-financier',
    titre: 'Rapports',
    sousTitre: 'Rapport financier',
    roles: GESTIONNAIRES,
    children: [
      { label: 'Rapport financier', route: '/caisse-bi/rapport-financier', titre: 'Rapports', sousTitre: 'Rapport financier', roles: GESTIONNAIRES },
      { label: 'Rapport vente', route: '/caisse-bi/rapport-vente', titre: 'Rapports', sousTitre: 'Rapport de vente', roles: GESTIONNAIRES },
      { label: 'Rapport stock', route: '/caisse-bi/rapport-stk', titre: 'Rapports', sousTitre: 'Rapport de stock', roles: GESTIONNAIRES },
    ],
  },
  {
    label: 'Compte & Paramètres',
    icon: 'bi-gear',
    route: '/caisse-bi/magasins',
    titre: 'Compte & Paramètres',
    sousTitre: 'Gestion des magasins',
    roles: GESTIONNAIRES,
    children: [
      { label: 'Magasins', route: '/caisse-bi/magasins', titre: 'Compte & Paramètres', sousTitre: 'Gestion des magasins', roles: GESTIONNAIRES },
      { label: 'Paramètres', route: '/caisse-bi/parametres', titre: 'Compte & Paramètres', sousTitre: 'Gestion des paramètres', roles: [ADMIN, ADMIN_SEC] },
    ],
  },
  {
    label: 'Paramètres',
    icon: 'bi bi-house-door',
    route: '/caisse-bi/admin-general/structure',
    titre: 'Structures et utilisateurs',
    sousTitre: 'Gestion des structures',
    roles: [ADMIN_GENERAL],
    children: [
      { label: 'Structures', route: '/caisse-bi/admin-general/structure', titre: 'Administration générale', sousTitre: 'Gestion des structures', roles: [ADMIN_GENERAL] },
    ],
  },
];