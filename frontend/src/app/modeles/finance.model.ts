export class Depense {
  id?: number;
  date: Date = new Date();
  categoryId!: number;
  statutDepense?: 'validé' | 'annulé' = 'validé';
  paiementId?: number;
  montant = 0;
  type: 'STANDARD' | 'STOCK'|'FRAIS'|'INVESTISSEMENT' = 'STANDARD';
  description = '';
  paymentMode!: string;
  receipt?: string; // URL du fichier justificatif
  magasinId?: number;

  constructor(data?: Partial<Depense>) {
    Object.assign(this, data);
  }
}

export class Recette {
  id?: number;
  date: Date = new Date();
  statutRecette?:'validé' | 'annulé' = 'validé';
  paiementId?: number;
  categoryId!: number;
  montant = 0;
  description = '';
  paymentMode!: string;
  receipt?: string; // URL du fichier justificatif
  magasinId?: number;

  constructor(data?: Partial<Recette>) {
    Object.assign(this, data);
  }
}

export class Categorie {
  id?: number;
  name!: string ;
  description?: string;
  type: 'DEPENSE' | 'RECETTE' = 'DEPENSE';
  isActive = true;
  code_structure?: string;

  constructor(data?: Partial<Categorie>) {
    Object.assign(this, data);
  }
}
// Interfaces pour les types de données
export interface IndicateursFinanciers {
  niveau: string;
  periode: string;
  dateDebut?: Date;
  dateFin?: Date;
  chiffreAffaires: number;
  nbVentes: number;
  autresRecettes: number;
  nbAutresRecettes: number;
  totalDepenses: number;
  nbDepenses: number;
  beneficeNet: number;
  soldeTresorerie: number;
  evolutionCA: {
    pourcentage: number;
    tendance: 'hausse' | 'baisse' | 'stable';
  };
  periodePrecedenteCA: number;
  fluxTresorerie: {
    soldeInitial: number;
    recettesPeriod: number;
    depensesPeriod: number;
    soldeFinal: number;
  };
  tendances: {
    evolutionCA: { valeur: number; tendance: '↑' | '↓' | '→' };
    evolutionBenefices: { valeur: number; tendance: '↑' | '↓' | '→' };
    evolutionCouts: { valeur: number; tendance: '↑' | '↓' | '→' };
  };
}

export interface CategorieRepartition {
  categorieId: number;
  categorieName: string;
  montantTotal: number;
  occurrences: number;
  pourcentage: number;
}

export interface RepartitionDepenses {
  niveau: string;
  periode: string;
  totalDepenses: number;
  repartition: CategorieRepartition[];
}

export interface RepartitionRecettes {
  niveau: string;
  periode: string;
  totalRecettes: number;
  repartition: CategorieRepartition[];
}

export interface ModePaiementStat {
  mode: string;
  montantTotal: number;
  occurrences: number;
  pourcentage: number;
}

export interface ModesPaiementStats {
  niveau: string;
  periode: string;
  totalTransactions: number;
  modesPaiement: ModePaiementStat[];
}

export interface TransactionDetail {
  id: number;
  date: Date;
  montant: number;
  description: string;
  paymentMode: string;
  categorie: {
    id: number;
    name: string;
  } | null;
  magasinId?: number;
  agentId?: number;
}

export interface TransactionsResponse {
  niveau: string;
  periode: string;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  depenses?: TransactionDetail[];
  recettes?: TransactionDetail[];
}

export interface DonneeEvolutive {
  periode: string;
  recettes: number;
  nbRecettes: number;
  depenses: number;
  nbDepenses: number;
  benefice: number;
}

export interface DonneesEvolutivesResponse {
  niveau: string;
  periode: string;
  groupBy: string;
  donnees: DonneeEvolutive[];
}

export interface DonneeComparative {
  periode: string;
  libelle: string;
  debut: Date;
  fin: Date;
  chiffreAffaires: number;
  nbVentes: number;
  autresRecettes: number;
  nbAutresRecettes: number;
  totalDepenses: number;
  nbDepenses: number;
  beneficeNet: number;
  soldeTresorerie: number;
  fluxTresorerie: {
    soldeInitial: number;
    recettesPeriod: number;
    depensesPeriod: number;
    soldeFinal: number;
  };
}

export interface DonneesComparativesResponse {
  niveau: string;
  periodeBase: string;
  nombrePeriodes: number;
  donneesPeriodes: DonneeComparative[];
}