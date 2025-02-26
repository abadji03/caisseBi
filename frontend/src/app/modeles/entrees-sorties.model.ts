export class Entree {
  constructor(
    public id: number,
    public ref: string,
    public produit: number,
    public quantite: number,
    public prix_achatUnite: number,
    public prix_achat_total: number,
    public fournisseur: number,
    public type_entree: string = "Achat", // Valeur par défaut
    public uniteStock: string = "Carton",  // Valeur par défaut
    public nombre_articles: number = 1, // Valeur par défaut
    public description: string = "", // Valeur par défaut
    public dateEntree: Date = new Date(), // Valeur par défaut
    public datereation: Date = new Date(), // Valeur par défaut
    public heureCreation: Date = new Date() // Valeur par défaut
  ) {}
}


export class Sortie {
  constructor(
    public id: number,
    public ref: string,
    public produit: number,
    public quantite: number,
    public prix_venteUnite: number,
    public prix_vente_total: number,
    public fournisseur: number,
    public type_sortie: string = "Vente", // Valeur par défaut
    public uniteStock: string = "Carton",  // Valeur par défaut
    public nombre_articles: number = 1, // Valeur par défaut
    public description: string = "", // Valeur par défaut
    public dateSortie: Date = new Date(), // Valeur par défaut
    public dateCreationSortie: Date = new Date(), // Valeur par défaut
    public heureCreationSortie: Date = new Date() // Valeur par défaut
  ) {}
}
