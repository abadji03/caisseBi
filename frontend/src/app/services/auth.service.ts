import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, finalize, Observable, switchMap, tap, throwError } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { NavigationItem, User } from '../modeles/user.model';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { NAVIGATION_CONFIG } from '../constantes/navigation.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User>({} as User);
  public currentUser = this.currentUserSubject.asObservable();
  private jwtHelper = new JwtHelperService();

  // Configuration complÃ¨te des menus par rÃ´le
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
    console.log('APP_INITIALIZER: DÃ©but initAuth');
    
    const token = this.getToken();
    console.log('Token prÃ©sent:', !!token);
    
    if (!token) {
      console.log('Aucun token, rÃ©solution immÃ©diate');
      resolve();
      return;
    }
    
    if (this.jwtHelper.isTokenExpired(token)) {
      console.log('Token expirÃ©, logout');
      this.logout();
      resolve();
      return;
    }
    
    console.log('Token valide, rÃ©cupÃ©ration user');
    this.getMe().subscribe({
      next: () => {
        console.log('User rÃ©cupÃ©rÃ© avec succÃ¨s');
        resolve();
      },
      error: (err) => {
        console.error('Erreur rÃ©cupÃ©ration user:', err);
        this.currentUserSubject.next({} as User);
        this.logout();
        resolve(); // TOUJOURS rÃ©soudre mÃªme en erreur
      }
    });
  });
}
  /* private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      this.getMe().subscribe({
        next: () => this.logger.info('Utilisateur chargÃ© depuis le stockage local'),
        error: err => {
          this.logger.error('Erreur lors de la rÃ©cupÃ©ration de l\'utilisateur', err);
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
        
        // CrÃ©ez une requÃªte avec le header Authorization manuellement
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${response.token}`
        });
        
        return this.http.get<User>(`${this.apiUrl}/auth/me`, { headers });
      }),
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
        this.debugUserInfo();
        this.redirectBasedOnRole(user);
      }),
      catchError(err => {
        this.logger.error('Erreur lors de la connexion', err);
        return throwError(() => err);
      })
    );
  }

  getMe(): Observable<User> {
    const token = this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<User>(`${this.apiUrl}/auth/me`,{ headers }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
        this.logger.info('Utilisateur rÃ©cupÃ©rÃ© avec succÃ¨s', user.nom);
      }),
      catchError(err => {
        this.logger.error('Erreur lors de la rÃ©cupÃ©ration de l\'utilisateur', err);
        return throwError(() => err);
      })
    );
  }

  // MÃ©thode pour dÃ©tecter si l'utilisateur est admin gÃ©nÃ©ral
  isGeneralAdmin(): boolean {
    const user = this.currentUserSubject.value;
    // MÃ©thode 1: Par structure_id null
    if (user && user.structure_id === null) {
      return true;
    }
    // MÃ©thode 2: Par rÃ´le
    if (user?.roles?.some(r => r.nom === 'Administrateur GÃ©nÃ©ral')) {
      return true;
    }
    // MÃ©thode 3: Par flag isGeneralAdmin
    return user?.isGeneralAdmin || false;
  }
  
  private redirectBasedOnRole(user: User): void {
    console.log('Redirection basÃ©e sur le rÃ´le de l\'utilisateur',user);
    if (!user || !user.roles || user.roles.length === 0) {
      this.router.navigate(['/unauthorized']);
      return;
    }
     if(!user.status){
      console.log('Utilisateur inactif, redirection vers unauthorized');
      //this.router.navigate(['/unauthorized']);
      return;
     }

    const userRoles = user.roles.map(r => r.nom);
   console.log('RÃ´les de l\'utilisateur:', userRoles);
    
    // Admin gÃ©nÃ©ral: rediriger vers paramÃ¨tres
    if (this.isGeneralAdmin()) {
      console.log('Admin gÃ©nÃ©ral dÃ©tectÃ©, redirection vers paramÃ¨tres');
      this.router.navigate(['/caisse-bi/admin-general/structure']);
      return;
    }
    
    if (userRoles.includes('Administrateur') || userRoles.includes('Administrateur secondaire')) {
      console.log('Redirection vers overview pour Administrateur');
      this.router.navigate(['/caisse-bi/overview']);
    }
    else if (userRoles.includes('GÃ©rant')) {
      console.log('Redirection vers caisse pour GÃ©rant');
      this.router.navigate(['/caisse-bi/caisse']);
    } 
    else if (userRoles.includes('Caissier')) {
      console.log('Redirection vers caisse pour Caissier');
      this.router.navigate(['/caisse-bi/caisse']);
    } 
    else if (userRoles.includes('EmployÃ©')) {
      console.log('Redirection vers overview pour EmployÃ©');
      this.router.navigate(['/caisse-bi/overview']);
    } 
    else {
      console.log('Aucun rÃ´le reconnu, redirection vers unauthorized');
      console.log('RÃ´les disponibles:', userRoles);
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
    next: () => console.log('âœ… DÃ©connexion serveur OK'),
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
  // MÃ©thode utilitaire pour filtrer les items par permission
  filterItemsByPermission(items: NavigationItem[]): NavigationItem[] {
    return items.filter(item => {
      // VÃ©rifier l'accÃ¨s Ã  l'item principal
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
    
    return user.roles.some(role => 
      role.permissions?.some(p => p.nom === permission)
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

    // Fallback : retourner l'item par dÃ©faut
    return { titre: 'Accueil', sousTitre: 'Vue d\'ensemble' };
  }

  // MÃ©thode pour mettre Ã  jour les permissions dynamiquement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateUserPermissions(roles: any[]): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      currentUser.roles = roles;
      this.currentUserSubject.next(currentUser);
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  }

  // VÃ©rifier si l'utilisateur a accÃ¨s Ã  un module spÃ©cifique
  hasModuleAccess(module: string): boolean {
    const modulePermissions: Record<string, string[]> = {
      'ventes': ['view_ventes', 'edit_ventes', 'manage_ventes'],
      'caisse': ['access_caisse', 'manage_caisse'],
      'clients': ['view_clients', 'edit_clients', 'manage_clients'],
      'stock': ['view_stock', 'edit_stock', 'manage_stock'],
      'catalogue': ['view_products', 'edit_products', 'manage_products'],
      'finance': ['view_finance', 'edit_finance', 'manage_finance'],
      'rapports': ['view_reports', 'generate_reports'],
      'parametres': ['manage_settings', 'manage_users'],
      'magasins': ['manage_stores', 'view_stores']
    };

    const permissions = modulePermissions[module] || [];
    return permissions.some(permission => this.hasPermission(permission));
  }

  debugUserInfo(): void {
    const user = this.currentUserSubject.value;
    const token = this.getToken();
    
    console.log('=== DEBUG AUTH SERVICE ===');
    console.log('Token prÃ©sent:', !!token);
    console.log('Token valeur:', token?.substring(0, 20) + '...');
    console.log('Utilisateur dans BehaviorSubject:', user);
    console.log('Roles:', user?.roles?.map(r => r.nom));
    console.log('LocalStorage user:', localStorage.getItem('user'));
    console.log('LocalStorage token:', localStorage.getItem('token'));
    console.log('Navigation items:', this.getNavigationItems().length);
    console.log('=== FIN DEBUG ===');
  }
}

