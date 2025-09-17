import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { Bon } from '../modeles/bon.model';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from './auth.service';
const API_URL = 'http://localhost:5000/api/bons'; 

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

  updateMotifsRetour(id: number, motifsRetour: string): Observable<Bon> {
    return this.http.patch<Bon>(`${API_URL}/${id}/motifsRetour`, { motifsRetour }, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }
}
