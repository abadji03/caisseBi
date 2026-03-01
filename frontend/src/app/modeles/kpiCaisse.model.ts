/* eslint-disable @typescript-eslint/no-explicit-any */

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

//..................KPI RAPPORT STOCK..................................
export interface IndicateursStocks {
  niveau: string;
  periode: string;
  dateDebut: Date;
  dateFin: Date;
  totalProduits: number;
  produitsUniques: number;
  produitsEnAlerte: number;
  produitsRupture: number;
  produitsEnSurStock: number;
  produitsAReapprovisionner: number;
  produitsPerissable: number;
  valeurStockInitial: number;
  valeurStockFinal: number;
  valeurStockInitialVente: number;
  valeurStockFinalVente: number;
  produitsNormaux:number;
  totalProduitsVendus:number;        
  totalEntrees : number;              
  totalSorties : number; 
}

export interface StatistiqueProduit {
  produitId: number;
  produit: {
    id: number;
    designation: string;
    categorieId: number;
    categorie?: string;
    unite: string;
    perissable: boolean;
  };
  prixAchat: number;
  prixVente: number;
  stockInitial: number;
  valeurStockInitial: number;
  entrees: number;
  sorties: number;
  stockFinal: number;
  valeurStockFinal: number;
  tauxRotation: number;
  statut: string;
  seuilAlerte: number;
  seuilReapprovisionnement: number;
  datePeremption?: Date;
}

export interface StatsProduitsResponse {
  niveau: string;
  periode: string;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  produits: StatistiqueProduit[];
}

export interface MouvementsResponse {
  niveau: string;
  periode: string;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  mouvements: MouvementStock[];
}

export interface EvolutionStock {
  date: string;
  entrees: number;
  sorties: number;
  solde: number;
}

export interface RepartitionCategorie {
  categorie: string;
  quantite: number;
  nombreProduits: number;
}

export interface TopProduitVendu {
  produitId: number;
  designation: string;
  famille: string;
  quantiteVendue: number;
  totalSorties: number;
}

export interface StatsGraphiquesResponse {
  niveau: string;
  periode: string;
  evolution: EvolutionStock[];
  repartitionCategories: RepartitionCategorie[];
  topProduits: TopProduitVendu[];
}

export interface ProduitSpecifique {
  produitId: number;
  designation: string;
  magasinId: number;
  quantite: number;
  seuilAlerte: number;
  seuilReapprovisionnement: number;
  datePeremption?: Date;
  dateDerniereMiseAJour: Date;
}

export interface ProduitsSpecifiquesResponse {
  niveau: string;
  periode: string;
  produitsRupture: ProduitSpecifique[];
  produitsAlerte: ProduitSpecifique[];
  produitsAReapprovisionner: ProduitSpecifique[];
  produitsSurStock: ProduitSpecifique[];
  produitsPeremption: ProduitSpecifique[];
  produitsRecents: ProduitSpecifique[];
  produitsRotationLente: ProduitSpecifique[];
}

export interface MouvementStock {
  id: number;
  ref: string;
  produitId: number;
  produit: string;
  magasinId: number;
  magasin: string;
  typeMouvement: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  dateMouvement: Date;
  description: string;
  acteurId: number;
  acteur: string;
}
export interface RapportCompletStocksResponse {
  niveau: string;
  periode: string;
  dateGeneration: Date;
  indicateurs: IndicateursStocks;
  produits: {
    items: StatistiqueProduit[];
    total: number;
    page: number;
    totalPages: number;
  };
  mouvements: {
    items: MouvementStock[];
    total: number;
    page: number;
    totalPages: number;
  };
  graphiques: StatsGraphiquesResponse;
  produitsSpecifiques: {
    produitsRupture: number;
    produitsAlerte: number;
    produitsAReapprovisionner: number;
    produitsSurStock: number;
    produitsPeremption: number;
    produitsRecents: number;
    produitsRotationLente: number;
    details: {
      rupture: ProduitSpecifique[];
      alerte: ProduitSpecifique[];
      peremption: ProduitSpecifique[];
    };
  };
}

export interface StatistiquesProduit {
  produit: StatistiqueProduit;
  mouvements: MouvementStock[];
  tendances: {
    evolutionJournaliere: { date: string; quantite: number }[];
    saisonnalite: string;
    recommandations: string[];
  };
}

/* export interface DonneesRapport {
  indicateurs: IndicateursStocks | null;
  produits: StatsProduitsResponse | null;
  mouvements: MouvementsResponse | null;
  graphiques: StatsGraphiquesResponse | null;
  produitsSpecifiques: ProduitsSpecifiquesResponse | null;
} */
export interface DonneesRapport {
  indicateurs: IndicateursStocks | null;
  produits: (StatsProduitsResponse & { items: StatistiqueProduit[] }) | null;
  mouvements: (MouvementsResponse & { items: MouvementStock[] }) | null;
  graphiques: StatsGraphiquesResponse | null;
  produitsSpecifiques: ProduitsSpecifiquesResponse | null;
}

//..................................KPI DE VENTE POUR LE RAPPORT ..........................
// À ajouter dans kpiCaisse.model.ts

