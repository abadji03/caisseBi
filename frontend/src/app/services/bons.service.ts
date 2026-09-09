import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { Bon } from '../modeles/bon.model';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

const API_URL = `${environment.apiUrl}/bons`;
const API_URL_BIS = `${environment.apiUrl}/bons-complet`;
export interface BonsFilter {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  statut?: string;
}

export interface BonsResponse {
  items: Bon[];
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
  providedIn: 'root'
})
export class BonsService {

  private http= inject(HttpClient);
  private logger= inject(NGXLogger);

  private handleError(error: unknown): Observable<never> {
    return handleApiError(this.logger, 'BonsService', error);
  }

  // bon.service.ts (frontend)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBonComplet(bonCompletData: any): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<any>(`${API_URL_BIS}/complet`, bonCompletData);
  }

  createBon(data: Bon): Observable<Bon> {
    return this.http.post<Bon>(`${API_URL}`, data, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  getBonsByStructure(code_structure: string): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}/structure/${code_structure}`, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  getBonsClientByStructure(code_structure: string): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}/structure/${code_structure}/clients`, {})
      .pipe(catchError(err => this.handleError(err)));
  }
  getBonsFournisseursByStructure(code_structure: string): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}/structure/${code_structure}/fournisseurs`, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  getBonsClientByStructureBis(code_structure: string, filter: BonsFilter = {}): Observable<BonsResponse> {
    let params = new HttpParams();
    
    // Pagination
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    
    // Recherche
    if (filter.search) params = params.set('search', filter.search);
    
    // Filtres
    if (filter.type) params = params.set('type', filter.type);
    if (filter.statut) params = params.set('statut', filter.statut);

    return this.http.get<BonsResponse>(
      `${API_URL}/structure/bis/${code_structure}/clients`, 
      { 
        params: params 
      }
    ).pipe(catchError(err => this.handleError(err)));
  }

  getBonsFournisseursByStructureBis(code_structure: string, filter: BonsFilter = {}): Observable<BonsResponse> {
    let params = new HttpParams();
    
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    if (filter.search) params = params.set('search', filter.search);
    if (filter.type) params = params.set('type', filter.type);
    if (filter.statut) params = params.set('statut', filter.statut);

    return this.http.get<BonsResponse>(
      `${API_URL}/structure/bis/${code_structure}/fournisseurs`, 
      { 
        params: params 
      }
    ).pipe(catchError(err => this.handleError(err)));
  }


  getAllBons(): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}`, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  getBonById(id: number): Observable<Bon> {
    return this.http.get<Bon>(`${API_URL}/${id}`, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  updateBon(id: number, data: Bon): Observable<Bon> {
    return this.http.put<Bon>(`${API_URL}/${id}`, data, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  deleteBon(id: number): Observable<Bon> {
    return this.http.delete<Bon>(`${API_URL}/${id}`, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  // === Méthodes spécifiques ===

  updateStatutBon(id: number, statutBon: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/statut`, { statutBon }, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  // services/bons.service.ts
  updateStatutBonBis(id: number, statutBon: string, numeroFacture?: string): Observable<Bon> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = { statutBon };
    if (numeroFacture) {
      body.numeroFacture = numeroFacture;
    }
    return this.http.patch<Bon>(`${API_URL}/${id}/bis/statut`, body, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  updateTypetBon(id: number, type: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/type`, { type }, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  updateResteAPayer(id: number, montant: number): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/resteAPayer`, { montant }, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  updateNetAPayer(id: number, remise: number): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/netAPayer`, { remise }, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  updateFichier(id: number, fichier: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/fichier`, { fichier }, {})
      .pipe(catchError(err => this.handleError(err)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadFichier(formData: FormData): Observable<any> {
  return this.http.post<Bon>(`${API_URL}/upload-fichier`, formData,{})
  .pipe(catchError(err => this.handleError(err)));
}

// Méthode pour mettre à jour le bon avec le chemin du fichier
// eslint-disable-next-line @typescript-eslint/no-explicit-any
updateBonAvecFichier(bonId: number, cheminFichier: string): Observable<any> {
  return this.http.patch(`${API_URL}/${bonId}/fichier`, {fichier: cheminFichier }, {})
  .pipe(catchError(err => this.handleError(err)));
}

  updateMotifsRetour(id: number, motifsRetour: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/motifsRetour`, { motifsRetour }, {})
      .pipe(catchError(err => this.handleError(err)));
  }
  
   // Créer un bon en mode brouillon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creerBonBrouillon(bonData: any): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<any>(`${API_URL}/brouillon`, bonData,{})
          .pipe(
            catchError(err => this.handleError(err)));
  }

  // Mettre à jour un bon existant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mettreAJourBon(bonId: number, bonData: any): Observable<any> {
    return this.http.put(`${API_URL}/${bonId}`, bonData,{})
      .pipe(
        catchError(err => this.handleError(err)));
  }

  // Changer le statut du panier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changerStatutPanier(panierId: number, nouveauStatut: string, confirmation?: boolean): Observable<any> {
    return this.http.post(`${API_URL}/panier/statut`, {
      panierId,
      nouveauStatut,
      confirmation
    },
    {}
    )
    .pipe(catchError(err => this.handleError(err)));
  }

  // Récupérer les bons brouillons
  getBonsBrouillons(code_structure: string): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}/brouillons/${code_structure}`, {})
    .pipe(catchError(err => this.handleError(err)));
  }

  // Supprimer un bon et son panier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supprimerBonComplet(bonId: number): Observable<any> {
    return this.http.delete(`${API_URL}/complet/${bonId}`, {})
    .pipe(catchError(err => this.handleError(err)));
  }

}