import { Operation } from './operation.model';
import { Produits } from './produit.modele';

export class Bon {
  id?: number;
  numero!: string;
  numeroFacture?: string;
  type!: 'Livraison' | 'Commande' | 'Retour' | 'Avoir';
  description!: string;
  montantTotal!: number;
  remise?: number;
  netAPayer!: number;
  resteAPayer!: number;
  dateBon: Date = new Date();
  statutBon?:
    | 'brouillon'
    | 'commandé'
    | 'expédié'
    | 'livré'
    | 'validé'
    | 'retourné'
    | 'facturé'
    | 'payé'
    | 'annulé';
  motifsRetour?: string;
  fichier?: string; // URL ou base64

  // Relations
  fournisseurId?: number; // Si c'est un bon fournisseur
  clientId?: number; // Si c'est un bon client
  agentId?: number;
  //produits: Produits[] = [];
  operations: Operation[] = [];
  panier?: {
    produits: Produits[];
    totalHT: number;
    tva: number;
    totalTTC: number;
  };

  constructor(data?: Partial<Bon>) {
    Object.assign(this, data);
  }
}