export interface RapportVenteParams extends KPIParams {
  page?: number;
  limit?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ProduitVendu {
  produit: {
    id: number;
    designation: string;
    prixVenteUnitaire: number;
  };
  quantite: number;
  ca: number;
  marge: number;
  nombreVentes: number;
}

export interface ClientStat {
  client: {
    id: number | null;
    nomComplet: string;
  };
  nbAchats: number;
  ca: number;
  dernierAchat: Date | null;
}

export interface VendeurPerformance {
  vendeur: VendeurInfo;
  nbVentes: number;
  caHT: number;
  caTTC: number;
  ticketMoyen: number;
  //panierMoyen: number;
}

export interface EvolutionParJour {
  date: string;
  nombreVentes: number;
  ca: number;
}

export interface ModePaiementStat {
  mode: string;
  montantTotal: number;
  occurrences: number;
  pourcentage?: number;
}

export interface ArticleVente {
  quantite: number;
  produit: string;
  totalTTC: number;
}

export interface PaiementVente {
  methodePaiement: string;
  montant: number;
  statut: string;
}

export interface VenteDetail {
  id: number;
  dateCreation: Date;
  totalTTC: number;
  totalHT: number;
  statut: string;
  clientId?: number;
  clientNom: string;
  agent: VendeurInfo;
  articles: ArticleVente[];
  nombreArticles: number;
  paiements: PaiementVente[];
}

export interface RapportVenteResponse {
  niveau: 'structure' | 'magasin';
  periode: string;
  dateDebut: Date;
  dateFin: Date;
  dateGeneration: Date;
  
  // KPI principaux
  totalVentes: number;
  chiffreAffairesTTC: number;
  chiffreAffairesHT: number;
  margeBeneficiaire: number;
  ticketMoyen: number;
  panierMoyen: number;
  
  // Évolution
  evolutionCA: {
    valeur: number;
    tendance: '↑' | '↓' | '→';
  };
  evolutionVolume: {
    valeur: number;
    tendance: '↑' | '↓' | '→';
  };
  
  // Données détaillées
  evolutionParJour: EvolutionParJour[];
  statmodesPaiement: ModePaiementStat[];
  topProduits: ProduitVendu[];
  topClients: ClientStat[];
  vendeursPerformance: VendeurPerformance[];
  
  // Détails des ventes avec pagination
  ventes: VenteDetail[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}
export interface VendeurInfo {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}
export interface VendeurDetailsResponse {
  vendeur: VendeurInfo;
  periode: string;
  dateDebut: Date;
  dateFin: Date;
  stats: {
    totalVentes: number;
    chiffreAffairesHT: number;
    chiffreAffairesTTC: number;
    ticketMoyen: number;
    panierMoyen: number;
    topProduits: {
      produit: { id: number; designation: string };
      quantite: number;
      ca: number;
    }[];
    modesPaiement: {
      mode: string;
      montantTotal: number;
      occurrences: number;
    }[];
    evolution?: EvolutionParJour[];
  };
  evolution: EvolutionParJour[];
  ventes: {
    id: number;
    dateCreation: Date;
    totalTTC: number;
    client: string;
    nombreArticles: number;
    paiements: string;
    statut: string;
  }[];
}

export interface ComparaisonOptions {
  value: string;
  label: string;
}

export interface ComparaisonResponse {
  type: 'periode' | 'vendeur' | 'magasin';
  ca1: number;
  ca2: number;
  ventes1: number;
  ventes2: number;
  ticketMoyen1: number;
  ticketMoyen2: number;
}

//.....................Dashboard et overview............................
// Interfaces pour les données du dashboard
export interface DonneesVentesDashboard {
  totalVentes: number;
  nbTransactions: number;
  caTTC: number;
  caHT: number;
  marge: number;
  tauxMarge: number;
  ticketMoyen: number;
  evolutionParJour: any[];
  modesPaiement: any[];
  topProduits: any[];
}

export interface DonneesStockDashboard {
  totalProduits: number;
  produitsUniques: number;
  valeurStockInitial: number;
  valeurStockFinal: number;
  valeurStockInitialVente: number;
  valeurStockFinalVente: number;
  produitsRupture: number;
  produitsEnAlerte: number;
  produitsAReapprovisionner: number;
  produitsEnSurStock: number;
  produitsPerissable: number;
  totalMouvements: number;
  totalEntrees: number;
  totalSorties: number;
  graphique: StatsGraphiquesResponse;
  derniersMouvements: any[];
}

 export interface DonneesFinancieresDashboard {
  ca: number;
  beneficeNet: number;
  tauxMarge: number;
  totalDepenses: number;
  nbDepenses: number;
  totalRecettes: number;
  nbRecettes: number;
  soldeInitial: number;
  soldeFinal: number;
  entrees: number;
  sorties: number;
  evolutionCA: { pourcentage: number; tendance: 'hausse' | 'baisse' | 'stable' };
  evolutionJournaliere: any[];
  topDepenses: any[];
  topRecettes: any[];
  dernieresTransactions: any[];
}