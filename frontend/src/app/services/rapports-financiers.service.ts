/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from './auth.service';
import { catchError, Observable, throwError } from 'rxjs';
import { DonneesComparativesResponse, DonneesEvolutivesResponse, IndicateursFinanciers, ModesPaiementStats, RepartitionDepenses, RepartitionRecettes, TransactionsResponse } from '../modeles/finance.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RapportsFinanciersService {
  private apiUrl = `${environment.apiUrl}/rapport-financier`;
    
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
      this.logger.error(`RapportsFinanciersService -> ${method} :`, error);
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
   *  API - INDICATEURS FINANCIERS
   ================================== */
  getIndicateursFinanciers(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<IndicateursFinanciers> {
    const params = this.buildParams(filters);
    
    return this.http.get<IndicateursFinanciers>(`${this.apiUrl}/indicateurs`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<IndicateursFinanciers>('getIndicateursFinanciers', error))
    );
  }

  /** ================================
   *  API - RÉPARTITION DÉPENSES
   ================================== */
  getRepartitionDepenses(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<RepartitionDepenses> {
    const params = this.buildParams(filters);
    
    return this.http.get<RepartitionDepenses>(`${this.apiUrl}/depenses/repartition`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<RepartitionDepenses>('getRepartitionDepenses', error))
    );
  }

  /** ================================
   *  API - RÉPARTITION RECETTES
   ================================== */
  getRepartitionRecettes(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<RepartitionRecettes> {
    const params = this.buildParams(filters);
    
    return this.http.get<RepartitionRecettes>(`${this.apiUrl}/recettes/repartition`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<RepartitionRecettes>('getRepartitionRecettes', error))
    );
  }

  /** ================================
   *  API - STATS MODES PAIEMENT
   ================================== */
  getStatistiquesModesPaiement(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<ModesPaiementStats> {
    const params = this.buildParams(filters);
    
    return this.http.get<ModesPaiementStats>(`${this.apiUrl}/modes-paiement/stats`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<ModesPaiementStats>('getStatistiquesModesPaiement', error))
    );
  }

  /** ================================
   *  API - DÉTAILS DÉPENSES
   ================================== */
  getDepensesDetaillees(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
  }): Observable<TransactionsResponse> {
    const params = this.buildParams(filters);
    
    return this.http.get<TransactionsResponse>(`${this.apiUrl}/depenses`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<TransactionsResponse>('getDepensesDetaillees', error))
    );
  }

  /** ================================
   *  API - DÉTAILS RECETTES
   ================================== */
  getRecettesDetaillees(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: number;
  }): Observable<TransactionsResponse> {
    const params = this.buildParams(filters);
    
    return this.http.get<TransactionsResponse>(`${this.apiUrl}/recettes`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<TransactionsResponse>('getRecettesDetaillees', error))
    );
  }

  /** ================================
   *  API - DONNÉES ÉVOLUTIVES (GRAPHIQUES)
   ================================== */
  getDonneesEvolutives(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    groupBy?: string;
  }): Observable<DonneesEvolutivesResponse> {
    const params = this.buildParams(filters);
    
    return this.http.get<DonneesEvolutivesResponse>(`${this.apiUrl}/evolution`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<DonneesEvolutivesResponse>('getDonneesEvolutives', error))
    );
  }

  /** ================================
   *  API - DONNÉES COMPARATIVES
   ================================== */
  getDonneesComparatives(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    nombrePeriodes?: number;
  }): Observable<DonneesComparativesResponse> {
    const params = this.buildParams(filters);
    
    return this.http.get<DonneesComparativesResponse>(`${this.apiUrl}/comparatives`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<DonneesComparativesResponse>('getDonneesComparatives', error))
    );
  }

  /** ================================
   *  MÉTHODE POUR EXPORT PDF
   ================================== */
  /* exportPDF(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    fromDate: Date;
    toDate: Date;
  }): Observable<Blob> {
    const params = this.buildParams(filters);
    
    return this.http.get(`${this.apiUrl}/export/pdf`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    }).pipe(
      catchError(error => this.handleError('exportPDF', error))
    );
  } */

  /** ================================
   *  MÉTHODE POUR EXPORT EXCEL
   ================================== */
  /* exportExcel(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    fromDate: Date;
    toDate: Date;
  }): Observable<Blob> {
    const params = this.buildParams(filters);
    
    return this.http.get(`${this.apiUrl}/export/excel`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    }).pipe(
      catchError(error => this.handleError('exportExcel', error))
    );
  } */

  /** ================================
   *  API COMPLÈTE POUR RAPPORT
   ================================== */
  getRapportComplet(filters: {
    code_structure: string;
    magasinId?: number;
    agentId?: number;
    periode?: string;
    dateReference?: Date;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
  }): Observable<any> {
    // Récupérer toutes les données en parallèle
    return new Observable(observer => {
      Promise.all([
        this.getIndicateursFinanciers(filters).toPromise(),
        this.getRepartitionDepenses(filters).toPromise(),
        this.getRepartitionRecettes(filters).toPromise(),
        this.getStatistiquesModesPaiement(filters).toPromise(),
        this.getDepensesDetaillees(filters).toPromise(),
        this.getRecettesDetaillees(filters).toPromise(),
        this.getDonneesEvolutives(filters).toPromise()
      ]).then(([
        indicateurs,
        repartitionDepenses,
        repartitionRecettes,
        modesPaiement,
        depenses,
        recettes,
        evolution
      ]) => {
        observer.next({
          indicateurs,
          repartitionDepenses,
          repartitionRecettes,
          modesPaiement,
          depenses,
          recettes,
          evolution,
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
   *  MÉTHODE UTILITAIRE POUR LE COMPOSANT
   ================================== */
  getCategories(type?: 'DEPENSE' | 'RECETTE'): Observable<any[]> {
    const params = this.buildParams({ type });
    
    return this.http.get<any[]>(`${this.apiUrl}/categories`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<any>('getCategories', error))
    );
  }

  /** ================================
   *  MÉTHODE POUR RÉCUPÉRER LES MAGASINS
   ================================== */
  getMagasins(code_structure: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/magasins`, {
      headers: this.getHeaders(),
      params: this.buildParams({ code_structure })
    }).pipe(
      catchError(error => this.handleError<any>('getMagasins', error))
    );
  }

  /** ================================
   *  MÉTHODE POUR LES STATS PAR CATÉGORIE
   ================================== */
  getStatsByCategory(filters: {
    code_structure: string;
    categoryId: number;
    type: 'DEPENSE' | 'RECETTE';
    magasinId?: number;
    agentId?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Observable<{
    montantTotal: number;
    occurrences: number;
    moyenne: number;
  }> {
    const params = this.buildParams(filters);
    
    return this.http.get<{
      montantTotal: number;
      occurrences: number;
      moyenne: number;
    }>(`${this.apiUrl}/stats/categorie`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(error => this.handleError<any>('getStatsByCategory', error))
    );
  }

  /**
   * Génère un PDF du rapport financier
   */
  genererRapportPDF(params: any): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params.periode) httpParams = httpParams.set('periode', params.periode);
    if (params.dateReference) httpParams = httpParams.set('dateReference', params.dateReference);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.magasinId) httpParams = httpParams.set('magasinId', params.magasinId.toString());
    if (params.agentId) httpParams = httpParams.set('agentId', params.agentId.toString());

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
   * Exporte le rapport financier au format Excel
   */
  exportRapportExcel(params: any): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params.periode) httpParams = httpParams.set('periode', params.periode);
    if (params.dateReference) httpParams = httpParams.set('dateReference', params.dateReference);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.magasinId) httpParams = httpParams.set('magasinId', params.magasinId.toString());
    if (params.agentId) httpParams = httpParams.set('agentId', params.agentId.toString());

    return this.http.get(`${this.apiUrl}/excel`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
