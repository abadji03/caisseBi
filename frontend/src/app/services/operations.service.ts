import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { forkJoin, map, Observable } from 'rxjs';
import { Operation } from '../modeles/operation.model';
import { ArticlePanier } from '../modeles/panier.model';

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

  // Récupérer les opérations d'un fournisseur
  getOperationsByFournisseur(code_structure: string, fournisseurId: number): Observable<Operation[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bons$ = this.http.get<any[]>(`${this.apiUrl}/bons/${code_structure}/fournisseur/${fournisseurId}`, { headers: this.getHeaders() });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paiements$ = this.http.get<any[]>(`${this.apiUrl}/paiements/${code_structure}/fournisseur/${fournisseurId}`, { headers: this.getHeaders() });

    return forkJoin([bons$, paiements$]).pipe(
      map(([bons, paiements]) => {
        const operations: Operation[] = [];

        bons.forEach(bon => {
          const op = new Operation({
            bonId: bon.id,
            fournisseurId: bon.fournisseurId,
            type: bon.type?.toUpperCase() || 'BON',
            montantPaye: bon.avance || 0,
            statut: bon.statutBon?.toUpperCase() || 'IMPAYE',
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
      })
    );
  }

  // Récupérer les opérations d'un client
  getOperationsByClient(code_structure: string, clientId: number): Observable<Operation[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bons$ = this.http.get<any[]>(`${this.apiUrl}/bons/${code_structure}/client/${clientId}`, { headers: this.getHeaders() });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paiements$ = this.http.get<any[]>(`${this.apiUrl}/paiements/${code_structure}/client/${clientId}`, { headers: this.getHeaders() });

    return forkJoin([bons$, paiements$]).pipe(
      map(([bons, paiements]) => {
        const operations: Operation[] = [];

         bons.forEach(bon => {
          const op = new Operation({
            bonId: bon.id,
            fournisseurId: bon.fournisseurId,
            type: bon.typeBon?.toUpperCase() || 'BON',
            montantPaye: bon.avance || 0,
            statut: bon.statutBon?.toUpperCase() || 'IMPAYE',
            dateOperation: new Date(bon.createdAt),
            numeroBon: bon.numero
          });

         /*  if (bon.paniers) {
            op.panier = bon.paniers.map((panier: Panier) => ({
              ...panier,
              articles: panier.articles || []
            }));
          } */
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
      })
    );
  }
}
