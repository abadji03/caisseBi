import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { Depense } from '../modeles/finance.model';

@Injectable({
  providedIn: 'root'
})
export class DepencesService {

  private apiUrl = 'http://localhost:5000/api/depenses';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handleError(method: string, error: any) {
      this.logger.error(`DépensesService -> ${method} :`, error);
      return throwError(() => error);
    }
  // ➕ Création d'une dépense
  createDepense(data: FormData): Observable<Depense> {
    return this.http
      .post<Depense>(`${this.apiUrl}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  //Mise à jour d'une dépense
  updateDepense(id: number, data: FormData): Observable<Depense> {
    return this.http
      .put<Depense>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // 📌 Récupérer les dépenses d’un magasin
  getDepensesByMagasin(magasinId: number): Observable<Depense[]> {
    return this.http
      .get<Depense[]>(`${this.apiUrl}/magasin/${magasinId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // 📌 Récupérer les dépenses d’une structure
  getDepensesByStructure(code_structure: string): Observable<Depense[]> {
    return this.http
      .get<Depense[]>(`${this.apiUrl}/structure/${code_structure}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }
  // 🗑️ Suppression d'une dépense
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteDepense(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }
}
