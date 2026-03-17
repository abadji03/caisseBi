// paiement.model.ts

import { Client } from "./clients.model";
import { Fournisseur } from "./fournisseur.model";
import { Magasin } from "./magasin.model";
import { User } from "./user.model";

// paiement.mapping.ts
export const METHODE_VERS_COMPTE: Record<
  Paiement['methodePaiement'],
  Paiement['compte']
> = {
  'Espèce': 'Caisse',
  'Carte': 'Banque',
  'Orange Money': 'Mobile Money',
  'Wave': 'Mobile Money',
  'Chèque': 'Banque',
  'Virement': 'Banque',
  'Autre': 'Caisse',
};

export class Paiement {
  id?: number;
  numero?: string;
  description = '';
  montant = 0;
  code_structure?:string;
  //remise?: number;
  //net_a_payer?: number;
  //avance?: number;
  //reste?: number;
  compte: 'Bon' | 'Caisse' | 'Mobile Money' | 'Banque' = 'Caisse';
  date: Date = new Date();
  methodePaiement:  'Espèce' | 'Carte' | 'Orange Money'| 'Wave' | 'Chèque' | 'Virement' | 'Autre' = 'Espèce'; // Changé de number à string pour correspondre aux options
  clientId?: number;
  fournisseurId?: number;
  //typeEntite!:'client' | 'fournisseur';
  bonId?: number;
  dateMiseAJour?: Date;
  panierId?: number;
  agentId?:number;
  typePaiement: 'fournisseur' | 'client' | 'autre' = 'client';
  magasinId?: number;
  user?:User;
  Magasin?:Magasin;
  fichier?: string;
  fichierFile?: File; // Pour gérer le fichier uploadé
  statutPaiement?: 'validé' | 'annulé' = 'validé';

  Fournisseur?:Fournisseur;
  Client?:Client;


  constructor(data?: Partial<Paiement>) {
    if (data) {
      Object.assign(this, data);
       // ⚠️ Sécurité : recalcul automatique
      if (this.methodePaiement) {
        this.compte = METHODE_VERS_COMPTE[this.methodePaiement];
      }
    }
  }
  setMethodePaiement(methode: Paiement['methodePaiement']) {
    this.methodePaiement = methode;
    this.compte = METHODE_VERS_COMPTE[methode];
  }
}

export class ModePaiement {
  id?: number;
  libelle: 'Espèce' | 'Carte' | 'Orange Money'| 'Wave' | 'Chèque' | 'Virement' | 'Autre' = 'Espèce';

  constructor(data?: Partial<ModePaiement>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

export interface PaiementAvecFichier {
  paiement: Paiement;
  fichier: File | null;
  onSuccess?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error?: any) => void;
}