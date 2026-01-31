
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

  caVendu: CAVendu;
  caEncaisse: CAEncaisse;

  ecartCA: number;
}

export interface CAVendu {
  totalVendu: number;
  nombrePaniers: number;
  ticketMoyenVente: number;
}

export interface CAEncaisse {
  totalEncaisse: number;
  nombrePaiements: number;
  ticketMoyenEncaisse: number;
}

// Suppression de KPICaisseStructure (fusionné avec KPICaissePeriode)
export interface PaiementMode {
  methodePaiement: string;
  total: number;
}

export interface ComptePaiement {
  compte: string;
  total: number;
}

export interface EncaissementsResponse {
  niveau: 'structure' | 'magasin';
  periode: string;
  parMethode: PaiementMode[];
  parCompte: ComptePaiement[];
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

export interface CAVendu {
  totalVendu: number;
  nombrePaniers: number;
  ticketMoyenVente: number;
}

export interface CAEncaisse {
  totalEncaisse: number;
  nombrePaiements: number;
  ticketMoyenEncaisse: number;
}

export interface VaCAVendu {
  actuel: number;
  precedent: number;
  variationPourcent: number;
}

export interface VaCAEncaisse {
  actuel: number;
  precedent: number;
  variationPourcent: number;
}
export interface ComparatifCA {
  niveau: 'structure' | 'magasin';
  periode: string;
  vaCAVendu:VaCAVendu;
  vaCAEncaisse : VaCAEncaisse;
}

export interface ComparatifMagasin {
  periode: string;
  structure: number;
  magasin: number;
  partMagasin: number;
}

export interface CADateVendu {
  date: string;
  total: number;
  nombrePaniers: number;
}

export interface CADateEncaisse {
  date: string;
  total: number;
  nombrePaiements: number;
}

export interface CAParJourResponse {
  niveau: 'structure' | 'magasin';
  periode: string;
  debut: string;
  fin: string;
  caVenduParJour: CADateVendu[];
  caEncaisseParJour: CADateEncaisse[];
}
export interface CADailyMerged {
  date: string;
  totalVendu: number;
  totalEncaisse: number;
  nombrePaniers: number;
  nombrePaiements: number;
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

// Interface pour les avoirs
export interface StatsAvoirs {
  montantAvoir: number;
  nombreAvoirs: number;
}

// Interface pour les ventes à crédit
export interface StatsVentesCredit {
  niveau: 'structure' | 'magasin';
  periode: string;
  montantCredit: number;
  nombrePaniersCredit: number;
  nombreBonsCredit: number;
}

// Interface pour les avances
export interface StatsAvances {
  niveau: 'structure' | 'magasin';
  periode: string;
  totalAvances: number;
  nombreAvances: number;
  nombrePaniersAvecAvance: number;
  moyenneAvance: number;
}

// Interface pour les ventes à crédit annulées
export interface RetourDetail {
  numeroRetour: string;
  numeroOrigine: string;
  montantOrigine: number;
  montantRetour: number;
  type: 'total' | 'partiel';
}

export interface StatsVentesCreditAnnulees {
  niveau: 'structure' | 'magasin';
  periode: string;
  totalMontantRetour: number;
  nombreRetours: number;
  nombreRetoursTotaux: number;
  nombreRetoursPartiels: number;
  details: RetourDetail[];
}

// Interface pour les ventes en caisse annulées
export interface StatutDetail {
  montant: number;
  nombre: number;
}

export interface StatsVentesCaisseAnnulees {
  niveau: 'structure' | 'magasin';
  periode: string;
  totalPaniersAnnules: number;
  totalMontantAnnule: number;
  totalPaniersRetournes: number;
  totalMontantRetourne: number;
  totalPaiementsAnnules: number;
  nombrePaiementsAnnules: number;
  totalPaniers: number;
  totalMontant: number;
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  details: {
    [key: string]: StatutDetail;
  };
}

// Interface pour le résumé
export interface ResumeStatistiquesSpeciales {
  totalAvoirs: number;
  totalVentesCredit: number;
  totalAvances: number;
  totalRetours: number;
  totalAnnulations: number;
}

// Interface principale pour toutes les statistiques spéciales
export interface ToutesStatistiquesSpeciales {
  niveau: 'structure' | 'magasin';
  periode: string;
  avoirs: StatsAvoirs;
  ventesCredit: StatsVentesCredit;
  avances: StatsAvances;
  ventesCreditAnnulees: StatsVentesCreditAnnulees;
  ventesCaisseAnnulees: StatsVentesCaisseAnnulees;
  resume: ResumeStatistiquesSpeciales;
}

//Interfaces principales pour les statistiques des commandes
export interface CommandeStats {
  niveau: string;
  periode: string;
  code_structure: string;
  magasinId?: string;
  agentId?: string;
  
  commandesValidees: {
    nombre: number;
    montantTotal: number;
    nombrePaniers: number;
    montantPaniers: number;
  };
  
  commandesLivrees: {
    nombre: number;
    montantTotal: number;
  };
  
  commandesAnnulees: {
    nombre: number;
    montantTotal: number;
  };
  
  commandesRetournees: {
    montantTotal: number;
    nombreTotal: number;
    nombreRetoursTotaux: number;
    nombreRetoursPartiels: number;
    montantRetoursPartiels: number;
    montantRetoursTotaux: number;
    // eslint-disable-next-line @typescript-eslint/array-type
    detailsPartiels: Array<{
      numeroRetour: string;
      numeroOrigine: string;
      montantOrigine: number;
      montantRetour: number;
      type: string;
    }>;
  };
  
  tauxConversion: number;
  tauxAnnulation: number;
  
  synthese: {
    totalCommandes: number;
    montantGlobal: number;
  };
  
  dateDebut: string;
  dateFin: string;
}