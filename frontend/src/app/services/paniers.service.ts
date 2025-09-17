import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  createPanier(data: Panier): Observable<Panier> {
    return this.http.post<Panier>(`${API_URL}`, data, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError(err)));
  }

  getPaniersByStructure(code_structure: string): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${API_URL}/structure/${code_structure}`, { headers: this.getHeaders() })
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
}
