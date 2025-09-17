import { Produits } from './produit.modele';

export class Stock {
  public id!: number;
  public produitId!: number; // Produit concerné
  public magasinId!: number; // Magasin concerné
  public quantiteTotale!: number; // Quantité totale en stock
  public quantiteReservee = 0; // Quantité engagée pour des commandes
  public seuilAlerte = 5; // Niveau minimum avant alerte
  public seuilReapprovisionnement = 10; // Déclenche une commande d'achat
  public stockSecurite = 5; // Quantité tampon pour éviter les ruptures
  public dernierPrixAchat?: number; // Dernier prix d'achat connu
  public prixVenteUnitaire?: number; // Prix de vente unitaire
  public datePeremption!: Date; // Pour les produits périssables
  public statutStock = 'En stock'; // État du stock ("En stock", "Rupture", etc.)
  public dateDerniereMiseAJour!: Date; // Date de la dernière mise à jour

  //Propriétés calculées
  public get quantiteDisponible(): number {
    return this.quantiteTotale - this.quantiteReservee;
  }

  public get valeurTotaleStock(): number {
    return (this.dernierPrixAchat || 0) * this.quantiteDisponible;
  }

  public get valeurTotaleVente(): number {
    return (this.prixVenteUnitaire || 0) * this.quantiteDisponible;
  }

  constructor(data?: Partial<Stock>) {
    Object.assign(this, data);
    //this.dateDerniereMiseAJour = new Date();
  }

  //Méthodes statiques pour les calculs globaux
  public static calculerValeurTotaleStocks(stocks: Stock[]): number {
    return stocks.reduce((total, stock) => total + stock.valeurTotaleStock, 0);
  }

  public static calculerValeurTotaleVente(stocks: Stock[]): number {
    return stocks.reduce((total, stock) => total + stock.valeurTotaleVente, 0);
  }

  public static compterProduitsTotal(stocks: Stock[]): number {
    return stocks.length;
  }

  public static compterProduitsUniques(stocks: Stock[]): number {
    const produitsUniques = new Set(stocks.map((stock) => stock.produitId));
    return produitsUniques.size;
  }

  public static compterProduitsEnAlerte(stocks: Stock[]): number {
    return stocks.filter((stock) => stock.quantiteDisponible <= stock.seuilAlerte).length;
  }

  public static compterProduitsEnRupture(stocks: Stock[]): number {
    return stocks.filter((stock) => stock.quantiteDisponible === 0).length;
  }

  public static compterProduitsAReapprovisionner(stocks: Stock[]): number {
    return stocks.filter((stock) => stock.quantiteDisponible <= stock.seuilReapprovisionnement)
      .length;
  }

  public static compterProduitsPerissables(stocks: Stock[], produits: Produits[]): number {
    return stocks.filter((stock) => {
      const produit = produits.find((p) => p.id === stock.produitId);
      return produit?.perissable ?? false;
    }).length;
  }

  public static compterProduitsEnSurstock(stocks: Stock[]): number {
    return stocks.filter(
      (stock) => stock.quantiteDisponible > stock.seuilReapprovisionnement + stock.stockSecurite,
    ).length;
  }
}

export class MouvementsStock {
  public id!: number;
  public ref!: string;
  public produitId!: number;
  public magasinId!: number;
  public stockId!: number; // Ajout du lien avec le stock
  public typeMouvement!: 'Entree' | 'Sortie';
  public quantite!: number;
  public prixUnitaire!: number;
  public acteurId!: number;
  public description?: string;
  public motif?: string;
  public dateMouvement: Date = new Date();

  //Calcul du prix total
  public get prixTotal(): number {
    return (this.prixUnitaire || 0) * this.quantite;
  }

  constructor(data?: Partial<MouvementsStock>) {
    if (data) {
      const { prixTotal, ...rest } = data as MouvementsStock;
      Object.assign(this, rest);
    }
  }

