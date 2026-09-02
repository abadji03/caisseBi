/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { Panier } from '../modeles/panier.model';
import { environment } from '../../environments/environment';

const API_URL = `${environment.apiUrl}/paniers`;
export interface TransactionsResponse {
  items: Panier[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistiques: {
    totalGlobal: number;
    nombreTransactions: number;
  };
  filtres: {
    search: string | null;
    statut: string | null;
  };
}

export interface TransactionsFilter {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
  bonId?: number | null | '';
  magasinId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaniersService {


  private http = inject(HttpClient);
  private logger = inject(NGXLogger);
  private authService = inject(AuthService)


  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message = typeof error.error === 'string'
      ? error.error
      : error.message || 'Erreur inconnue';
    const status = error.status || 0;
    this.logger.error(`Erreur API Panier (${status}): ${message}`, error);
    return throwError(() => error);
  }

  // === HELPERS DE CONSTRUCTION D'URL ===

  /** Construit l'URL de base pour une structure et un magasin */
  private structureUrl(code_structure: string, magasinId: number): string {
    return `${API_URL}/structure/${code_structure}/magasin/${magasinId}`;
  }

  /** Construit l'URL pour un panier par son ID */
  private panierUrl(id: number): string {
    return `${API_URL}/${id}`;
  }

  // === CRUD ===

  createPanierComplet(panierCompletData: any): Observable<any> {
      return this.http.post<any>(`${API_URL}/panier-complet`, panierCompletData);
  }

