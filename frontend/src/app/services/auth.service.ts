import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, finalize, Observable, switchMap, tap } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { NavigationItem, User } from '../modeles/user.model';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';
import { NAVIGATION_CONFIG } from '../constantes/navigation.config';
import { CODE_TO_LABEL } from '../constantes/permissions.constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User>({} as User);
  public currentUser = this.currentUserSubject.asObservable();
  private jwtHelper = new JwtHelperService();

  // Configuration complète des menus par rôle
  // Navigation unifiee : la configuration (roles autorises par item) vit dans
  // constantes/navigation.config.ts. Le filtrage par role/permission est
  // effectue dans getNavigationItems().
  private http = inject(HttpClient);
  private router = inject(Router);
  private logger = inject(NGXLogger);
  
  /* constructor() {
    this.loadUserFromStorage();
  } */

  initAuth(): Promise<void> {
  return new Promise((resolve) => {
    
    const token = this.getToken();
    
    if (!token) {
      resolve();
      return;
    }
    
    if (this.jwtHelper.isTokenExpired(token)) {
      this.logout();
      resolve();
      return;
    }
    
    this.getMe().subscribe({
      next: () => {
        resolve();
      },
      error: (err) => {
        console.error('Erreur récupération user:', err);
        this.currentUserSubject.next({} as User);
        this.logout();
        resolve(); // TOUJOURS résoudre même en erreur
      }
    });
  });
}
  /* private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      this.getMe().subscribe({
        next: () => this.logger.info('Utilisateur chargé depuis le stockage local'),
        error: err => {
          this.logger.error('Erreur lors de la récupération de l\'utilisateur', err);
          this.logout();
        }
      });
    } else {
      this.logout();
    }
  } */

  login(email: string, password: string): Observable<User> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<{ token: string; user: any }>(`${this.apiUrl}/auth/connexion`, { email, password }).pipe(
      switchMap(response => {
        // Sauvegardez le token
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Créez une requête avec le header Authorization manuellement
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${response.token}`
        });
        
        return this.http.get<User>(`${this.apiUrl}/auth/me`, { headers });
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
        this.redirectBasedOnRole(user);
      }),
      catchError(err => handleApiError(this.logger, 'AuthService.login', err, 'Erreur lors de la connexion'))
    );
  }

  getMe(): Observable<User> {
    const token = this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<User>(`${this.apiUrl}/auth/me`,{ headers }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
        this.logger.info('Utilisateur récupéré avec succès', user.nom);
      }),
      catchError(err => handleApiError(this.logger, 'AuthService.getMe', err, 'Erreur lors de la récupération de l\'utilisateur'))
    );
  }

  // Méthode pour détecter si l'utilisateur est admin général
  isGeneralAdmin(): boolean {
    const user = this.currentUserSubject.value;
    // Méthode 1: Par structure_id null
    if (user && user.structure_id === null) {
      return true;
    }
    // Méthode 2: Par rôle
    if (user?.roles?.some(r => r.nom === 'Administrateur Général')) {
      return true;
    }
    // Méthode 3: Par flag isGeneralAdmin
    return user?.isGeneralAdmin || false;
  }
  
  private redirectBasedOnRole(user: User): void {
    if (!user || !user.roles || user.roles.length === 0) {
      this.router.navigate(['/unauthorized']);
      return;
    }
     if(!user.status){
      //this.router.navigate(['/unauthorized']);
      return;
     }

    const userRoles = user.roles.map(r => r.nom);
    
    // Admin général: rediriger vers paramètres
    if (this.isGeneralAdmin()) {
      this.router.navigate(['/caisse-bi/admin-general/structure']);
      return;
    }
    
    if (userRoles.includes('Administrateur') || userRoles.includes('Administrateur secondaire')) {
      this.router.navigate(['/caisse-bi/overview']);
    }
    else if (userRoles.includes('Gérant')) {
      this.router.navigate(['/caisse-bi/caisse']);
    } 
    else if (userRoles.includes('Caissier')) {
      this.router.navigate(['/caisse-bi/caisse']);
    } 
    else if (userRoles.includes('Employé')) {
      this.router.navigate(['/caisse-bi/overview']);
    } 
    else {
      this.router.navigate(['/unauthorized']);
    }
  }

  /* logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next({} as User);
    this.router.navigate(['/login']);
  } */

  /**
   * Session expirée ou invalide (401) : nettoie la session locale et
   * redirige vers /login sans appel serveur (évite les boucles 401).
   */
  sessionExpired(): void {
    this.clearSession();
  }

  logout(): void {
  const token = localStorage.getItem('token');

  if (!token) {
    this.clearSession();
    return;
  }

  this.http.post(`${this.apiUrl}/auth/deconnexion`, {}, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).pipe(
    finalize(() => this.clearSession())
  ).subscribe({
    next: () => {
      // Déconnexion serveur effectuée
    },
    error: err => console.error('âŒ Erreur serveur:', err)
  });
}

private clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  this.currentUserSubject.next({} as User);
  this.router.navigate(['/login']);
}

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    //return token ? !this.jwtHelper.isTokenExpired(token) : false; */
    const token = this.getToken();
    return !!token && !this.jwtHelper.isTokenExpired(token);
  }

  getNavigationItems(): NavigationItem[] {
    const user = this.currentUserSubject.value;
    if (!user || !user.roles || user.roles.length === 0) return [];

    // Admin general : menu dedie. Sinon filtrage par les roles de l'utilisateur.
    const userRoles = this.isGeneralAdmin()
      ? ['Administrateur G\u00e9n\u00e9ral']
      : user.roles.map(r => r.nom);

    const items = this.filterItemsByRoles(NAVIGATION_CONFIG, userRoles);
    return this.filterItemsByPermission(items);
  }

  private filterItemsByRoles(items: NavigationItem[], userRoles: string[]): NavigationItem[] {
    return items
      .map(item => ({
        ...item,
        children: item.children?.filter(
          child => !child.roles || child.roles.some(r => userRoles.includes(r))
        ),
      }))
      .filter(item => {
        const hasAccess = !item.roles || item.roles.some(r => userRoles.includes(r));
        if (!hasAccess) return false;
        if (item.children) return item.children.length > 0;
        return true;
      });
  }
  // Méthode utilitaire pour filtrer les items par permission
  filterItemsByPermission(items: NavigationItem[]): NavigationItem[] {
    return items.filter(item => {
      // Vérifier l'accès Ã  l'item principal
      if (item.requiredPermission && !this.hasPermission(item.requiredPermission)) {
        return false;
      }
      if (item.requiredRole && !this.hasRole(item.requiredRole)) {
        return false;
      }

      // Filtrer les enfants
      if (item.children) {
        item.children = item.children.filter(child => {
          if (child.requiredPermission && !this.hasPermission(child.requiredPermission)) {
            return false;
          }
          if (child.requiredRole && !this.hasRole(child.requiredRole)) {
            return false;
          }
          return true;
        });

        // Si l'item n'a plus d'enfants et n'a pas de route propre, on le cache
        if (item.children.length === 0 && !item.route) {
          return false;
        }
      }

      return true;
    });
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user?.roles) return false;

    // Contrôle sur le CODE stable (aligné avec le backend). Filet de
    // sécurité de transition : si la session ne contient pas encore les
    // codes (base non migrée), on retombe sur le libellé français.
    return user.roles.some(role =>
      role.permissions?.some(p =>
        p.code === permission ||
        p.nom === permission ||
        (p.code == null && p.nom === CODE_TO_LABEL[permission])
      )
    );
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    if (!user?.roles) return false;
    
    return user.roles.some(r => r.nom === role);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setUser(user: User) {
    this.currentUserSubject.next(user);
  }
  getUserStructureId(): number | null {
    return this.currentUserSubject.value?.structure_id || null;
  }

  getUserStructureName(): string {
    const user = this.currentUserSubject.value;
    return user?.code_structure || 'Nom Structure';
  }

  getUserName(): string {
    const user = this.currentUserSubject.value;
    return user?.nom || 'Utilisateur';
  }

  getUserEmail(): string {
    const user = this.currentUserSubject.value;
    return user?.email || '';
  }

  canAccess(permission?: string, role?: string): boolean {
    if (permission) {
      return this.hasPermission(permission);
    }
    if (role) {
      return this.hasRole(role);
    }
    return this.isAuthenticated();
  }

  findNavigationByRoute(url: string): { titre: string; sousTitre: string } | null {
    const items = this.getNavigationItems();

    for (const item of items) {
      // Route principale
      if (item.route === url) {
        return { titre: item.titre, sousTitre: item.sousTitre };
      }

      // Enfants
      for (const child of item.children || []) {
        if (child.route === url) {
          return {
            titre: child.titre,
            sousTitre: child.sousTitre || '',
          };
        }
      }
    }

    // Fallback : retourner l'item par défaut
    return { titre: 'Accueil', sousTitre: 'Vue d\'ensemble' };
  }

  // Méthode pour mettre Ã  jour les permissions dynamiquement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateUserPermissions(roles: any[]): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      currentUser.roles = roles;
      this.currentUserSubject.next(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  }

  // Vérifier si l'utilisateur a accès à un module spécifique
  // Codes alignés sur backend/constants/permissions.js
  hasModuleAccess(module: string): boolean {
    const modulePermissions: Record<string, string[]> = {
      'ventes': ['sales.manage', 'all.access'],
      'caisse': ['sales.manage', 'all.access'],
      'clients': ['clients.manage', 'all.access'],
      'stock': ['stock.manage', 'all.access'],
      'catalogue': ['products.manage', 'all.access'],
      'finance': ['finance.manage', 'all.access'],
      'rapports': ['finance.manage', 'all.access'],
      'parametres': ['roles.manage', 'users.manage', 'config.access', 'all.access'],
      'magasins': ['stores.manage', 'all.access'],
      'fournisseurs': ['suppliers.manage', 'all.access']
    };

    const permissions = modulePermissions[module] || [];
    return permissions.some(permission => this.hasPermission(permission));
  }

  }
