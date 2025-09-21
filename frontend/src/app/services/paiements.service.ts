import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Paiement } from '../modeles/paiement.model';

@Injectable({
  providedIn: 'root'
})
export class PaiementsService {

  private apiUrl = 'http://localhost:5000/api/paiements';
  
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);
  private logger = inject(NGXLogger);
  private authService = inject(AuthService);


  /**Génération headers avec token */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /**Créer un paiement (avec fichier optionnel) */
  create(paiement: FormData): Observable<Paiement> {

    return this.http.post<Paiement>(this.apiUrl, paiement, { headers: this.getHeaders() }).pipe(
      tap(() => {
        //this.toastr.success('Paiement créé avec succès');
        this.logger.info('Paiement créé', paiement);
      }),
      catchError((error) => this.handleError(error, 'Erreur lors de la création du paiement'))
    );
  }

  /**écupérer tous les paiements */
  findAll(): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info('Liste des paiements récupérée')),
      catchError((error) => this.handleError(error, 'Erreur lors du chargement des paiements'))
    );
  }

  /** Récupérer un paiement par ID */
  findById(id: number): Observable<Paiement> {
    return this.http.get<Paiement>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Paiement ${id} récupéré`)),
      catchError((error) => this.handleError(error, `Erreur lors de la récupération du paiement ${id}`))
    );
  }

  /** Mettre à jour un paiement */
  update(id: number, paiement: FormData): Observable<Paiement> {
    return this.http.put<Paiement>(`${this.apiUrl}/${id}`, paiement, { headers: this.getHeaders() }).pipe(
      tap(() => {
        //this.toastr.success('Paiement mis à jour avec succès');
        this.logger.info('Paiement mis à jour', { id, paiement });
      }),
      catchError((error) => this.handleError(error, `Erreur lors de la mise à jour du paiement ${id}`))
    );
  }

  /** Supprimer un paiement */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => {
        //this.toastr.success('Paiement supprimé');
        this.logger.warn(`Paiement ${id} supprimé`);
      }),
      catchError((error) => this.handleError(error, `Erreur lors de la suppression du paiement ${id}`))
    );
  }

  /** Récupérer paiements d’une structure */
  getByStructure(code_structure: string): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/structure/${code_structure}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Paiements récupérés pour la structure ${code_structure}`)),
      catchError((error) => this.handleError(error, `Erreur lors du chargement des paiements de la structure ${code_structure}`))
    );
  }

  /** Gestion des erreurs */
  private handleError(error: unknown, message: string) {
    this.logger.error(message, error);
    //this.toastr.error(message);
    return throwError(() => error);
  }
}