  //Réinitialiser l'heure d'une date pour éviter les erreurs de comparaison
  private static resetTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  //Méthode pour calculer les statistiques de stock
  public static calculerStatistiques(
    mouvements: MouvementsStock[],
    stocks: Stock[],
    dernierPrixAchat: number,
    dateDebut: Date,
    dateFin: Date,
    magasinId: number,
    produitId: number,
  ) {
    const stockInitial = this.getStockInitial(
      produitId,
      magasinId,
      new Date(dateDebut.getTime() - 1),
      stocks,
      mouvements,
    );

    const startDate = this.resetTime(dateDebut);
    const endDate = this.resetTime(dateFin);

    const mouvementsFiltres = mouvements.filter((mvt) => {
      const mouvementDate = this.resetTime(new Date(mvt.dateMouvement));

      return (
        mvt.produitId === produitId &&
        (magasinId === -1 || mvt.magasinId === magasinId) &&
        mouvementDate >= startDate &&
        mouvementDate <= endDate
      );
    });

    //Regrouper les entrées et sorties
    const entrees = mouvementsFiltres
      .filter((mvt) => mvt.typeMouvement === 'Entree')
      .reduce((total, mvt) => total + mvt.quantite, 0);

    const sorties = mouvementsFiltres
      .filter((mvt) => mvt.typeMouvement === 'Sortie')
      .reduce((total, mvt) => total + mvt.quantite, 0);

    //Calcul du stock final
    const stockFinal = stockInitial + entrees - sorties;

    //Calcul des valeurs du stock
    const valeurStockInitial = stockInitial * dernierPrixAchat;
    const valeurStockFinal = stockFinal * dernierPrixAchat;

    //Calcul du stock moyen
    const stockMoyen = (stockInitial + stockFinal) / 2;

    //Calcul du taux de rotation
    const tauxRotation = stockMoyen > 0 ? sorties / stockMoyen : 0;

    return {
      stockInitial,
      valeurStockInitial,
      entrees,
      sorties,
      stockFinal,
      valeurStockFinal,
      tauxRotation,
    };
  }

