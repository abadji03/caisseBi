import { Stock } from './entrees-sorties.model';
import { Magasin } from './magasin.model';
import { Paiement } from './paiement.model';
import { Produits } from './produit.modele';
import { User } from './user.model';

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
  //methodePaiement?: 'Espèce' | 'Carte' | 'Orange Money'| 'Wave' | 'Chèque' | 'Virement' | 'Autre';
  remise = 0;
  avance = 0;
  user?:User;
  Magasin?:Magasin;
  tauxTVA = 0;
  typeEntite?:'client' | 'fournisseur'|'autre';
  typePanier?:'produit' | 'service '|'mixte'= 'produit';
  code_structure?:string;
  statut: 'en_cours' | 'validé' | 'annulé'|'retourné' = 'en_cours';
  dateCreation: Date = new Date();
  dateMiseAJour: Date = new Date();
  detailsVisible = false; // Permet de gérer l'affichage des détails
  magasinId?: number;
  agentId?: number;
  Paiements?:Paiement[];
  paiements?: Paiement[];
  remiseParArticle = false; // Indicateur pour savoir si on applique la remise par article
  tvaParArticle = true; // Par défaut, TVA par article

  constructor(data?: Partial<Panier>) {
    if (data) {
      Object.assign(this, data);
      // Recalculer les totaux après construction
      this.convertirArticlesEnInstances(data);

      this.calculerTotals();
    }
  }
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 private convertirArticlesEnInstances(data: any): void {
    // Convertir ArticlePaniers (majuscule)
    if (data.ArticlePaniers && Array.isArray(data.ArticlePaniers)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ArticlePaniers = data.ArticlePaniers.map((item: any) => {
        if (item instanceof ArticlePanier) {
          return item;
        } else {
          return new ArticlePanier(item);
        }
      });
    }
    
    // Convertir articles (minuscule)
    if (data.articles && Array.isArray(data.articles)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.articles = data.articles.map((item: any) => {
        if (item instanceof ArticlePanier) {
          return item;
        } else {
          return new ArticlePanier(item);
        }
      });
    }
    
    // Si les deux tableaux existent, on privilégie ArticlePaniers
    if (this.ArticlePaniers && this.ArticlePaniers.length > 0) {
      this.articles = [...this.ArticlePaniers];
    } else if (this.articles && this.articles.length > 0) {
      this.ArticlePaniers = [...this.articles];
    }
  }

 /** UNIQUE méthode de calcul du panier */
  calculerTotals(): void {

    // Reset
    this.totalHT = 0;
    this.remise = 0;
    this.tva = 0;
    this.totalTTC = 0;
    const htTotalAvantRemise = this.articles.reduce((sum, art) => sum + (art.prixUnitaire * art.quantite), 0);


    // 1. Calcul des articles
    for (const article of this.articles) {
      article.calculerTotaux(
        this.tvaParArticle,
        this.remiseParArticle,
        this.tauxTVA, 
        this.remiseGlobale,
        htTotalAvantRemise
      );

      this.totalHT += (article.totalHT ?? 0);
      this.tva += article.montantTVA ?? 0;
      this.remise += article.montantRemise ?? 0;
    }

    // 2. Remise globale (SI PAS par article)
    /*if (!this.remiseParArticle && this.remiseGlobale && this.remiseGlobale > 0) {
       const remiseGlobaleMontant = this.totalHT * (this.remiseGlobale / 100);

      this.remise += remiseGlobaleMontant;
      this.totalHT -= remiseGlobaleMontant; 
      const montantRemiseGlobale = this.totalHT * (this.remiseGlobale / 100);
      this.remise += montantRemiseGlobale;
      this.totalHT -= montantRemiseGlobale;
    }*/

    // 3. TVA globale (SI PAS par article)
    if (!this.tvaParArticle && this.tauxTVA > 0) {
      this.tva = this.totalHT * (this.tauxTVA / 100);
    }

    // 4. Total TTC
    this.totalTTC = this.totalHT + this.tva;

    // Validation des calculs
    this.validerCalculs(htTotalAvantRemise);

    // 5. Reste à payer
    /* this.resteAPayer = Math.max(
      this.totalTTC - this.avance,
      0
    ); */
  }
  /** Méthode de validation des calculs */
  private validerCalculs(htTotalAvantRemise: number): void {
    if (!this.remiseParArticle && this.remiseGlobale && this.remiseGlobale > 0) {
      const remiseGlobaleTheorique = htTotalAvantRemise * (this.remiseGlobale / 100);
      const remiseTotaleCalculee = this.articles.reduce((sum, art) => sum + (art.montantRemise || 0), 0);
      const difference = Math.abs(remiseGlobaleTheorique - remiseTotaleCalculee);

      console.log('✅ VALIDATION OPTION 1:', {
        htTotalAvantRemise,
        remiseGlobale: this.remiseGlobale,
        remiseGlobaleTheorique,
        remiseTotaleCalculee,
        difference,
        estCorrect: difference < 0.01,
        totalHT: this.totalHT,
        totalHTVerif: htTotalAvantRemise - remiseTotaleCalculee
      });

      if (difference > 0.01) {
        console.warn('⚠️ ATTENTION: Écart important dans les calculs de remise!');
      }
    }
  }

   ajouterArticle(article: ArticlePanier): void {
    this.articles.unshift(new ArticlePanier(article));
    this.calculerTotals();
  }

  incrementerQuantiteArticle(index: number): void {
    if (index >= 0 && index < this.articles.length) {
      this.articles[index].quantite++;
      this.articles[index].calculerTotaux(this.tvaParArticle, this.remiseParArticle, this.tauxTVA, this.remiseGlobale);
      this.calculerTotals();
    }
  }

  supprimerArticle(index: number): ArticlePanier | null {
    if (index >= 0 && index < this.articles.length) {
      const articleSupprime = this.articles.splice(index, 1)[0];
      this.calculerTotals();
      return articleSupprime;
    }
    return null;
  }

  mettreAJourArticle(index: number, article: Partial<ArticlePanier>): void {
    if (index >= 0 && index < this.articles.length) {
      Object.assign(this.articles[index], article);
      this.articles[index].calculerTotaux(this.tvaParArticle, this.remiseParArticle, this.tauxTVA, this.remiseGlobale);
      this.calculerTotals();
    }
  }

  trouverArticleIndex(produitId: number): number {
    return this.articles.findIndex(article => article.produitId === produitId);
  }

  public annuler(): void {
    this.statut = 'annulé';
  }

  get resteAPayer(): number {
    return Math.max(this.totalTTC - this.avance, 0);
  }

  get isValid(): boolean {
    return this.articles.length > 0 && 
           this.articles.every(article => article.quantite > 0 && article.prixUnitaire >= 0);
  }

  // Nouvelle méthode pour obtenir tous les articles (fusion de articles et ArticlePaniers)
