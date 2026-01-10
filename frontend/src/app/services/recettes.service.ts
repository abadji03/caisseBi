import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Recette } from '../modeles/finance.model';

@Injectable({
  providedIn: 'root'
})
export class RecettesService {

    private apiUrl = 'http://localhost:5000/api/recettes';
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
      this.logger.error(`RecettesService -> ${method} :`, error);
      return throwError(() => error);
    }
  /** 📌 1. Création de recette */
  createRecette(data: FormData): Observable<Recette> {
    return this.http
      .post<Recette>(`${this.apiUrl}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** 📌 2. Mise à jour de recette */
  updateRecette(id: number, data: FormData): Observable<Recette> {
    return this.http
      .put<Recette>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** 📌 3. Récupération par structure */
  getByStructure(code_structure: string): Observable<Recette[]> {
    return this.http
      .get<Recette[]>(`${this.apiUrl}/structure/${code_structure}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

   /**Récupération par paiementId */
  getByPaiementId(paiementId: number): Observable<Recette> {
    return this.http
      .get<Recette>(`${this.apiUrl}/paiement/${paiementId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /** 📌 4. Suppression */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteRecette(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }
}
