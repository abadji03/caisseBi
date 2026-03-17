import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { Categorie } from '../modeles/finance.model';

export interface CategoriesResponse {
  items: Categorie[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filtres: {
    search: string | null;
    type: string | null;
    showInactive: boolean;
  };
}

export interface CategoriesFilter {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  showInactive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesDepencesRecettesService {

  private apiUrl = 'http://localhost:5000/api/categories'; 

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);

  /** ================================
   *  GÉNÉRATION HEADERS AVEC TOKEN
   ================================== */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /** ================================
   *  GESTION CENTRALISÉE DES ERREURS
   ================================== */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(method: string, error: any) {
    this.logger.error(`CategorieService -> ${method} :`, error);
    return throwError(() => error);
  }

  /** ================================
   *            CRUD
   ================================== */

  /** Créer une catégorie */
  createCategorie(data: Categorie): Observable<Categorie> {
    return this.http.post<Categorie>(`${this.apiUrl}`, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => this.handleError('createCategorie', err))
    );
  }

  /** Récupérer toutes les catégories d'une structure */
  getAllByStructure(code_structure: string): Observable<Categorie[]> {
    return this.http.get<Categorie[]>(`${this.apiUrl}/structure/${code_structure}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => this.handleError('getAllByStructure', err))
    );
  }

   /** Récupérer toutes les catégories d'une structure avec pagination */
  getAllByStructureBis(code_structure: string, filter: CategoriesFilter = {}): Observable<CategoriesResponse> {
    let params = new HttpParams();
    
    // Pagination
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    
    // Recherche
    if (filter.search) params = params.set('search', filter.search);
    
    // Filtres spécifiques
    if (filter.type) params = params.set('type', filter.type);
    if (filter.showInactive !== undefined) params = params.set('showInactive', filter.showInactive.toString());

    return this.http.get<CategoriesResponse>(`${this.apiUrl}/structure/bis/${code_structure}`, {
      headers: this.getHeaders(),
      params: params
    }).pipe(
      catchError(err => this.handleError('getAllByStructure', err))
    );
  }


  /** Modifier une catégorie */
  updateCategorie(id: number, data: Partial<Categorie>): Observable<Categorie> {
    return this.http.put<Categorie>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => this.handleError('updateCategorie', err))
    );
  }

  /** Activer / Désactiver une catégorie */
  toggleActive(id: number): Observable<{ message: string, isActive: boolean }> {
    return this.http.patch<{ message: string, isActive: boolean }>(
      `${this.apiUrl}/toggle/${id}`,
      {}, // body vide
      { headers: this.getHeaders() }
    ).pipe(
      catchError(err => this.handleError('toggleActive', err))
    );
  }

  /** Supprimer une catégorie */
  deleteCategorie(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => this.handleError('deleteCategorie', err))
    );
  }

}
