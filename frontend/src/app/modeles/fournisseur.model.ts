import { Bon } from "./bon.model";
import { Operation } from "./operation.model";
import { Paiement } from "./paiement.model";

export class Fournisseur {
  id?: number;
  nomComplet!: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  banque?: string;
  numeroCompte?: string;
  dateCreation: Date = new Date();
  statut: boolean = true;
  montantAPayer?: number;
  termePaiement?: string;
  termeLivraison?: string;
  pays?: string;
  ville?: string;
  magasinId?: string;

  // Relations
  bons: Bon[] = [];
  paiements: Paiement[] = [];
  operations: Operation[] = [];

  constructor(data?: Partial<Fournisseur>) {
    Object.assign(this, data);
  }
}
