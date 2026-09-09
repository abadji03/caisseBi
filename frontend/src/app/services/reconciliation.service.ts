import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { PaginatedAnalyseResponse, PaginatedResponse, Reconciliation } from '../modeles/entrees-sorties.model';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

@Injectable({
  providedIn: 'root',
})
export class ReconciliationService {
  private apiUrl = `${environment.apiUrl}/reconciliations`;
  private apiUrlBis = `${environment.apiUrl}/historiques-reconciliations`;
  private http = inject(HttpClient);
  private logger = inject(NGXLogger);


  private handleError(method: string, error: unknown): Observable<never> {
    return handleApiError(this.logger, `ReconciliationService.${method}`, error);
  }

  create(reconciliation: Reconciliation): Observable<Reconciliation> {
    return this.http.post<Reconciliation>(this.apiUrl, reconciliation, {})
      .pipe(catchError(err => this.handleError('create', err)));
  }

  getByStructure(
    codeStructure: string,
    page = 1,
    limit = 10,
    search = '',
  ): Observable<PaginatedResponse<Reconciliation>> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;

    return this.http.get<PaginatedResponse<Reconciliation>>(
      `${this.apiUrl}/structure/${codeStructure}${params}`,
      {}
    ).pipe(catchError(err => this.handleError('getByStructure', err)));
  }

  getByProduit(produitId: number): Observable<Reconciliation[]> {
    return this.http.get<Reconciliation[]>(`${this.apiUrl}/produit/${produitId}`, {
    }).pipe(catchError(err => this.handleError('getByProduit', err)));
  }

  getById(id: number): Observable<Reconciliation> {
    return this.http.get<Reconciliation>(`${this.apiUrl}/${id}`, {})
      .pipe(catchError(err => this.handleError('getById', err)));
  }

  update(id: number, reconciliation: Reconciliation): Observable<Reconciliation> {
    return this.http.put<Reconciliation>(`${this.apiUrl}/${id}`, reconciliation, {
    }).pipe(catchError(err => this.handleError('update', err)));
  }

  delete(id: number): Observable<Reconciliation> {
    return this.http.delete<Reconciliation>(`${this.apiUrl}/${id}`, {})
      .pipe(catchError(err => this.handleError('delete', err)));
  }

  getAnalyse(
    codeStructure: string,
    page = 1,
    limit = 10,
    search = '',
    tri?: string
  ): Observable<PaginatedAnalyseResponse> {
    let params = `?page=${page}&limit=${limit}&tri=${tri}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;

    return this.http.get<PaginatedAnalyseResponse>(
      `${this.apiUrl}/structure/${codeStructure}/analyse-ecart${params}`,
      {}
    ).pipe(catchError(err => this.handleError('getAnalyse', err)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAnalyseProduit(codeStructure: string, produitId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/structure/${codeStructure}/produit/${produitId}`,
      {}
    ).pipe(catchError(err => this.handleError('getAnalyseProduit', err)));
  }

  createHistorique(historique: unknown): Observable<unknown> {
    return this.http.post<unknown>(this.apiUrlBis, historique, {})
      .pipe(catchError(err => this.handleError('createHistorique', err)));
  }

  getByReconciliation(reconciliationId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrlBis}/reconciliation/${reconciliationId}`, {
    }).pipe(catchError(err => this.handleError('getByReconciliation', err)));
  }

  getHistoriqueByStructure(code_structure: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrlBis}/structure/${code_structure}`, {
    }).pipe(catchError(err => this.handleError('getHistoriqueByStructure', err)));
  }

  getHistoriqueById(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrlBis}/${id}`, {})
      .pipe(catchError(err => this.handleError('getHistoriqueById', err)));
  }

  updateHistorique(id: number, historique: Partial<unknown>): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrlBis}/${id}`, historique, {
    }).pipe(catchError(err => this.handleError('updateHistorique', err)));
  }

  deleteHistorique(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrlBis}/${id}`, {})
      .pipe(catchError(err => this.handleError('deleteHistorique', err)));
  }

  updateStatut(id: number, statut: string): Observable<Reconciliation> {
    return this.http.patch<Reconciliation>(
      `${this.apiUrl}/${id}/statut`,
      { statut },
      {},
    ).pipe(catchError(err => this.handleError('updateStatut', err)));
  }
}