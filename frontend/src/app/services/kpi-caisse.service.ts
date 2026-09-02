/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { CaisseTheorique, CAParJourResponse, CommandeStats, ComparaisonOptions, ComparaisonResponse, ComparatifCA, ComparatifMagasin, EncaissementsResponse,KPICaissePeriode, KPIParams, KPIParamsJournalier, RapportVenteParams, RapportVenteResponse, StatsAvances, StatsAvoirs, StatsRemises, StatsStructureParMagasinResponse, StatsVentesCaisseAnnulees, StatsVentesCredit, StatsVentesCreditAnnulees, ToutesStatistiquesSpeciales, VendeurDetailsResponse } from '../modeles/kpiCaisse.model';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KpiCaisseService {

  private apiUrl = `${environment.apiUrl}/kpi-caisse`;
  
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
   *  API STATISTIQUES SPÉCIALES COMBINÉES
   ================================== */

  /**
   * Récupère toutes les statistiques spéciales en un seul appel
   * - Avoirs émis
   * - Ventes à crédit
   * - Avances
   * - Ventes à crédit annulées/retournées
   * - Ventes en caisse annulées/retournées
   */
  getToutesStatistiquesSpeciales(params: KPIParams): Observable<ToutesStatistiquesSpeciales> {
    // Validation des paramètres requis
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }

    // Si aucune période n'est spécifiée, on prend "jour" par défaut
    if (!params.periode) {
      params = { ...params, periode: 'jour' };
    }

    const url = `${this.apiUrl}/stats/caisse/toutes-statistiques-speciales`;
    const httpParams = this.buildParams(params);

    return this.http.get<ToutesStatistiquesSpeciales>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<ToutesStatistiquesSpeciales>('getToutesStatistiquesSpeciales', error))
    );
  }

  /** ================================
   *  API STATISTIQUES SPÉCIALES INDIVIDUELLES
   ================================== */

  /**
   * Récupère uniquement les statistiques des avoirs
  /**
   * Récupère uniquement les statistiques des ventes à crédit
   */
  getStatistiquesVentesCredit(params: KPIParams): Observable<StatsVentesCredit> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }

    const url = `${this.apiUrl}/stats/caisse/ventes-credit`;
    const httpParams = this.buildParams(params);

    return this.http.get<StatsVentesCredit>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsVentesCredit>('getStatistiquesVentesCredit', error))
    );
  }

  /**
   * Récupère uniquement les statistiques des avances
   */
  getStatistiquesAvances(params: KPIParams): Observable<StatsAvances> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }

    const url = `${this.apiUrl}/stats/caisse/avances`;
    const httpParams = this.buildParams(params);

    return this.http.get<StatsAvances>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsAvances>('getStatistiquesAvances', error))
    );
  }

  /**
   * Récupère uniquement les statistiques des ventes à crédit annulées
   */
  getStatistiquesVentesCreditAnnulees(params: KPIParams): Observable<StatsVentesCreditAnnulees> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }

    const url = `${this.apiUrl}/stats/caisse/ventes-credit-annulees`;
    const httpParams = this.buildParams(params);

    return this.http.get<StatsVentesCreditAnnulees>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsVentesCreditAnnulees>('getStatistiquesVentesCreditAnnulees', error))
    );
  }

  /**
   * Récupère uniquement les statistiques des ventes en caisse annulées
   */
  getStatistiquesVentesCaisseAnnulees(params: KPIParams): Observable<StatsVentesCaisseAnnulees> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }

    const url = `${this.apiUrl}/stats/caisse/ventes-caisse-annulees`;
    const httpParams = this.buildParams(params);

    return this.http.get<StatsVentesCaisseAnnulees>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsVentesCaisseAnnulees>('getStatistiquesVentesCaisseAnnulees', error))
    );
  }

   /**
   * Récupère les statistiques complètes des commandes clients
   */
  getStatistiquesCommandes(params: KPIParams): Observable<CommandeStats> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }

    const url = `${this.apiUrl}/stats/caisse/toutes-statistiques-commandes`;
    const httpParams = this.buildParams(params);

    return this.http.get<CommandeStats>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<CommandeStats>('getStatistiquesCommandes', error))
    );
  }

  //............................Partie pour le rapport de vente.....................................
  // ================================
//  API RAPPORT DE VENTE COMPLET
// ================================

/**
 * Récupère le rapport de vente complet avec tous les KPI
 * @param params Paramètres incluant période, dates, pagination, recherche
 */
