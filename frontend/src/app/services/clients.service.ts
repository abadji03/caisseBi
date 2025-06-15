import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Client } from '../modeles/clients.model';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private apiUrl = 'http://localhost:5000/api/clients'; // URL de l'API backend

  constructor(private http: HttpClient,private authService: AuthService) {} 

  private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
          'Authorization': `Bearer ${token}`
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
    return this.http.get<Client[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Récupérer un client par ID
  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Ajouter un nouveau client (vérification en back si existe déjà)
  ajouterClient(client: Client): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client, { headers: this.getHeaders() });
  }

  // Rechercher un client
  rechercherClient(query: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}?q=${query}`, { headers: this.getHeaders() });
  }

  // Récupérer les clients d'une structure
  getClientsByStructure(codeStructure: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}/structure/${codeStructure}`, { headers: this.getHeaders() });
  }

  // Mettre à jour les infos générales du client
  updateClient(id: number, clientData: Partial<Client>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, clientData, { headers: this.getHeaders() });
  }

  // Supprimer un client
  deleteClient(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  //Mise à jour du statut
  updateClientStatut(id: number, statut: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/statut`, { statut }, { headers: this.getHeaders() });
  }

  // Mise à jour du plafond
  updateClientPlafond(id: number, plafond: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/plafond`, { plafond }, { headers: this.getHeaders() });
  }

  //Mise à jour du solde
  updateClientSolde(id: number, solde: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/solde`, { solde }, { headers: this.getHeaders() });
  }

  //Mise à jour du montant à nous payer
  updateClientMontantAPayer(id: number, montantANousPayer: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/montant-a-payer`, { montantANousPayer }, { headers: this.getHeaders() });
  }
}
