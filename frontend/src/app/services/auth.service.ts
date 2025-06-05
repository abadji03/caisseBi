import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:5000/api'; // URL API
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();
  private jwtHelper = new JwtHelperService();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  /* login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/connexion`, { email, password }).pipe(
      tap((response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  } */
 
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/connexion`, { email, password }).pipe(
      tap(async (response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Charger les rôles et permissions
        const userId = response.user.id;
        const roles = await this.http.get(`${this.apiUrl}/user-roles/${userId}`).toPromise();
        const permissionsReqs = (roles as any[]).map((r: any) =>
          this.http.get(`${this.apiUrl}/role-permissions/${r.id}`).toPromise()
        );

        const permissions = (await Promise.all(permissionsReqs)).flat();

        const fullUser = {
          ...response.user,
          roles,
          permissions
        };

        localStorage.setItem('user', JSON.stringify(fullUser));
        this.currentUserSubject.next(fullUser);

        // Redirection selon rôle
        this.redirectUser(fullUser);
      })
    );
  }

  private redirectUser(user: any) {
    const roleNames = user.roles.map((r: any) => r.nom);
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
    this.currentUserSubject.next(null);
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
    return user?.structureId || null;
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

   hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.some((p: any) => p.nom === permission);
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.some((r: any) => r.nom === role);
  }

}