  //Méthode pour calculer le stock initial
  private static getStockInitial(
    produitId: number,
    magasinId: number,
    dateDebut: Date,
    stocks: Stock[],
    mouvements: MouvementsStock[],
  ): number {
    const dateDebutReset = this.resetTime(dateDebut);

    if (magasinId !== -1) {
      //Calcul pour un magasin spécifique
      const stockEnregistre = stocks
        .filter((stock) => stock.produitId === produitId && stock.magasinId === magasinId)
        .sort((a, b) => b.dateDerniereMiseAJour.getTime() - a.dateDerniereMiseAJour.getTime())
        .find((stock) => this.resetTime(stock.dateDerniereMiseAJour) <= dateDebutReset);

      if (stockEnregistre) {
        return stockEnregistre.quantiteDisponible;
      }

      //Calcul via les mouvements
      const totalEntrees = mouvements
        .filter(
          (mvt) =>
            mvt.produitId === produitId &&
            mvt.magasinId === magasinId &&
            this.resetTime(mvt.dateMouvement) <= dateDebutReset &&
            mvt.typeMouvement === 'Entree',
        )
        .reduce((total, mvt) => total + mvt.quantite, 0);

      const totalSorties = mouvements
        .filter(
          (mvt) =>
            mvt.produitId === produitId &&
            mvt.magasinId === magasinId &&
            this.resetTime(mvt.dateMouvement) <= dateDebutReset &&
            mvt.typeMouvement === 'Sortie',
        )
        .reduce((total, mvt) => total + mvt.quantite, 0);

      return totalEntrees - totalSorties;
    }

    //Cas où tous les magasins sont pris en compte
    const stockTotal = stocks
      .filter((stock) => stock.produitId === produitId)
      .reduce((total, stock) => total + stock.quantiteDisponible, 0);

    const totalEntreesGlobales = mouvements
      .filter(
        (mvt) =>
          mvt.produitId === produitId &&
          this.resetTime(mvt.dateMouvement) <= dateDebutReset &&
          mvt.typeMouvement === 'Entree',
      )
      .reduce((total, mvt) => total + mvt.quantite, 0);

    const totalSortiesGlobales = mouvements
      .filter(
        (mvt) =>
          mvt.produitId === produitId &&
          this.resetTime(mvt.dateMouvement) <= dateDebutReset &&
          mvt.typeMouvement === 'Sortie',
      )
      .reduce((total, mvt) => total + mvt.quantite, 0);

    return stockTotal + totalEntreesGlobales - totalSortiesGlobales;
  }
  // Méthode pour calculer les statistiques globales pour tous les produits
  public static calculerStatistiquesGlobaux(
    mouvements: MouvementsStock[],
    stocks: Stock[],
    dateDebut: Date,
    dateFin: Date,
    magasinId: number,
  ) {
    // Regrouper les mouvements par produit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const produitsStatistiques: Record<number, any> = {};

    // Filtrer les mouvements entre les dates spécifiées
    const mouvementsFiltres = mouvements.filter((mvt) => {
      const mouvementDate = this.resetTime(new Date(mvt.dateMouvement));
      return (
        (magasinId === -1 || mvt.magasinId === magasinId) &&
        mouvementDate >= this.resetTime(dateDebut) &&
        mouvementDate <= this.resetTime(dateFin)
      );
    });

    // Calculer les statistiques pour chaque produit
    mouvementsFiltres.forEach((mvt) => {
      const produitId = mvt.produitId;

      if (!produitsStatistiques[produitId]) {
        produitsStatistiques[produitId] = {
          stockInitial: 0,
          valeurStockInitial: 0,
          entrees: 0,
          sorties: 0,
          stockFinal: 0,
          valeurStockFinal: 0,
          tauxRotation: 0,
        };
      }

      const produitStatistiques = produitsStatistiques[produitId];

      // Trouver le dernier prix d'achat du produit
      const produit = stocks.find((p) => p.id === produitId);
      const dernierPrixAchat = produit ? (produit.dernierPrixAchat ?? 0) : 0;

      // Calcul du stock initial pour chaque produit
      const stockInitial = this.getStockInitial(
        produitId,
        magasinId,
        new Date(dateDebut.getTime() - 1),
        stocks,
        mouvements,
      );

      produitStatistiques.stockInitial += stockInitial;
      produitStatistiques.valeurStockInitial += stockInitial * dernierPrixAchat;
      //produitStatistiques.stockFinal += stockFinal;
      //produitStatistiques.valeurStockFinal += stockFinal * dernierPrixAchat;
      produitStatistiques.entrees += mvt.typeMouvement === 'Entree' ? mvt.quantite : 0;
      produitStatistiques.sorties += mvt.typeMouvement === 'Sortie' ? mvt.quantite : 0;
      // Maintenant recalculer le stockFinal
      const stockFinal = stockInitial + produitStatistiques.entrees - produitStatistiques.sorties;
      produitStatistiques.stockFinal = stockFinal;
      // Mettre à jour la valeur du stock final
      produitStatistiques.valeurStockFinal = stockFinal * dernierPrixAchat;

      // Calcul du taux de rotation
      const stockMoyen = (produitStatistiques.stockInitial + produitStatistiques.stockFinal) / 2;
      produitStatistiques.tauxRotation =
        stockMoyen > 0 ? produitStatistiques.sorties / stockMoyen : 0;
    });

    // Calcul des totaux globaux pour tous les produits
    let totalEntrees = 0;
    let totalSorties = 0;
    let totalValeurStockInitial = 0;
    let totalValeurStockFinal = 0;
    let totalStockInitial = 0;
    let totalStockFinal = 0;

    for (const produitId in produitsStatistiques) {
      const statsProduit = produitsStatistiques[produitId];
      totalEntrees += statsProduit.entrees;
      totalSorties += statsProduit.sorties;
      totalValeurStockInitial += statsProduit.valeurStockInitial;
      totalValeurStockFinal += statsProduit.valeurStockFinal;
      totalStockInitial += statsProduit.stockInitial;
      totalStockFinal += statsProduit.stockFinal;
    }

    return {
      totalEntrees,
      totalSorties,
      totalValeurStockInitial,
      totalValeurStockFinal,
      totalStockInitial,
      totalStockFinal,
      tauxRotation: totalStockFinal > 0 ? totalSorties / totalStockFinal : 0,
    };
  }
}

export class Reconciliation {
  id?: number;
  produitId!: number;
  stockTheorique!: number;
  stockPhysique!: number;
  private _ecart!: number; // Stocke l'écart interne
  dateReconciliation!: Date;
  responsable?: number; // Personne ayant effectué la réconciliation
  note?: string; // Explication de l'écart
  historiqueEcart?: { date: Date; ecart: number; note?: string }[] = []; // Historique des écarts

