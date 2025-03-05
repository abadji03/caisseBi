export class Transfert {
    id?: number;
    reference!: string; // Identifiant unique du transfert
    produitId!: number; // Produit transféré
    quantite!: number; // Quantité transférée
    magasinSource!: number; // Magasin d'origine
    magasinDestination!: number; // Magasin de destination
    dateTransfert!: Date; // Date du transfert
    statut!: 'En attente' | 'Validé' | 'Refusé'; // Statut du transfert
    motif?: string; // Motif du transfert (optionnel)
    agentResponsable!: number; // Personne qui effectue le transfert
    dateValidation?: Date; // Date de validation du transfert
    agentValidation?: number; // Personne qui valide le transfert

    constructor(data?: Partial<Transfert>) {
      Object.assign(this, data);
    }
  }
