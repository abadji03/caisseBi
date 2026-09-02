import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from './auth.service';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { ArticlePanier } from '../modeles/panier.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArticlesPanierService {

  private apiUrl = `${environment.apiUrl}/articles-panier`;

  private http = inject(HttpClient);
  private logger = inject(NGXLogger);
  private authService = inject(AuthService);

  /** Headers avec token */
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  /** Créer un article panier */
  create(article: ArticlePanier): Observable<ArticlePanier> {
    return this.http.post<ArticlePanier>(this.apiUrl, article, { headers: this.getHeaders() }).pipe(
      tap(() => {
        this.logger.info('Article ajouté', article);
      }),
      catchError((error) => this.handleError(error, 'Erreur lors de l’ajout de l’article'))
    );
  }

  createArticles (articles: ArticlePanier[]): Observable<ArticlePanier[]> {
    return this.http.post<ArticlePanier[]>(`${this.apiUrl}/batch`, articles, { headers: this.getHeaders() }).pipe(
      tap(() => {
        this.logger.info('Article ajouté', articles);
      }),
      catchError((error) => this.handleError(error, 'Erreur lors de l’ajout des articles'))
    );
  }


  /**Récupérer tous les articles panier */
  findAll(): Observable<ArticlePanier[]> {
    return this.http.get<ArticlePanier[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info('Liste des articles panier récupérée')),
      catchError((error) => this.handleError(error, 'Erreur lors du chargement des articles panier'))
    );
  }

  /**Récupérer un article par ID */
  findById(id: number): Observable<ArticlePanier> {
    return this.http.get<ArticlePanier>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Article panier ${id} récupéré`)),
      catchError((error) => this.handleError(error, `Erreur lors de la récupération de l’article ${id}`))
    );
  }

  /**Mettre à jour un article panier */
  update(id: number, article: ArticlePanier): Observable<ArticlePanier> {
    return this.http.put<ArticlePanier>(`${this.apiUrl}/${id}`, article, { headers: this.getHeaders() }).pipe(
      tap(() => {
        this.logger.info('Article mis à jour', { id, article });
      }),
      catchError((error) => this.handleError(error, `Erreur lors de la mise à jour de l’article ${id}`))
    );
  }

  /**Supprimer un article panier */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      tap(() => {
        this.logger.warn(`Article ${id} supprimé`);
      }),
      catchError((error) => this.handleError(error, `Erreur lors de la suppression de l’article ${id}`))
    );
  }

  deleteArticleFromPanier(panierId: number, id: number) {
  return this.http.delete(`${this.apiUrl}/panier/${panierId}/produit/${id}`,{ headers: this.getHeaders() });
}
 
  /**Récupérer les paniers d’une structure */
  getByStructure(code_structure: string): Observable<ArticlePanier[]> {
    return this.http.get<ArticlePanier[]>(`${this.apiUrl}/structure/${code_structure}`, { headers: this.getHeaders() }).pipe(
      tap(() => this.logger.info(`Articles panier récupérés pour la structure ${code_structure}`)),
      catchError((error) => this.handleError(error, `Erreur lors du chargement des articles de la structure ${code_structure}`))
    );
  }

  /**Gestion des erreurs */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(error: any, message: string) {
    this.logger.error(message, error);
    return throwError(() => error);
  }
}