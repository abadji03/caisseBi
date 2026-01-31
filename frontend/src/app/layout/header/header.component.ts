import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { TitreService } from '../../services/titre.service';
import { AuthService } from '../../services/auth.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit{
    
  @Output() toggleSidebar = new EventEmitter<void>();
  titre = 'Accueil';
  sousTitre = 'Vue d’ensemble';
  userName = 'Utilisateur';
  structureName = 'Nom Structure';
  private titreService = inject(TitreService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    // 🔁 1. Réagir à chaque navigation (y compris refresh)
    // 🔁 Écoute des changements de route
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        const { titre, sousTitre } = this.titreService.getCurrentTitre();
        this.titre = titre;
        this.sousTitre = sousTitre;
      });

    // 🔁 Écoute du service
    this.titreService.titre$.subscribe(({ titre, sousTitre }) => {
      this.titre = titre;
      this.sousTitre = sousTitre;
    });
    
    this.authService.currentUser.subscribe((user) => {
      if (user && user.nom) {
        this.userName = user.nom;
        this.structureName = user.code_structure || 'Structure';
      }
    });
  }

  toggleSidebarMenu(): void {
    this.toggleSidebar.emit();
  }
   onLogout(): void {
    this.authService.logout();
  }

  onProfile(): void {
    this.router.navigate(['/profile']);
  }

  onSettings(): void {
    this.router.navigate(['/caisse-bi/parametres']);
  }
}
