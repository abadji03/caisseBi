import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { Reconciliation } from '../modeles/entrees-sorties.model';

@Injectable({
  providedIn: 'root',
})
export class ReconciliationService {
  private apiUrl = 'http://localhost:5000/api/reconciliations';
  private apiUrlBis = 'http://localhost:5000/api/historiques-reconciliations';

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      //'Content-Type': 'application/json'
    });
  }

  /** Créer une réconciliation */
  create(reconciliation: Reconciliation): Observable<Reconciliation> {
    console.log('Données réconciliation',reconciliation)
    return this.http.post<Reconciliation>(this.apiUrl, reconciliation, { headers: this.getHeaders() });
  }

  /** Récupérer les réconciliations d'une structure */
  getByStructure(codeStructure: string): Observable<Reconciliation[]> {
    return this.http.get<Reconciliation[]>(`${this.apiUrl}/structure/${codeStructure}`, {
      headers: this.getHeaders(),
    });
  }

  /** Récupérer les réconciliations d'un produit */
  getByProduit(produitId: number): Observable<Reconciliation[]> {
    return this.http.get<Reconciliation[]>(`${this.apiUrl}/produit/${produitId}`, {
      headers: this.getHeaders(),
    });
  }

  /** Récupérer une réconciliation par ID */
  getById(id: number): Observable<Reconciliation> {
    return this.http.get<Reconciliation>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  /** Mettre à jour une réconciliation */
  update(id: number, reconciliation: Reconciliation): Observable<Reconciliation> {
    return this.http.put<Reconciliation>(`${this.apiUrl}/${id}`, reconciliation, {
      headers: this.getHeaders(),
    });
  }

  /** Supprimer une réconciliation */
  delete(id: number): Observable<Reconciliation> {
    return this.http.delete<Reconciliation>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  /*.....................................................................................*/

  /** Créer un historique */
  createHistorique(historique: unknown): Observable<unknown> {
    return this.http.post<unknown>(this.apiUrlBis, historique, { headers: this.getHeaders() });
  }

  /** Récupérer tous les historiques d'une réconciliation */
  getByReconciliation(reconciliationId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrlBis}/reconciliation/${reconciliationId}`, {
      headers: this.getHeaders(),
    });
  }

  /** Récupérer tous les historiques d’une structure */
  getHistoriqueByStructure(code_structure: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrlBis}/structure/${code_structure}`, {
      headers: this.getHeaders(),
    });
  }

  /** Récupérer un historique par ID */
  getHistoriqueById(id: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrlBis}/${id}`, { headers: this.getHeaders() });
  }

  /** Mettre à jour un historique */
  updateHistorique(id: number, historique: Partial<unknown>): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrlBis}/${id}`, historique, {
      headers: this.getHeaders(),
    });
  }

  /** Supprimer un historique */
  deleteHistorique(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrlBis}/${id}`, { headers: this.getHeaders() });
  }

  updateStatut(id: number, statut: string): Observable<Reconciliation> {
      return this.http.patch<Reconciliation>(
        `${this.apiUrl}/${id}/statut`,
        { statut },
        { headers: this.getHeaders() },
      );
    }
}
