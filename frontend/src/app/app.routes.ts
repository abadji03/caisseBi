import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';
import { authGuard } from './guards/auth.guard';
import { generalAdminGuard } from './guards/general-admin.guard';
import { structureGuard } from './guards/structure.guard';
import { PERMISSIONS } from './constantes/permissions.constants';

/**
 * Routes en lazy loading (loadComponent) : chaque page est chargee a la
 * demande afin de reduire le bundle initial. Les guards et permissions
 * restent inchanges. Les routes obsoletes (/clients, /fournisseurs,
 * /gerant, e-commerce) ont ete supprimees.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./caisse/acces_accueil/connexion/connexion.component').then(m => m.ConnexionComponent),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./caisse/notFoundPages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent),
  },
  {
    path: 'caisse-bi',
    loadComponent: () =>
      import('./caisse/acces_accueil/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'admin-general',
        canActivate: [generalAdminGuard],
        children: [
          {
            path: 'structure',
            loadComponent: () =>
              import('./caisse/parametres/parametres-users-admin/parametres-users-admin.component')
                .then(m => m.ParametresUsersAdminComponent),
            data: { title: 'Gestion des structures' }
          },
        ]
      },
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./caisse/acces_accueil/overview/overview.component').then(m => m.OverviewComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant', 'Caissier', 'Employé'],
          requireStructure: true
        }
      },
      {
        path: 'ventes',
        loadComponent: () =>
          import('./caisse/vente/ventes/ventes.component').then(m => m.VentesComponent),
        canActivate: [roleGuard,structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant', 'Caissier'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_SALES, PERMISSIONS.EDIT_SALES,PERMISSIONS.MANAGE_SALES]
        }
      },
      {
        path: 'caisse',
        loadComponent: () =>
          import('./caisse/vente/caisse/caisse.component').then(m => m.CaisseComponent),
        canActivate: [roleGuard,structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant', 'Caissier'],
          requireStructure: true,
          permissions: [PERMISSIONS.ACCESS_CASHIER]
        }
      },
      {
        path: 'client',
        loadComponent: () =>
          import('./caisse/vente/client/client.component').then(m => m.ClientComponent),
        canActivate: [roleGuard,structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_CLIENTS, PERMISSIONS.MANAGE_CLIENTS]
        }
      },
      {
        path: 'entrees-sorties',
        loadComponent: () =>
          import('./caisse/stock_inventaire/entrees-sorties/entrees-sorties.component').then(m => m.EntreesSortiesComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_STOCK]
        }
      },
      {
        path: 'stock',
        loadComponent: () =>
          import('./caisse/stock_inventaire/stock-inventaires/stock-inventaires.component').then(m => m.StockInventairesComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_STOCK]
        }
      },
      {
        path: 'catalogue-produits',
        loadComponent: () =>
          import('./caisse/stock_inventaire/catalogue-produit/catalogue-produit.component').then(m => m.CatalogueProduitComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.VIEW_PRODUCTS]
        }
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./caisse/finance/finance/finance.component').then(m => m.FinanceComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_FINANCE, PERMISSIONS.EDIT_FINANCE, PERMISSIONS.VIEW_FINANCE,]
        }
      },
      {
        path: 'fournisseur',
        loadComponent: () =>
          import('./caisse/finance/fournisseur/fournisseur.component').then(m => m.FournisseurComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_SUPPLIERS]
        }
      },
      {
        path: 'rapport-financier',
        loadComponent: () =>
          import('./caisse/rapports/rapports-financiers/rapports-financiers.component').then(m => m.RapportsFinanciersComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_REPORTS]
        }
      },
      {
        path: 'rapport-vente',
        loadComponent: () =>
          import('./caisse/rapports/rapports-ventes/rapports-ventes.component').then(m => m.RapportsVentesComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_REPORTS]
        }
      },
      {
        path: 'rapport-stk',
        loadComponent: () =>
          import('./caisse/rapports/rapports-stocks/rapports-stocks.component').then(m => m.RapportsStocksComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_REPORTS]
        }
      },
      {
        path: 'magasins',
        loadComponent: () =>
          import('./caisse/parametres/magazin/magazin.component').then(m => m.MagazinComponent),
        canActivate: [roleGuard, structureGuard],
        data: {
          roles: ['Administrateur Général', 'Administrateur','Administrateur secondaire'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_STORES]
        }
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./caisse/parametres/parametres/parametres.component').then(m => m.ParametresComponent),
        canActivate: [roleGuard],
        data: {
          roles: ['Administrateur','Administrateur secondaire'],
          permissions: [PERMISSIONS.MANAGE_SETTINGS]
        }
      },
      {
        path: 'import-donnees',
        loadComponent: () =>
          import('./caisse/parametres/import/import.component').then(m => m.ImportComponent),
        canActivate: [roleGuard],
        data: {
          roles: ['Administrateur','Administrateur secondaire'],
          permissions: [PERMISSIONS.MANAGE_SETTINGS]
        }
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./caisse/notFoundPages/not-found/not-found.component').then(m => m.NotFoundComponent),
  },

  ];

