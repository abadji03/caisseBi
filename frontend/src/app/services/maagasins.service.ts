import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Magasin } from '../modeles/magasin.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaagasinsService {

   private apiUrl = 'http://localhost:5000/api/magasins';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Créer un nouveau magasin
  createMagasin(magasin: Magasin): Observable<Magasin> {
    return this.http.post<Magasin>(this.apiUrl, magasin, { headers: this.getHeaders() });
  }

  // Mettre à jour un magasin
  updateMagasin(id: number, magasin: Magasin): Observable<Magasin> {
    return this.http.put<Magasin>(`${this.apiUrl}/${id}`, magasin, { headers: this.getHeaders() });
  }

  // Supprimer un magasin
  deleteMagasin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Obtenir tous les magasins
  getAllMagasins(): Observable<Magasin[]> {
    return this.http.get<Magasin[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obtenir les magasins d'une structure
  getMagasinsByStructure(codeStructure: string): Observable<Magasin[]> {
    return this.http.get<Magasin[]>(`${this.apiUrl}/structure/${codeStructure}`, { headers: this.getHeaders() });
  }

  // Obtenir un magasin par son ID
  getMagasinById(id: number): Observable<Magasin> {
    return this.http.get<Magasin>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Mettre à jour le statut d'un magasin
  updateMagasinStatus(id: number, statut: 'Actif' | 'Inactif'): Observable<Magasin> {
    return this.http.patch<Magasin>(`${this.apiUrl}/${id}/statut`, { statut }, { headers: this.getHeaders() });
  }
}
