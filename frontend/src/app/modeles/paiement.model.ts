 // Modèle pour les paiements fournisseurs
 export class Paiement {
    id?: number;
    numero?: string;
    description: string ="";
    montant: number = 0;
    remise?:number;
    net_a_payer?:number;
    avance ?:number;
    reste?:number;
    compte:'Bon'| 'Caisse'| 'Mobile Money'| 'Banque' = 'Caisse';
    date?: Date;
    methodePaiement!: string;
    clientId?: number;
    fournisseurId?: number; // Clé étrangère vers Fournisseur
    bonId?: number;
    dateMiseAJour?: Date;
    fichier?:string;

    constructor(data?: Partial<Paiement>) {
      Object.assign(this, data);
    }
  }
  // Classe pour gérer les modes de paiement
export class ModePaiement {
  id?: number;
  libelle?: 'Espèce' | 'Carte' | 'Mobile Money' | 'Virement';

  constructor(data?: Partial<ModePaiement>) {
    Object.assign(this, data);
  }
}