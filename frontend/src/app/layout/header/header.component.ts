import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { TitreService } from '../../services/titre.service';
import { AuthService } from '../../services/auth.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit{
    
  @Output() toggleSidebar = new EventEmitter<void>();
  titre = 'Accueil';
  sousTitre = 'Vue d’ensemble';
  userName = 'Utilisateur';
  photoProfilUrl : string| null = null;
  private titreService = inject(TitreService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    
    // 1️⃣ Initialisation à partir de l’URL courante
    const nav = this.authService.findNavigationByRoute(this.router.url);
    if (nav) {
      this.titreService.setTitre(nav.titre, nav.sousTitre);
    }
    // 2️⃣ Écoute des changements de route
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = this.authService.findNavigationByRoute(event.urlAfterRedirects);
        if (nav) {
          this.titreService.setTitre(nav.titre, nav.sousTitre);
        }
    });


    // 🔁 3.Écoute du service
    this.titreService.titre$.subscribe(({ titre, sousTitre }) => {
      this.titre = titre;
      this.sousTitre = sousTitre;
    });
    
    this.authService.currentUser.subscribe((user) => {
      if (user && user.nom) {
        this.userName = user.nom;
        //this.code_structure = user.code_structure || 'Structure';
        this.photoProfilUrl = user.photoProfil || null; // Valeur par défaut
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
