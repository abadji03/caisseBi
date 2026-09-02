import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { Panier } from '../modeles/panier.model';
import { HttpClient } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VentesService {
  private apiUrl = `${environment.apiUrl}/ventes`;
  private http = inject(HttpClient);
  private logger = inject(NGXLogger);

  private handleError(method: string, error: unknown): Observable<never> {
    this.logger.error(`VentesService -> ${method} :`, error);
    return throwError(() => error);
  }

  enregistrerVente(panier: Panier): Observable<unknown> {
    return this.http.post<unknown>(this.apiUrl, panier)
      .pipe(catchError(err => this.handleError('enregistrerVente', err)));
  }

  getTotalCaisse(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-caisse`)
      .pipe(catchError(err => this.handleError('getTotalCaisse', err)));
  }

  getTransactionsJournalieres(): Observable<Panier[]> {
    return this.http.get<Panier[]>(`${this.apiUrl}/transactions`)
      .pipe(catchError(err => this.handleError('getTransactionsJournalieres', err)));
  }

  getSalesHistory(): Observable<unknown> {
    return of({
      history: [
        { date: '2024-12-01', total: 2000, type: 'local' },
        { date: '2024-12-02', total: 1500, type: 'en ligne' },
      ],
      salesByCategory: [
        { category: 'Electronics', total: 5000 },
        { category: 'Clothing', total: 3000 },
      ],
      salesByEmployee: [
        { employee: 'John Doe', totalSales: 8000 },
        { employee: 'Jane Doe', totalSales: 12000 },
      ],
      salesByProduct: [
        { product: 'Laptop', quantitySold: 20, unitPrice: 1000, total: 20000 },
        { product: 'T-shirt', quantitySold: 50, unitPrice: 20, total: 1000 },
      ],
      salesByClient: [
        { client: 'Client 1', totalPurchases: 5000 },
        { client: 'Client 2', totalPurchases: 3000 },
      ],
      salesByPeriod: [
        { period: 'Week 1', totalSales: 10000 },
        { period: 'Week 2', totalSales: 15000 },
      ],
    });
  }
}