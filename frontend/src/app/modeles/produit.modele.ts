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

  export class Produits {
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

    constructor(data?: Partial<Produits>) {
      Object.assign(this, data);
    }
  }