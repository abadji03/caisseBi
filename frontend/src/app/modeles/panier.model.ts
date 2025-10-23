import { Stock } from './entrees-sorties.model';
import { Paiement } from './paiement.model';
import { Produits } from './produit.modele';

export class Panier {
  id?: number;
  clientId?: number;
  bonId?: number;
  ArticlePaniers?: ArticlePanier[] = [];
  articles: ArticlePanier[] = [];
  //articles: Produits[] = [];
  //stockList: Stock[] = [];  // Liste des stocks associés à chaque produit (pour un magasin spécifique)
  totalHT = 0;
  tva = 0;
  totalTTC = 0;
  remise = 0;
  avance = 0;
  tauxTVA = 0;
  typeEntite?:'client' | 'fournisseur';
  code_structure?:string;
  statut: 'en_cours' | 'validé' | 'annulé' = 'en_cours';
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

  // Nouvelle méthode pour calculer les totaux
  public calculerTotals(): void {
    this.totalHT = this.articles.reduce((sum, article) => {
      const quantite = article.quantite ?? 0;
      const prix = article.prixUnitaire ?? 0;
      return sum + prix * quantite;
    }, 0);

    this.tva = this.totalHT * (this.tauxTVA / 100);
    this.totalTTC = this.totalHT + this.tva;
  }

  public annuler(): void {
    this.statut = 'annulé';
  }
}

export class ArticlePanier {
  id?: number;
  produitId?: number;
  panierId?: number;
  Produit?: Produits;
  produit?: Produits;
  prixUnitaire!: number; // Prix utilisé pour les calculs (prix de vente ou d'achat selon typeEntite)
  quantite!: number;
  prixVenteUnitaire!: number;
  prixAchatUnitaire!: number;
  stock?: Stock;

  constructor(data?: Partial<ArticlePanier>) {
    Object.assign(this, data);
  }
}
