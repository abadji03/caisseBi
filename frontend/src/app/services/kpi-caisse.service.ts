/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { throwError } from 'rxjs/internal/observable/throwError';
import { CaisseTheorique, CAParJourResponse, CommandeStats, ComparatifCA, ComparatifMagasin, EncaissementsResponse,KPICaissePeriode, KPIParams, KPIParamsJournalier, StatsAvances, StatsAvoirs, StatsRemises, StatsStructureParMagasinResponse, StatsVentesCaisseAnnulees, StatsVentesCredit, StatsVentesCreditAnnulees, ToutesStatistiquesSpeciales } from '../modeles/kpiCaisse.model';
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

}