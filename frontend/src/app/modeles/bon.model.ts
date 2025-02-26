import { Operation } from "./operation.model";
import { Produits } from "./produit.modele";

export class Bon {
  id?: number;
  numero!: string;
  numeroFacture?: string;
  type!: 'Livraison' | 'Commande' | 'Retour' | 'Avoir';
  description!: string;
  montant: number = 0;
  dateBon: Date = new Date();
  statusBon?: 'Payé' | 'Impayé' | 'Annulé';
  motifsRetour?: string;
  fichier?: string; // URL ou base64

  // Relations
  fournisseurId?: number; // Si c'est un bon fournisseur
  clientId?: number; // Si c'est un bon client
  agentId?: number;
  produits: Produits[] = [];
  operations: Operation[] = [];

  constructor(data?: Partial<Bon>) {
    Object.assign(this, data);
  }
}
