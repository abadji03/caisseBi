import { User } from "@sentry/angular";
import { Panier } from "./panier.model";
import { Bon } from "./bon.model";
import { Paiement } from "./paiement.model";

export class Operation {
  id?: number;
  clientId?: number;
  fournisseurId?: number;
  agentId?: number;
  bonId?: number;
  paiementId?: number;
  magasinId?: number;
  code_structure?:string

  type?: string; //'COMMANDE' | 'VERSEMENT' | 'FACTURE' | 'TICKET_CAISSE' | 'RETOUR' | 'AVOIR' | 'LIVRAISON';

  montantPaye!: number;
  resteAPayer?:number;

  moyenPaiement?: string; //'ESPECES' | 'MOBILE_MONEY' | 'CARTE_BANCAIRE' | 'VIREMENT' | 'CHEQUE';

  panier?:Panier;
  Panier?:Panier 
  user?:User
  fichier?:string;
  bon?:Bon;
  Bon?:Bon;
  paiement?: Paiement;
  Paiement?: Paiement;

  numeroBon?: string;
  numeroFacture?: string;
  numeroTicket?: string;
  numeroAvoir?: string;
  numeroVersement?: string;
  numeroRetour?: string;

  statut!: string; // 'PAYE' | 'PARTIELLEMENT_PAYE' | 'IMPAYE' | 'ANNULE';

  dateOperation: Date = new Date();
  commentaire?: string;

  constructor(data?: Partial<Operation>) {
    Object.assign(this, data);
  }
}
export interface OperationsFilters {
  code_structure?: string;
  dateDebut?: string;
  dateFin?: string;
  type?: string;
  statut?: string;
  fournisseurId?: number;
  clientId?: number;
  page?: number;
  limit?: number;
}

export interface OperationsResponse {
  operations: Operation[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface StatsResponse {
  type: string;
  count: number;
  totalMontant: number;
  totalPaye: number;
}