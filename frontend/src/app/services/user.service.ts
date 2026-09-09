import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap } from 'rxjs';
import { User } from '../modeles/user.model';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

export interface UsersFilter {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
}

export interface UsersResponse {
  items: User[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);


    
   private handleError(error: unknown, message: string): Observable<never> {
    return handleApiError(this.logger, 'UserService', error, message);
  }
  
  // Récupère tous les utilisateurs (filtrés par structure si nécessaire)

  getAlls(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`, {});
  }

  // Récupérer tous les utilisateurs avec pagination
  getAllsBis(filter: UsersFilter = {}): Observable<UsersResponse> {
    let params = new HttpParams();
    
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    if (filter.search) params = params.set('search', filter.search);
    if (filter.statut && filter.statut !== 'tous') {
      params = params.set('statut', filter.statut);
    }

    return this.http.get<UsersResponse>(this.apiUrl, {
      params
    }).pipe(
      tap(response => this.logger.info(`Utilisateurs récupérés: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des utilisateurs'))
    );
  }

  // Récupère un utilisateur par son ID
  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, {});
  }

  // Crée un nouvel utilisateur
  create(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user, {});
  }

  // Met à jour un utilisateur existant
  update(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user, {});
  }

  // Supprime un utilisateur
  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, {});
  }

  // Active/désactive un utilisateur
  updateStatus(id: number, status: boolean): Observable<User> {
    return this.http.patch<User>(
      `${this.apiUrl}/${id}/status`,
      { status },
      {},
    );
  }

  // Change le mot de passe d'un utilisateur
  changePassword(id: number, newPassword: string): Observable<unknown> {
    return this.http.patch(
      `${this.apiUrl}/${id}/password`,
      { password: newPassword },
      {},
    );
  }

  // Méthodes supplémentaires pour la gestion des utilisateurs

  // Recherche d'utilisateurs par critères
  search(criteria: { email?: string; nom?: string; role?: string }): Observable<User[]> {
    let query = '';
    if (criteria.email) query += `email=${criteria.email}&`;
    if (criteria.nom) query += `nom=${criteria.nom}&`;
    if (criteria.role) query += `role=${criteria.role}`;

    // Si ce n'est pas l'admin général, on filtre par structure
    /* if (!this.authService.isGeneralAdmin()) {
      query += `&structure_id=${this.authService.getUserStructureId()}`;
    } */

    return this.http.get<User[]>(`${this.apiUrl}/search?${query}`, {});
  }

  // Récupère les utilisateurs par structure
  getByStructure(code_structure: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${code_structure}/users`, {
    });
  }

   // Récupère les utilisateurs par structure avec pagination
  getByStructureBis(code_structure: string, filter: UsersFilter = {}): Observable<UsersResponse> {
    let params = new HttpParams();
    
    // Pagination
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    
    // Recherche
    if (filter.search) params = params.set('search', filter.search);
    
    // Filtre par statut
    if (filter.statut && filter.statut !== 'tous') {
      params = params.set('statut', filter.statut);
    }

    return this.http.get<UsersResponse>(`${this.apiUrl}/${code_structure}/bis/users`, {
      params
    }).pipe(
      tap(response => this.logger.info(`Utilisateurs récupérés: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des utilisateurs'))
    );
  }


  // Vérifie si un email est déjà utilisé
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(`${this.apiUrl}/check-email?email=${email}`, {
    });
  }

  }