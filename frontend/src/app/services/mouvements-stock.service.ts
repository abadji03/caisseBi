import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { MouvementsStock, PaginatedResponse } from '../modeles/entrees-sorties.model';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

@Injectable({
  providedIn: 'root',
})
export class MouvementsStockService {
  private apiUrl = `${environment.apiUrl}/mouvements-stock`;
  private http = inject(HttpClient);
  private logger = inject(NGXLogger);


  private handleError(method: string, error: unknown): Observable<never> {
    return handleApiError(this.logger, `MouvementsStockService.${method}`, error);
  }

  create(mouvement: MouvementsStock): Observable<MouvementsStock> {
    return this.http.post<MouvementsStock>(this.apiUrl, mouvement, {})
      .pipe(catchError(err => this.handleError('create', err)));
  }

  getAll(): Observable<MouvementsStock[]> {
    return this.http.get<MouvementsStock[]>(this.apiUrl, {})
      .pipe(catchError(err => this.handleError('getAll', err)));
  }

  getById(id: number): Observable<MouvementsStock> {
    return this.http.get<MouvementsStock>(`${this.apiUrl}/${id}`, {})
      .pipe(catchError(err => this.handleError('getById', err)));
  }

  update(id: number, mouvement: Partial<MouvementsStock>): Observable<MouvementsStock> {
    return this.http.put<MouvementsStock>(`${this.apiUrl}/${id}`, mouvement, {
    }).pipe(catchError(err => this.handleError('update', err)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {})
      .pipe(catchError(err => this.handleError('delete', err)));
  }

  getByStructure(
    code_structure: string,
    page = 1,
    limit = 10,
    search = '',
    typeMouvement: string,
  ): Observable<PaginatedResponse<MouvementsStock>> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;
    if (typeMouvement && typeMouvement !== 'tous') params += `&typeMouvement=${encodeURIComponent(typeMouvement)}`;

    return this.http.get<PaginatedResponse<MouvementsStock>>(
      `${this.apiUrl}/structure/${code_structure}${params}`,
      {}
    ).pipe(catchError(err => this.handleError('getByStructure', err)));
  }

  updateStatut(id: number, statut: string): Observable<MouvementsStock> {
    return this.http.patch<MouvementsStock>(
      `${this.apiUrl}/${id}/statut`,
      { statut },
      {},
    ).pipe(catchError(err => this.handleError('updateStatut', err)));
  }
}