getRapportVente(params: RapportVenteParams): Observable<RapportVenteResponse> {
  if (!params.code_structure) {
    return throwError(() => new Error('Le paramètre "code_structure" est requis'));
  }

  const url = `${this.apiUrl}/rapport-vente`;
  let httpParams = this.buildParams(params);
  
  // Ajouter les paramètres spécifiques
  if (params.page) {
    httpParams = httpParams.set('page', params.page.toString());
  }
  if (params.limit) {
    httpParams = httpParams.set('limit', params.limit.toString());
  }
  if (params.search) {
    httpParams = httpParams.set('search', params.search);
  }
  if (params.fromDate) {
    httpParams = httpParams.set('fromDate', params.fromDate);
  }
  if (params.toDate) {
    httpParams = httpParams.set('toDate', params.toDate);
  }

  return this.http.get<RapportVenteResponse>(url, {
    headers: this.getHeaders(),
    params: httpParams
  }).pipe(
    catchError(error => this.handleError<RapportVenteResponse>('getRapportVente', error))
  );
}

// ================================
//  API DÉTAILS VENDEUR
// ================================

/**
 * Récupère les détails d'un vendeur spécifique
 * @param vendeurId ID du vendeur
 * @param params Paramètres de période
 */
getDetailsVendeur(vendeurId: number, params: RapportVenteParams): Observable<VendeurDetailsResponse> {
  // if (!params.code_structure) {
  //   return throwError(() => new Error('Le paramètre "code_structure" est requis'));
  // }
  if (!vendeurId) {
    return throwError(() => new Error('Le paramètre "vendeurId" est requis'));
  }

  const url = `${this.apiUrl}/rapport-vente/vendeur/${vendeurId}/details`;
  let  httpParams = this.buildParams(params);
  // Ajouter les paramètres spécifiques
  if (params.page) {
    httpParams = httpParams.set('page', params.page.toString());
  }
  if (params.limit) {
    httpParams = httpParams.set('limit', params.limit.toString());
  }
  if (params.search) {
    httpParams = httpParams.set('search', params.search);
  }
  if (params.fromDate) {
    httpParams = httpParams.set('fromDate', params.fromDate);
  }
  if (params.toDate) {
    httpParams = httpParams.set('toDate', params.toDate);
  }

  return this.http.get<VendeurDetailsResponse>(url, {
    headers: this.getHeaders(),
    params: httpParams
  }).pipe(
    catchError(error => this.handleError<VendeurDetailsResponse>('getDetailsVendeur', error))
  );
}

// ================================
//  API OPTIONS DE COMPARAISON
// ================================

/**
 * Récupère les options disponibles pour la comparaison
 * @param type Type de comparaison ('periode', 'vendeur', 'magasin')
 */
getOptionsComparaison(type: string): Observable<ComparaisonOptions[]> {
  

  const url = `${this.apiUrl}/rapport-vente/comparaison/options`;
  const params = new HttpParams()
    .set('type', type);
    //.set('code_structure', code_struc);

  return this.http.get<ComparaisonOptions[]>(url, {
    headers: this.getHeaders(),
    params
  }).pipe(
    catchError(error => this.handleError<ComparaisonOptions[]>('getOptionsComparaison', error))
  );
}

// ================================
//  API GÉNÉRER COMPARAISON
// ================================

/**
 * Génère une comparaison entre deux éléments
 * @param data Données de comparaison
 */
genererComparaison(data: {
  type: string;
  element1: string;
  element2: string;
  periode?: string;
  dateReference?: string;
  fromDate?: string;
  toDate?: string;
  magasinId?: number;
  agentId?: number;
}): Observable<ComparaisonResponse> {
  

  const url = `${this.apiUrl}/rapport-vente/comparaison`;
  let params = new HttpParams()
    .set('type', data.type)
    .set('element1', data.element1)
    .set('element2', data.element2);

  if (data.periode) {
    params = params.set('periode', data.periode);
  }
  if (data.dateReference) {
    params = params.set('dateReference', data.dateReference);
  }
  if (data.fromDate) {
    params = params.set('fromDate', data.fromDate);
  }
  if (data.toDate) {
    params = params.set('toDate', data.toDate);
  }
  if (data.magasinId) {
    params = params.set('magasinId', data.magasinId.toString());
  }
  if (data.agentId) {
    params = params.set('agentId', data.agentId.toString());
  }

  
  return this.http.post<ComparaisonResponse>(url,{}, {
    headers: this.getHeaders(),
    params
  }).pipe(
    catchError(error => this.handleError<ComparaisonResponse>('genererComparaison', error))
  );
}

/**
   * Exporte le rapport de vente au format Excel
   */
  exportRapportExcel(params: any): Observable<Blob> {
    let httpParams = new HttpParams();

    // Ajouter les paramètres
    if (params.periode) httpParams = httpParams.set('periode', params.periode);
    if (params.dateReference) httpParams = httpParams.set('dateReference', params.dateReference);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    if (params.magasinId) httpParams = httpParams.set('magasinId', params.magasinId.toString());
    if (params.agentId) httpParams = httpParams.set('agentId', params.agentId.toString());

    console.log('📤 Export Excel avec paramètres:', httpParams.toString());

    return this.http.get(`${this.apiUrl}/rapport-vente/excel`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
