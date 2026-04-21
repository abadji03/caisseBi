import { Bon } from './bon.model';
import { Magasin } from './magasin.model';
import { Operation } from './operation.model';
import { Paiement } from './paiement.model';

export class Fournisseur {
  id?: number;
  nomComplet!: string;
  code_structure!: string;
  adresse!: string;
  telephone!: string;
  email!: string;
  banque!: string;
  numeroCompte!: string;
  dateCreation: Date = new Date();
  statut = true;
  montantAPayer?: number;
  termePaiement?: string;
  termeLivraison?: string;
  pays?: string;
  ville?: string;
  magasinId!: string;

  // Relations
  bons: Bon[] = [];
  paiements: Paiement[] = [];
  operations: Operation[] = [];

  Magasins?: Magasin[];
  

  constructor(data?: Partial<Fournisseur>) {
    Object.assign(this, data);
  }
}

export interface MagasinFournisseur {
  id: number;
  magasinId: number;
  fournisseurId: number;
  solde: number;
  createdAt?: Date;
  updatedAt?: Date;
}