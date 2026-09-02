/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { IndicateursStocks, MouvementsResponse, ProduitsSpecifiquesResponse, RapportCompletStocksResponse, StatistiquesProduit, StatsGraphiquesResponse, StatsProduitsResponse } from '../modeles/kpiCaisse.model';
import { RapportStockParams } from '../modeles/finance.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RapportStockService {

  private apiUrl = `${environment.apiUrl}/rapport-stock`;

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
  private handleError<T>(method: string, error: any): Observable<T> {
    this.logger.error(`RapportsStocksService -> ${method} :`, error);
    return throwError(() => error);
  }

  /** ================================
   *  CONSTRUCTION DES PARAMÈTRES
   ================================== */
  private buildParams(params: any): HttpParams {
    let httpParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        if (params[key] instanceof Date) {
          // Formater la date en YYYY-MM-DD pour le backend
          const year = params[key].getFullYear();
          const month = String(params[key].getMonth() + 1).padStart(2, '0');
          const day = String(params[key].getDate()).padStart(2, '0');
          httpParams = httpParams.set(key, `${year}-${month}-${day}`);
        } else {
          httpParams = httpParams.set(key, params[key].toString());
        }
      }
    });

    return httpParams;
  }

  /** ================================
   *  API 1 - INDICATEURS STOCKS
   ================================== */
  getIndicateursStocks(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<IndicateursStocks> {
    const params = this.buildParams(filters);

    return this.http.get<IndicateursStocks>(`${this.apiUrl}/indicateurs`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<IndicateursStocks>('getIndicateursStocks', error))
    );
  }

  /** ================================
   *  API 2 - STATISTIQUES PRODUITS
   ================================== */
  getStatsProduits(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
    statut?: string;
  }): Observable<StatsProduitsResponse> {
    const params = this.buildParams(filters);

    return this.http.get<StatsProduitsResponse>(`${this.apiUrl}/produits`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<StatsProduitsResponse>('getStatsProduits', error))
    );
  }

  /** ================================
   *  API 3 - MOUVEMENTS DE LA PÉRIODE
   ================================== */
  getMouvementsPeriode(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
    typeMouvement?: string;
  }): Observable<MouvementsResponse> {
    const params = this.buildParams(filters);

    return this.http.get<MouvementsResponse>(`${this.apiUrl}/mouvements`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<MouvementsResponse>('getMouvementsPeriode', error))
    );
  }

  /** ================================
   *  API 4 - STATISTIQUES GRAPHIQUES
   ================================== */
  getStatsGraphiques(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<StatsGraphiquesResponse> {
    const params = this.buildParams(filters);

    return this.http.get<StatsGraphiquesResponse>(`${this.apiUrl}/graphiques`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<StatsGraphiquesResponse>('getStatsGraphiques', error))
    );
  }

  /** ================================
   *  API 5 - PRODUITS SPÉCIFIQUES
   ================================== */
  getProduitsSpecifiques(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<ProduitsSpecifiquesResponse> {
    const params = this.buildParams(filters);

    return this.http.get<ProduitsSpecifiquesResponse>(`${this.apiUrl}/produits-specifiques`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<ProduitsSpecifiquesResponse>('getProduitsSpecifiques', error))
    );
  }

  /** ================================
   *  API 6 - RAPPORT COMPLET STOCKS
   ================================== */
  getRapportCompletStocks(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    pageProduits?: number;
    pageMouvements?: number;
    limit?: number;
    search?: string;
  }): Observable<RapportCompletStocksResponse> {
    const params = this.buildParams(filters);

    return this.http.get<RapportCompletStocksResponse>(`${this.apiUrl}/rapport-complet`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<RapportCompletStocksResponse>('getRapportCompletStocks', error))
    );
  }

  /** ================================
   *  API 7 - EXPORT DONNÉES STOCKS
   ================================== */
  exportDonneesStocks(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    format?: string;
  }): Observable<any> {
    const params = this.buildParams(filters);

    return this.http.get(`${this.apiUrl}/export`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError('exportDonneesStocks', error))
    );
  }

  /** ================================
   *  API COMPLÈTE POUR RAPPORT STOCKS
   ================================== */
  getRapportComplet(filters: {
    code_structure: string;
    magasinId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    pageProduits?: number;
    pageMouvements?: number;
    limit?: number;
    search?: string;
  }): Observable<any> {
    // Récupérer toutes les données en parallèle
    return new Observable(observer => {
      Promise.all([
        this.getIndicateursStocks(filters).toPromise(),
        this.getStatsProduits({
          ...filters,
          page: filters.pageProduits || 1,
          limit: filters.limit || 10,
          search: filters.search
        }).toPromise(),
        this.getMouvementsPeriode({
          ...filters,
          page: filters.pageMouvements || 1,
          limit: filters.limit || 10,
          search: filters.search
        }).toPromise(),
        this.getStatsGraphiques(filters).toPromise(),
        this.getProduitsSpecifiques(filters).toPromise()
      ]).then(([
        indicateurs,
        produits,
        mouvements,
        graphiques,
        produitsSpecifiques
      ]) => {
        observer.next({
          indicateurs,
          produits,
          mouvements,
          graphiques,
          produitsSpecifiques,
          filters
        });
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    }).pipe(
      catchError(error => this.handleError('getRapportComplet', error))
    );
  }

  /** ================================
   *  API SPÉCIFIQUE - STATS PAR PRODUIT
   ================================== */
  getStatistiquesProduit(filters: {
    code_structure: string;
    produitId: number;
    magasinId?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<StatistiquesProduit> {
    const params = this.buildParams(filters);

    return this.http.get<StatistiquesProduit>(`${this.apiUrl}/produit/${filters.produitId}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<StatistiquesProduit>('getStatistiquesProduit', error))
    );
  }

  /** ================================
   *  API SPÉCIFIQUE - MOUVEMENTS PAR PRODUIT
   ================================== */
  getMouvementsParProduit(filters: {
    code_structure: string;
    produitId: number;
    magasinId?: number;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }): Observable<MouvementsResponse> {
    const params = this.buildParams(filters);

    return this.http.get<MouvementsResponse>(`${this.apiUrl}/produit/${filters.produitId}/mouvements`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<MouvementsResponse>('getMouvementsParProduit', error))
    );
  }

  /** ================================
   *  API SPÉCIFIQUE - STOCKS PAR MAGASIN
   ================================== */
  getStocksParMagasin(filters: {
    code_structure: string;
    magasinId: number;
    statut?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<StatsProduitsResponse> {
    const params = this.buildParams(filters);

    return this.http.get<StatsProduitsResponse>(`${this.apiUrl}/magasin/${filters.magasinId}/stocks`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<StatsProduitsResponse>('getStocksParMagasin', error))
    );
  }

  /** ================================
   *  MÉTHODE POUR EXPORT PDF (optionnel)
   ================================== */
  exportPDF(filters: {
    code_structure: string;
    magasinId?: number;
    fromDate: Date;
    toDate: Date;
  }): Observable<any> {
    const params = this.buildParams(filters);

    return this.http.get(`${this.apiUrl}/export/pdf`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    }).pipe(
      catchError(error => this.handleError('exportPDF', error))
    );
  }

  /** ================================
   *  MÉTHODE POUR EXPORT EXCEL
   ================================== */
  exportExcel(filters: {
    code_structure: string;
    magasinId?: number;
    fromDate: Date;
    toDate: Date;
  }): Observable<any> {
    const params = this.buildParams(filters);

    return this.http.get(`${this.apiUrl}/export/excel`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    }).pipe(
      catchError(error => this.handleError('exportExcel', error))
    );
  }

  /** ================================
   *  MÉTHODE POUR RÉCUPÉRER LES CATÉGORIES DE PRODUITS
   ================================== */
  getCategoriesProduits(code_structure: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories`, {
      headers: this.getHeaders(),
      params: this.buildParams({ code_structure })
    }).pipe(
      catchError(error => this.handleError<any>('getCategoriesProduits', error))
    );
  }

  /** ================================
   *  MÉTHODE POUR RÉCUPÉRER LES STATUTS POSSIBLES
   ================================== */
  getStatutsStock(): string[] {
    return ['En stock', 'En alerte', 'En rupture', 'Tous'];
  }

  /** ================================
   *  MÉTHODE POUR RÉCUPÉRER LES TYPES DE MOUVEMENTS
   ================================== */
  getTypesMouvement(): string[] {
    return ['Entrée', 'Sortie', 'Tous'];
  }

  /**
   * Génère un PDF du rapport de stock
   */
  generateRapportStockPDF(params: RapportStockParams): Observable<Blob> {
    let httpParams = new HttpParams();

    // Ajouter les paramètres
    if (params.periode) httpParams = httpParams.set('periode', params.periode);
    if (params.dateReference) httpParams = httpParams.set('dateReference', params.dateReference);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.magasinId) httpParams = httpParams.set('magasinId', params.magasinId.toString());
    if (params.categorie) httpParams = httpParams.set('categorie', params.categorie);
    if (params.statut) httpParams = httpParams.set('statut', params.statut);

    console.log('📤 Génération PDF Stock avec params:', httpParams.toString());

    return this.http.get(`${this.apiUrl}/pdf`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Sauvegarde le PDF
   */
  savePDF(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

/**
 * Exporte le rapport de stock au format Excel
 */
exportRapportStockExcel(params: RapportStockParams): Observable<Blob> {
  let httpParams = new HttpParams();

  // Ajouter les paramètres
  if (params.periode) httpParams = httpParams.set('periode', params.periode);
  if (params.dateReference) httpParams = httpParams.set('dateReference', params.dateReference);
  if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
  if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
  if (params.magasinId) httpParams = httpParams.set('magasinId', params.magasinId.toString());
  if (params.categorie) httpParams = httpParams.set('categorie', params.categorie);
  if (params.statut) httpParams = httpParams.set('statut', params.statut);

  console.log('Export Excel Stock avec params:', httpParams.toString());

  return this.http.get(`${this.apiUrl}/excel`, {
    params: httpParams,
    responseType: 'blob'
  });
}

/**
 * Sauvegarde le fichier Excel
 */
saveExcel(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
}
