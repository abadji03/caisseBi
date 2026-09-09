import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Fournisseur } from '../modeles/fournisseur.model';
import { catchError, Observable, tap } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

export interface FournisseursFilter {
  page?: number;
  limit?: number;
  search?: string;
  statut?: string;
}

export interface FournisseursResponse {
  items: Fournisseur[];
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
export class FournisseursService {
  private apiUrl = `${environment.apiUrl}/fournisseurs`;
  private http = inject(HttpClient);
  private logger = inject(NGXLogger);


  // Créer un fournisseur
  createFournisseur(fournisseur: Fournisseur,magasinIds?: number[]): Observable<Fournisseur> {
    const data = {
      ...fournisseur,
      magasinIds: magasinIds || []
    };
    return this.http.post<Fournisseur>(`${this.apiUrl}`, data, {
    });
  }

  // Récupérer tous les fournisseurs
  getAllFournisseurs(): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(`${this.apiUrl}`, {});
  }

  // Récupérer un fournisseur par ID
  getFournisseurById(id: number): Observable<Fournisseur> {
    return this.http.get<Fournisseur>(`${this.apiUrl}/${id}`, {});
  }

  // Mettre à jour un fournisseur
  updateFournisseur(id: number, updateData: Partial<Fournisseur>,magasinIds?: number[]): Observable<Fournisseur> {
    const data = {
      ...updateData,
      magasinIds: magasinIds
    };
    return this.http.put<Fournisseur>(`${this.apiUrl}/${id}`, data, {
    });
  }

  // Mettre à jour le statut d'un fournisseur
  updateFournisseurStatus(id: number, statut: boolean): Observable<Fournisseur> {
    return this.http.patch<Fournisseur>(
      `${this.apiUrl}/${id}/statut`,
      { statut }, // Envoyez un objet JSON contenant le statut
      {},
    );
  }

  // Supprimer un fournisseur
  deleteFournisseur(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
    });
  }

  // Récupérer les fournisseurs par structure
  getFournisseursByStructure(codeStructure: string): Observable<Fournisseur[]> {
    return this.http.get<Fournisseur[]>(`${this.apiUrl}/structure/${codeStructure}`, {
    });
  }

  // Récupérer les fournisseurs par structure avec pagination
  getFournisseursByStructureBis(codeStructure: string, filter: FournisseursFilter = {}): Observable<FournisseursResponse> {
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

    return this.http.get<FournisseursResponse>(`${this.apiUrl}/structure/bis/${codeStructure}`, {
      params
    }).pipe(
      tap(response => this.logger.info(`Fournisseurs récupérés: ${response.items.length}`)),
      catchError(err => this.handleError(err, 'Erreur lors du chargement des fournisseurs'))
    );
  }

  getFournisseurWithMagasins(id: number): Observable<Fournisseur> {
      return this.http.get<Fournisseur>(`${this.apiUrl}/${id}/with-magasins`, {});
    }
  // Mettre à jour le solde pour un magasin spécifique
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFournisseurSoldeByMagasin(fournisseurId: number, magasinId: number, solde: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${fournisseurId}/magasins/${magasinId}/solde`,
      { solde },
      {}
    );
  }
   
  private handleError(error: unknown, message: string): Observable<never> {
    return handleApiError(this.logger, 'FournisseursService', error, message);
  }

}