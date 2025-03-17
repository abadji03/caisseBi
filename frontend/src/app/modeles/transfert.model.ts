export class Transfert {
  public id?: number;
  public reference!: string;
  public produitId!: number;
  public quantite!: number;
  public magasinSource!: number;
  public magasinDestination!: number;
  public dateTransfert!: Date;
  public statut!: "En attente" | "Validé" | "Refusé";
  public motif?: string;
  public agentResponsable!: number;
  public dateValidation?: Date;
  public agentValidation?: number;
  public mouvementSortieId?: number; // ID du mouvement stock associé à la sortie
  public mouvementEntreeId?: number; // ID du mouvement stock associé à l’entrée

  constructor(data?: Partial<Transfert>) {
    Object.assign(this, data);
    this.dateTransfert = data?.dateTransfert ?? new Date(); // Date par défaut si absente
  }
}
