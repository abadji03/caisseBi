import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

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
  ) {}


  /** Créer un historique */
  create(historique: HistoriqueStatut): Observable<HistoriqueStatut> {
    return this.http.post<HistoriqueStatut>(this.baseUrl, historique, {}).pipe(
      tap(() => this.logger.info('Historique créé avec succès')),
      catchError(error => this.handleError(error, 'Erreur lors de la création d’un historique'))
    );
  }

  /** Récupérer les historiques d’une structure */
  getByStructure(code_structure: string): Observable<HistoriqueStatut[]> {
    return this.http.get<HistoriqueStatut[]>(`${this.baseUrl}/structure/${code_structure}`, {}).pipe(
      tap(() => this.logger.info(`Historiques récupérés pour structure ${code_structure}`)),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des historiques de la structure'))
    );
  }

  /** Récupérer les historiques d’un bon */
  getByBon(bonId: number): Observable<HistoriqueStatut[]> {
    return this.http.get<HistoriqueStatut[]>(`${this.baseUrl}/bon/${bonId}`, {}).pipe(
      tap(() => this.logger.info(`Historiques récupérés pour bon ${bonId}`)),
      catchError(error => this.handleError(error, 'Erreur lors de la récupération des historiques du bon'))
    );
  }

  /** Supprimer un historique */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, {}).pipe(
      tap(() => this.logger.warn(`Historique supprimé : ${id}`)),
      catchError(error => this.handleError(error, 'Erreur lors de la suppression de l’historique'))
    );
  }

  /** Gestion centralisée des erreurs : relance une ApiError (statut + message backend préservés). */
  private handleError(error: HttpErrorResponse, message: string) {
    return handleApiError(this.logger, 'HistoriqueStatutBonService', error, message);
  }
}