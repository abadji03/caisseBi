import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
//import { TitreService } from '../../services/titre.service';
import { CommonModule } from '@angular/common';
import { NavigationItem } from '../../modeles/user.model';
import { AuthService } from '../../services/auth.service';
import { NGXLogger } from 'ngx-logger';
import { StructureService } from '../../services/structure.service';
import { filter, finalize, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit,OnDestroy{

  @Output() toggleSidebar = new EventEmitter<void>();
  isSidebarCollapsed = false;
  @Input() isCollapsed = false;
  openSubtitre: string | null = null;
  sidebarItems: NavigationItem[] = [];
  private structureService = inject(StructureService);
  logoUrl = './assets/CMP.png';
  code_structure: string | null = null;
  nomStructure = 'Ma Structure';
  isloading = false;

  private destroy$ = new Subject<void>();
  


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
private router = inject(Router);


 ngOnInit(): void {
    this.loadNavigationItems();
    
    // Recharger les items si l'utilisateur change
     this.authService.currentUser
    .pipe(takeUntil(this.destroy$))
    .subscribe((user) => {
      if (user?.id) {
        this.code_structure = user.code_structure || null;
        this.loadNavigationItems();
        this.loadStructureLogo();
        this.openSubmenuFromRoute();
      }
    });

  // 🔥 Écoute les changements de route (navigation interne)
  this.router.events
    .pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    )
    .subscribe(() => {
      this.openSubmenuFromRoute();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private openSubmenuFromRoute(): void {
    const currentUrl = this.router.url;

    for (const item of this.sidebarItems) {
      if (item.children?.some(child => currentUrl.startsWith(child.route))) {
        this.openSubtitre = item.label;
        return;
      }
    }

    this.openSubtitre = null;
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

  /**
   * Indique si un groupe du menu contient la page actuellement affichée :
   * sert à mettre en évidence le groupe parent dans la sidebar.
   */
  isGroupActive(item: NavigationItem): boolean {
    const url = this.router.url.split('?')[0];
    if (url === item.route) return true;
    return (item.children || []).some(child => url.startsWith(child.route));
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

 loadStructureLogo(): void {
    if (!this.code_structure) {
      this.logger.error('Code structure non défini pour l’utilisateur actuel.');
      return;
    }
      this.structureService
        .getByCodeStructure(this.code_structure)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isloading = false))
        )
        .subscribe({
          next: (structure) => {
            if (structure.logo) {
              this.logoUrl = structure.logo;
              this.nomStructure = structure.nom_structure || 'Ma Structure';
            }
          },
          error: (err) => {
            console.error('Erreur lors du chargement des détails de la structure:', err);
          }
        });
    } 
}