  constructor(data?: Partial<Reconciliation>) {
    Object.assign(this, data);

    //S'assurer que `dateReconciliation` est bien une instance de Date
    if (typeof this.dateReconciliation === 'string') {
      this.dateReconciliation = new Date(this.dateReconciliation);
    }

    this._ecart = this.calculerEcart(); // Utilisation correcte
    //this.ajouterHistorique("Initialisation de l'écart");
  }

  //  Getter pour `ecart`
  get ecart(): number {
    return this._ecart;
  }

  //  Setter pour `ecart
  set ecart(value: number) {
    this._ecart = value;
  }

  //  Calcul automatique de l'écart
  private calculerEcart(): number {
    return (this.stockPhysique ?? 0) - (this.stockTheorique ?? 0);
  }

  // Ajouter un écart au suivi historique
  /* ajouterHistorique(note?: string): void {
    this.historiqueEcart?.push({
      date: new Date(),
      ecart: this._ecart,
      note,
    });
  } */

  //Transformer un objet brut en instance de `Reconciliation`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromRaw(data: any): Reconciliation {
    return new Reconciliation({
      id: data.id,
      produitId: data.produitId,
      stockTheorique: data.stockTheorique,
      stockPhysique: data.stockPhysique,
      dateReconciliation: new Date(data.dateReconciliation),
      responsable: data.responsable,
      note: data.note,
      historiqueEcart:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.historiqueEcart?.map((h: any) => ({
          date: new Date(h.date),
          ecart: h.ecart,
          note: h.note,
        })) || [],
    });
  }
}

export class AnalyseEcart {
  produitId!: number;
  ecartTotal!: number;
  dernierEcart!: Date;
  nombreReconciliations?: number;
  moyenneEcart?: number;
  tauxCorrection?: number;
  ecartsDetail?: { date: Date; ecart: number; corrige?: boolean }[];

  constructor(data?: Partial<AnalyseEcart>) {
    Object.assign(this, data);

      //Mettre à jour automatiquement corrige
    this.mettreAJourCorrections();

    this.moyenneEcart = this.calculerMoyenneEcart();
    this.tauxCorrection = this.calculerTauxCorrection();
  }

  private calculerMoyenneEcart(): number {
    if (!this.ecartsDetail || this.ecartsDetail.length === 0) return 0;
    const total = this.ecartsDetail.reduce((sum, item) => sum + Math.abs(item.ecart), 0);
    return total / this.ecartsDetail.length;
  }

  private calculerTauxCorrection(): number {
    if (!this.ecartsDetail || this.ecartsDetail.length === 0) return 0;
    const corriges = this.ecartsDetail.filter((item) => item.corrige).length;
    return (corriges / this.ecartsDetail.length) * 100;
  }

  // Met à jour la propriété corrige selon l’écart
  mettreAJourCorrections(): void {
    if (!this.ecartsDetail) return;
    this.ecartsDetail = this.ecartsDetail.map((item) => ({
      ...item,
      corrige: item.ecart === 0,
    }));
  }
  // Ajout d'une méthode statique pour convertir un objet brut en instance de la classe
  /* static fromRaw(data: any): AnalyseEcart {
    return new AnalyseEcart({
      produitId: data.produitId,
      ecartTotal: data.ecartTotal,
      dernierEcart: new Date(data.dernierEcart),
      nombreReconciliations: data.nombreReconciliations,
      ecartsDetail: data.ecartsDetail
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.ecartsDetail.map((item: any) => ({
            date: new Date(item.date),
            ecart: item.ecart,
            corrige: item.corrige,
          }))
        : [],
    });
  } */

    //Conversion objet brut → instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromRaw(data: any): AnalyseEcart {
    const instance = new AnalyseEcart({
      produitId: data.produitId,
      ecartTotal: data.ecartTotal,
      dernierEcart: new Date(data.dernierEcart),
      nombreReconciliations: data.nombreReconciliations,
      ecartsDetail: data.ecartsDetail
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.ecartsDetail.map((item: any) => ({
            date: new Date(item.date),
            ecart: item.ecart,
            corrige: item.corrige, // sera recalculé par mettreAJourCorrections()
          }))
        : [],
    });

    //S’assurer que corrige est bien recalculé
    instance.mettreAJourCorrections();

    return instance;
  }
}
