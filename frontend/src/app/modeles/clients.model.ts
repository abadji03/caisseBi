import { Bon } from './bon.model';
import { Magasin } from './magasin.model';
import { Operation } from './operation.model';
import { Paiement } from './paiement.model';
import { Panier } from './panier.model';

export class Client {
  id?: number;
  code_structure?: string;
  nomComplet!: string;
  email?: string;
  telephone?: string;
  adresse!: string;
  dateCreation?: Date;
  dateMiseAJour?: Date;
  solde = 0;
  montantANousPayer?: number;
  estEmploye = false;
  plafond?: number;
  statut?: boolean;
  magasinId?: number;

  Magasins?: Magasin[]; // Nouveau: liste des magasins associés

  // Relations
  bons: Bon[] = [];
  paiements: Paiement[] = [];
  operations: Operation[] = [];
  paniers: Panier[] = [];

  constructor(data?: Partial<Client>) {
    Object.assign(this, data);
  }
}

export interface MagasinClient {
  id: number;
  magasinId: number;
  clientId: number;
  solde: number;
  createdAt?: Date;
  updatedAt?: Date;
}