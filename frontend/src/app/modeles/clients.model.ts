import { Bon } from "./bon.model";
import { Operation } from "./operation.model";
import { Paiement } from "./paiement.model";
import { Panier } from "./panier.model";

export class Client {
  id?: number;
  nomComplet!: string;
  email?: string;
  telephone?: string;
  adresse!: string;
  dateCreation: Date = new Date();
  dateMiseAJour?: Date;
  solde: number = 0;
  estEmploye: boolean = false;
  plafond?: number;
  statut?: boolean;

  // Relations
  bons: Bon[] = [];
  paiements: Paiement[] = [];
  operations: Operation[] = [];
  paniers: Panier[] = [];

  constructor(data?: Partial<Client>) {
    Object.assign(this, data);
  }
}
