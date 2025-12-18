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
  remiseGlobale = 0; // Renommer pour clarifier
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
  remiseParArticle = false; // Indicateur pour savoir si on applique la remise par article
  tvaParArticle = true; // Par défaut, TVA par article

  constructor(data?: Partial<Panier>) {
    Object.assign(this, data);
    this.calculerTotals();
  }

  // Nouvelle méthode pour calculer les totaux
  /* public calculerTotals(): void {
    this.totalHT = this.articles.reduce((sum, article) => {
      const quantite = article.quantite ?? 0;
      const prix = article.prixUnitaire ?? 0;
      return sum + prix * quantite;
    }, 0);

    this.tva = this.totalHT * (this.tauxTVA / 100);
    this.totalTTC = this.totalHT + this.tva;
  } */

  public calculerTotals(): void {
    // Réinitialiser les totaux
    this.totalHT = 0;
    this.tva = 0;
    this.totalTTC = 0;

    // Calculer les totaux par article d'abord
    this.articles.forEach(article => {
      article.calculerTotauxArticle();
      this.totalHT += article.totalHT || 0;
      this.tva += article.montantTVA || 0;
      this.totalTTC += article.totalTTC || 0;
    });

    // Appliquer la remise globale si elle existe
    if (this.remiseGlobale > 0 && !this.remiseParArticle) {
      const remiseMontant = this.totalHT * (this.remiseGlobale / 100);
      this.totalTTC -= remiseMontant;
    }

    // Appliquer la TVA globale si nécessaire
    if (this.tvaParArticle === false && this.tauxTVA > 0) {
      this.tva = this.totalHT * (this.tauxTVA / 100);
      this.totalTTC = this.totalHT + this.tva;
      
      // Réappliquer la remise globale après TVA si nécessaire
      if (this.remiseGlobale > 0 && !this.remiseParArticle) {
        const remiseMontant = this.totalHT * (this.remiseGlobale / 100);
        this.totalTTC -= remiseMontant;
      }
    }
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
  code_structure?:string;
  stock?: Stock;
  remise?: number = 0; // Remise par article
  tauxTVA?: number = 0; // TVA spécifique à l'article
  montantTVA?: number = 0; // TVA calculée pour cet article
  montantRemise?: number = 0; // Remise calculée pour cet article
  totalHT?: number = 0; // Total HT pour cet article
  totalTTC?: number = 0; // Total TTC pour cet article

  constructor(data?: Partial<ArticlePanier>) {
    Object.assign(this, data);
    this.calculerTotauxArticle();
  }
  public calculerTotauxArticle(): void {
    // Calcul du total HT
    this.totalHT = (this.prixUnitaire || 0) * (this.quantite || 0);
    
    // Calcul de la remise
    this.montantRemise = (this.totalHT || 0) * ((this.remise || 0) / 100);
    
    // HT après remise
    const htApresRemise = (this.totalHT || 0) - (this.montantRemise || 0);
    
    // Calcul de la TVA
    this.montantTVA = htApresRemise * ((this.tauxTVA || 0) / 100);
    
    // Total TTC
    this.totalTTC = htApresRemise + (this.montantTVA || 0);
  }
}
