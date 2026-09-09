import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable } from 'rxjs';
import { Depense } from '../modeles/finance.model';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

export interface DepensesResponse {
  items: Depense[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistiques: {
    globales: {
      totalDepenses: number;
      montantTotal: number;
      montantMoyen: number;
      montantMax: number;
      montantMin: number;
      repartitionParMode: {
        espece: number;
        carte: number;
        orangeMoney: number;
        wave: number;
        virement: number;
        cheque: number;
        autre: number;
      };
      repartitionParType: {
        standard: number;
        stock: number;
        frais: number;
        investissement: number;
      };
      repartitionParStatut: {
        validees: number;
        annulees: number;
      };
      tauxPieceJointe: number;
    };
    parCategorie: {
      categoryId: number;
      categoryName: string;
      categoryType: string;
      nombreDepenses: number;
      montantTotal: number;
      montantMoyen: number;
    }[];
    evolutionMensuelle: {
      mois: string;
      nombreDepenses: number;
      montantTotal: number;
      montantMoyen: number;
    }[];
    parJourSemaine: {
      jourSemaine: number;
      nombreDepenses: number;
      montantTotal: number;
      montantMoyen: number;
    }[];
  };
  filtres: {
    search: string | null;
    /* startDate: string | null;
    endDate: string | null; */
    categoryId: string | null;
    paymentMode: string | null;
    typeDepense: string | null;
    statut: string | null;
  };
}

export interface DepensesFilter {
  page?: number;
  limit?: number;
  search?: string;
  /* startDate?: string;
  endDate?: string; */
  categoryId?: string;
  paymentMode?: string;
  typeDepense?: string;
  statut?: string;
}
@Injectable({
  providedIn: 'root'
})
export class DepencesService {

  private apiUrl = `${environment.apiUrl}/depenses`;

  private http = inject(HttpClient);
  private logger = inject(NGXLogger);

  /** ================================
   *  GÉNÉRATION HEADERS AVEC TOKEN
   ================================== */

  /** ================================
     *  GESTION CENTRALISÉE DES ERREURS
     ================================== */
    private handleError(method: string, error: unknown): Observable<never> {
      return handleApiError(this.logger, `DepencesService.${method}`, error);
    }
  // ➕ Création d'une dépense
  createDepense(data: FormData): Observable<Depense> {
    return this.http
      .post<Depense>(`${this.apiUrl}`, data, {})
      .pipe(catchError(error => this.handleError('createDepense', error)));
  }

  //Mise à jour d'une dépense
  updateDepense(id: number, data: FormData): Observable<Depense> {
    return this.http
      .put<Depense>(`${this.apiUrl}/${id}`, data, {})
      .pipe(catchError(error => this.handleError('updateDepense', error)));
  }

  // 📌 Récupérer les dépenses d’un magasin
  getDepensesByMagasin(magasinId: number): Observable<Depense[]> {
    return this.http
      .get<Depense[]>(`${this.apiUrl}/magasin/${magasinId}`, {
      })
      .pipe(catchError(error => this.handleError('getDepensesByMagasin', error)));
  }

  // 📌 Récupérer les dépenses d’une structure
  getDepensesByStructure(code_structure: string): Observable<Depense[]> {
    return this.http
      .get<Depense[]>(`${this.apiUrl}/structure/${code_structure}`, {
      })
      .pipe(catchError(error => this.handleError('getDepensesByStructure', error)));
  }
  // 🗑️ Suppression d'une dépense
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteDepense(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`, {})
      .pipe(catchError(error => this.handleError('deleteDepense', error)));
  }

  /**
   * Récupérer les dépenses d'une structure avec pagination et filtres
   */
  getDepensesByStructureBis(code_structure: string, filter: DepensesFilter = {}): Observable<DepensesResponse> {
    let params = new HttpParams();
    
    // Pagination
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    
    // Recherche
    if (filter.search) params = params.set('search', filter.search);
    
    // Filtres de période
    /* if (filter.startDate) params = params.set('startDate', filter.startDate);
    if (filter.endDate) params = params.set('endDate', filter.endDate); */
    
    // Filtres spécifiques
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    if (filter.paymentMode) params = params.set('paymentMode', filter.paymentMode);
    if (filter.typeDepense) params = params.set('typeDepense', filter.typeDepense);
    if (filter.statut) params = params.set('statut', filter.statut);

    //return this.http.get<DepensesResponse>(`${this.apiUrl}/structure/bis/${code_structure}${params}`,{});
    return this.http.get<DepensesResponse>(
      `${this.apiUrl}/structure/bis/${code_structure}`,
      { 
        params: params
      }
    ).pipe(catchError(error => this.handleError('getDepensesByStructureBis', error)));
  }

  updateStatut(id: number, statutDepense: string): Observable<Depense> {
          return this.http.patch<Depense>(
            `${this.apiUrl}/${id}/statutDepense`,
            { statutDepense },
            {},
          ).pipe(catchError(error => this.handleError('updateStatut', error)));
      }
}