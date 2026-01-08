import { User } from '@sentry/angular';
import { Operation } from './operation.model';
import { Panier } from './panier.model';

export class Bon {

  id?: number;

  // Identification
  numero!: string;
  numeroFacture?: string;
  dateBon: Date = new Date();

  // Structure & entité
  code_structure!: string;
  type!: 'commande' | 'livraison' | 'retour' | 'avoir' | 'vente' | 'achat';
  typeEntite!: 'client' | 'fournisseur'|'autre';
  clientId?: number;
  fournisseurId?: number;
  magasinId?: number;

  methodePaiement?: 'Espèce' | 'Carte' | 'Orange Money'| 'Wave' | 'Chèque' | 'Virement' | 'Autre';

  // Descriptions & documents
  description?: string;
  fichier?: string;

  // Références croisées
  numeroBonOrigine?: string; // retours + avoir
  referenceExterne?: string;

  // Statut du bon
  statutBon!: 'brouillon' | 'validé' | 'livré' | 'retourné' | 'facturé' | 'annulé';

  // Retours & Avoirs
  motifsRetour?: string;
  montantAvoir?: number;

  // Montants financiers
  montantTotal = 0;
  remise = 0;
  avance = 0;
  netAPayer = 0;
  resteAPayer = 0;

  // Paiement
  conditionsPaiement?: string;
  delaiPaiement?: number;

  // Logistique
  dateLivraisonPrevue?: Date;
  dateLivraisonReelle?: Date;
  pointLivraison?: string;
  transporteur?: string;

  // Relations
  agentId?: number;
  user?: User;
  panier?: Panier;
  Panier?: Panier
  operations: Operation[] = [];


  constructor(data?: Partial<Bon>) {
    Object.assign(this, data);
    this.dateBon = data?.dateBon ? new Date(data.dateBon) : new Date();
  }
}

export interface BonAvecFichier {
  bon: Bon;
  fichier: File | null;
  onSuccess?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error?: any) => void;
}
