import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Client } from '../modeles/clients.model';
import { catchError, Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';

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
