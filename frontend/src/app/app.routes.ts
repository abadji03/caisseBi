import { Routes } from '@angular/router';
/* import { ConnexionComponent } from './caisse/acces_accueil/connexion/connexion.component';
import { WebProduitsComponent } from './e-commerce/web-produits/web-produits.component';
import { CategorieProduitsComponent } from './e-commerce/categorie-produits/categorie-produits.component';
import { LayoutComponent } from './e-commerce/layout/layout.component';
import { PanierClientComponent } from './e-commerce/panier-client/panier-client.component';
import { ClientOrderComponent } from './e-commerce/client-order/client-order.component';
import { CheckoutComponent } from './e-commerce/checkout/checkout.component';
import { DetailsProduitComponent } from './e-commerce/details-produit/details-produit.component'; */
// import { EnregistrementProduitsComponent } from './caisse/acces_accueil/enregistrement-produits/enregistrement-produits.component';
import { CaisseComponent } from './caisse/vente/caisse/caisse.component';
// import { VenteComponent } from './caisse/vente/vente/vente.component';
//import { EnregistrementActeurComponent } from './caisse/acces_accueil/enregistrement-acteur/enregistrement-acteur.component';
//import { EspaceVendeursComponent } from './caisse/acces_accueil/espace-vendeurs/espace-vendeurs.component';
import { OverviewComponent } from './caisse/acces_accueil/overview/overview.component';
import { VentesComponent } from './caisse/vente/ventes/ventes.component';
import { FournisseursComponent } from './caisse/finance/fournisseurs/fournisseurs.component';
import { ClientsComponent } from './caisse/vente/clients/clients.component';
import { RapportsFinanciersComponent } from './caisse/rapports/rapports-financiers/rapports-financiers.component';
import { ParametresComponent } from './caisse/parametres/parametres/parametres.component';
import { EntreesSortiesComponent } from './caisse/stock_inventaire/entrees-sorties/entrees-sorties.component';
import { StockInventairesComponent } from './caisse/stock_inventaire/stock-inventaires/stock-inventaires.component';
import { MagazinComponent } from './caisse/parametres/magazin/magazin.component';
import { GerantComponent } from './caisse/parametres/gerant/gerant.component';
import { CatalogueProduitComponent } from './caisse/stock_inventaire/catalogue-produit/catalogue-produit.component';
import { FinanceComponent } from './caisse/finance/finance/finance.component';
import { RapportsVentesComponent } from './caisse/rapports/rapports-ventes/rapports-ventes.component';
import { RapportsStocksComponent } from './caisse/rapports/rapports-stocks/rapports-stocks.component';
import { DashboardComponent } from './caisse/acces_accueil/dashboard/dashboard.component';
import { NotFoundComponent } from './caisse/notFoundPages/not-found/not-found.component';
import { roleGuard } from './guards/role.guard';
import { UnauthorizedComponent } from './caisse/notFoundPages/unauthorized/unauthorized.component';
import { authGuard } from './guards/auth.guard';
import { ConnexionComponent } from './caisse/acces_accueil/connexion/connexion.component';
import { PERMISSIONS } from './constantes/permissions.constants';
//import { StructureComponent } from './caisse/parametres/structure/structure.component';
import { generalAdminGuard } from './guards/general-admin.guard';
import { structureGuard } from './guards/structure.guard';
import { ParametresUsersAdminComponent } from './caisse/parametres/parametres-users-admin/parametres-users-admin.component';
//import { FournisseurComponent } from './caisse/finance/fournisseur/fournisseur.component';
/* import { LandingComponent } from './e-commerce/landing/landing.component';
import { UserLoginComponent } from './e-commerce/user-login/user-login.component';
import { UserAccountComponent } from './e-commerce/user-account/user-account.component';
import { ProduitsComponent } from './e-commerce/produits/produits.component'; */

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: ConnexionComponent,
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
  },
  {
    path: 'caisse-bi',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'admin-general',
        canActivate: [generalAdminGuard], // Nouveau guard spécifique
        children: [
          {
            path: 'structure',
            component: ParametresUsersAdminComponent, // Créez ce composant
            data: { title: 'Gestion des structures' }
          },
          /* {
            path: 'parametres',
            component: ParametresComponent, // Créez ce composant
            data: { title: 'Gestion des utilisateurs' }
          } */
        ]
      },
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        component: OverviewComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant', 'Caissier', 'Employé'],
          requireStructure: true 
        }
      },
      {
        path: 'ventes',
        component: VentesComponent,
        canActivate: [roleGuard,structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant', 'Caissier'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_SALES, PERMISSIONS.EDIT_SALES,PERMISSIONS.MANAGE_SALES]
        }
      },
      {
        path: 'caisse',
        component: CaisseComponent,
        canActivate: [roleGuard,structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant', 'Caissier'],
          requireStructure: true,
          permissions: [PERMISSIONS.ACCESS_CASHIER]
        }
      },
      {
        path: 'clients',
        component: ClientsComponent,
        canActivate: [roleGuard,structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_CLIENTS, PERMISSIONS.MANAGE_CLIENTS]
        }
      },
      {
        path: 'entrees-sorties',
        component: EntreesSortiesComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_STOCK]
        }
      },
      {
        path: 'stock',
        component: StockInventairesComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_STOCK]
        }
      },
      {
        path: 'catalogue-produits',
        component: CatalogueProduitComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.VIEW_PRODUCTS]
        }
      },
      {
        path: 'finance',
        component: FinanceComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_FINANCE, PERMISSIONS.EDIT_FINANCE, PERMISSIONS.VIEW_FINANCE,]
        }
      },
      {
        path: 'fournisseurs',
        component: FournisseursComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_SUPPLIERS]
        }
      },
      {
        path: 'rapport-financier',
        component: RapportsFinanciersComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_REPORTS]
        }
      },
      {
        path: 'rapport-vente',
        component: RapportsVentesComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_REPORTS]
        }
      },
      {
        path: 'rapport-stk',
        component: RapportsStocksComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur', 'Gérant'],
          requireStructure: true,
          permissions: [PERMISSIONS.VIEW_REPORTS]
        }
      },
      {
        path: 'magasins',
        component: MagazinComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_STORES]
        }
      },
      {
        path: 'gerant',
        component: GerantComponent,
        canActivate: [roleGuard, structureGuard],
        data: { 
          roles: ['Administrateur Général', 'Administrateur'],
          requireStructure: true,
          permissions: [PERMISSIONS.MANAGE_USERS]
        }
      },
      {
        path: 'parametres',
        component: ParametresComponent,
        canActivate: [roleGuard],
        data: { 
          roles: ['Administrateur'],
          permissions: [PERMISSIONS.MANAGE_SETTINGS]
        }
      },
    ],
  },
  {
    path: '**',
    component: NotFoundComponent,
  },
  
  ];
