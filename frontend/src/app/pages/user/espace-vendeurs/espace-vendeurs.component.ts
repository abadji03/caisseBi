import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Chart as ChartJS,registerables } from 'chart.js';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';

// Enregistrer les éléments nécessaires dans Chart.js
ChartJS.register(...registerables);

@Component({
  selector: 'app-espace-vendeurs',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, RouterOutlet, RouterLinkActive],
  templateUrl: './espace-vendeurs.component.html',
  styleUrl: './espace-vendeurs.component.css'
})
export class EspaceVendeursComponent {
modeVente: any;
ajouterOuModifierMagasin() {
throw new Error('Method not implemented.');
}
supprimerMagasin(arg0: any) {
throw new Error('Method not implemented.');
}
modifierMagasin(_t22: any) {
throw new Error('Method not implemented.');
}
  isSidebarCollapsed = false;
  activeAccordion: string | null = null;

  // Track the state of submenus
  private openSubMenu: string | null = null;
  //activeSection: string = 'overview';  // Par défaut, la section "Vue d'ensemble" est active.


  constructor() {}

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


  // Méthode pour changer la section active
  /* setActiveSection(section: string) {
    this.activeSection = section;
  } */
}
