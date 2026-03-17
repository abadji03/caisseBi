import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Client } from '../modeles/clients.model';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';

export interface ClientsFilter {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
}

export interface ClientsResponse {
  items: Client[];
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
  providedIn: 'root',
})
export class ClientsService {
  private apiUrl = 'http://localhost:5000/api/clients'; // URL de l'API backend
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /*  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl,{ headers: this.getHeaders() });
  }

  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`,{ headers: this.getHeaders() });
  }

  ajouterClient(client: Client): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client,{ headers: this.getHeaders() });
  }

  rechercherClient(query: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}?q=${query}`,{ headers: this.getHeaders() });
  }
 */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(error: any, message: string): Observable<never> {
    this.logger.error(message, error);
    return throwError(() => error);
  }
  // Récupérer tous les clients
  getClients(): Observable<Client[]> {

    this.logger.debug('Appel API: récupération des clients');

    return this.http.get<Client[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      tap((res) => this.logger.info('Clients récupérés avec succès', res)),
      catchError((error) => {
        this.logger.error('Erreur lors de la récupération des clients', error);
        throw error; // on relance l'erreur pour que le composant gère aussi
      })
    );;
  }

  // Récupérer un client par ID
  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Ajouter un nouveau client (vérification en back si existe déjà)
  ajouterClient(client: Client): Observable<Client> {
    this.logger.debug('Appel API: ajout d’un client', client);
    return this.http.post<Client>(this.apiUrl, client, { headers: this.getHeaders() }).pipe(
      tap((res) => this.logger.info('Client ajouté avec succès', res)),
      catchError((error) => {
        this.logger.error('Erreur lors de l’ajout du client', error);
        throw error;
      })
    );
  }

  // Rechercher un client
  rechercherClient(query: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}?q=${query}`, { headers: this.getHeaders() });
  }

  // Récupérer les clients d'une structure
  getClientsByStructure(codeStructure: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}/structure/${codeStructure}`, {
      headers: this.getHeaders(),
    });
  }

   // Récupérer les clients par structure avec pagination
  getClientsByStructureBis(codeStructure: string, filter: ClientsFilter = {}): Observable<ClientsResponse> {
    let params = new HttpParams();
    
    // Pagination
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    
    // Recherche
    if (filter.search) params = params.set('search', filter.search);
    
    // Filtre par statut
    if (filter.statut && filter.statut !== 'tous') {
      params = params.set('statut', filter.statut);
    }

    return this.http.get<ClientsResponse>(`${this.apiUrl}/structure/bis/${codeStructure}`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(response => this.logger.info(`Clients récupérés: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des clients'))
    );
  }
  // Mettre à jour les infos générales du client
  updateClient(id: number, clientData: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/${id}`, clientData, {
      headers: this.getHeaders(),
    });
  }

  // Supprimer un client
  deleteClient(id: number): Observable<Client> {
    return this.http.delete<Client>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  //Mise à jour du statut
  updateClientStatut(id: number, statut: boolean): Observable<Client> {
    return this.http.patch<Client>(
      `${this.apiUrl}/${id}/statut`,
      { statut },
      { headers: this.getHeaders() },
    );
  }

  // Mise à jour du plafond
  updateClientPlafond(id: number, plafond: number): Observable<Client> {
    return this.http.patch<Client>(
      `${this.apiUrl}/${id}/plafond`,
      { plafond },
      { headers: this.getHeaders() },
    );
  }

  //Mise à jour du solde
  updateClientSolde(id: number, solde: number): Observable<Client> {
    return this.http.patch<Client>(
      `${this.apiUrl}/${id}/solde`,
      { solde },
      { headers: this.getHeaders() },
    );
  }

  //Mise à jour du montant à nous payer
  updateClientMontantAPayer(id: number, montantANousPayer: number): Observable<Client> {
    return this.http.patch<Client>(
      `${this.apiUrl}/${id}/montant-a-payer`,
      { montantANousPayer },
      { headers: this.getHeaders() },
    );
  }
}
