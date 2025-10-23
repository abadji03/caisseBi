import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { Bon } from '../modeles/bon.model';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from './auth.service';
const API_URL = 'http://localhost:5000/api/bons'; 
const API_URL_BIS = 'http://localhost:5000/api/bons-complet'; 
//const apiUrl = 'http://localhost:5000/api/bons';


@Injectable({
  providedIn: 'root'
})
export class BonsService {

  private http= inject(HttpClient);
  private logger= inject(NGXLogger)
  private authService= inject(AuthService)

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private handleError(error: Bon): Observable<never> {
    this.logger.error('Erreur API Bon:', error);
    return throwError(() => error);
  }

  // bon.service.ts (frontend)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBonComplet(bonCompletData: any): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<any>(`${API_URL_BIS}/complet`, bonCompletData);
  }

  createBon(data: Bon): Observable<Bon> {
    return this.http.post<Bon>(`${API_URL}`, data, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getBonsByStructure(code_structure: string): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}/structure/${code_structure}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getAllBons(): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getBonById(id: number): Observable<Bon> {
    return this.http.get<Bon>(`${API_URL}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateBon(id: number, data: Bon): Observable<Bon> {
    return this.http.put<Bon>(`${API_URL}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  deleteBon(id: number): Observable<Bon> {
    return this.http.delete<Bon>(`${API_URL}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  // === Méthodes spécifiques ===

  updateStatutBon(id: number, statutBon: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/statut`, { statutBon }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateResteAPayer(id: number, montant: number): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/resteAPayer`, { montant }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateNetAPayer(id: number, remise: number): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/netAPayer`, { remise }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  updateFichier(id: number, fichier: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/fichier`, { fichier }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadFichier(formData: FormData): Observable<any> {
  return this.http.post<Bon>(`${API_URL}/upload-fichier`, formData,{ headers: this.getHeaders() })
  .pipe(catchError(err => this.handleError(err)));
}

// Méthode pour mettre à jour le bon avec le chemin du fichier
// eslint-disable-next-line @typescript-eslint/no-explicit-any
updateBonAvecFichier(bonId: number, cheminFichier: string): Observable<any> {
  return this.http.patch(`/api/bons/${bonId}/fichier`, {fichier: cheminFichier }, { headers: this.getHeaders() })
  .pipe(catchError(err => this.handleError(err)));
}

  updateMotifsRetour(id: number, motifsRetour: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/motifsRetour`, { motifsRetour }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }
  
   // Créer un bon en mode brouillon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creerBonBrouillon(bonData: any): Observable<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<any>(`${API_URL}/brouillon`, bonData,{ headers: this.getHeaders() })
          .pipe(catchError(err => this.handleError(err)));
  }

  // Mettre à jour un bon existant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mettreAJourBon(bonId: number, bonData: any): Observable<any> {
    return this.http.put(`${API_URL}/${bonId}`, bonData,{ headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  // Changer le statut du panier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changerStatutPanier(panierId: number, nouveauStatut: string, confirmation?: boolean): Observable<any> {
    return this.http.post(`${API_URL}/panier/statut`, {
      panierId,
      nouveauStatut,
      confirmation
    },
    { headers: this.getHeaders() }
    )
    .pipe(catchError(err => this.handleError(err)));
  }

  // Récupérer les bons brouillons
  getBonsBrouillons(code_structure: string): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${API_URL}/brouillons/${code_structure}`, { headers: this.getHeaders()})
    .pipe(catchError(err => this.handleError(err)));
  }

  // Supprimer un bon et son panier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supprimerBonComplet(bonId: number): Observable<any> {
    return this.http.delete(`${API_URL}/complet/${bonId}`, { headers: this.getHeaders()})
    .pipe(catchError(err => this.handleError(err)));
  }

  /* // Créer un bon brouillon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creerBonBrouillons(bonData: any): Observable<any> {
    return this.http.post(`${apiUrl}/brouillon`, bonData);
  }

  // Mettre à jour un panier brouillon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mettreAJourPanierBrouillon(panierId: number, panierData: any): Observable<any> {
    return this.http.put(`${apiUrl}/panier/${panierId}`, panierData);
  }

  // Récupérer les bons brouillons
  getBonsBrouillon(code_structure: string): Observable<Bon[]> {
    return this.http.get<Bon[]>(`${apiUrl}/brouillons/${code_structure}`);
  } */
}
