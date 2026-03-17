import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Recette } from '../modeles/finance.model';

export interface RecettesResponse {
  items: Recette[];
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
      totalRecettes: number;
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
      repartitionParStatut: {
        validees: number;
        annulees: number;
      };
      tauxPieceJointe: number;
      nbAvecPieceJointe: number;
    };
    parCategorie: {
      categoryId: number;
      categoryName: string;
      categoryType: string;
      nombreRecettes: number;
      montantTotal: number;
      montantMoyen: number;
    }[];
    evolutionMensuelle: {
      mois: string;
      nombreRecettes: number;
      montantTotal: number;
      montantMoyen: number;
    }[];
    parJourSemaine: {
      jourSemaine: number;
      nombreRecettes: number;
      montantTotal: number;
      montantMoyen: number;
    }[];
  };
  filtres: {
    search: string | null;
    //startDate: string | null;
    //endDate: string | null;
    categoryId: string | null;
    paymentMode: string | null;
    statut: string | null;
  };
}

export interface RecettesFilter {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paymentMode?: string;
  statut?: string;
}


@Injectable({
  providedIn: 'root'
})
export class RecettesService {

    private apiUrl = 'http://localhost:5000/api/recettes';
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private logger = inject(NGXLogger);
  
    /** ================================
     *  GÉNÉRATION HEADERS AVEC TOKEN
     ================================== */
    private getHeaders(): HttpHeaders {
      const token = this.authService.getToken();
      return new HttpHeaders({
        Authorization: `Bearer ${token}`
      });
    }
  
    /** ================================
     *  GESTION CENTRALISÉE DES ERREURS
     ================================== */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private handleError(method: string, error: any) {
      this.logger.error(`RecettesService -> ${method} :`, error);
      return throwError(() => error);
    }
  /** 📌 1. Création de recette */
  createRecette(data: FormData): Observable<Recette> {
    return this.http
      .post<Recette>(`${this.apiUrl}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** 📌 2. Mise à jour de recette */
  updateRecette(id: number, data: FormData): Observable<Recette> {
    return this.http
      .put<Recette>(`${this.apiUrl}/${id}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /** 📌 3. Récupération par structure */
  getByStructure(code_structure: string): Observable<Recette[]> {
    return this.http
      .get<Recette[]>(`${this.apiUrl}/structure/${code_structure}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }


    /** 📌 1. Récupération par structure avec pagination et filtres */
  getByStructureBis(code_structure: string, filter: RecettesFilter = {}): Observable<RecettesResponse> {
    let params = new HttpParams();
    
    // Pagination
    if (filter.page) params = params.set('page', filter.page.toString());
    if (filter.limit) params = params.set('limit', filter.limit.toString());
    
    // Recherche
    if (filter.search) params = params.set('search', filter.search);
    
    // Filtres de période
    //if (filter.startDate) params = params.set('startDate', filter.startDate);
    //if (filter.endDate) params = params.set('endDate', filter.endDate);
    
    // Filtres spécifiques
    if (filter.categoryId) params = params.set('categoryId', filter.categoryId);
    if (filter.paymentMode) params = params.set('paymentMode', filter.paymentMode);
    if (filter.statut) params = params.set('statut', filter.statut);

    return this.http
      .get<RecettesResponse>(`${this.apiUrl}/structure/bis/${code_structure}`, {
        headers: this.getHeaders(),
        params: params
      })
      .pipe(catchError((error) => this.handleError('getByStructureBis', error)));
  }

   /**Récupération par paiementId */
  getByPaiementId(paiementId: number): Observable<Recette> {
    return this.http
      .get<Recette>(`${this.apiUrl}/paiement/${paiementId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /** 📌 4. Suppression */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteRecette(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateStatut(id: number, statutRecette: string): Observable<Recette> {
        return this.http.patch<Recette>(
          `${this.apiUrl}/${id}/statutRecette`,
          { statutRecette },
          { headers: this.getHeaders() },
        ).pipe(catchError(this.handleError));;
    }
}
