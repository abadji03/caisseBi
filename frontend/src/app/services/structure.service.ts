import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Structure } from '../modeles/structure.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class StructureService {
  private apiUrl = 'http://localhost:5000/api/structures'; //URL API

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getAll(): Observable<Structure[]> {
    return this.http.get<Structure[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getById(id: number): Observable<Structure> {
    return this.http.get<Structure>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getByCodeStructure(code_structure: string): Observable<Structure> {
    return this.http.get<Structure>(`${this.apiUrl}/code/${code_structure}`, { headers: this.getHeaders() });
  }

  create(structure: FormData): Observable<Structure> {
    return this.http.post<Structure>(this.apiUrl, structure, { headers: this.getHeaders() });
  }

  update(id: number, structure: FormData): Observable<Structure> {
    return this.http.put<Structure>(`${this.apiUrl}/${id}`, structure, {
      headers: this.getHeaders(),
    });
  }

  updateBis(id: number, structure: Structure): Observable<Structure> {
    return this.http.put<Structure>(`${this.apiUrl}/${id}`, structure, {
      headers: this.getHeaders(),
    });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  updateStatus(id: number, estActive: boolean): Observable<Structure> {
    return this.http.patch<Structure>(
      `${this.apiUrl}/${id}/status`,
      { estActive },
      { headers: this.getHeaders() },
    );
  }
  /*   //Créer une structure
  create(structure: Structure): Observable<Structure> {
    return this.http.post<Structure>(this.apiUrl, structure);
  }

  //Récupérer toutes les structures
  getAll(): Observable<Structure[]> {
    return this.http.get<Structure[]>(this.apiUrl);
  }

  //Récupérer une structure par ID
  getById(id: number): Observable<Structure> {
    return this.http.get<Structure>(`${this.apiUrl}/${id}`);
  }

  //Mettre à jour une structure
  update(id: number, structure: Structure): Observable<Structure> {
    return this.http.put<Structure>(`${this.apiUrl}/${id}`, structure);
  }

  //Supprimer une structure
  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  //Activer/Désactiver une structure
  toggleStatus(id: number, actif: boolean): Observable<Structure> {
    return this.http.patch<Structure>(`${this.apiUrl}/${id}/status`, { actif });
  }*/
}
