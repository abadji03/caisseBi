/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { map, Observable, tap } from 'rxjs';
import { Operation, OperationsFilters, OperationsResponse, StatsResponse } from '../modeles/operation.model';

@Injectable({
  providedIn: 'root'
})
export class OperationsService {

   private apiUrl = 'http://localhost:5000/api'; 

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  /* // Récupérer les opérations d'un fournisseur
  getOperationsByFournisseur(code_structure: string, fournisseurId: number): Observable<Operation[]> {
    const bons$ = this.http.get<any[]>(`${this.apiUrl}/bons/${code_structure}/fournisseur/${fournisseurId}`, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(bons => console.log(`📦 Bons chargés: ${bons.length}`, bons))
    );
    const paiements$ = this.http.get<any[]>(`${this.apiUrl}/paiements/${code_structure}/fournisseur/${fournisseurId}`, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(paiements => console.log(`💰 Paiements chargés: ${paiements.length}`, paiements))
    );

    return forkJoin([bons$, paiements$]).pipe(
      map(([bons, paiements]) => {
        const operations: Operation[] = [];

        bons.forEach(bon => {
          const op = new Operation({
            id: bon.id,
            bonId: bon.id,
            fournisseurId: bon.fournisseurId,
            type: this.normaliserTypeOperation(bon.type),
            montantPaye: bon.avance || 0,
            statut: bon.statutBon?.toUpperCase() || 'brouillon',
            dateOperation: new Date(bon.createdAt),
            numeroBon: bon.numero,
          });

          if (bon.Panier) {
            op.Panier = {
              ...bon.Panier,
              articles: (bon.Panier.ArticlesPaniers || []).map(
                (article: ArticlePanier) =>
                  new ArticlePanier({
                    ...article,
                    produit: article.Produit, // Sequelize injecte Produit
                  })
              ),
            };
          }
          if(bon.user) {
            op.user = bon.user;
          }
        operations.push(op);
        });

        paiements.forEach(paiement => {
          operations.push(new Operation({
            id: paiement.id,
            paiementId: paiement.id,
            fournisseurId: paiement.fournisseurId,
            type: 'VERSEMENT',
            montantPaye: paiement.montant,
            moyenPaiement: paiement.moyenPaiement,
            statut: paiement.statut,
            dateOperation: new Date(paiement.date),
            numeroVersement: paiement.numero
          }));
        });

        // Tri par date
        return operations.sort((a, b) => new Date(b.dateOperation).getTime() - new Date(a.dateOperation).getTime());
      }),
      shareReplay(1)
    );
  }

  // Récupérer les opérations d'un client
  getOperationsByClient(code_structure: string, clientId: number): Observable<Operation[]> {
    const bons$ = this.http.get<any[]>(`${this.apiUrl}/bons/${code_structure}/client/${clientId}`, { headers: this.getHeaders() });
    const paiements$ = this.http.get<any[]>(`${this.apiUrl}/paiements/${code_structure}/client/${clientId}`, { headers: this.getHeaders() });

    return forkJoin([bons$, paiements$]).pipe(
      map(([bons, paiements]) => {
        const operations: Operation[] = [];

         bons.forEach(bon => {
          const op = new Operation({
            id: bon.id,
            bonId: bon.id,
            fournisseurId: bon.fournisseurId,
            type: this.normaliserTypeOperation(bon.type),
            montantPaye: bon.avance || 0,
            statut: bon.statutBon?.toUpperCase() || 'IMPAYE',
            dateOperation: new Date(bon.createdAt),
            numeroBon: bon.numero
          });

         
         if (bon.Panier) {
            op.Panier = {
              ...bon.Panier,
              articles: (bon.Panier.ArticlesPaniers || []).map(
                (article: ArticlePanier) =>
                  new ArticlePanier({
                    ...article,
                    produit: article.Produit, // Sequelize injecte Produit
                  })
              ),
            };
          }


        operations.push(op);
        });


        paiements.forEach(paiement => {
          operations.push(new Operation({
            id: paiement.id,
            paiementId: paiement.id,
            clientId: paiement.clientId,
            type: 'REGLEMENT',
            montantPaye: paiement.montant,
            moyenPaiement: paiement.moyenPaiement,
            statut: paiement.statut,
            dateOperation: new Date(paiement.date),
            numeroVersement: paiement.numero
          }));
        });

        // Tri par date
        return operations.sort((a, b) => new Date(b.dateOperation).getTime() - new Date(a.dateOperation).getTime());
      }),
      shareReplay(1)
    );
  }

  //NOUVELLE MÉTHODE : Normaliser le type d'opération
  private normaliserTypeOperation(typeBon: string): string {
    if (!typeBon) return 'BON';
    
    // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
    const typesNormalises: { [key: string]: string } = {
      'commande': 'COMMANDE',
      'livraison': 'LIVRAISON',
      'retour': 'RETOUR',
      'versement': 'VERSEMENT'
    };
    
    return typesNormalises[typeBon.toLowerCase()] || typeBon.toUpperCase();
  }  */

