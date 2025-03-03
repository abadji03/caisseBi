import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Client } from '../modeles/clients.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private apiUrl = 'http://localhost:3000/api/clients'; // URL de l'API backend

  constructor(private http: HttpClient) {}

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl);
  }

  getClientById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  ajouterClient(client: Client): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }

  rechercherClient(query: string): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}?q=${query}`);
  }
}
