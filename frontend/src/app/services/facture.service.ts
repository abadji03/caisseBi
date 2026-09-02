import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, lastValueFrom, Observable, throwError } from 'rxjs';
import { Facture, FactureFilter } from '../modeles/facture.model';
import { NGXLogger } from 'ngx-logger';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FactureService {

  private apiUrl = `${environment.apiUrl}/factures`;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
    private logger = inject(NGXLogger);

  /** ================================
     *  GÉNÉRATION HEADERS AVEC TOKEN
     ================================== */
    private getHeaders(): HttpHeaders {
      const token = this.authService.getToken();
      return new HttpHeaders({
        Authorization: `Bearer ${token}`
      });
    }
  
    /** ================================
       *  GESTION CENTRALISÉE DES ERREURS
       ================================== */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      private handleError(method: string, error: any) {
        this.logger.error(`DépensesService -> ${method} :`, error);
        return throwError(() => error);
      }

  /**
   * Créer une facture à partir d'un bon
   */
  /* createFactureFromBon(bonId: number, remise?: number, commentaire?: string): Observable<{ facture: Facture; pdf: string }> {
    return this.http.post<{ facture: Facture; pdf: string }>(`${this.apiUrl}/from-bon`, {
      bonId,
      remise: remise || 0,
      ///date_echeance: dateEcheance,
      commentaire
    },
    { headers: this.getHeaders() }
    );
  }
 */

  createFactureFromBon(bonId: number, remise?: number, commentaire?: string): Observable<{ facture: Facture; pdf: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    bonId,
    remise: remise || 0,
    commentaire
  };
  
  console.log('Envoi création facture:', body);
  
  return this.http.post<{ facture: Facture; pdf: string }>(
    `${this.apiUrl}/from-bon`, 
    body,
    { headers: this.getHeaders() }
  ).pipe(
    catchError(error => {
      console.error('Erreur HTTP création facture:', error);
      this.logger.error('FactureService.createFactureFromBon:', error);
      return throwError(() => error);
    })
  );
}
  /**
   * Créer une facture à partir d'un bon de livraison fournisseur
   */
  createFactureAchat(bonId: number, fournisseurId?: number, magasinId?: number, remise?: number, commentaire?: string): Observable<{ facture: Facture; pdf: string }> {
    return this.http.post<{ facture: Facture; pdf: string }>(`${this.apiUrl}/achat`, {
      bonId,
      fournisseurId:fournisseurId,
      magasinId:magasinId,
      remise: remise || 0,
      commentaire
    },
    { headers: this.getHeaders() }
    );
  }
  /**
   * Créer un avoir
   */
  createAvoir(factureId: number, motif: string, montant?: number, commentaire?: string): Observable<{ avoir: Facture; pdf: string }> {
    return this.http.post<{ avoir: Facture; pdf: string }>(`${this.apiUrl}/avoir`, {
      factureId,
      motif,
      montant,
      commentaire
    },
    { headers: this.getHeaders() }
    );
  }

  //Créer une facture de commande
  createFactureCommande(bonId: number,commentaire?: string): Observable<{ facture: Facture; pdf: string }> {
    return this.http.post<{ facture: Facture; pdf: string }>(`${this.apiUrl}/commande`, {
      bonId,
      commentaire
    },
    { headers: this.getHeaders() }
    );
  }

  /**
   * Créer une facture de régularisation
   */
  createFactureRegularisation(clientId: number, magasinId: number, montant: number, type: 'debit' | 'credit', motif: string, commentaire?: string): Observable<{ facture: Facture; pdf: string }> {
    return this.http.post<{ facture: Facture; pdf: string }>(`${this.apiUrl}/regularisation`, {
      clientId,
      magasinId,
      montant,
      type,
      motif,
      commentaire
    },
    { headers: this.getHeaders() }
    );
  }

  /**
   * Récupérer toutes les factures d'une structure
   */
  getFactures(code_structure: string, typeEntite: string|null, filters?: FactureFilter): Observable<{
    items: Facture[];
    pagination: {
      total: number;
      page: number;
      totalPages: number;
      limit: number;
      search: string | null;
    };
  }> {
    
    let params = new HttpParams();
  
    // Ne pas ajouter typeEntite s'il est null ou undefined
    if (typeEntite && typeEntite !== 'null' && typeEntite !== 'undefined') {
      params = params.set('typeEntite', typeEntite);
    }
    
    if (filters) {
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.statut) params = params.set('statut', filters.statut);
      if (filters.type_facture) params = params.set('type_facture', filters.type_facture);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.search) params = params.set('search', filters.search);
    }

    console.log('URL complète:', `${this.apiUrl}/${code_structure}`);
    console.log('Headers:', this.getHeaders());
    console.log('Params:', params.toString());
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.get<any>(`${this.apiUrl}/${code_structure}`, { headers: this.getHeaders(), params : params });
  }

  /**
   * Récupérer une facture par ID
   */
  getFactureById(id: number): Observable<Facture> {
    return this.http.get<Facture>(`${this.apiUrl}/${id}`,{ headers: this.getHeaders() });
  }

  /**
   * Annuler une facture
   */
  annulerFacture(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`,{ headers: this.getHeaders() });
  }

  /**
   * Télécharger le PDF d'une facture
   */
  downloadPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, 
      {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  /**
   * Ouvrir le PDF dans un nouvel onglet
   */
  async openPDF(id: number): Promise<void> {
    const blob = await lastValueFrom(this.downloadPDF(id));
    const url = window.URL.createObjectURL(blob!);
    window.open(url, '_blank');
  }
}
