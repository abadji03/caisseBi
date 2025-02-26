import { Produits } from "./produit.modele";

export class Panier {
  id?: number;
  clientId?: number;
  bonId?: number;
  articles: Produits[] = [];
  totalHT: number = 0;
  tva: number = 0;
  totalTTC: number = 0;
  statut: 'EN_COURS' | 'VALIDE' | 'ANNULE' = 'EN_COURS';
  dateCreation: Date = new Date();
  dateMiseAJour: Date = new Date();

  constructor(data?: Partial<Panier>) {
    Object.assign(this, data);
    this.calculerTotals();
  }

  private calculerTotals(): void {
    this.totalHT = this.articles.reduce((sum, article) => sum + (article.prixTotalVente ?? 0), 0);
    this.tva = this.totalHT * 0.18; // Supposons 18% de TVA
    this.totalTTC = this.totalHT + this.tva;
  }
}
