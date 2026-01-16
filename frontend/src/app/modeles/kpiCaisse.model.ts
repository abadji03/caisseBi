
// Interfaces pour typer les réponses
export interface KPICaisse {
  totalCA: number;
  nombrePaniers: number;
  ticketMoyen: number;
}

export interface KPICaissePeriode extends KPICaisse {
  niveau: 'structure' | 'magasin';
  periode: string;
  debut: string;
  fin: string;
}

// Suppression de KPICaisseStructure (fusionné avec KPICaissePeriode)
export interface PaiementMode {
  methodePaiement: string;
  total: number;
}

export interface EncaissementsResponse {
  niveau: 'structure' | 'magasin';
  periode: string;
  paiements: PaiementMode[];
}

export interface StatsRemises {
  totalRemise: number;
  nombrePaniers: number;
}

export interface StatsAvoirs {
  montantAvoir: number;
  nombreAvoirs: number;
}

export interface CaisseTheorique {
  caisseTheorique: number;
  niveau: 'structure' | 'magasin';
}

export interface ComparatifCA {
  niveau: 'structure' | 'magasin';
  periode: string;
  actuel: number;
  precedent: number;
  variationPourcent: number;
}

export interface ComparatifMagasin {
  periode: string;
  structure: number;
  magasin: number;
  partMagasin: number;
}

export interface CADate {
  date: string;
  total: number;
  nombrePaniers: number;
}

export interface CAParJourResponse {
  niveau: 'structure' | 'magasin';
  periode: string;
  debut: string;
  fin: string;
  data: CADate[];
}

export interface StatsMagasin {
  magasinId: number;
  totalCA: number;
  nombrePaniers: number;
  ticketMoyen: number;
  Magasin?: {
    id: number;
    nom: string;
  };
}

export interface StatsStructureParMagasinResponse {
  periode: string;
  debut: string;
  fin: string;
  structure: string;
  stats: StatsMagasin[];
}

// Interface pour les paramètres de requête - code_structure toujours requis
export interface KPIParams {
  periode?: 'jour' | 'semaine' | 'mois' | 'annee';
  dateReference?: string; // Date ISO string
  code_structure: string; // Maintenant obligatoire
  magasinId?: number;
  agentId?: number;
}

// Interface pour les requêtes journalières (code_structure toujours requis)
export interface KPIParamsJournalier {
  code_structure: string; // Obligatoire
  magasinId?: number;
  agentId?: number;
}