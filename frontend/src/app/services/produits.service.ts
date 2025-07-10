import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CategorieProduits, Produits } from '../modeles/produit.modele';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProduitsService {

  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}
  private getHeaders(): HttpHeaders {
      const token = this.authService.getToken();
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
        //'Content-Type': 'application/json'
      });
    }

 /*  getAllProduits(code_structure:string): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}/produits/structure/${code_structure}`, { headers: this.getHeaders() });
  }

  getProduitById(id: number): Observable<Produits> {
    return this.http.get<Produits>(`${this.apiUrl}/${id}`);
  }

  rechercherProduit(query: string): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}?q=${query}`);
  }
 */

    //Obtenir tous les produits d'une structure
  getAllProduits(code_structure: string): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}/produits/structure/${code_structure}`, { headers: this.getHeaders() });
  }

  //Obtenir tous les catégories de produits d'une structure
  getAllCategoriesProduits(code_structure: string): Observable<CategorieProduits[]> {
    return this.http.get<CategorieProduits[]>(`${this.apiUrl}/categories-produits/structure/${code_structure}`, { headers: this.getHeaders() });
  }
  //Obtenir tous les produits (global)
  getProduits(): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}/produits`, { headers: this.getHeaders() });
  }

  //Obtenir un produit spécifique
  getProduitById(id: number): Observable<Produits> {
    return this.http.get<Produits>(`${this.apiUrl}/produits/${id}`, { headers: this.getHeaders() });
  }

   //Obtenir une catégorie spécifique
  getCategorieById(id: number): Observable<CategorieProduits> {
    return this.http.get<CategorieProduits>(`${this.apiUrl}/categories-produits/${id}`, { headers: this.getHeaders() });
  }

  //Créer un produit
  createProduit(produit: FormData): Observable<Produits> {
    return this.http.post<Produits>(`${this.apiUrl}/produits`, produit);
  }

  //Créer une catégorie
  createCategorie(categorie: CategorieProduits): Observable<CategorieProduits> {
    return this.http.post<CategorieProduits>(`${this.apiUrl}/categories-produits`, categorie, { headers: this.getHeaders() });
  }

  //Mettre à jour un produit
  updateProduit(id: number, produit: Partial<FormData>): Observable<any> {
    return this.http.put(`${this.apiUrl}/produits/${id}`, produit, { headers: this.getHeaders() });
  }

  //Mettre à jour une catégorie
  updateCategorie(id: number, categorie: Partial<CategorieProduits>): Observable<any> {
    return this.http.put(`${this.apiUrl}/categories-produits/${id}`, categorie, { headers: this.getHeaders() });
  }

  updateCodeBarre(id: number, codeBarre: string) {
  return this.http.put<any>(`${this.apiUrl}/produits/${id}/code-barre`, { codeBarre }, { headers: this.getHeaders() });
}

  //Supprimer un produit
  deleteProduit(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/produits/${id}`, { headers: this.getHeaders() });
  }

  //Supprimer une categorie
  deleteCategorie(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories-produits/${id}`, { headers: this.getHeaders() });
  }

  //Rechercher des produits par mot-clé (désignation, code-barres)
  rechercherProduit(query: string): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}/search/q?q=${encodeURIComponent(query)}`, { headers: this.getHeaders() });
  }

  //Mettre à jour le statut d’un produit
  updateStatusProduit(id: number, statut: boolean): Observable<any> {
    console.log('Statut envoyé :', statut);
    return this.http.patch(`${this.apiUrl}/produits/${id}/statut`, { statut }, { headers: this.getHeaders() });
  }
  updateStatutCategorie(id: number, statut: boolean) {
  return this.http.patch(`${this.apiUrl}/categories-produits/${id}/statut`, { statut },{ headers: this.getHeaders() });
}
//Mise à jour de l'image du produit
updateImageProduit(id: number, imageFile: File): Observable<any> {
  const formData = new FormData();
  formData.append('image', imageFile);
  return this.http.patch(`${this.apiUrl}/produits/${id}/image`, formData, { headers: this.getHeaders() });
}


  // Archiver un produit
  archiverProduit(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/archive`, {}, { headers: this.getHeaders() });
  }
}
