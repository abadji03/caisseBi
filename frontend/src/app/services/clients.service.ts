import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Client } from '../modeles/clients.model';
import { catchError, Observable, tap } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

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
  private apiUrl = `${environment.apiUrl}/clients`;
  private http = inject(HttpClient);
  private logger = inject(NGXLogger);


  private handleError(error: unknown, message: string): Observable<never> {
    return handleApiError(this.logger, 'ClientsService', error, message);
  }
  // Récupérer tous les clients
  getClients(): Observable<Client[]> {

    this.logger.debug('Appel API: récupération des clients');

    return this.http.get<Client[]>(this.apiUrl, {}).pipe(
      tap((res) => this.logger.info('Clients récupérés avec succès', res)),
      catchError((error) => this.handleError(error, 'Erreur lors de la récupération des clients'))
    );
  }

  // Récupérer un client par ID
  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`, {});
  }

  // Ajouter un nouveau client (vérification en back si existe déjà)
  ajouterClient(client: Client,magasinIds?: number[]): Observable<Client> {
    const data = {
    ...client,
    magasinIds: magasinIds || []
  };
    this.logger.debug('Appel API: ajout d\'un client', data);
    return this.http.post<Client>(this.apiUrl, data, {}).pipe(
      tap((res) => this.logger.info('Client ajouté avec succès', res)),
      catchError((error) => this.handleError(error, 'Erreur lors de l\'ajout du client'))
    );
  }

  ajouterClientBis(client: Client,magasinIds?: number[]): Observable<Client> {
    const data = {
    ...client,
    magasinIds: magasinIds || []
  };
    this.logger.debug('Appel API: ajout d\'un client', data);
    return this.http.post<Client>(`${this.apiUrl}/create-associate-client`, data, {}).pipe(
      tap((res) => this.logger.info('Client ajouté avec succès', res)),
      catchError((error) => this.handleError(error, 'Erreur lors de l\'ajout du client'))
    );
  }

  getClientWithMagasins(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/clients/${id}/with-magasins`, {});
  }
  // Rechercher un client
  rechercherClient(query: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}?q=${query}`, {});
  }

  // Récupérer les clients d'une structure
  getClientsByStructure(codeStructure: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}/structure/${codeStructure}`, {
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
      params
    }).pipe(
      tap(response => this.logger.info(`Clients récupérés: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des clients'))
    );
  }
  // Mettre à jour les infos générales du client
  updateClient(id: number, clientData: Partial<Client>,magasinIds?: number[]): Observable<Client> {
    
    const data = {
      ...clientData,
      magasinIds: magasinIds
    };
    return this.http.put<Client>(`${this.apiUrl}/${id}`, data, {
    });
  }

  // Supprimer un client
  deleteClient(id: number): Observable<Client> {
    return this.http.delete<Client>(`${this.apiUrl}/${id}`, {});
  }

  //Mise à jour du statut
  updateClientStatut(id: number, statut: boolean): Observable<Client> {
    return this.http.patch<Client>(
      `${this.apiUrl}/${id}/statut`,
      { statut },
      {},
    );
  }

  // Mise à jour du plafond
  updateClientPlafond(id: number, plafond: number): Observable<Client> {
    return this.http.patch<Client>(
      `${this.apiUrl}/${id}/plafond`,
      { plafond },
      {},
    );
  }

  //Mise à jour du solde
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateClientSoldeByMagasin(clientId: number, magasinId: number, solde: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${clientId}/magasins/${magasinId}/solde`,
      { solde },
      {}
    );
  }

  //Mise à jour du montant à nous payer
  updateClientMontantAPayer(id: number, montantANousPayer: number): Observable<Client> {
    return this.http.patch<Client>(
      `${this.apiUrl}/${id}/montant-a-payer`,
      { montantANousPayer },
      {},
    );
  }
}