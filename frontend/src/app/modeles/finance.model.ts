export class Depense {
    id?: number;
    date: Date = new Date();
    categoryId!: number;
    amount: number = 0;
    type: 'STANDARD' | 'STOCK' = 'STANDARD';
    description: string = "";
    paymentMode!: string;
    receipt?: string; // URL du fichier justificatif

    constructor(data?: Partial<Depense>) {
      Object.assign(this, data);
    }
  }

  export class Recette {
    id?: number;
    date: Date = new Date();
    categoryId!: number;
    amount: number = 0;
    description: string = "";
    paymentMode!: string;
    receipt?: string; // URL du fichier justificatif

    constructor(data?: Partial<Recette>) {
      Object.assign(this, data);
    }
  }

  export class Categorie {
    id?: number;
    name: string = "";
    description?:string;
    type: 'DEPENSE' | 'RECETTE' = 'DEPENSE';
    isActive: boolean = true;

    constructor(data?: Partial<Categorie>) {
      Object.assign(this, data);
    }
  }
