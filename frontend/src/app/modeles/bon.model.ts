import { User } from '@sentry/angular';
import { Operation } from './operation.model';
import { Panier } from './panier.model';

export class Bon {
  id?: number;
  numero!: string;
  numeroFacture?: string;
  code_structure!:string;
  type!: 'livraison' | 'commande' | 'retour' | 'avoir';
  description!: string;
  typeEntite!:'client' | 'fournisseur';
  montantTotal!: number;
  montantAvoir?: number;
  remise?: number;
  netAPayer?: number;
  magasinId!:number;
  avance ?: number;
  resteAPayer?: number;
  dateBon: Date = new Date();
  statutBon?:
    | 'brouillon'
    | 'livré'
    | 'validé'
    | 'retourné'
    | 'facturé'
    | 'annulé';
  motifsRetour?: string;
  fichier?: string; // URL ou base64
  numeroBonOrigine?: string; // Pour les retours et avoirs
  // Relations
  fournisseurId?: number; // Si c'est un bon fournisseur
  clientId?: number; // Si c'est un bon client
  agentId?: number;
  user?:User;
  //produits: Produits[] = [];
  operations: Operation[] = [];
  Panier?: Panier
  panier?: Panier /* {
    produits: Produits[];
    totalHT: number;
    tva: number;
    totalTTC: number;
  }; */

  constructor(data?: Partial<Bon>) {
    Object.assign(this, data);
  }
}

export interface BonAvecFichier {
  bon: Bon;
  fichier: File | null;
  onSuccess?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error?: any) => void;
}
