import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Stock } from '../modeles/entrees-sorties.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StockInventaireService {

  private apiUrl = 'http://localhost:3000/stocks'; // Remplace par ton API

  constructor(private http: HttpClient) {}

  getStocks(): Observable<Stock[]> {
    return this.http.get<Stock[]>(this.apiUrl);
  }

  getMouvements(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/mouvements');
  }

  checkReapprovisionnement(): Observable<Stock[]> {
    return this.http.get<Stock[]>(`${this.apiUrl}?seuilAlerte=true`);
  }
}
