import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Structure } from '../modeles/structure.model';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';

export interface StructuresFilter {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
}

export interface StructuresResponse {
  items: Structure[];
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
export class StructureService {
  private apiUrl = `${environment.apiUrl}/structures`;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getAll(): Observable<Structure[]> {
    return this.http.get<Structure[]>(this.apiUrl, { headers: this.getHeaders() });
  } 

   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   private handleError(error: any, message: string): Observable<never> {
    this.logger.error(message, error);
    return throwError(() => error);
  }

  // Dans structure.service.ts
  getStructuresWithoutAdmin(): Observable<Structure[]> {
    return this.http.get<Structure[]>(`${this.apiUrl}/structures/without-admin`);
  }
  // Récupérer toutes les structures avec pagination
  getAllBis(filter: StructuresFilter = {}): Observable<StructuresResponse> {
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

    return this.http.get<StructuresResponse>(`${this.apiUrl}/bis`, { 
      headers: this.getHeaders(),
      params 
    }).pipe(
      tap(response => this.logger.info(`Structures récupérées: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des structures'))
    );
  }


  getById(id: number): Observable<Structure> {
    return this.http.get<Structure>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getByCodeStructure(code_structure: string): Observable<Structure> {
    return this.http.get<Structure>(`${this.apiUrl}/code/${code_structure}`, { headers: this.getHeaders() });
  }

  create(structure: FormData): Observable<Structure> {
    return this.http.post<Structure>(this.apiUrl, structure, { headers: this.getHeaders() });
  }

  update(id: number, structure: FormData): Observable<Structure> {
    return this.http.put<Structure>(`${this.apiUrl}/${id}`, structure, {
      headers: this.getHeaders(),
    });
  }

  updateBis(id: number, structure: Structure): Observable<Structure> {
    return this.http.put<Structure>(`${this.apiUrl}/${id}`, structure, {
      headers: this.getHeaders(),
    });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  updateStatus(id: number, estActive: boolean): Observable<Structure> {
    return this.http.patch<Structure>(
      `${this.apiUrl}/${id}/status`,
      { estActive },
      { headers: this.getHeaders() },
    );
  }
  /*   //Créer une structure
  create(structure: Structure): Observable<Structure> {
    return this.http.post<Structure>(this.apiUrl, structure);
  }

  //Récupérer toutes les structures
  getAll(): Observable<Structure[]> {
    return this.http.get<Structure[]>(this.apiUrl);
  }

  //Récupérer une structure par ID
  getById(id: number): Observable<Structure> {
    return this.http.get<Structure>(`${this.apiUrl}/${id}`);
  }

  //Mettre à jour une structure
  update(id: number, structure: Structure): Observable<Structure> {
    return this.http.put<Structure>(`${this.apiUrl}/${id}`, structure);
  }

  //Supprimer une structure
  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  //Activer/Désactiver une structure
  toggleStatus(id: number, actif: boolean): Observable<Structure> {
    return this.http.patch<Structure>(`${this.apiUrl}/${id}/status`, { actif });
  }*/
}
