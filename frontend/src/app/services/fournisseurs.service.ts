import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Fournisseur } from '../modeles/fournisseur.model';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';

export interface FournisseursFilter {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
}

export interface FournisseursResponse {
  items: Fournisseur[];
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
export class FournisseursService {
  private apiUrl = 'http://localhost:5000/api/fournisseurs';
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // Créer un fournisseur
  createFournisseur(fournisseur: Fournisseur,magasinIds?: number[]): Observable<Fournisseur> {
    const data = {
      ...fournisseur,
      magasinIds: magasinIds || []
    };
    return this.http.post<Fournisseur>(`${this.apiUrl}`, data, {
      headers: this.getHeaders(),
    });
  }

  // Récupérer tous les fournisseurs
  getAllFournisseurs(): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  // Récupérer un fournisseur par ID
  getFournisseurById(id: number): Observable<Fournisseur> {
    return this.http.get<Fournisseur>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Mettre à jour un fournisseur
  updateFournisseur(id: number, updateData: Partial<Fournisseur>,magasinIds?: number[]): Observable<Fournisseur> {
    const data = {
      ...updateData,
      magasinIds: magasinIds
    };
    return this.http.put<Fournisseur>(`${this.apiUrl}/${id}`, data, {
      headers: this.getHeaders(),
    });
  }

  // Mettre à jour le statut d'un fournisseur
  updateFournisseurStatus(id: number, statut: boolean): Observable<Fournisseur> {
    return this.http.patch<Fournisseur>(
      `${this.apiUrl}/${id}/statut`,
      { statut }, // Envoyez un objet JSON contenant le statut
      { headers: this.getHeaders() },
    );
  }

  // Supprimer un fournisseur
  deleteFournisseur(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    });
  }

  // Récupérer les fournisseurs par structure
  getFournisseursByStructure(codeStructure: string): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(`${this.apiUrl}/structure/${codeStructure}`, {
      headers: this.getHeaders(),
    });
  }

  // Récupérer les fournisseurs par structure avec pagination
  getFournisseursByStructureBis(codeStructure: string, filter: FournisseursFilter = {}): Observable<FournisseursResponse> {
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

    return this.http.get<FournisseursResponse>(`${this.apiUrl}/structure/bis/${codeStructure}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(response => this.logger.info(`Fournisseurs récupérés: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des fournisseurs'))
    );
  }

  getFournisseurWithMagasins(id: number): Observable<Fournisseur> {
      return this.http.get<Fournisseur>(`${this.apiUrl}/${id}/with-magasins`);
    }
  // Mettre à jour le solde pour un magasin spécifique
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFournisseurSoldeByMagasin(fournisseurId: number, magasinId: number, solde: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${fournisseurId}/magasins/${magasinId}/solde`,
      { solde },
      { headers: this.getHeaders() }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(error: any, message: string): Observable<never> {
    this.logger.error(message, error);
    return throwError(() => error);
  }

  // Recherche avancée de fournisseurs
  /*  searchFournisseurs(params: {
    nom?: string;
    statut?: string;
    code_structure?: string;
  }): Observable<Fournisseur[]> {
    let httpParams = new HttpParams();
    
    if (params.nom) httpParams = httpParams.append('nom', params.nom);
    if (params.statut) httpParams = httpParams.append('statut', params.statut);
    if (params.code_structure) httpParams = httpParams.append('code_structure', params.code_structure);

    return this.http.get<Fournisseur[]>(
      `${this.apiUrl}/fournisseurs/search`,
      { headers: this.getHeaders(), params: httpParams }
    );
  }

  // Compter le nombre total de fournisseurs
  countFournisseurs(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.apiUrl}/fournisseurs/count`,
      { headers: this.getHeaders() }
    );
  }

  // Récupérer les fournisseurs avec pagination
  getFournisseursPaginated(page: number = 1, limit: number = 10): Observable<PaginatedFournisseurs> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedFournisseurs>(
      `${this.apiUrl}/fournisseurs/page`,
      { headers: this.getHeaders(), params }
    );
  } */
}
