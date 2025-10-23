import { User } from "@sentry/angular";
import { Panier } from "./panier.model";

export class Operation {
  id?: number;
  clientId?: number;
  fournisseurId?: number;
  agentId?: number;
  bonId?: number;
  paiementId?: number;

  type?: string; //'COMMANDE' | 'VERSEMENT' | 'FACTURE' | 'TICKET_CAISSE' | 'RETOUR' | 'AVOIR' | 'LIVRAISON';

  montantPaye!: number;

  moyenPaiement?: 'ESPECES' | 'MOBILE_MONEY' | 'CARTE_BANCAIRE' | 'VIREMENT' | 'CHEQUE';

  panier?:Panier;
  Panier?:Panier 
  user?:User

  numeroBon?: string;
  numeroFacture?: string;
  numeroTicket?: string;
  numeroAvoir?: string;
  numeroVersement?: string;
  numeroRetour?: string;

  statut!: 'PAYE' | 'PARTIELLEMENT_PAYE' | 'IMPAYE' | 'ANNULE';

  dateOperation: Date = new Date();
  commentaire?: string;

  constructor(data?: Partial<Operation>) {
    Object.assign(this, data);
  }
}
