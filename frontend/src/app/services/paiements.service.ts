import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Paiement } from '../modeles/paiement.model';

export interface PaiementsFilter {
  page?: number;
  limit?: number;
  search?: string;
  methodePaiement?: string;
  /* dateDebut?: string;
  dateFin?: string; */
}

export interface PaiementsResponse {
  items: Paiement[];
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

  /** Récupérer paiements d’une structure pour les clients */
  getByClientsStructure(code_structure: string): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/structure/${code_structure}/clients`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Paiements récupérés pour la structure ${code_structure}`)),
      catchError((error) => this.handleError(error, `Erreur lors du chargement des paiements de la structure ${code_structure}`))
    );
  }

  /** Récupérer paiements d’une structure pour les clients */
  getByFournisseursStructure(code_structure: string): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`${this.apiUrl}/structure/${code_structure}/fournisseurs`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Paiements récupérés pour la structure ${code_structure}`)),
      catchError((error) => this.handleError(error, `Erreur lors du chargement des paiements de la structure ${code_structure}`))
    );
  }

   /** Récupérer paiements d’une structure pour les clients avec pagination */
  getByClientsStructureBis(code_structure: string, filter: PaiementsFilter = {}): Observable<PaiementsResponse> {
    let params = new HttpParams();
    
    // Pagination
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    
    // Recherche
    if (filter.search) params = params.set('search', filter.search);
    
    // Filtres
    if (filter.methodePaiement && filter.methodePaiement !== 'tous') {
      params = params.set('methodePaiement', filter.methodePaiement);
    }
    //if (filter.dateDebut) params = params.set('dateDebut', filter.dateDebut);
    //if (filter.dateFin) params = params.set('dateFin', filter.dateFin);

    return this.http.get<PaiementsResponse>(`${this.apiUrl}/structure/bis/${code_structure}/clients`, { 
      headers: this.getHeaders(),
      params 
    }).pipe(
      tap(() => this.logger.info(`Paiements récupérés pour la structure ${code_structure}`)),
      catchError((error) => this.handleError(error, `Erreur lors du chargement des paiements`))
    );
  }

  /** Récupérer paiements d’une structure pour les fournisseurs avec pagination */
  getByFournisseursStructureBis(code_structure: string, filter: PaiementsFilter = {}): Observable<PaiementsResponse> {
    let params = new HttpParams();
    
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    if (filter.search) params = params.set('search', filter.search);
    if (filter.methodePaiement && filter.methodePaiement !== 'tous') {
      params = params.set('methodePaiement', filter.methodePaiement);
    }
    //if (filter.dateDebut) params = params.set('dateDebut', filter.dateDebut);
    //if (filter.dateFin) params = params.set('dateFin', filter.dateFin);

    return this.http.get<PaiementsResponse>(`${this.apiUrl}/structure/bis/${code_structure}/fournisseurs`, { 
      headers: this.getHeaders(),
      params 
    }).pipe(
      tap(() => this.logger.info(`Paiements fournisseurs récupérés pour la structure ${code_structure}`)),
      catchError((error) => this.handleError(error, `Erreur lors du chargement des paiements`))
    );
  }
  /** Gestion des erreurs */
  private handleError(error: unknown, message: string) {
    this.logger.error(message, error);
    //this.toastr.error(message);
    return throwError(() => error);
  }
}


