import { Stock } from './entrees-sorties.model';
import { Paiement } from './paiement.model';
import { Produits } from './produit.modele';

export class Panier {
  id?: number;
  clientId?: number;
  bonId?: number;
  articles: ArticlePanier[] = [];
  //articles: Produits[] = [];
  //stockList: Stock[] = [];  // Liste des stocks associés à chaque produit (pour un magasin spécifique)
  totalHT = 0;
  tva = 0;
  totalTTC = 0;
  statut: 'EN_COURS' | 'VALIDE' | 'ANNULE' = 'EN_COURS';
  dateCreation: Date = new Date();
  dateMiseAJour: Date = new Date();
  detailsVisible = false; // Permet de gérer l'affichage des détails
  magasinId?: number;
  agentId?: number;
  paiements?: Paiement[];
  constructor(data?: Partial<Panier>) {
    Object.assign(this, data);
    this.calculerTotals();
  }

  // ✅ Nouvelle méthode pour calculer les totaux
  public calculerTotals(): void {
    this.totalHT = this.articles.reduce((sum, article) => {
      const quantite = article.quantite ?? 0;
      const prix = article.prixVenteUnitaire ?? 0;
      return sum + prix * quantite;
    }, 0);

    this.tva = this.totalHT * 0.18;
    this.totalTTC = this.totalHT + this.tva;
  }

  public annuler(): void {
    this.statut = 'ANNULE';
  }
}

export class ArticlePanier {
  id!: number;
  produit!: Produits;
  quantite!: number;
  prixVenteUnitaire!: number;
  prixAchatUnitaire!: number;
  stock?: Stock;

  constructor(data?: Partial<ArticlePanier>) {
    Object.assign(this, data);
  }
}
