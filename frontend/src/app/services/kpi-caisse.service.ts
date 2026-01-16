/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { throwError } from 'rxjs/internal/observable/throwError';
import { CaisseTheorique, CAParJourResponse, ComparatifCA, ComparatifMagasin, EncaissementsResponse,KPICaissePeriode, KPIParams, KPIParamsJournalier, StatsAvoirs, StatsRemises, StatsStructureParMagasinResponse } from '../modeles/kpiCaisse.model';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KpiCaisseService {

  private apiUrl = 'http://localhost:5000/api/kpi-caisse';
  
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
    this.logger.error(`KpiCaisseService -> ${method} :`, error);
    return throwError(() => error);
  }

  /** ================================
   *  CONSTRUCTION DES PARAMÈTRES
   ================================== */
  private buildParams(params: KPIParams): HttpParams {
    let httpParams = new HttpParams();
    
    // code_structure est toujours requis maintenant
    if (params.code_structure) {
      httpParams = httpParams.set('code_structure', params.code_structure);
    }
    
    if (params.periode) {
      httpParams = httpParams.set('periode', params.periode);
    }
    
    if (params.dateReference) {
      httpParams = httpParams.set('dateReference', params.dateReference);
    }
    
    if (params.magasinId) {
      httpParams = httpParams.set('magasinId', params.magasinId.toString());
    }
    
    if (params.agentId) {
      httpParams = httpParams.set('agentId', params.agentId.toString());
    }
    
    return httpParams;
  }

  /** ================================
   *  API KPI CAISSE - JOUR COURANT
   ================================== */

  /**
   * KPI caisse pour la journée courante
   * code_structure est maintenant obligatoire
   */
  getKpiCaisseJour(params: KPIParamsJournalier): Observable<KPICaissePeriode> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/kpi`;
    const httpParams = this.buildParams({
      ...params,
      periode: 'jour'
    });
    
    return this.http.get<KPICaissePeriode>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<KPICaissePeriode>('getKpiCaisseJour', error))
    );
  }

  /**
   * Paiements par mode pour la journée courante
   * code_structure est maintenant obligatoire
   */
  getPaiementsJour(params: KPIParamsJournalier): Observable<EncaissementsResponse> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/paiements`;
    const httpParams = this.buildParams({
      ...params,
      periode: 'jour'
    });
    
    return this.http.get<EncaissementsResponse>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<EncaissementsResponse>('getPaiementsJour', error))
    );
  }

  /** ================================
   *  API KPI CAISSE - PAR PÉRIODE
   ================================== */

  /**
   * KPI caisse pour une période spécifique
   * code_structure et periode sont obligatoires
   */
  getKpiCaissePeriode(params: KPIParams): Observable<KPICaissePeriode> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    if (!params.periode) {
      return throwError(() => new Error('Le paramètre "periode" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/kpi-periode`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<KPICaissePeriode>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<KPICaissePeriode>('getKpiCaissePeriode', error))
    );
  }

  /**
   * KPI caisse pour une structure (alias de getKpiCaissePeriode)
   * Gardé pour la rétrocompatibilité
   */
  getKpiCaisseStructure(params: KPIParams): Observable<KPICaissePeriode> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    if (!params.periode) {
      return throwError(() => new Error('Le paramètre "periode" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/kpi-structure`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<KPICaissePeriode>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<KPICaissePeriode>('getKpiCaisseStructure', error))
    );
  }

  /**
   * Paiements par mode pour une période
   * code_structure et periode sont obligatoires
   */
  getPaiementsPeriode(params: KPIParams): Observable<EncaissementsResponse> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    if (!params.periode) {
      return throwError(() => new Error('Le paramètre "periode" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/paiements`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<EncaissementsResponse>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<EncaissementsResponse>('getPaiementsPeriode', error))
    );
  }

  /** ================================
   *  API STATISTIQUES DIVERSES
   ================================== */

  /**
   * Remises accordées (jour ou période)
   * code_structure est obligatoire
   */
  getRemises(params: KPIParams): Observable<StatsRemises> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/remises`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<StatsRemises>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsRemises>('getRemises', error))
    );
  }

  /**
   * Avoirs émis (jour ou période)
   * code_structure est obligatoire
   */
  getAvoirs(params: KPIParams): Observable<StatsAvoirs> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/avoirs`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<StatsAvoirs>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsAvoirs>('getAvoirs', error))
    );
  }

  /**
   * Caisse théorique (jour ou période)
   * code_structure est obligatoire
   */
  getCaisseTheorique(params: KPIParams): Observable<CaisseTheorique> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/caisse-theorique`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<CaisseTheorique>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<CaisseTheorique>('getCaisseTheorique', error))
    );
  }

  /** ================================
   *  API COMPARAISONS ET ANALYSES
   ================================== */

  /**
   * Comparatif CA période actuelle vs précédente
   * code_structure et periode sont obligatoires
   */
  getComparatifCA(params: KPIParams): Observable<ComparatifCA> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    if (!params.periode) {
      return throwError(() => new Error('Le paramètre "periode" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/comparatif`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<ComparatifCA>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<ComparatifCA>('getComparatifCA', error))
    );
  }

  /**
   * Comparatif magasin vs structure
   * code_structure, magasinId et periode sont obligatoires
   */
  getComparatifMagasin(params: KPIParams): Observable<ComparatifMagasin> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    if (!params.magasinId) {
      return throwError(() => new Error('Le paramètre "magasinId" est requis'));
    }
    
    if (!params.periode) {
      return throwError(() => new Error('Le paramètre "periode" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/comparatif-magasin`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<ComparatifMagasin>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<ComparatifMagasin>('getComparatifMagasin', error))
    );
  }

  /**
   * CA par jour (par défaut pour le mois en cours)
   * code_structure est obligatoire
   */
  getCAParJour(params: KPIParams): Observable<CAParJourResponse> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/ca-par-jour`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<CAParJourResponse>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<CAParJourResponse>('getCAParJour', error))
    );
  }

  /**
   * Statistiques par magasin pour une structure
   * code_structure et periode sont obligatoires
   */
  getStatsStructureParMagasin(params: KPIParams): Observable<StatsStructureParMagasinResponse> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    if (!params.periode) {
      return throwError(() => new Error('Le paramètre "periode" est requis'));
    }
    
    const url = `${this.apiUrl}/stats/caisse/structure-par-magasin`;
    const httpParams = this.buildParams(params);
    
    return this.http.get<StatsStructureParMagasinResponse>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsStructureParMagasinResponse>('getStatsStructureParMagasin', error))
    );
  }

  /** ================================
   *  MÉTHODES UTILITAIRES
   ================================== */

  /**
   * Méthode pour récupérer toutes les données KPI pour un dashboard journalier
   */
  getDashboardJournalier(params: KPIParamsJournalier): Observable<{
    kpi: KPICaissePeriode;
    paiements: EncaissementsResponse;
    remises: StatsRemises;
    avoirs: StatsAvoirs;
    caisseTheorique: CaisseTheorique;
  }> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    // Convertir params journalier en params standard pour les autres appels
    /* const kpiParams: KPIParams = {
      ...params,
      periode: 'jour'
    }; */
    
    // Utiliser Promise.all pour combiner plusieurs requêtes
    return throwError(() => new Error('Utiliser forkJoin dans votre composant'));
  }

  /**
   * Méthode pour récupérer toutes les données KPI pour une période
   */
  getDashboardPeriode(params: KPIParams): Observable<{
    kpi: KPICaissePeriode;
    paiements: EncaissementsResponse;
    remises: StatsRemises;
    avoirs: StatsAvoirs;
    caisseTheorique: CaisseTheorique;
    comparatif: ComparatifCA;
  }> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }
    
    if (!params.periode) {
      return throwError(() => new Error('Le paramètre "periode" est requis'));
    }
    
    // Utiliser Promise.all pour combiner plusieurs requêtes
    return throwError(() => new Error('Utiliser forkJoin dans votre composant'));
  }

  /**
   * Formatte un montant avec séparateur de milliers
   */
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant);
  }

  /**
   * Calcule la variation avec formatage couleur
   */
  getVariationStyle(variation: number): { color: string; icon: string } {
    if (variation > 0) {
      return { color: 'green', icon: '↑' };
    } else if (variation < 0) {
      return { color: 'red', icon: '↓' };
    } else {
      return { color: 'gray', icon: '→' };
    }
  }

  /**
   * Détermine le niveau (structure ou magasin) selon les paramètres
   */
  getNiveau(params: KPIParams | KPIParamsJournalier): 'structure' | 'magasin' {
    return params.magasinId ? 'magasin' : 'structure';
  }

  /**
   * Valide les paramètres avant l'appel API
   */
  validateParams(params: KPIParams): string[] {
    const errors: string[] = [];
    
    if (!params.code_structure) {
      errors.push('Le paramètre "code_structure" est requis');
    }
    
    // Pour les méthodes qui nécessitent une période
    if ('periode' in params && !params.periode) {
      errors.push('Le paramètre "periode" est requis');
    }
    
    return errors;
  }
}