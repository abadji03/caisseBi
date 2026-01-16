/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { Panier } from '../modeles/panier.model';
const API_URL = 'http://localhost:5000/api/paniers'; // adapte selon ton backend

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

  private handleError(error: Panier): Observable<never> {
    this.logger.error('Erreur API Panier:', error);
    return throwError(() => error);
  }

  createPanierComplet(panierCompletData: any): Observable<any> {
      return this.http.post<any>(`${API_URL}/panier-complet`, panierCompletData);
  }

  createPanier(data: Panier): Observable<Panier> {
    return this.http.post<Panier>(`${API_URL}`, data, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err))); 
  }

  getPaniersByStructure(code_structure: string, magasinId: number): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${API_URL}/structure/${code_structure}/magasin/${magasinId }`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getPaniersBrouillon(code_structure: string, magasinId: number): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${API_URL}/structure/${code_structure}/magasin/${magasinId }/brouillon`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getAllPaniers(): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${API_URL}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getPanierById(id: number): Observable<Panier> {
    return this.http.get<Panier>(`${API_URL}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updatePanier(id: number, data: Panier): Observable<Panier> {
    return this.http.put<Panier>(`${API_URL}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  deletePanier(id: number): Observable<Panier> {
    return this.http.delete<Panier>(`${API_URL}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  deleteOnlyPanier(id: number): Observable<Panier> {
    return this.http.delete<Panier>(`${API_URL}/onlyPanier/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }
  // === Méthodes spécifiques ===

  updateStatutPanier(id: number, statut: string): Observable<Panier> {
    return this.http.patch<Panier>(`${API_URL}/${id}/statut`, { statut }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateTotauxPanier(id: number, totalHT: number, tva: number): Observable<Panier> {
    return this.http.patch<Panier>(`${API_URL}/${id}/totaux`, { totalHT, tva }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateDetailsVisible(id: number, visible: boolean): Observable<Panier> {
    return this.http.patch<Panier>(`${API_URL}/${id}/detailsVisible`, { visible }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  resetPanier(id: number): Observable<Panier> {
    return this.http.patch<Panier>(`${API_URL}/${id}/reset`, {}, { headers: this.getHeaders() })
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
   * Récupère uniquement les paniers d'aujourd'hui
   * @param code_structure Optionnel - Code de la structure
   * @param magasinId Optionnel - ID du magasin
   */
  getPaniersAujourdhui(code_structure?: string, magasinId?: number, bonId?: number | null | ''): Observable<any> {
    let params = new HttpParams();
    
    if (code_structure) {
      params = params.set('code_structure', code_structure);
    }
    
    if (magasinId) {
      params = params.set('magasinId', magasinId.toString());
    }

    if (bonId !== undefined) {
    if (bonId === null) {
      params = params.set('bonId', 'null');
    } 
    else if (typeof bonId === 'number') {
      params = params.set('bonId', bonId.toString());
    }
  }

    return this.http.get<any>(`${API_URL}/structure/${code_structure}/magasin/${magasinId}/bons/${bonId}/aujourdhui`, {
      headers: this.getHeaders(),
      params
    }).pipe(catchError(err => this.handleError(err)));
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