  // ==============================
  // MÉTHODES PRINCIPALES
  // ==============================

  /**
   * Récupère toutes les opérations avec filtres
   */
  getOperations(filters: OperationsFilters = {}): Observable<OperationsResponse> {
    let params = new HttpParams();

    // Ajout des paramètres de filtrage
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof OperationsFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<OperationsResponse>(`${this.apiUrl}/operations`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(response => console.log(`📊 Opérations chargées: ${response.operations.length} / ${response.total} total`))
    );
  }

  /**
   * Récupère les opérations d'un fournisseur
   */
  getOperationsByFournisseur(
    code_structure: string, 
    fournisseurId: number, 
    filters: Omit<OperationsFilters, 'code_structure' | 'fournisseurId'> = {}
  ): Observable<Operation[]> {
    let params = new HttpParams()
    .set('code_structure', code_structure)
    .set('fournisseurId', fournisseurId.toString());

     // Ajouter les filtres de date
    if (filters.dateDebut) {
      params = params.set('dateDebut', filters.dateDebut);
    }
    if (filters.dateFin) {
      params = params.set('dateFin', filters.dateFin);
    }
    // Ajout des paramètres de filtrage
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<Operation[]>(
      `${this.apiUrl}/operations/fournisseur/${code_structure}/${fournisseurId}`, 
      {
        headers: this.getHeaders(),
        params
      }
    ).pipe(
      tap(operations => console.log(`📦 Opérations fournisseur chargées: ${operations.length}`))
    );
  }

  /**
   * Récupère les opérations d'un client
   */
  getOperationsByClient(
    code_structure: string, 
    clientId: number, 
    filters: Omit<OperationsFilters, 'code_structure' | 'clientId'> = {}
  ): Observable<Operation[]> {
    let params = new HttpParams();

    // Ajout des paramètres de filtrage
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<Operation[]>(
      `${this.apiUrl}/operations/client/${code_structure}/${clientId}`, 
      {
        headers: this.getHeaders(),
        params
      }
    ).pipe(
      tap(operations => console.log(`Opérations client chargées: ${operations.length}`))
    );
  }

