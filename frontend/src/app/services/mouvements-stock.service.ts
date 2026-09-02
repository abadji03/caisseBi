import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { MouvementsStock, PaginatedResponse } from '../modeles/entrees-sorties.model';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MouvementsStockService {
  private apiUrl = `${environment.apiUrl}/mouvements-stock`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private logger = inject(NGXLogger);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private handleError(method: string, error: unknown): Observable<never> {
    this.logger.error(`MouvementsStockService -> ${method} :`, error);
    return throwError(() => error);
  }

  create(mouvement: MouvementsStock): Observable<MouvementsStock> {
    return this.http.post<MouvementsStock>(this.apiUrl, mouvement, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError('create', err)));
  }

  getAll(): Observable<MouvementsStock[]> {
    return this.http.get<MouvementsStock[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError('getAll', err)));
  }

  getById(id: number): Observable<MouvementsStock> {
    return this.http.get<MouvementsStock>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(err => this.handleError('getById', err)));
  }

  update(id: number, mouvement: Partial<MouvementsStock>): Observable<MouvementsStock> {
    return this.http.put<MouvementsStock>(`${this.apiUrl}/${id}`, mouvement, {
      headers: this.getHeaders(),
    }).pipe(catchError(err => this.handleError('update', err)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
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
      { headers: this.getHeaders() }
    ).pipe(catchError(err => this.handleError('getByStructure', err)));
  }

  updateStatut(id: number, statut: string): Observable<MouvementsStock> {
    return this.http.patch<MouvementsStock>(
      `${this.apiUrl}/${id}/statut`,
      { statut },
      { headers: this.getHeaders() },
    ).pipe(catchError(err => this.handleError('updateStatut', err)));
  }
}