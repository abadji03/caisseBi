import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from './auth.service';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HistoriqueStatut {
  id?: number;
  bonId: number;
  ancienStatut?: string;
  nouveauStatut: string;
  commentaire?: string;
  agentId: number;
  code_structure: string;
  dateChangement?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class HistoriqueStatutBonService {

  //constructor() { }
  private baseUrl = `${environment.apiUrl}/historique-status`;

  constructor(
    // eslint-disable-next-line @angular-eslint/prefer-inject
    private http: HttpClient,
    // eslint-disable-next-line @angular-eslint/prefer-inject
    private logger: NGXLogger,
    // eslint-disable-next-line @angular-eslint/prefer-inject
    private authService: AuthService
  ) {}

  /** Récupérer les headers avec token */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /** Créer un historique */
  create(historique: HistoriqueStatut): Observable<HistoriqueStatut> {
    return this.http.post<HistoriqueStatut>(this.baseUrl, historique, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info('Historique créé avec succès')),
      catchError(error => this.handleError(error, 'Erreur lors de la création d’un historique'))
    );
  }

  /** Récupérer les historiques d’une structure */
  getByStructure(code_structure: string): Observable<HistoriqueStatut[]> {
    return this.http.get<HistoriqueStatut[]>(`${this.baseUrl}/structure/${code_structure}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Historiques récupérés pour structure ${code_structure}`)),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des historiques de la structure'))
    );
  }

  /** Récupérer les historiques d’un bon */
  getByBon(bonId: number): Observable<HistoriqueStatut[]> {
    return this.http.get<HistoriqueStatut[]>(`${this.baseUrl}/bon/${bonId}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Historiques récupérés pour bon ${bonId}`)),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des historiques du bon'))
    );
  }

  /** Supprimer un historique */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.warn(`Historique supprimé : ${id}`)),
      catchError(error => this.handleError(error, 'Erreur lors de la suppression de l’historique'))
    );
  }

  /** Gestion centralisée des erreurs */
  private handleError(error: HttpErrorResponse, message: string) {
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      this.logger.error(`${message} (Client) : ${error.error.message}`);
    } else {
      // Erreur côté serveur
      this.logger.error(`${message} (Serveur) : Code ${error.status}, Message : ${error.message}`);
    }
    return throwError(() => new Error(message));
  }
}
