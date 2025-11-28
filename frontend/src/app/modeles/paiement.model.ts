// paiement.model.ts
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
  typePaiement: 'fournisseur' | 'client' = 'client';
  magasinId?: number;
  fichier?: string;
  fichierFile?: File; // Pour gérer le fichier uploadé

  constructor(data?: Partial<Paiement>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}

export class ModePaiement {
  id?: number;
  libelle!: 'Espèce' | 'Carte' | 'Mobile Money' | 'Virement' | 'Chèque';

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