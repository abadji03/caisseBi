import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Stock } from '../modeles/entrees-sorties.model';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class StockInventaireService {
  private apiUrl = 'http://localhost:5000/api/stocks';

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // Créer un stock
  createStock(stock: Stock): Observable<Stock> {
    return this.http.post<Stock>(this.apiUrl, stock, { headers: this.getHeaders() });
  }

  // Mettre à jour un stock
  updateStock(id: number, stock: Partial<Stock>): Observable<Stock> {
    return this.http.put<Stock>(`${this.apiUrl}/${id}`, stock, { headers: this.getHeaders() });
  }

  //Supprimer un stock
  deleteStock(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Récupérer tous les stocks d'une structure
  getStocksByStructure(codeStructure: string): Observable<Stock[]> {
    return this.http.get<Stock[]>(`${this.apiUrl}/structure/${codeStructure}`, {
      headers: this.getHeaders(),
    });
  }

  // Récupérer un stock à partir d'un produitId
  getStockByProduitId(produitId: number): Observable<Stock> {
    return this.http.get<Stock>(`${this.apiUrl}/produit/${produitId}`, {
      headers: this.getHeaders(),
    });
  }

  //Récupérer un stock avec calcul de statut (optionnel)
  getStockWithStatut(produitId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/produit/${produitId}/statut`, {
      headers: this.getHeaders(),
    });
  }

  /* ===========================================================
   *  NOUVEAU : Ajustements de quantité
   * ========================================================= */
  /**
   * Ajuste la quantité totale (entrée/sortie de stock)
   * @param id        id du stock
   * @param variation nombre positif (entrée) ou négatif (sortie)
   */
  adjustQuantiteTotale(id: number, variation: number): Observable<Stock> {
    return this.http.patch<Stock>(
      `${this.apiUrl}/${id}/adjust-quantite`,
      { variation },
      { headers: this.getHeaders() },
    );
  }

  /**
   * Ajuste la quantité réservée
   * @param id        id du stock
   * @param variation nombre positif ou négatif
   */
  adjustQuantiteReservee(id: number, variation: number): Observable<Stock> {
    return this.http.patch<Stock>(
      `${this.apiUrl}/${id}/adjust-reservee`,
      { variation },
      { headers: this.getHeaders() },
    );
  }
}
