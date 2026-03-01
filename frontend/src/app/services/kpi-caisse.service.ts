/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { throwError } from 'rxjs/internal/observable/throwError';
import { CaisseTheorique, CAParJourResponse, CommandeStats, ComparaisonOptions, ComparaisonResponse, ComparatifCA, ComparatifMagasin, EncaissementsResponse,KPICaissePeriode, KPIParams, KPIParamsJournalier, RapportVenteParams, RapportVenteResponse, StatsAvances, StatsAvoirs, StatsRemises, StatsStructureParMagasinResponse, StatsVentesCaisseAnnulees, StatsVentesCredit, StatsVentesCreditAnnulees, ToutesStatistiquesSpeciales, VendeurDetailsResponse } from '../modeles/kpiCaisse.model';
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
   */
  getStatistiquesAvoirs(params: KPIParams): Observable<StatsAvoirs> {
    if (!params.code_structure) {
      return throwError(() => new Error('Le paramètre "code_structure" est requis'));
    }

    const url = `${this.apiUrl}/stats/caisse/avoirs`;
    const httpParams = this.buildParams(params);

    return this.http.get<StatsAvoirs>(url, {
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      catchError(error => this.handleError<StatsAvoirs>('getStatistiquesAvoirs', error))
    );
  }

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

  /** ================================
   *  MÉTHODES UTILITAIRES SPÉCIFIQUES
   ================================== */

  /**
   * Formatte les données pour l'affichage des statistiques spéciales
   */
  formatStatistiquesSpeciales(stats: ToutesStatistiquesSpeciales): any {
    return {
      // Résumé formaté
      resume: {
        totalAvoirs: this.formatMontant(stats.resume.totalAvoirs),
        totalVentesCredit: this.formatMontant(stats.resume.totalVentesCredit),
        totalAvances: this.formatMontant(stats.resume.totalAvances),
        totalRetours: this.formatMontant(stats.resume.totalRetours),
        totalAnnulations: this.formatMontant(stats.resume.totalAnnulations),
      },
      // Détails formatés
      avoirs: {
        montantAvoir: this.formatMontant(stats.avoirs.montantAvoir),
        nombreAvoirs: stats.avoirs.nombreAvoirs
      },
      ventesCredit: {
        montantCredit: this.formatMontant(stats.ventesCredit.montantCredit),
        nombrePaniersCredit: stats.ventesCredit.nombrePaniersCredit,
        nombreBonsCredit: stats.ventesCredit.nombreBonsCredit
      },
      avances: {
        totalAvances: this.formatMontant(stats.avances.totalAvances),
        nombreAvances: stats.avances.nombreAvances,
        nombrePaniersAvecAvance: stats.avances.nombrePaniersAvecAvance,
        moyenneAvance: this.formatMontant(stats.avances.moyenneAvance)
      },
      ventesCreditAnnulees: {
        totalMontantRetour: this.formatMontant(stats.ventesCreditAnnulees.totalMontantRetour),
        nombreRetours: stats.ventesCreditAnnulees.nombreRetours,
        nombreRetoursTotaux: stats.ventesCreditAnnulees.nombreRetoursTotaux,
        nombreRetoursPartiels: stats.ventesCreditAnnulees.nombreRetoursPartiels
      },
      ventesCaisseAnnulees: {
        totalMontant: this.formatMontant(stats.ventesCaisseAnnulees.totalMontant),
        totalPaniers: stats.ventesCaisseAnnulees.totalPaniers,
        totalPaiementsAnnules: this.formatMontant(stats.ventesCaisseAnnulees.totalPaiementsAnnules)
      }
    };
  }

  /**
   * Calcule les pourcentages pour les statistiques spéciales
   */
  calculerPourcentagesStatistiquesSpeciales(stats: ToutesStatistiquesSpeciales): any {
    const totalGeneral = 
      stats.resume.totalAvoirs + 
      stats.resume.totalVentesCredit + 
      stats.resume.totalAvances + 
      stats.resume.totalRetours + 
      stats.resume.totalAnnulations;

    return {
      pourcentageAvoirs: totalGeneral > 0 ? (stats.resume.totalAvoirs / totalGeneral) * 100 : 0,
      pourcentageVentesCredit: totalGeneral > 0 ? (stats.resume.totalVentesCredit / totalGeneral) * 100 : 0,
      pourcentageAvances: totalGeneral > 0 ? (stats.resume.totalAvances / totalGeneral) * 100 : 0,
      pourcentageRetours: totalGeneral > 0 ? (stats.resume.totalRetours / totalGeneral) * 100 : 0,
      pourcentageAnnulations: totalGeneral > 0 ? (stats.resume.totalAnnulations / totalGeneral) * 100 : 0,
    };
  }

  /**
   * Obtient l'icône appropriée pour chaque type de statistique spéciale
   */
  getIconeStatistiqueSpecial(type: string): string {
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
    const icones: { [key: string]: string } = {
      'avoirs': 'bi-ticket-perforated',
      'ventesCredit': 'bi-credit-card',
      'avances': 'bi-cash-coin',
      'retours': 'bi-arrow-return-left',
      'annulations': 'bi-x-circle'
    };
    return icones[type] || 'bi-info-circle';
  }

  /**
   * Obtient la couleur appropriée pour chaque type de statistique spéciale
   */
  getCouleurStatistiqueSpecial(type: string): string {
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
    const couleurs: { [key: string]: string } = {
      'avoirs': 'primary',
      'ventesCredit': 'success',
      'avances': 'warning',
      'retours': 'info',
      'annulations': 'danger'
    };
    return couleurs[type] || 'secondary';
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

   console.log('URL complète:', url);
  console.log('Params:', params.toString());
  console.log('URL avec params:', `${url}?${params.toString()}`);
  
  return this.http.post<ComparaisonResponse>(url,{}, {
    headers: this.getHeaders(),
    params
  }).pipe(
    catchError(error => this.handleError<ComparaisonResponse>('genererComparaison', error))
  );
}

// ================================
//  MÉTHODES UTILITAIRES POUR LE RAPPORT
// ================================

/**
 * Formate les données du rapport pour l'affichage
 */
formatRapportVente(rapport: RapportVenteResponse): any {
  return {
    ...rapport,
    // KPI formatés
    chiffreAffairesTTCFormatted: this.formatMontant(rapport.chiffreAffairesTTC),
    chiffreAffairesHTFormatted: this.formatMontant(rapport.chiffreAffairesHT),
    margeBeneficiaireFormatted: this.formatMontant(rapport.margeBeneficiaire),
    ticketMoyenFormatted: this.formatMontant(rapport.ticketMoyen),
    
    // Modes de paiement avec pourcentage
    statmodesPaiement: rapport.statmodesPaiement.map(mode => ({
      ...mode,
      montantTotalFormatted: this.formatMontant(mode.montantTotal),
      pourcentage: rapport.chiffreAffairesTTC > 0 
        ? (mode.montantTotal / rapport.chiffreAffairesTTC * 100).toFixed(1)
        : 0
    })),
    
    // Top produits formatés
    topProduits: rapport.topProduits.map(p => ({
      ...p,
      caFormatted: this.formatMontant(p.ca),
      margeFormatted: this.formatMontant(p.marge),
      margePourcentage: p.ca > 0 ? (p.marge / p.ca * 100).toFixed(1) : 0
    })),
    
    // Top clients formatés
    topClients: rapport.topClients.map(c => ({
      ...c,
      caFormatted: this.formatMontant(c.ca),
      dernierAchat: c.dernierAchat ? new Date(c.dernierAchat) : null
    })),
    
    // Performance vendeurs formatée
    vendeursPerformance: rapport.vendeursPerformance.map(v => ({
      ...v,
      caHTFormatted: this.formatMontant(v.caHT),
      caTTCFormatted: this.formatMontant(v.caTTC),
      ticketMoyenFormatted: this.formatMontant(v.ticketMoyen)
    }))
  };
}

/**
 * Calcule les tendances pour le rapport
 */
calculerTendances(rapport: RapportVenteResponse): {
  caTendance: 'positive' | 'negative' | 'stable';
  volumeTendance: 'positive' | 'negative' | 'stable';
  message: string;
} {
  const caTendance = rapport.evolutionCA.valeur > 0 ? 'positive' 
    : rapport.evolutionCA.valeur < 0 ? 'negative' : 'stable';
  
  const volumeTendance = rapport.evolutionVolume.valeur > 0 ? 'positive'
    : rapport.evolutionVolume.valeur < 0 ? 'negative' : 'stable';

  let message = '';
  if (caTendance === 'positive' && volumeTendance === 'positive') {
    message = '📈 Excellente performance : CA et volume en hausse';
  } else if (caTendance === 'positive' && volumeTendance === 'negative') {
    message = '📊 CA en hausse malgré une baisse du volume (ticket moyen plus élevé)';
  } else if (caTendance === 'negative' && volumeTendance === 'positive') {
    message = '📉 Baisse du CA malgré une hausse du volume (ticket moyen en baisse)';
  } else if (caTendance === 'negative' && volumeTendance === 'negative') {
    message = '📉 Performance en baisse sur tous les indicateurs';
  } else {
    message = '📊 Performance stable par rapport à la période précédente';
  }

  return { caTendance, volumeTendance, message };
}

/**
 * Prépare les données pour les graphiques du rapport
 */
prepareChartData(rapport: RapportVenteResponse): {
  evolutionChart: { labels: string[]; datasets: any[] };
  paiementsChart: { labels: string[]; data: number[] };
  topProduitsChart: { labels: string[]; data: number[] };
} {
  // Évolution des ventes
  const evolutionChart = {
    labels: rapport.evolutionParJour.map(e => {
      const date = new Date(e.date);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [
      {
        label: 'Chiffre d\'affaires',
        data: rapport.evolutionParJour.map(e => e.ca),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        yAxisID: 'y'
      },
      {
        label: 'Nombre de ventes',
        data: rapport.evolutionParJour.map(e => e.nombreVentes),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        yAxisID: 'y1'
      }
    ]
  };

  // Modes de paiement
  const paiementsChart = {
    labels: rapport.statmodesPaiement.map(m => m.mode),
    data: rapport.statmodesPaiement.map(m => m.montantTotal)
  };

  // Top produits
  const topProduitsChart = {
    labels: rapport.topProduits.map(p => p.produit.designation.substring(0, 20) + '...'),
    data: rapport.topProduits.map(p => p.ca)
  };

  return { evolutionChart, paiementsChart, topProduitsChart };
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
