/*

export class Stock {
  public id!: number;
  public produitId!: number; // Produit concerné
  public magasinId!: number; // Magasin concerné
  public quantiteTotale!: number; // Quantité totale en stock
  public quantiteReservee: number = 0; // Quantité déjà engagée pour des commandes
  public quantiteDisponible!: number; // Calculée : quantiteTotale - quantiteReservee
  public seuilAlerte: number = 5; // Niveau minimum pour alerte
  public seuilReapprovisionnement: number = 10; // Déclenche une commande d'achat
  public stockSecurite: number = 5; // Quantité tampon pour éviter les ruptures
  public dernierPrixAchat: number = 0; // Dernier coût unitaire d’achat
  public valeurTotaleStock: number = 0; // Calculée : dernierPrixAchat * quantiteTotale
  public uniteStock: string = "Carton"; // Unité de stockage
  public dateDerniereEntree?: Date; // Dernière entrée en stock
  public dateDerniereSortie?: Date; // Dernière sortie de stock
  public statutStock: string = "En stock"; // État du stock ("En stock", "Rupture", etc.)
  public datePeremption?: Date; // Pour les produits périssables
  public dateDerniereMiseAJour: Date = new Date(); // Date de la dernière mise à jour

  constructor(data?: Partial<Stock>) {
    Object.assign(this, data);
    this.quantiteDisponible = (this.quantiteTotale || 0) - this.quantiteReservee;
    this.valeurTotaleStock = (this.dernierPrixAchat || 0) * (this.quantiteTotale || 0);
  }
} */

  export class Stock {
    public id!: number;
    public produitId!: number; // Produit concerné
    public magasinId!: number; // Magasin concerné
    public quantiteTotale!: number; // Quantité totale en stock
    public quantiteReservee: number = 0; // Quantité engagée pour des commandes
    public seuilAlerte: number = 5; // Niveau minimum avant alerte
    public seuilReapprovisionnement: number = 10; // Déclenche une commande d'achat
    public stockSecurite: number = 5; // Quantité tampon pour éviter les ruptures
    public dernierPrixAchat?: number; // Dernier prix d'achat connu
    public datePeremption!: Date; // Pour les produits périssables
    public statutStock: string = "En stock"; // État du stock ("En stock", "Rupture", etc.)
    public dateDerniereMiseAJour: Date = new Date(); // Date de la dernière mise à jour

    // 🔹 Propriétés calculées (non stockées en base)
    public get quantiteDisponible(): number {
      return this.quantiteTotale - this.quantiteReservee;
    }

    public get valeurTotaleStock(): number {
      return (this.dernierPrixAchat || 0) * this.quantiteTotale;
    }

    constructor(data?: Partial<Stock>) {
      Object.assign(this, data);
      this.dateDerniereMiseAJour = new Date();
    }
  }




/* export class MouvementsStock {
  public id!: number;
  public ref!: string; // Référence du mouvement
  public produitId!: number; // Produit concerné
  public magasinId!: number; // Magasin concerné
  public typeMouvement!: "Entree" | "Sortie" | "Ajustement"; // Type de mouvement
  public quantite!: number; // Quantité ajoutée ou retirée
  public prixUnitaire!: number; // Prix unitaire d'achat ou de vente
  public prixTotal!: number; // Calculé : prixUnitaire * quantite
  public acteurId!: number; // Fournisseur (si achat) ou client (si vente)
  public uniteStock: string = "Carton"; // Unité de stockage
  public nombreArticles: number = 1; // Nombre total d’articles
  public description: string = ""; // Détails sur le mouvement
  public dateMouvement: Date = new Date(); // Date du mouvement
  public dateCreation: Date = new Date(); // Date de création de l'enregistrement
  public heureCreation: Date = new Date(); // Heure de création
  public motif?: string; // Raison si ajustement (ex : Perte, Correction)

  constructor(data?: Partial<MouvementsStock>) {
    Object.assign(this, data);
    this.prixTotal = (this.prixUnitaire || 0) * (this.quantite || 0);
  }
}
 */


