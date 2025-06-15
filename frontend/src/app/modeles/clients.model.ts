import { Bon } from "./bon.model";
import { Operation } from "./operation.model";
import { Paiement } from "./paiement.model";
import { Panier } from "./panier.model";

export class Client {
  id?: number;
  code_structure?:string;
  nomComplet!: string;
  email?: string;
  telephone?: string;
  adresse!: string;
  dateCreation?: Date ;
  dateMiseAJour?: Date;
  solde: number = 0;
  montantANousPayer?:number;
  estEmploye: boolean = false;
  plafond?: number;
  statut?: boolean;
  magasinId?:number;

  // Relations
  bons: Bon[] = [];
  paiements: Paiement[] = [];
  operations: Operation[] = [];
  paniers: Panier[] = [];

  constructor(data?: Partial<Client>) {
    Object.assign(this, data);
  }
}