  /**
   * Récupère une opération spécifique par son ID
   */
  getOperationById(id: number): Observable<Operation> {
    return this.http.get<Operation>(`${this.apiUrl}/operations/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(operation => console.log('🔍 Détails opération chargés:', operation))
    );
  }

  // ==============================
  // MÉTHODES DE CRÉATION
  // ==============================

  /**
   * Crée une nouvelle opération
   */
  createOperation(operationData: Partial<Operation>): Observable<Operation> {
    return this.http.post<Operation>(`${this.apiUrl}/operations`, operationData, {
      headers: this.getHeaders()
    }).pipe(
      tap(operation => console.log('✅ Opération créée:', operation))
    );
  }

  /**
   * Crée une opération à partir d'un bon (pour usage interne)
   */
  createOperationFromBon(bonData: any): Observable<Operation> {
    // Cette méthode pourrait être utilisée côté backend
    // Pour le frontend, on utilise directement createOperation
    return this.createOperation({
      type: bonData.type.toUpperCase()||'BON',
      bonId: bonData.id,
      fournisseurId: bonData.fournisseurId,
      clientId: bonData.clientId,
      magasinId: bonData.magasinId,
      resteAPayer:bonData.resteAPayer,
      code_structure: bonData.code_structure,
      montantPaye: bonData.avance || 0,
      statut: bonData.statutBon?.toUpperCase() || 'BROUILLON',
      dateOperation: bonData.dateBon || new Date(),
      commentaire: `Bon ${bonData.type} - ${bonData.numero}`,
      numeroBon: bonData.numero
    });
  }

  /**
   * Crée une opération à partir d'un paiement (pour usage interne)
   */
  createOperationFromPaiement(paiementData: any): Observable<Operation> {
    const typeOperation = paiementData.typePaiement === 'client' ? 'REGLEMENT' : 'VERSEMENT';
    
    return this.createOperation({
      type: typeOperation,
      paiementId: paiementData.id,
      bonId: paiementData.bonId,
      fournisseurId: paiementData.fournisseurId,
      clientId: paiementData.clientId,
      magasinId: paiementData.magasinId,
      code_structure: paiementData.code_structure,
      montantPaye: paiementData.montant,
      statut: paiementData.statut?.toUpperCase() || 'EFFECTUE',
      dateOperation: paiementData.date || new Date(),
      commentaire: paiementData.description || `${typeOperation} - ${paiementData.numero}`,
      numeroVersement: paiementData.numero,
      moyenPaiement: paiementData.methodePaiement
    });
  }

  // ==============================
  // MÉTHODES DE MISE À JOUR ET SUPPRESSION
  // ==============================

  /**
   * Met à jour une opération
   */
  updateOperation(id: number, updateData: Partial<Operation>): Observable<Operation> {
    return this.http.put<Operation>(`${this.apiUrl}/operations/${id}`, updateData, {
      headers: this.getHeaders()
    }).pipe(
      tap(operation => console.log('Opération mise à jour:', operation))
    );
  }

  /**
   * Supprime une opération
   */
  deleteOperation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/operations/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(() => console.log('🗑️ Opération supprimée:', id))
    );
  }

  // ==============================
  // MÉTHODES DE STATISTIQUES ET RAPPORTS
  // ==============================

  /**
   * Récupère les statistiques des opérations
   */
  getOperationsStats(filters: Omit<OperationsFilters, 'page' | 'limit'> = {}): Observable<StatsResponse[]> {
    let params = new HttpParams();

    // Ajout des paramètres de filtrage
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof typeof filters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<StatsResponse[]>(`${this.apiUrl}/operations/stats`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(stats => console.log('📈 Statistiques chargées:', stats))
    );
  }

  /**
   * Récupère le solde d'un fournisseur
   */
  getSoldeFournisseur(code_structure: string, fournisseurId: number): Observable<number> {
    return this.getOperationsByFournisseur(code_structure, fournisseurId).pipe(
      map(operations => {
        const solde = operations.reduce((total, op) => {
          if (op.type === 'BON') {
            return total - (op.resteAPayer || 0);
          } else if (op.type === 'VERSEMENT') {
            return total + (op.montantPaye || 0);
          }
          return total;
        }, 0);
        
        console.log(`💰 Solde fournisseur ${fournisseurId}:`, solde);
        return solde;
      })
    );
  }

  /**
   * Récupère le solde d'un client
   */
  getSoldeClient(code_structure: string, clientId: number): Observable<number> {
    return this.getOperationsByClient(code_structure, clientId).pipe(
      map(operations => {
        const solde = operations.reduce((total, op) => {
          if (op.type === 'BON') {
            return total + (op.resteAPayer || 0);
          } else if (op.type === 'REGLEMENT') {
            return total - (op.montantPaye || 0);
          }
          return total;
        }, 0);
        
        console.log(`💰 Solde client ${clientId}:`, solde);
        return solde;
      })
    );
  }

  // ==============================
  // MÉTHODES UTILITAIRES
  // ==============================

  /**
   * Filtre les opérations par type
   */
  filterOperationsByType(operations: Operation[], type: string): Operation[] {
    return operations.filter(op => 
      op?.type?.toLowerCase() === type.toLowerCase()
    );
  }

  /**
   * Filtre les opérations par statut
   */
  filterOperationsByStatut(operations: Operation[], statut: string): Operation[] {
    return operations.filter(op => 
      op.statut.toLowerCase() === statut.toLowerCase()
    );
  }

  /**
   * Calcule le total des montants pour des opérations
   */
  calculerTotalOperations(operations: Operation[]): number {
    return operations.reduce((total, op) => total + (op.montantPaye || 0), 0);
  }

  /**
   * Calcule le total des montants payés pour des opérations
   */
  calculerTotalPaye(operations: Operation[]): number {
    return operations.reduce((total, op) => total + (op.montantPaye || 0), 0);
  }

  /**
   * Vérifie si une opération a des détails de bon
   */
  hasBonDetails(operation: Operation): boolean {
    return !!(operation.Bon && operation.Bon.Panier);
  }

  /**
   * Vérifie si une opération a des détails de paiement
   */
  hasPaiementDetails(operation: Operation): boolean {
    return !!operation.Paiement;
  }

  /**
   * Récupère le nombre d'articles d'une opération
   */
  getNombreArticles(operation: Operation): number {
    if (this.hasBonDetails(operation) && operation.Bon!.Panier!.ArticlePaniers) {
      return operation.Bon!.Panier!.ArticlePaniers.length;
    }
    return 0;
  }

  /**
   * Rafraîchit les opérations après un enregistrement (méthode de compatibilité)
   */
  rafraichirOperationsApresEnregistrement(
    code_structure: string,
    fournisseurId?: number,
    clientId?: number
  ): Observable<Operation[]> {
    console.log('🔄 Rafraîchissement des opérations');

    if (fournisseurId) {
      return this.getOperationsByFournisseur(code_structure, fournisseurId);
    } else if (clientId) {
      return this.getOperationsByClient(code_structure, clientId);
    }

    // Fallback: récupérer toutes les opérations de la structure
    return this.getOperations({ code_structure }).pipe(
      map(response => response.operations)
    );
  }

     
}
