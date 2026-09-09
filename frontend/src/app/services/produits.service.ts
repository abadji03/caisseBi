import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';
import { CategorieProduits, Produits } from '../modeles/produit.modele';
import { PaginatedResponse } from '../modeles/entrees-sorties.model';
import { NGXLogger } from 'ngx-logger';
import { environment } from '../../environments/environment';
import { handleApiError } from '../core/api/api-error';

@Injectable({
  providedIn: 'root',
})
export class ProduitsService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private logger = inject(NGXLogger);


  private handleError(method: string, error: unknown): Observable<never> {
    return handleApiError(this.logger, `ProduitsService.${method}`, error);
  }

  getProduitsDisponibles(code_structure: string): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}/produits/structure/${code_structure}/produits-disponibles`, {
    }).pipe(catchError(err => this.handleError('getProduitsDisponibles', err)));
  }

  getAllProduits(
    codeStructure: string,
    page = 1,
    limit = 10,
    search = '',
    categorieId = '',
    statut = ''
  ): Observable<PaginatedResponse<Produits>> {
    let params = `?page=${page}&limit=${limit}`;
    if (search) params += `&search=${encodeURIComponent(search)}`;
    if (categorieId) params += `&categorieId=${categorieId}`;
    if (statut !== '') params += `&statut=${statut}`;

    return this.http.get<PaginatedResponse<Produits>>(
      `${this.apiUrl}/produits/structure/${codeStructure}${params}`, 
      {}
    ).pipe(catchError(err => this.handleError('getAllProduits', err)));
  }

  exportToExcel(
    codeStructure: string,
    categorieId?: string,
    statut?: string,
    search?: string
  ): Observable<Blob> {
    const params = new URLSearchParams();
    if (categorieId) params.append('categorieId', categorieId);
    if (statut) params.append('statut', statut);
    if (search) params.append('search', search);

    const url = `${this.apiUrl}/produits/export/excel/structure/${codeStructure}?${params.toString()}`;
    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(catchError(err => this.handleError('exportToExcel', err)));
  }

  exportToPDF(
    codeStructure: string,
    categorieId?: string,
    statut?: string,
    search?: string
  ): Observable<Blob> {
    const params = new URLSearchParams();
    if (categorieId) params.append('categorieId', categorieId);
    if (statut) params.append('statut', statut);
    if (search) params.append('search', search);

    const url = `${this.apiUrl}/produits/export-pdf/structure/${codeStructure}?${params.toString()}`;
    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(catchError(err => this.handleError('exportToPDF', err)));
  }

  getAllCategoriesProduits(code_structure: string): Observable<CategorieProduits[]> {
    return this.http.get<CategorieProduits[]>(
      `${this.apiUrl}/categories-produits/structure/${code_structure}`,
      {},
    ).pipe(catchError(err => this.handleError('getAllCategoriesProduits', err)));
  }

  getProduits(): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}/produits`, {})
      .pipe(catchError(err => this.handleError('getProduits', err)));
  }

  getProduitById(id: number): Observable<Produits> {
    return this.http.get<Produits>(`${this.apiUrl}/produits/${id}`, {})
      .pipe(catchError(err => this.handleError('getProduitById', err)));
  }

  getCategorieById(id: number): Observable<CategorieProduits> {
    return this.http.get<CategorieProduits>(`${this.apiUrl}/categories-produits/${id}`, {
    }).pipe(catchError(err => this.handleError('getCategorieById', err)));
  }

  createProduit(produit: FormData): Observable<Produits> {
    return this.http.post<Produits>(`${this.apiUrl}/produits`, produit)
      .pipe(catchError(err => this.handleError('createProduit', err)));
  }

  createCategorie(categorie: CategorieProduits): Observable<CategorieProduits> {
    return this.http.post<CategorieProduits>(`${this.apiUrl}/categories-produits`, categorie, {
    }).pipe(catchError(err => this.handleError('createCategorie', err)));
  }

  updateProduit(id: number, produit: Partial<FormData>): Observable<FormData> {
    return this.http.put<FormData>(`${this.apiUrl}/produits/${id}`, produit, {
    }).pipe(catchError(err => this.handleError('updateProduit', err)));
  }

  updateCategorie(id: number, categorie: Partial<CategorieProduits>): Observable<CategorieProduits> {
    return this.http.put<CategorieProduits>(`${this.apiUrl}/categories-produits/${id}`, categorie, {
    }).pipe(catchError(err => this.handleError('updateCategorie', err)));
  }

  updateCodeBarre(id: number, codeBarre: string) {
    return this.http.put<string>(
      `${this.apiUrl}/produits/${id}/code-barre`,
      { codeBarre },
      {},
    ).pipe(catchError(err => this.handleError('updateCodeBarre', err)));
  }

  deleteProduit(id: number): Observable<Produits> {
    return this.http.delete<Produits>(`${this.apiUrl}/produits/${id}`, {
    }).pipe(catchError(err => this.handleError('deleteProduit', err)));
  }

  deleteCategorie(id: number): Observable<CategorieProduits> {
    return this.http.delete<CategorieProduits>(`${this.apiUrl}/categories-produits/${id}`, {
    }).pipe(catchError(err => this.handleError('deleteCategorie', err)));
  }

  rechercherProduit(query: string): Observable<Produits[]> {
    return this.http.get<Produits[]>(`${this.apiUrl}/search/q?q=${encodeURIComponent(query)}`, {
    }).pipe(catchError(err => this.handleError('rechercherProduit', err)));
  }

  updateStatusProduit(id: number, statut: boolean): Observable<Produits> {
    return this.http.patch<Produits>(
      `${this.apiUrl}/produits/${id}/statut`,
      { statut },
      {},
    ).pipe(catchError(err => this.handleError('updateStatusProduit', err)));
  }

  updateTauxTVAProduit(id: number, tauxTVA: number): Observable<Produits> {
    return this.http.patch<Produits>(
      `${this.apiUrl}/produits/${id}/tauxTVA`,
      { tauxTVA },
      {},
    ).pipe(catchError(err => this.handleError('updateTauxTVAProduit', err)));
  }

  updateStatutCategorie(id: number, statut: boolean) {
    return this.http.patch(
      `${this.apiUrl}/categories-produits/${id}/statut`,
      { statut },
      {},
    ).pipe(catchError(err => this.handleError('updateStatutCategorie', err)));
  }

  updateImageProduit(id: number, imageFile: File): Observable<Produits> {
    const formData = new FormData();
    formData.append('image', imageFile);
    return this.http.patch<Produits>(`${this.apiUrl}/produits/${id}/image`, formData, {
    }).pipe(catchError(err => this.handleError('updateImageProduit', err)));
  }

  archiverProduit(id: number): Observable<Produits> {
    return this.http.patch<Produits>(
      `${this.apiUrl}/${id}/archive`, {},
      {},
    ).pipe(catchError(err => this.handleError('archiverProduit', err)));
  }
}