import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, Observable, switchMap, tap, throwError } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { User } from '../modeles/user.model';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api'; // URL API
  private currentUserSubject = new BehaviorSubject<User>({} as User);
  public currentUser = this.currentUserSubject.asObservable();
  private jwtHelper = new JwtHelperService();

  private http = inject(HttpClient);
  private router = inject(Router);
  private logger = inject(NGXLogger);
  
  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      this.getMe().subscribe({
        next: () => {this.logger.info('Utilisateur chargé depuis le stockage local')},
        error: err => this.logger.error('Erreur lors de la récupération de l\'utilisateur', err),
      });
    } else {
      this.logout();
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/auth/connexion`, { email, password }).pipe(
      tap(response => localStorage.setItem('token', response.token)),
      switchMap(() => this.getMe())
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user', JSON.stringify(user));
      }),
      catchError(err => {
        this.logger.error('Erreur lors de la récupération de l\'utilisateur', err);
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next({} as User);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }

  hasPermission(permission: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles?.some(r => r.permissions?.some(p => p.nom === permission)) ?? false;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles?.some(r => r.nom === role) ?? false;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserStructureId(): number | null {
    return this.currentUserSubject.value?.structure_id || null;
  }
  
  isGeneralAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user && user.role === 'admin_general';
  }

  isStructureAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user && user.role === 'admin_structure';
  }

  /* private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }



  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/connexion`, { email, password }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tap(async (response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Charger les rôles et permissions
        const userId = response.user.id;
        const roles = await this.http.get(`${this.apiUrl}/user-roles/${userId}`).toPromise();
        const permissionsReqs = (roles as Role[]).map((r: Role) =>
          this.http.get(`${this.apiUrl}/role-permissions/${r.id}`).toPromise(),
        );

        const permissions = (await Promise.all(permissionsReqs)).flat();

        const fullUser = {
          ...response.user,
          roles,
          permissions,
        };

        localStorage.setItem('user', JSON.stringify(fullUser));
        this.currentUserSubject.next(fullUser);

        // Redirection selon rôle
        this.redirectUser(fullUser);
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redirectUser(user: any) {
    const roleNames = user.roles.map((r: Role) => r.nom);
    if (roleNames.includes('Administrateur Général')) {
      this.router.navigate(['/admin-general/dashboard']);
    } else if (roleNames.includes('Administrateur')) {
      this.router.navigate(['/admin/dashboard']);
    } else if (roleNames.includes('Gérant')) {
      this.router.navigate(['/gerant/dashboard']);
    } else if (roleNames.includes('Caissier')) {
      this.router.navigate(['/caisse']);
    } else if (roleNames.includes('Employé')) {
      this.router.navigate(['/employe/dashboard']);
    } else {
      this.router.navigate(['/unauthorized']);
    }
  }

  logout(): void {
    localStorage.clear();
    this.currentUserSubject.next({} as User);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }

  isGeneralAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user && user.role === 'admin_general';
  }

  isStructureAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user && user.role === 'admin_structure';
  }

  getUserStructureId(): number | null {
    const user = this.currentUserSubject.value;
    return user?.structure_id || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return user?.permissions?.some((p: any) => p.nom === permission);
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.some((r: Role) => r.nom === role);
  } */
}