  createPanier(data: Panier): Observable<Panier> {
    return this.http.post<Panier>(`${API_URL}`, data, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err))); 
  }

  getPaniersByStructure(code_structure: string, magasinId: number): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${this.structureUrl(code_structure, magasinId)}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getPaniersBrouillon(code_structure: string, magasinId: number): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${this.structureUrl(code_structure, magasinId)}/brouillon`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getAllPaniers(): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${API_URL}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getPanierById(id: number): Observable<Panier> {
    return this.http.get<Panier>(`${this.panierUrl(id)}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updatePanier(id: number, data: Panier): Observable<Panier> {
    return this.http.put<Panier>(`${this.panierUrl(id)}`, data, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  deletePanier(id: number): Observable<Panier> {
    return this.http.delete<Panier>(`${this.panierUrl(id)}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  deleteOnlyPanier(id: number): Observable<Panier> {
    return this.http.delete<Panier>(`${API_URL}/onlyPanier/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }
  // === Méthodes spécifiques ===

  updateStatutPanier(id: number, statut: string): Observable<Panier> {
    return this.http.patch<Panier>(`${this.panierUrl(id)}/statut`, { statut }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateTotauxPanier(id: number, totalHT: number, tva: number): Observable<Panier> {
    return this.http.patch<Panier>(`${this.panierUrl(id)}/totaux`, { totalHT, tva }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateDetailsVisible(id: number, visible: boolean): Observable<Panier> {
    return this.http.patch<Panier>(`${this.panierUrl(id)}/detailsVisible`, { visible }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  resetPanier(id: number): Observable<Panier> {
    return this.http.patch<Panier>(`${this.panierUrl(id)}/reset`, {}, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getPanierByBonId(bonId: number): Observable<Panier> {
  return this.http.get<Panier>(`${API_URL}/bon/${bonId}`, {
    headers: this.getHeaders(),
  }).pipe(catchError(err => this.handleError(err)));
}


 /**
   * Récupère les paniers journaliers d'une structure par magasin
   * @param code_structure Code de la structure
   * @param magasinId Optionnel - ID du magasin à filtrer
   */
  getPaniersJournaliersByStructureEtMagasin(code_structure: string, magasinId?: number): Observable<Panier[]> {
    let params = new HttpParams();
    
    if (magasinId) {
      params = params.set('magasinId', magasinId.toString());
    }
    
    return this.http.get<Panier[]>(`${API_URL}/structure/${code_structure}/journalier`, {
      headers: this.getHeaders(),
      params
    }).pipe(catchError(err => this.handleError(err)));
  }

  /**
   * Récupère les paniers pour une date spécifique avec statistiques
   * @param date Date au format YYYY-MM-DD
   * @param code_structure Optionnel - Code de la structure
   * @param magasinId Optionnel - ID du magasin
   */
  getPaniersParDate(date: string, code_structure?: string, magasinId?: number): Observable<{
    date: string,
    paniers: Panier[],
    statistiques: any
  }> {
    let params = new HttpParams();
    
    if (code_structure) {
      params = params.set('code_structure', code_structure);
    }
    
    if (magasinId) {
      params = params.set('magasinId', magasinId.toString());
    }
    
    return this.http.get<{
      date: string,
      paniers: Panier[],
      statistiques: any
    }>(`${API_URL}/par-date/${date}`, {
      headers: this.getHeaders(),
      params
    }).pipe(catchError(err => this.handleError(err)));
  }

  /**
   * Récupère les transactions du jour avec pagination, recherche et filtres
   *
   * @param code_structure Code de la structure (obligatoire)
   * @param magasinId ID du magasin (optionnel)
   * @param bonId ID du bon, null pour "sans bon", undefined pour "tous" (optionnel)
   * @param filter Filtres optionnels (pagination, recherche, statut)
   */
  getPaniersAujourdhui(
    code_structure: string,
    magasinId?: number,
    bonId?: number | null | '',
    filter: TransactionsFilter = {}
  ): Observable<TransactionsResponse> {
    let params = new HttpParams();

    // Pagination
    if (filter.page)   params = params.set('page',  filter.page.toString());
    if (filter.limit)  params = params.set('limit', filter.limit.toString());

    // Recherche / filtres
    if (filter.search) params = params.set('search', filter.search);
    if (filter.statut) params = params.set('statut', filter.statut);

    if (magasinId) params = params.set('magasinId', magasinId.toString());

    // bonId : null → 'null' (filtre "sans bon"), undefined / '' → omis
    if (bonId === null) {
      params = params.set('bonId', 'null');
    } else if (bonId !== undefined && bonId !== '') {
      params = params.set('bonId', bonId.toString());
    }

    // On utilise toujours la route "bis" (avec pagination + statistiques).
    // bonId est passé entièrement en query param pour éviter les doubles slashes
    // quand il est null/undefined.
    const url = `${API_URL}/structure/bis/${code_structure}/magasin/${magasinId ?? ''}/bons/0/aujourdhui`;

    return this.http.get<TransactionsResponse>(url, {
      headers: this.getHeaders(),
      params
    }).pipe(catchError(err => this.handleError(err)));
  }

  /**
   * @deprecated Utiliser `getPaniersAujourdhui(code_structure, magasinId, bonId, filter)` à la place.
   * Conservé pour compatibilité ascendante.
   */
  getPaniersAujourdhuiBis(
    code_structure: string, 
    magasinId?: number, 
    bonId?: number | null | '',
    filter: TransactionsFilter = {}
  ): Observable<TransactionsResponse> {
    return this.getPaniersAujourdhui(code_structure, magasinId, bonId, filter);
  }


  /**
   * Récupère les statistiques de vente pour une période
   * @param dateDebut Date de début
   * @param dateFin Date de fin
   * @param code_structure Optionnel - Code de la structure
   * @param magasinId Optionnel - ID du magasin
   */
  getStatistiquesVentes(dateDebut: Date, dateFin: Date, code_structure?: string, magasinId?: number): Observable<any> {
    let params = new HttpParams()
      .set('dateDebut', dateDebut.toISOString().split('T')[0])
      .set('dateFin', dateFin.toISOString().split('T')[0]);
    
    if (code_structure) {
      params = params.set('code_structure', code_structure);
    }
    
    if (magasinId) {
      params = params.set('magasinId', magasinId.toString());
    }
    
    return this.http.get<any>(`${API_URL}/statistiques`, {
      headers: this.getHeaders(),
      params
    }).pipe(catchError(err => this.handleError(err)));
  }

  /**
   * Exporte les paniers en CSV pour une période
   * @param dateDebut Date de début
   * @param dateFin Date de fin
   * @param code_structure Code de la structure
   * @param magasinId Optionnel - ID du magasin
   */
  exporterPaniersCSV(dateDebut: Date, dateFin: Date, code_structure: string, magasinId?: number): Observable<Blob> {
    let params = new HttpParams()
      .set('dateDebut', dateDebut.toISOString().split('T')[0])
      .set('dateFin', dateFin.toISOString().split('T')[0]);
    
    if (magasinId) {
      params = params.set('magasinId', magasinId.toString());
    }
    
    return this.http.get(`${API_URL}/export/csv/${code_structure}`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    }).pipe(catchError(err => this.handleError(err)));
  }
}
