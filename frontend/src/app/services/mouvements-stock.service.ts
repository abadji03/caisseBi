import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { MouvementsStock, PaginatedResponse } from '../modeles/entrees-sorties.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MouvementsStockService {
  private apiUrl = 'http://localhost:5000/api/mouvements-stock';

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /** ----------------------------- CRUD ----------------------------- */

  /** Créer un mouvement */
  create(mouvement: MouvementsStock): Observable<MouvementsStock> {
    return this.http.post<MouvementsStock>(this.apiUrl, mouvement, { headers: this.getHeaders() });
  }

  /**Lire tous les mouvements */
  getAll(): Observable<MouvementsStock[]> {
    return this.http.get<MouvementsStock[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  /** Lire un mouvement par ID */
  getById(id: number): Observable<MouvementsStock> {
    return this.http.get<MouvementsStock>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  /** Mettre à jour un mouvement */
  update(id: number, mouvement: Partial<MouvementsStock>): Observable<MouvementsStock> {
    return this.http.put<MouvementsStock>(`${this.apiUrl}/${id}`, mouvement, {
      headers: this.getHeaders(),
    });
  }

  /** Supprimer un mouvement */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  /** ------------------- End‑point spécifique ------------------- */

  /** Obtenir les mouvements d’une structure donnée */
  /* getByStructure(code_structure: string): Observable<MouvementsStock[]> {
    return this.http.get<MouvementsStock[]>(`${this.apiUrl}/structure/${code_structure}`, {
      headers: this.getHeaders(),
    });
  } */

  getByStructure(
    code_structure: string, 
    page= 1, 
    limit= 10, 
    search= '',
    typeMouvement: string,
 
): Observable<PaginatedResponse<MouvementsStock>> {
  
  // Construire les paramètres de requête
  let params = `?page=${page}&limit=${limit}`;
  
  if (search) {
    params += `&search=${encodeURIComponent(search)}`;
  }
  
  if (typeMouvement && typeMouvement !== 'tous') {
    params += `&typeMouvement=${encodeURIComponent(typeMouvement)}`;
  }
  
  /* if (dateDebut) {
    params += `&dateDebut=${encodeURIComponent(dateDebut)}`;
  }
  
  if (dateFin) {
    params += `&dateFin=${encodeURIComponent(dateFin)}`;
  } */

  return this.http.get<PaginatedResponse<MouvementsStock>>(
    `${this.apiUrl}/structure/${code_structure}${params}`, 
    { headers: this.getHeaders() }
  );
}

  updateStatut(id: number, statut: string): Observable<MouvementsStock> {
      return this.http.patch<MouvementsStock>(
        `${this.apiUrl}/${id}/statut`,
        { statut },
        { headers: this.getHeaders() },
      );
    }
}
