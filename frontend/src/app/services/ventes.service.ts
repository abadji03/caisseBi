import { Injectable } from '@angular/core';
import {Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VentesService {

  constructor() { }

  // Exemple de données statiques ou récupérées d'une API
  getSalesHistory(): Observable<any> {
    // Remplacez ceci par une API réelle
    return of({
      history: [
        { date: '2024-12-01', total: 2000, type: 'local' },
        { date: '2024-12-02', total: 1500, type: 'en ligne' },
        // Ajoutez d'autres données de ventes ici
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
      ]
    });
  }
}
