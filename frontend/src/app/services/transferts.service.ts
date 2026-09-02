import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable, throwError } from 'rxjs';
import { Stock } from '../modeles/entrees-sorties.model';
import { environment } from '../../environments/environment';

export interface TransfertRequest {
  produitId: number;
  quantite: number;
  magasinSource: number;
  magasinDestination: number;
  motif?: string;
  agentResponsable: number;
}

export interface TransfertResponse {
  id: number;
  code_structure: string;
  reference: string;
  Produit: { id: number; designation: string };
  Responsable: { id: number; nom: string };
  produitId: number;
  quantite: number;
  magasinSource: number;
  magasinDestination: number;
  dateTransfert: Date;
  statut: 'En attente' | 'Validé' | 'Refusé';
  motif?: string;
  agentResponsable: number;
  dateValidation?: Date;
  agentValidation?: number;
  mouvementSortieId?: number;
  mouvementEntreeId?: number;
}

export interface PaginatedTransfertsResponse {
  transferts: TransfertResponse[];
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
  providedIn: 'root'
})
export class TransfertsService {

  private apiUrl = `${environment.apiUrl}/transferts`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError<T>(method: string, error: any): Observable<T> {
    this.logger.error(`TransfertService -> ${method} :`, error);
    return throwError(() => error);
  }

  createTransfert(data: TransfertRequest): Observable<TransfertResponse> {
    return this.http.post<TransfertResponse>(`${this.apiUrl}`, data, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError<TransfertResponse>('createTransfert', error)));
  }

  validerTransfert(id: number): Observable<TransfertResponse> {
    return this.http.put<TransfertResponse>(`${this.apiUrl}/valider/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError<TransfertResponse>('validerTransfert', error)));
  }

  refuserTransfert(id: number): Observable<TransfertResponse> {
    return this.http.put<TransfertResponse>(`${this.apiUrl}/refuser/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError<TransfertResponse>('refuserTransfert', error)));
  }

  getTransfertsByStructure(codeStructure: string): Observable<TransfertResponse[]> {
    return this.http.get<TransfertResponse[]>(`${this.apiUrl}/structure/${codeStructure}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError<TransfertResponse[]>('getTransfertByStructure', error)));
  }

  getByStructure(
    codeStructure: string,
    page = 1,
    limit = 10,
    search = '',
    statut = ''
  ): Observable<PaginatedTransfertsResponse> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;
    if (statut && statut !== 'tous') params += `&statut=${statut}`;
    return this.http.get<PaginatedTransfertsResponse>(`${this.apiUrl}/structure/${codeStructure}${params}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError<PaginatedTransfertsResponse>('getByStructure', error)));
  }

  getStockByProduitAndMagasin(produitId: number, magasinId: number): Observable<Stock> {
    return this.http.get<Stock>(`${this.apiUrl}/produit/${produitId}/magasin/${magasinId}`, { headers: this.getHeaders() })
      .pipe(catchError(error => this.handleError<Stock>('getStockByProduitAndMagasin', error)));
  }
}