import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { DashboardStockResponse, Stock } from '../modeles/entrees-sorties.model';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

@Injectable({
  providedIn: 'root',
})
export class StockInventaireService {
  private apiUrl = `${environment.apiUrl}/stocks`;
  private http = inject(HttpClient);
  private logger = inject(NGXLogger);


  private handleError(method: string, error: unknown): Observable<never> {
    return handleApiError(this.logger, `StockInventaireService.${method}`, error);
  }

  createStock(stock: Stock): Observable<Stock> {
    return this.http.post<Stock>(this.apiUrl, stock, {})
      .pipe(catchError(err => this.handleError('createStock', err)));
  }

  updateStock(id: number, stock: Partial<Stock>): Observable<Stock> {
    return this.http.put<Stock>(`${this.apiUrl}/${id}`, stock, {})
      .pipe(catchError(err => this.handleError('updateStock', err)));
  }

  deleteStock(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, {})
      .pipe(catchError(err => this.handleError('deleteStock', err)));
  }

  getStocksByStructure(codeStructure: string): Observable<Stock[]> {
    return this.http.get<Stock[]>(`${this.apiUrl}/structure/${codeStructure}`, {
    }).pipe(catchError(err => this.handleError('getStocksByStructure', err)));
  }

  getStocksByStructureBis(
    codeStructure: string,
    page = 1,
    limit = 10,
    search = '',
    statut = '',
    perissable = '',
    alerte = '',
    tri = ''
  ): Observable<DashboardStockResponse> {
    let params = `?page=${page}&limit=${limit}&tri=${tri}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;
    if (statut) params += `&statut=${statut}`;
    if (perissable) params += `&perissable=${perissable}`;
    if (alerte) params += `&alerte=${alerte}`;

    return this.http.get<DashboardStockResponse>(
      `${this.apiUrl}/structure/complet/${codeStructure}${params}`,
      {}
    ).pipe(catchError(err => this.handleError('getStocksByStructureBis', err)));
  }

  getStockByProduitId(produitId: number): Observable<Stock> {
    return this.http.get<Stock>(`${this.apiUrl}/produit/${produitId}`, {
    }).pipe(catchError(err => this.handleError('getStockByProduitId', err)));
  }

  getStockWithStatut(produitId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/produit/${produitId}/statut`, {
    }).pipe(catchError(err => this.handleError('getStockWithStatut', err)));
  }

  adjustQuantiteTotale(id: number, variation: number): Observable<Stock> {
    return this.http.patch<Stock>(
      `${this.apiUrl}/${id}/adjust-quantite`,
      { variation },
      {},
    ).pipe(catchError(err => this.handleError('adjustQuantiteTotale', err)));
  }

  adjustQuantiteReservee(id: number, variation: number): Observable<Stock> {
    return this.http.patch<Stock>(
      `${this.apiUrl}/${id}/adjust-reservee`,
      { variation },
      {},
    ).pipe(catchError(err => this.handleError('adjustQuantiteReservee', err)));
  }
}