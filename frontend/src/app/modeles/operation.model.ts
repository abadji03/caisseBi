export class Operation {
  id?: number;
  clientId?: number;
  fournisseurId?: number;
  agentId?: number;
  bonId?: number;
  paiementId?: number;

  type?: 'COMMANDE' | 'VERSEMENT' | 'FACTURE' | 'TICKET_CAISSE' | 'RETOUR' | 'AVOIR' | 'LIVRAISON';

  montantPaye!: number;

  moyenPaiement?: 'ESPECES' | 'MOBILE_MONEY' | 'CARTE_BANCAIRE' | 'VIREMENT' | 'CHEQUE';

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