get tousLesArticles(): ArticlePanier[] {
  console.log('🔍 get tousLesArticles appelé:', {
    hasArticlePaniers: !!this.ArticlePaniers,
    articlePaniersType: typeof this.ArticlePaniers,
    articlePaniersLength: this.ArticlePaniers?.length,
    hasArticles: !!this.articles,
    articlesLength: this.articles?.length
  });

  // 1. Vérifier ArticlePaniers (avec la majuscule)
  if (this.ArticlePaniers && Array.isArray(this.ArticlePaniers)) {
    console.log('📦 ArticlePaniers trouvé:', this.ArticlePaniers.length, 'articles');
    
    // Convertir en instances d'ArticlePanier si nécessaire
    const articles = this.ArticlePaniers.map(item => {
      if (item instanceof ArticlePanier) {
        return item;
      } else {
        // Si c'est un objet brut, le convertir en ArticlePanier
        return new ArticlePanier(item);
      }
    });
    
    if (articles.length > 0) {
      console.log('✅ Retourne ArticlePaniers convertis');
      return articles;
    }
  }

  // 2. Vérifier articles (minuscule)
  if (this.articles && Array.isArray(this.articles)) {
    console.log('📦 articles trouvé:', this.articles.length, 'articles');
    
    // Convertir en instances d'ArticlePanier si nécessaire
    const articles = this.articles.map(item => {
      if (item instanceof ArticlePanier) {
        return item;
      } else {
        return new ArticlePanier(item);
      }
    });
    
    if (articles.length > 0) {
      console.log('✅ Retourne articles convertis');
      return articles;
    }
  }

  // 3. Vérifier si ArticlePaniers est undefined mais qu'il y a une propriété avec un nom différent
  // Par exemple, si l'API renvoie "articlePaniers" avec une minuscule
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyThis = this as any;
  const possibleKeys = ['articlePaniers', 'article_paniers', 'items', 'lignes'];
  
  for (const key of possibleKeys) {
    if (anyThis[key] && Array.isArray(anyThis[key])) {
      console.log(`🔍 Propriété "${key}" trouvée:`, anyThis[key].length, 'articles');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const articles = anyThis[key].map((item: any) => new ArticlePanier(item));
      if (articles.length > 0) {
        console.log(`✅ Retourne articles de ${key}`);
        return articles;
      }
    }
  }

  console.log('⚠️ Aucun article trouvé, retourne tableau vide');
  return [];
}

  clone(): Panier {
  return new Panier({
    id: this.id,
    clientId: this.clientId,
    bonId: this.bonId,
    ArticlePaniers: this.ArticlePaniers ? this.ArticlePaniers.map(a => a.clone()) : [],
    articles: this.articles.map(a => a.clone()),
    totalHT: this.totalHT,
    tva: this.tva,
    totalTTC: this.totalTTC,
    remiseGlobale: this.remiseGlobale,
    remise: this.remise,
    typePanier: this.typePanier,
    avance: this.avance,
    //methodePaiement: this.methodePaiement,
    tauxTVA: this.tauxTVA,
    typeEntite: this.typeEntite,
    code_structure: this.code_structure,
    statut: this.statut,
    dateCreation: this.dateCreation,
    dateMiseAJour: this.dateMiseAJour,
    detailsVisible: this.detailsVisible,
    magasinId: this.magasinId,
    agentId: this.agentId,
    paiements: this.paiements,
    remiseParArticle: this.remiseParArticle,
    tvaParArticle: this.tvaParArticle
  }); 
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
    //this.calculerTotauxArticle();
  }
  /** Calcul STRICTEMENT local à l’article */
  calculerTotaux(
    appliquerTVA: boolean, 
    appliquerRemise: boolean, 
    tauxTVAGlobal?: number, 
    remiseGlobale?: number,
    totalHTPanier?: number
  ): void {
    
    console.log('🧮 ArticlePanier.calculerTotaux() - Début', {
      appliquerTVA,
      appliquerRemise,
      tauxTVAGlobal,
      remiseGlobale,
      prixUnitaire: this.prixUnitaire,
      quantite: this.quantite,
      tauxTVA: this.tauxTVA,
      remise: this.remise
    });
    // 1. HT brut
    const htBrut = this.prixUnitaire * this.quantite;
    console.log('📊 HT brut:', htBrut, '=', this.prixUnitaire, '*', this.quantite);

    // 2. Calcul de la remise
    if (appliquerRemise && this.remise && this.remise > 0) {
      // Remise par article
      this.montantRemise = htBrut * (this.remise / 100);
    } 
     else if (!appliquerRemise && remiseGlobale && remiseGlobale > 0 && totalHTPanier && totalHTPanier > 0) {
      // Part de la remise globale pour cet article (proportionnelle)
      const proportion = htBrut / totalHTPanier  ;
      const montantRemiseGlobaleTotal = totalHTPanier * (remiseGlobale / 100);
      this.montantRemise = montantRemiseGlobaleTotal * proportion;
      //this.montantRemise = totalHTPanier  * (remiseGlobale / 100) * proportion;
    }  
    else {
      this.montantRemise = 0;
    }

    const htNet = htBrut - (this.montantRemise || 0);

    // 3. Calcul de la TVA
    if (appliquerTVA && this.tauxTVA && this.tauxTVA > 0) {
      // TVA par article
      this.montantTVA = htNet * (this.tauxTVA / 100);
    } 
    else if (!appliquerTVA && tauxTVAGlobal && tauxTVAGlobal > 0) {
      // TVA globale appliquée à la part HT de cet article
      this.montantTVA = htNet * (tauxTVAGlobal / 100);
    } 
    else {
      this.montantTVA = 0;
    }

    // 4. Totaux
    this.totalHT = htNet;
    this.totalTTC = htNet + (this.montantTVA || 0);
  }

  get isValid(): boolean {
    return this.produitId != null && 
           this.quantite > 0 && 
           this.prixUnitaire >= 0;
  }

  // Méthode pour cloner un article
  /* clone(): ArticlePanier {
    return new ArticlePanier({...this});
  } */
 // Améliorer le clonage d'article
  clone(): ArticlePanier {
    return new ArticlePanier({
      id: this.id,
      produitId: this.produitId || this.Produit?.id,
      panierId: this.panierId,
      Produit: this.Produit ? {...this.Produit} : undefined,
      produit: this.produit ? {...this.produit} : undefined,
      prixUnitaire: this.prixUnitaire,
      quantite: this.quantite,
      prixVenteUnitaire: this.prixVenteUnitaire,
      prixAchatUnitaire: this.prixAchatUnitaire,
      code_structure: this.code_structure,
      stock: this.stock || undefined,
      remise: this.remise,
      tauxTVA: this.tauxTVA,
      montantTVA: this.montantTVA,
      montantRemise: this.montantRemise,
      totalHT: this.totalHT,
      totalTTC: this.totalTTC
    });
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
