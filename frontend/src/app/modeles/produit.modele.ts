export class Produit {
    id : number;
    sku: string;
    nomComplet: string;
    prix: number;
    nomCourt: string;
    description: string;
    quantite: number;
    dateCreation: Date;
    deliveryTimeSpan: string
    categorie: string;
    imageUrl: string;



    constructor(id: number,sku: string, nomComplet: string,
         prix: number,nomCourt: string, description: string, quantite: number,
          date_creation: Date, deliveryTimeSpan: string,
          categorie: string,imageUrl: string) {

      this.id = id;
      this.sku = sku;
      this.nomComplet = nomComplet;
      this.nomCourt = nomCourt;
      this.prix = prix;
      this.description = description;
      this.quantite = quantite;
      this.imageUrl = imageUrl;
      this.dateCreation = date_creation;
      this.categorie = categorie;
      this.deliveryTimeSpan = deliveryTimeSpan;
    }
    /* constructor(public title: string,
      public description: string,
      public imageUrl: string,
      public createdDate: Date,
      public snaps: number,
      public location?: string) {
    } */
  }

/*   export class Produits {
    id?: number;
    famille!: string;
    designation!: string;
    fournisseur!: string;
    magasin!: string ;
    quantite?: number;
    unite?: string;
    prixAchatUnitaire?: number;
    prixTotalAchat?: number;
    prixVenteUnitaire?: number;
    prixTotalVente?: number;
    dateCreation?: Date;
    agent?: string;
    description?: string;
    codeBarre?: string;
    image?: string;
    perissable?:boolean;

    constructor(data?: Partial<Produits>) {
      Object.assign(this, data);
    }
  } */

 /*  export class Produits {
    public id?: number;
    public famille?: string; // Catégorie du produit
    public designation!: string; // Nom du produit
    public fournisseurId?: number; // ID du fournisseur
    public magasinId?: number; // ID du magasin
    public quantite!: number; // Quantité disponible
    public quantiteReservee?: number = 0; // Quantité engagée pour des commandes
    public quantiteDisponible?: number; // Calculée : quantite - quantiteReservee
    public unite?: string; // Unité de mesure (Carton, Pièce, Kg…)
    public prixAchatUnitaire?: number; // Prix d'achat unitaire
    public prixTotalAchat?: number; // Calculé : prixAchatUnitaire * quantite
    public prixVenteUnitaire?: number; // Prix de vente unitaire
    public prixTotalVente?: number; // Calculé : prixVenteUnitaire * quantite
    public marge?: number; // Calculé : prixVenteUnitaire - prixAchatUnitaire
    public dateCreation?: Date = new Date(); // Date d'ajout du produit
    public agent?: string; // Personne qui a ajouté le produit
    public description?: string; // Détails du produit
    public codeBarre?: string; // Code-barres du produit
    public image?: string; // Image du produit
    public perissable?: boolean = false; // Produit périssable ou non
    public datePeremption?: Date; // Date d'expiration si périssable
    public seuilAlerte?: number = 5; // Seuil de stock minimum avant alerte
    public seuilReapprovisionnement?: number = 10; // Déclenche une commande
    public dernierPrixAchat?: number; // Dernier prix d'achat
    public valeurStock?: number; // Calculé : dernierPrixAchat * quantite
    public statutStock?: string = "En stock"; // "En stock", "Rupture", etc.

    constructor(data?: Partial<Produits>) {
      Object.assign(this, data);

       // ⚠️ Ajout de valeurs par défaut pour éviter les erreurs
    this.quantiteReservee = this.quantiteReservee ?? 0;
    this.dateCreation = this.dateCreation ?? new Date();
    this.seuilAlerte = this.seuilAlerte ?? 5;
    this.seuilReapprovisionnement = this.seuilReapprovisionnement ?? 10;
    this.statutStock = this.statutStock ?? "En stock";

    // Calculs automatiques
    this.prixTotalAchat = (this.prixAchatUnitaire || 0) * (this.quantite || 0);
    this.prixTotalVente = (this.prixVenteUnitaire || 0) * (this.quantite || 0);
    this.marge = (this.prixVenteUnitaire || 0) - (this.prixAchatUnitaire || 0);
    this.valeurStock = (this.dernierPrixAchat || 0) * (this.quantite || 0);

    }
  } */

    export class Produits {
      public id: number=0;
      public famille!: string; // Catégorie du produit
      public designation!: string; // Nom du produit
      public fournisseurId?: number; // ID du fournisseur
      public unite!: string; // Unité de mesure (Carton, Pièce, Kg…)
      public prixAchatUnitaire?: number; // Prix d'achat unitaire
      public prixTotalAchat?: number; // Calculé : prixAchatUnitaire * quantite
      public prixVenteUnitaire!: number; // Prix de vente unitaire
      public prixTotalVente?: number; // Calculé : prixVenteUnitaire * quantite
      public marge?: number; // Calculé dynamiquement : prixVenteUnitaire - prixAchatUnitaire
      public perissable?: boolean = false; // Produit périssable ou non
      public description?: string; // Détails du produit
      public codeBarre?: string; // Code-barres du produit
      public image?: string; // Image du produit
      public dateCreation?: Date = new Date(); // Date d'ajout du produit
      public agent?: string; // Personne qui a ajouté le produit
      public dernierPrixAchat?: number; // Dernier prix d'achat connu

      constructor(data?: Partial<Produits>) {
        Object.assign(this, data);
        this.marge = (this.prixVenteUnitaire || 0) - (this.prixAchatUnitaire || 0);
        this.dateCreation = this.dateCreation ?? new Date();


      }
    }

export class CategorieProduits {
  id?:number;
  code_structure!: string;
  nom!:string;
  description?:string;

  constructor(data?: Partial<CategorieProduits>){
    
  }

}