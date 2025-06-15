import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Fournisseur } from '../modeles/fournisseur.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FournisseursService {

  private apiUrl = 'http://localhost:5000/api/fournisseurs';

  constructor(private http: HttpClient, private authService: AuthService) { }

   private getHeaders(): HttpHeaders {
      const token = this.authService.getToken();
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }

  // Créer un fournisseur
  createFournisseur(fournisseur: Fournisseur): Observable<Fournisseur> {
    return this.http.post<Fournisseur>(
      `${this.apiUrl}`,
      fournisseur,
      { headers: this.getHeaders() }
    );
  }

  // Récupérer tous les fournisseurs
  getAllFournisseurs(): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(
      `${this.apiUrl}`,
      { headers: this.getHeaders() }
    );
  }

  // Récupérer un fournisseur par ID
  getFournisseurById(id: number): Observable<Fournisseur> {
    return this.http.get<Fournisseur>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // Mettre à jour un fournisseur
  updateFournisseur(id: number, updateData: Partial<Fournisseur>): Observable<Fournisseur> {
    return this.http.put<Fournisseur>(
      `${this.apiUrl}/${id}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

  // Mettre à jour le statut d'un fournisseur
  updateFournisseurStatus(id: number, statut: boolean): Observable<Fournisseur> {
    return this.http.patch<Fournisseur>(
      `${this.apiUrl}/${id}/statut`,
      { statut }, // Envoyez un objet JSON contenant le statut
      { headers: this.getHeaders() }
    );
  }

  // Supprimer un fournisseur
  deleteFournisseur(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // Récupérer les fournisseurs par structure
  getFournisseursByStructure(codeStructure: string): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(
      `${this.apiUrl}/structure/${codeStructure}`,
      { headers: this.getHeaders() }
    );
  }

  // Recherche avancée de fournisseurs
 /*  searchFournisseurs(params: {
    nom?: string;
    statut?: string;
    code_structure?: string;
  }): Observable<Fournisseur[]> {
    let httpParams = new HttpParams();
    
    if (params.nom) httpParams = httpParams.append('nom', params.nom);
    if (params.statut) httpParams = httpParams.append('statut', params.statut);
    if (params.code_structure) httpParams = httpParams.append('code_structure', params.code_structure);

    return this.http.get<Fournisseur[]>(
      `${this.apiUrl}/fournisseurs/search`,
      { headers: this.getHeaders(), params: httpParams }
    );
  }

  // Compter le nombre total de fournisseurs
  countFournisseurs(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.apiUrl}/fournisseurs/count`,
      { headers: this.getHeaders() }
    );
  }

  // Récupérer les fournisseurs avec pagination
  getFournisseursPaginated(page: number = 1, limit: number = 10): Observable<PaginatedFournisseurs> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedFournisseurs>(
      `${this.apiUrl}/fournisseurs/page`,
      { headers: this.getHeaders(), params }
    );
  } */
}
