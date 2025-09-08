export class Depense {
  id?: number;
  date: Date = new Date();
  categoryId!: number;
  montant = 0;
  type: 'STANDARD' | 'STOCK' = 'STANDARD';
  description = '';
  paymentMode!: string;
  receipt?: string; // URL du fichier justificatif
  magasinId?: number;

  constructor(data?: Partial<Depense>) {
    Object.assign(this, data);
  }
}

export class Recette {
  id?: number;
  date: Date = new Date();
  categoryId!: number;
  montant = 0;
  description = '';
  paymentMode!: string;
  receipt?: string; // URL du fichier justificatif
  magasinId?: number;

  constructor(data?: Partial<Recette>) {
    Object.assign(this, data);
  }
}

export class Categorie {
  id?: number;
  name = '';
  description?: string;
  type: 'DEPENSE' | 'RECETTE' = 'DEPENSE';
  isActive = true;

  constructor(data?: Partial<Categorie>) {
    Object.assign(this, data);
  }
}
