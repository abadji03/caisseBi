import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Magasin } from '../modeles/magasin.model';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';

export interface MagasinsFilter {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
}

export interface MagasinsResponse {
  items: Magasin[];
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
export class MaagasinsService {
  private apiUrl = `${environment.apiUrl}/magasins`;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   private handleError(error: any, message: string): Observable<never> {
    this.logger.error(message, error);
    return throwError(() => error);
  }
  // Créer un nouveau magasin
  createMagasin(magasin: Magasin): Observable<Magasin> {
    return this.http.post<Magasin>(this.apiUrl, magasin, { headers: this.getHeaders() });
  }

  // Mettre à jour un magasin
  updateMagasin(id: number, magasin: Magasin): Observable<Magasin> {
    return this.http.put<Magasin>(`${this.apiUrl}/${id}`, magasin, { headers: this.getHeaders() });
  }

  // Supprimer un magasin
  deleteMagasin(id: number): Observable<Magasin> {
    return this.http.delete<Magasin>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Obtenir tous les magasins
  getAllMagasins(): Observable<Magasin[]> {
    return this.http.get<Magasin[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obtenir les magasins d'une structure
  getMagasinsByStructure(codeStructure: string): Observable<Magasin[]> {
    return this.http.get<Magasin[]>(`${this.apiUrl}/structure/${codeStructure}`, {
      headers: this.getHeaders(),
    });
  }

   // Obtenir les magasins d'une structure avec pagination
  getMagasinsByStructureBis(codeStructure: string, filter: MagasinsFilter = {}): Observable<MagasinsResponse> {
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

    return this.http.get<MagasinsResponse>(`${this.apiUrl}/structure/bis/${codeStructure}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(response => this.logger.info(`Magasins récupérés: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des magasins'))
    );
  }

  // Obtenir un magasin par son ID
  getMagasinById(id: number): Observable<Magasin> {
    return this.http.get<Magasin>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Mettre à jour le statut d'un magasin
  updateMagasinStatus(id: number, statut: 'Actif' | 'Inactif'): Observable<Magasin> {
    return this.http.patch<Magasin>(
      `${this.apiUrl}/${id}/statut`,
      { statut },
      { headers: this.getHeaders() },
    );
  }
}
