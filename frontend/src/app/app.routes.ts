import { Routes } from '@angular/router';
import { ConnexionComponent } from './pages/admin/connexion/connexion.component';
import { LandingComponent } from './pages/user/landing/landing.component';
import { WebProduitsComponent } from './pages/user/web-produits/web-produits.component';
import { CategorieProduitsComponent } from './pages/user/categorie-produits/categorie-produits.component';
import { LayoutComponent } from './pages/admin/layout/layout.component';
import { ProduitsComponent } from './pages/admin/produits/produits.component';
import { CategoriesComponent } from './pages/admin/categories/categories.component';
import { PanierClientComponent } from './pages/user/panier-client/panier-client.component';
import { ClientOrderComponent } from './pages/user/client-order/client-order.component';
import { UserLoginComponent } from './pages/user/user-login/user-login.component';
import { CheckoutComponent } from './pages/user/checkout/checkout.component';
import { DetailsProduitComponent } from './pages/user/details-produit/details-produit.component';
import { UserAccountComponent } from './pages/user/user-account/user-account.component';
import { EnregistrementProduitsComponent } from './pages/admin/enregistrement-produits/enregistrement-produits.component';
import { CaisseComponent } from './pages/admin/caisse/caisse.component';
import { VenteComponent } from './pages/admin/vente/vente.component';
import { VenteBComponent } from './pages/admin/vente-b/vente-b.component';
import { EnregistrementActeurComponent } from './pages/admin/enregistrement-acteur/enregistrement-acteur.component';
import { EspaceVendeursComponent } from './pages/user/espace-vendeurs/espace-vendeurs.component';
import { OverviewComponent } from './pages/user/overview/overview.component';
import { VentesComponent } from './pages/user/ventes/ventes.component';
import { FournisseursComponent } from './pages/user/fournisseurs/fournisseurs.component';
import { ClientsComponent } from './pages/user/clients/clients.component';
import { RapportsFinanciersComponent } from './pages/user/rapports-financiers/rapports-financiers.component';
import { ParametresComponent } from './pages/user/parametres/parametres.component';
import { EntreesSortiesComponent } from './pages/user/entrees-sorties/entrees-sorties.component';
import { StockInventairesComponent } from './pages/user/stock-inventaires/stock-inventaires.component';
import { MagazinComponent } from './pages/user/magazin/magazin.component';
import { GerantComponent } from './pages/user/gerant/gerant.component';
import { CatalogueProduitComponent } from './pages/user/catalogue-produit/catalogue-produit.component';
import { FinanceComponent } from './pages/user/finance/finance.component';
import { RapportsComponent } from './pages/user/rapports/rapports.component';

export const routes: Routes = [
    {
        path:'',
        redirectTo:'Allproducts',
        pathMatch:'full'
    },
    {
        path:'login',
        component:ConnexionComponent
    },
    {
        path:'venteB',
        component:VenteBComponent
    },

    {
        path:'espace-vendeurs',
        component:EspaceVendeursComponent,
        children: [

            {
                path: '',  // Redirection par défaut
                redirectTo: 'overview',
                pathMatch: 'full'
            },
            {
                path:'fournisseurs',
                component:FournisseursComponent
            },
            {
                path:'catalogue-produits',
                component:CatalogueProduitComponent
            },
            {
                path:'clients',
                component:ClientsComponent
            },

            {
                path:'rapports-financiers',
                component:RapportsFinanciersComponent
            },
            {
                path:'rapports',
                component:RapportsComponent
            },
            {
                path:'enregistrement-acteurs',
                component:EnregistrementActeurComponent
            },
            {
                path:'ventes',
                component:VentesComponent
            },
            {
                path:'parametres',
                component:ParametresComponent
            },
            {
                path:'entrees-sorties',
                component:EntreesSortiesComponent
            },
            {
                path:'magasins',
                component:MagazinComponent
            },
            {
                path:'gerant',
                component:GerantComponent
            },
            {
                path:'caisse',
                component: CaisseComponent
            },
            {
                path:'produits',
                component: ProduitsComponent
            },
            {
                path:'enregistrement-produit',
                component: EnregistrementProduitsComponent
            },
            {
                path:'stock',
                component:StockInventairesComponent
            },
            {
                path:'finance',
                component:FinanceComponent
            },
            {
                path:'overview',
                component:OverviewComponent
            },
        ]
    },
    {
        path:'',
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
    },


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
