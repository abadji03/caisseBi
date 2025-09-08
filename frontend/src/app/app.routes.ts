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
import { EspaceVendeursComponent } from './caisse/acces_accueil/espace-vendeurs/espace-vendeurs.component';
import { OverviewComponent } from './caisse/parametres/overview/overview.component';
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
import { RapportsComponent } from './caisse/rapports/rapports/rapports.component';
import { RapportsVentesComponent } from './caisse/rapports/rapports-ventes/rapports-ventes.component';
import { RapportsStocksComponent } from './caisse/rapports/rapports-stocks/rapports-stocks.component';
/* import { LandingComponent } from './e-commerce/landing/landing.component';
import { UserLoginComponent } from './e-commerce/user-login/user-login.component';
import { UserAccountComponent } from './e-commerce/user-account/user-account.component';
import { ProduitsComponent } from './e-commerce/produits/produits.component'; */

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'connexion',
    pathMatch: 'full',
  },
  /* {
        path:'login',
        component:ConnexionComponent
    }, */

  {
    path: 'espace-vendeurs',
    component: EspaceVendeursComponent,
    children: [
      {
        path: '', // Redirection par défaut
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      /* {
                path:'user-account',
                component:UserAccountComponent
            }, */
      {
        path: 'fournisseurs',
        component: FournisseursComponent,
      },
      {
        path: 'catalogue-produits',
        component: CatalogueProduitComponent,
      },
      {
        path: 'clients',
        component: ClientsComponent,
      },

      {
        path: 'rapport-financier',
        component: RapportsFinanciersComponent,
      },
      {
        path: 'rapport-vente',
        component: RapportsVentesComponent,
      },
      {
        path: 'rapport-stk',
        component: RapportsStocksComponent,
      },
      {
        path: 'rapports',
        component: RapportsComponent,
      },
      {
        path: 'ventes',
        component: VentesComponent,
      },
      {
        path: 'parametres',
        component: ParametresComponent,
      },
      {
        path: 'entrees-sorties',
        component: EntreesSortiesComponent,
      },
      {
        path: 'magasins',
        component: MagazinComponent,
      },
      {
        path: 'gerant',
        component: GerantComponent,
      },
      {
        path: 'caisse',
        component: CaisseComponent,
      },
      /* {
                path:'produits',
                component: ProduitsComponent
            }, */
      /* {
                path:'enregistrement-produit',
                component: EnregistrementProduitsComponent
            }, */
      {
        path: 'stock',
        component: StockInventairesComponent,
      },
      {
        path: 'finance',
        component: FinanceComponent,
      },
      {
        path: 'overview',
        component: OverviewComponent,
      },
      /*  {
                path:'connexion',
                component:ConnexionComponent
            }, */
    ],
  },

  /* {
        path:'connexion',
        component:EnregistrementActeurComponent
    }, */

  /*  {
        path:'Allproducts',
        component:LandingComponent,
        children: [
            {
                path:'Allproducts',
                component:WebProduitsComponent
            },
            {
                path:'produits/:id',
                component:CategorieProduitsComponent
            },
            {
                path:'panier-client',
                component:PanierClientComponent
            },
            {
                path:'compte-client',
                component:ClientOrderComponent
            },
            {
                path:'user-login',
                component:UserLoginComponent
            },
            {
                path:'checkout-page',
                component:CheckoutComponent
            },
            {
                path:'client-order',
                component:ClientOrderComponent
            },
            {
                path:'details-produit/:id',
                component:DetailsProduitComponent
            },
            {
                path:'user-account',
                component:UserAccountComponent
            },
        ]
    }, */

  /* {
        path:'',
        component:LayoutComponent,
        children: [
            {
                path:'vente',
                component: VenteComponent
            },
            {
                path:'category',
                component: CategoriesComponent
            }
        ]
    } */
];
