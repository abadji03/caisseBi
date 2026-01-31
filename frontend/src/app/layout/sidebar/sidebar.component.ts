import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
//import { TitreService } from '../../services/titre.service';
import { CommonModule } from '@angular/common';
import { NavigationItem } from '../../modeles/user.model';
import { AuthService } from '../../services/auth.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit{

  @Output() toggleSidebar = new EventEmitter<void>();
  isSidebarCollapsed = false;
  @Input() isCollapsed = false;
  openSubtitre: string | null = null;
  sidebarItems: NavigationItem[] = [];


  /* sidebarItems: SidebarItem[] = [
    {
      label: 'Accueil',
      icon: 'bi bi-house-door',
      route: '/caisse-bi/overview',
      titre: 'Accueil',
      sousTitre: 'Vue d’ensemble',
      children: [
        { label: 'Vue d’ensemble', route: '/caisse-bi/overview', titre: 'Accueil', sousTitre: 'Vue d’ensemble' },
      ],
    },
    { 
      label: 'Ventes', 
      icon: 'bi-cash-stack', 
      route: '/caisse-bi/ventes', 
      titre: 'Ventes', 
      sousTitre: 'Gestion des ventes',
      children: [
        { label: 'Ventes', route: '/caisse-bi/ventes', titre: 'Ventes', sousTitre: 'Gestion des ventes' },
        { label: 'Caisse', route: '/caisse-bi/caisse', titre: 'Ventes', sousTitre: 'Gestion de la caisse' },
        { label: 'Clients', route: '/caisse-bi/clients', titre: 'Ventes', sousTitre: 'Gestion des clients' }
      ]
    },
    { 
      label: 'Stock & Inventaire', 
      icon: 'bi-box', 
      route: '/caisse-bi/entrees-sorties', 
      titre: 'Stock & Inventaire', 
      sousTitre: 'Gestion des entrées/sorties',
      children: [
        { label: 'Entrées/Sorties', route: '/caisse-bi/entrees-sorties', titre: 'Stock & Inventaire', sousTitre: 'Gestion des entrées/sorties' },
        { label: 'Stock', route: '/caisse-bi/stock', titre: 'Stock & Inventaire', sousTitre: 'Gestion du stock' },
        { label: 'Catalogue', route: '/caisse-bi/catalogue-produits', titre: 'Stock & Inventaire', sousTitre: 'Gestion du catalogue' },
        { label: 'Ajout Produit', route: '/caisse-bi/enregistrement-produit', titre: 'Stock & Inventaire', sousTitre: 'Gestion des produits' }
      ]
    },
    { 
      label: 'Finance', 
      icon: 'bi-wallet', 
      route: '/caisse-bi/finance', 
      titre: 'Finance', 
      sousTitre: 'Gestion financière',
      children: [
        { label: 'Gestion Financière', route: '/caisse-bi/finance', titre: 'Finance', sousTitre: 'Gestion financière' },
        { label: 'Fournisseurs', route: '/caisse-bi/fournisseurs', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' },
        //{ label: 'Fournisseur', route: '/caisse-bi/fournisseur', titre: 'Finance', sousTitre: 'Gestion des fournisseurs' }

      ]
    },
    { 
      label: 'Rapports', 
      icon: 'bi-graph-up', 
      route: '/caisse-bi/rapport-financier', 
      titre: 'Rapports', 
      sousTitre: 'Rapport financier',
      children: [
        { label: 'Rapport financier', route: '/caisse-bi/rapport-financier', titre: 'Rapports', sousTitre: 'Rapport financier' },
        { label: 'Rapport vente', route: '/caisse-bi/rapport-vente', titre: 'Rapports', sousTitre: 'Rapport de vente' },
        { label: 'Rapport stock', route: '/caisse-bi/rapport-stk', titre: 'Rapports', sousTitre: 'Rapport de stock' }
      ]
    },
    { 
      label: 'Compte & Paramètres', 
      icon: 'bi-gear', 
      route: '/caisse-bi/magasins', 
      titre: 'Compte & Paramètres', 
      sousTitre: 'Gestion des magasins',
      children: [
        { label: 'Magasins', route: '/caisse-bi/magasins', titre: 'Compte & Paramètres', sousTitre: 'Gestion des magasins' },
        { label: 'Personnel', route: '/caisse-bi/gerant', titre: 'Compte & Paramètres', sousTitre: 'Gestion du personnel' },
        { label: 'Paramètres', route: '/caisse-bi/parametres', titre: 'Compte & Paramètres', sousTitre: 'Gestion des paramètres' }
      ]
    }
  ]; */

//private router = inject(Router);
//private titreService = inject(TitreService);
private authService = inject(AuthService);
private logger = inject(NGXLogger);

 ngOnInit(): void {
    this.loadNavigationItems();
    
    // Recharger les items si l'utilisateur change
    this.authService.currentUser.subscribe((user) => {
      if (user && user.id) { // Vérifier que l'utilisateur est bien connecté
        this.loadNavigationItems();
      }
    });
  }
  private loadNavigationItems(): void {
    this.sidebarItems = this.authService.getNavigationItems();
    // Si aucun item n'est disponible, afficher un message
    if (this.sidebarItems.length === 0) {
      this.logger.warn('Aucun élément de navigation disponible pour cet utilisateur');
    }
  }

toggleCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.toggleSidebar.emit();
  }

toggleSubtitre(titre: string): void {
    this.openSubtitre = this.openSubtitre === titre ? null : titre;
  }

isSubtitreOpen(titre: string): boolean {
    return this.openSubtitre === titre;
  }

/* onSelect(item: SidebarItem): void {
    this.titreService.setTitre(item.titre, item.sousTitre || '');
    this.router.navigate([item.route]);
} */
canShowItem(item: NavigationItem): boolean {
    if (item.requiredRole && !this.authService.hasRole(item.requiredRole)) {
      return false;
    }
    if (item.requiredPermission && !this.authService.hasPermission(item.requiredPermission)) {
      return false;
    }
    return true;
}
}
