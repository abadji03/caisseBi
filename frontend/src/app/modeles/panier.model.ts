import { Stock } from "./entrees-sorties.model";
import { Produits } from "./produit.modele";

export class Panier {
  id?: number;
  clientId?: number;
  bonId?: number;
  articles: Produits[] = [];
  stockList: Stock[] = [];  // Liste des stocks associés à chaque produit (pour un magasin spécifique)
  totalHT: number = 0;
  tva: number = 0;
  totalTTC: number = 0;
  statut: 'EN_COURS' | 'VALIDE' | 'ANNULE' = 'EN_COURS';
  dateCreation: Date = new Date();
  dateMiseAJour: Date = new Date();
  detailsVisible: boolean = false; // Permet de gérer l'affichage des détails
  magasinId?:number;
  constructor(data?: Partial<Panier>) {
    Object.assign(this, data);
    this.calculerTotals();
  }

 // Méthode pour calculer le total HT, TVA et TTC
 public calculerTotals(): void {
  // Calculer totalHT en fonction des produits et des stocks
  this.totalHT = this.articles.reduce((sum, article) => {
    // On récupère le stock correspondant au produit dans le panier
    const stock = article.id ? this.getStockForProduit(article.id) : undefined;
    // Si le stock existe, on utilise la quantité disponible
    const quantiteDisponible = stock ? stock.quantiteDisponible : 0;
    return sum + (article.prixVenteUnitaire ?? 0) * quantiteDisponible; // Calcul du total avec la quantité en stock
  }, 0);

  // Calcul de la TVA (exemple : 18%)
  this.tva = this.totalHT * 0.18;

  // Calcul du total TTC
  this.totalTTC = this.totalHT + this.tva;
}

// Méthode pour récupérer le stock correspondant à un produit spécifique
private getStockForProduit(produitId: number): Stock | undefined {
  // On filtre le stock par produitId et magasinId
  return this.stockList.find(stock => stock.produitId === produitId && stock.magasinId === this.magasinId);
}
  public annuler(): void {
    this.statut = 'ANNULE';
  }
}