export class MouvementsStock {
  public id!: number;
  public ref!: string; // Référence unique du mouvement
  public produitId!: number; // Produit concerné
  public magasinId!: number; // Magasin concerné
  public typeMouvement!: "Entree" | "Sortie" | "Transfert"; // Type de mouvement
  public quantite!: number; // Quantité ajoutée ou retirée
  public prixUnitaire!: number; // Prix unitaire d'achat ou de vente
  public acteurId!: number; // Fournisseur (si achat) ou client (si vente)
  public description?: string; // Détails sur le mouvement
  public motif?: string; // Raison si ajustement (ex : Perte, Correction)
  public dateMouvement: Date = new Date(); // Date du mouvement
  public heureMouvement: Date = new Date(); // Heure de création



  // 🔹 Propriétés calculées (non stockées en base)
  public get prixTotal(): number {
    return (this.prixUnitaire || 0) * this.quantite;
  }

  constructor(data?: Partial<MouvementsStock>) {
    if (data) {
      // Exclure prixTotal lors de l'assignation pour éviter l'erreur
      const { prixTotal, ...rest } = data as any;
      Object.assign(this, rest);
    }
  }
}

export class Reconciliation {
  id?: number;
  produitId!: number;
  stockTheorique!: number;
  stockPhysique!: number;
  private _ecart!: number; // Stocke l'écart interne
  dateReconciliation!: Date;
  responsable?: string; // Personne ayant effectué la réconciliation
  note?: string; // Explication de l'écart
  historiqueEcart?: { date: Date; ecart: number; note?: string }[] = []; // Historique des écarts

  constructor(data?: Partial<Reconciliation>) {
    Object.assign(this, data);

    // ✅ S'assurer que `dateReconciliation` est bien une instance de Date
    if (typeof this.dateReconciliation === 'string') {
      this.dateReconciliation = new Date(this.dateReconciliation);
    }

    this._ecart = this.calculerEcart(); // ✅ Utilisation correcte
    this.ajouterHistorique("Initialisation de l'écart");
  }

  // 🔥 Getter pour `ecart`
  get ecart(): number {
    return this._ecart;
  }

  // 🔥 Setter pour `ecart` (met à jour et ajoute à l'historique)
  set ecart(value: number) {
    if (this._ecart !== undefined && this._ecart !== value) { // Si changement de valeur
      this.ajouterHistorique(`Mise à jour de l'écart : ${this._ecart} → ${value}`);
    }
    this._ecart = value;
  }

  // 🔥 Calcul automatique de l'écart
  private calculerEcart(): number {
    return (this.stockPhysique ?? 0) - (this.stockTheorique ?? 0);
  }

  // 🔥 Ajouter un écart au suivi historique
  ajouterHistorique(note?: string): void {
    this.historiqueEcart?.push({
      date: new Date(),
      ecart: this._ecart,
      note,
    });
  }

  // 🔥 Transformer un objet brut en instance de `Reconciliation`
  static fromRaw(data: any): Reconciliation {
    return new Reconciliation({
      id: data.id,
      produitId: data.produitId,
      stockTheorique: data.stockTheorique,
      stockPhysique: data.stockPhysique,
      dateReconciliation: new Date(data.dateReconciliation),
      responsable: data.responsable,
      note: data.note,
      historiqueEcart: data.historiqueEcart?.map((h: any) => ({
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
      const corriges = this.ecartsDetail.filter(item => item.corrige).length;
      return (corriges / this.ecartsDetail.length) * 100;
    }

    // 🔥 Ajout d'une méthode statique pour convertir un objet brut en instance de la classe
    static fromRaw(data: any): AnalyseEcart {
      return new AnalyseEcart({
        produitId: data.produitId,
        ecartTotal: data.ecartTotal,
        dernierEcart: new Date(data.dernierEcart),
        nombreReconciliations: data.nombreReconciliations,
        ecartsDetail: data.ecartsDetail ? data.ecartsDetail.map((item: any) => ({
          date: new Date(item.date),
          ecart: item.ecart,
          corrige: item.corrige
        })) : []
      });
    }
  }



