import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { catchError, Observable } from 'rxjs';
import { Stock } from '../modeles/entrees-sorties.model';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

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
  private logger = inject(NGXLogger);


   
  private handleError<T>(method: string, error: unknown): Observable<T> {
    return handleApiError(this.logger, `TransfertService.${method}`, error);
  }

  createTransfert(data: TransfertRequest): Observable<TransfertResponse> {
    return this.http.post<TransfertResponse>(`${this.apiUrl}`, data, {})
      .pipe(catchError(error => this.handleError<TransfertResponse>('createTransfert', error)));
  }

  validerTransfert(id: number): Observable<TransfertResponse> {
    return this.http.put<TransfertResponse>(`${this.apiUrl}/valider/${id}`, {})
      .pipe(catchError(error => this.handleError<TransfertResponse>('validerTransfert', error)));
  }

  refuserTransfert(id: number): Observable<TransfertResponse> {
    return this.http.put<TransfertResponse>(`${this.apiUrl}/refuser/${id}`, {})
      .pipe(catchError(error => this.handleError<TransfertResponse>('refuserTransfert', error)));
  }

  getTransfertsByStructure(codeStructure: string): Observable<TransfertResponse[]> {
    return this.http.get<TransfertResponse[]>(`${this.apiUrl}/structure/${codeStructure}`, {})
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
    return this.http.get<PaginatedTransfertsResponse>(`${this.apiUrl}/structure/${codeStructure}${params}`, {})
      .pipe(catchError(error => this.handleError<PaginatedTransfertsResponse>('getByStructure', error)));
  }

  getStockByProduitAndMagasin(produitId: number, magasinId: number): Observable<Stock> {
    return this.http.get<Stock>(`${this.apiUrl}/produit/${produitId}/magasin/${magasinId}`, {})
      .pipe(catchError(error => this.handleError<Stock>('getStockByProduitAndMagasin', error)));
  }
}