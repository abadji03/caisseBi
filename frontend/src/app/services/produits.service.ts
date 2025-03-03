import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Produits } from '../modeles/produit.modele';

@Injectable({
  providedIn: 'root'
})
export class ProduitsService {

  private apiUrl = 'http://localhost:3000/api/produits';

  constructor(private http: HttpClient) {}

  getProduits(): Observable<Produits[]> {
    return this.http.get<Produits[]>(this.apiUrl);
  }

  getProduitById(id: number): Observable<Produits> {
    return this.http.get<Produits>(`${this.apiUrl}/${id}`);
  }

  rechercherProduit(query: string): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}?q=${query}`);
  }

}
