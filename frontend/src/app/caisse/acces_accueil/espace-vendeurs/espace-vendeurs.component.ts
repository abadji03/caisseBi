import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Chart as ChartJS, registerables } from 'chart.js';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterModule,
  RouterOutlet,
} from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';

// Enregistrer les éléments nécessaires dans Chart.js
ChartJS.register(...registerables);

@Component({
  selector: 'app-espace-vendeurs',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, RouterOutlet, RouterLinkActive],
  templateUrl: './espace-vendeurs.component.html',
  styleUrl: './espace-vendeurs.component.css',
})
export class EspaceVendeursComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  activeAccordion: string | null = null;

  menu = 'Accueil';
  subMenu = 'Tableau de bord';

  // Track the state of submenus
  private openSubMenu: string | null = null;
  //activeSection: string = 'overview';  // Par défaut, la section "Vue d'ensemble" est active.

  currentMenu = 'Accueil';
  currentSubMenu = "Vue d'ensemble";
  fullTitle = '';
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event: unknown) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),

    )
      .subscribe(() => {
        this.updateTitles();
      });
  }

   ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  updateTitles(): void {
    const url = this.router.url;
    //console.log(url)
    // Déterminer le menu principal en fonction de l'URL
    if (url.includes('overview')) {
      this.currentMenu = 'Accueil';
      this.currentSubMenu = "Vue d'ensemble";
    } else if (url.includes('ventes') || url.includes('caisse') || url.includes('clients')) {
      this.currentMenu = 'Ventes';
      if (url.includes('ventes')) this.currentSubMenu = 'Gestion des ventes';
      else if (url.includes('caisse')) this.currentSubMenu = 'Gestion de la caisse';
      else if (url.includes('clients')) this.currentSubMenu = 'Gestion des clients';
    } else if (
      url.includes('entrees-sorties') ||
      url.includes('stock') ||
      url.includes('catalogue-produits') ||
      url.includes('enregistrement-produit')
    ) {
      this.currentMenu = 'Stock & Inventaire';
      if (url.includes('entrees-sorties')) this.currentSubMenu = 'Gestion des entrées/sorties';
      else if (url.includes('stock')) this.currentSubMenu = 'Gestion du stock';
      else if (url.includes('catalogue-produits')) this.currentSubMenu = 'Gestion du catalogue';
      else if (url.includes('enregistrement-produit')) this.currentSubMenu = 'Gestion des produits';
    } else if (url.includes('finance') || url.includes('fournisseurs')) {
      this.currentMenu = 'Finance';
      if (url.includes('finance')) this.currentSubMenu = 'Gestion financière';
      else if (url.includes('fournisseurs')) this.currentSubMenu = 'Gestion des fournisseurs';
    } else if (this.router.url.startsWith('/espace-vendeurs/rapport-')) {
      /* else if (url.includes('rapport-financier')|| url.includes('rapport-vente')|| url.includes('rapport-stk')) {
      this.currentMenu = 'Rapports';
      if (url.includes('rapport-financier')) this.currentSubMenu = 'Rapport financier';
      else if (url.includes('rapport-vente')) this.currentSubMenu = 'Rapport de vente';
      else if (url.includes('rapport-stk')) this.currentSubMenu = 'Rapport de stock'; 
    } */
      this.currentMenu = 'Rapports';
      if (this.router.url === '/espace-vendeurs/rapport-financier') {
        this.currentSubMenu = 'Rapport financier';
      } else if (this.router.url === '/espace-vendeurs/rapport-vente') {
        this.currentSubMenu = 'Rapport de vente';
      } else if (this.router.url === '/espace-vendeurs/rapport-stk') {
        this.currentSubMenu = 'Rapport de stock';
      }
    } else if (url.includes('magasins') || url.includes('gerant') || url.includes('parametres')) {
      this.currentMenu = 'Compte & Paramètres';
      if (url.includes('magasins')) this.currentSubMenu = 'Gestion des magasins';
      else if (url.includes('gerant')) this.currentSubMenu = 'Gestion du personnel';
      else if (url.includes('parametres')) this.currentSubMenu = 'Gestion des paramètres';
      // else if (url.includes('user-login')) this.currentSubMenu = 'Gestion du profil';
    } else {
      this.currentMenu = 'Accueil';
      this.currentSubMenu = "Vue d'ensemble";
    }
  }

  // Toggle submenu visibility
  toggleSubMenu(menu: string): void {
    // this.openSubMenu = this.openSubMenu === menu ? null : menu;
    // Si un autre sous-menu est ouvert, le fermer
    if (this.openSubMenu && this.openSubMenu !== menu) {
      this.openSubMenu = menu; // Ouvre le sous-menu cliqué
    } else {
      // Sinon, bascule l'état du sous-menu
      this.openSubMenu = this.openSubMenu === menu ? null : menu;
    }
  }

  // Check if the submenu is open
  isSubMenuOpen(menu: string): boolean {
    return this.openSubMenu === menu;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
