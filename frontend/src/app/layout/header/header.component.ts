import { Component, DestroyRef, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitreService } from '../../services/titre.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NotificationDropdownComponent } from '../../shared/notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NotificationDropdownComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {

  @Output() toggleSidebar = new EventEmitter<void>();

  titre        = 'Accueil';
  sousTitre    = "Vue d'ensemble";
  userName     = 'Utilisateur';
  photoProfilUrl: string | null = null;

  /** Compteur non-lues exposé au template via l'async pipe */
  readonly count$ = inject(NotificationService).count$;

  private titreService = inject(TitreService);
  private authService  = inject(AuthService);
  private router       = inject(Router);
  private destroyRef   = inject(DestroyRef);

  ngOnInit(): void {

    // 1️⃣ Initialisation à partir de l'URL courante
    const nav = this.authService.findNavigationByRoute(this.router.url);
    if (nav) {
      this.titreService.setTitre(nav.titre, nav.sousTitre);
    }

    // 2️⃣ Écoute des changements de route
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(event => {
        const n = this.authService.findNavigationByRoute(event.urlAfterRedirects);
        if (n) this.titreService.setTitre(n.titre, n.sousTitre);
      });

    // 3️⃣ Écoute du service titre
    this.titreService.titre$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ titre, sousTitre }) => {
        this.titre    = titre;
        this.sousTitre = sousTitre;
      });

    // 4️⃣ Données utilisateur
    this.authService.currentUser
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(user => {
        if (user?.nom) {
          this.userName      = user.nom;
          this.photoProfilUrl = user.photoProfil || null;
        }
      });
  }

  toggleSidebarMenu(): void { this.toggleSidebar.emit(); }
  onLogout():  void { this.authService.logout(); }
  onProfile(): void { this.router.navigate(['/profile']); }
  onSettings(): void { this.router.navigate(['/caisse-bi/parametres']); }
}
