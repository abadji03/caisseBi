import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  inject,
} from '@angular/core';
import { Chart } from 'chart.js';
import { Chart as ChartJS, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Magasin } from '../../../modeles/magasin.model';
import { Produits } from '../../../modeles/produit.modele';
import { MouvementsStock, Stock } from '../../../modeles/entrees-sorties.model';
import { Transfert } from '../../../modeles/transfert.model';
import {
  categories,
  clients,
  magasins,
  modesPaiement,
  mouvements,
  paniers,
  produits,
  recettes,
  stocks,
  vendeurs,
} from '../../../modeles/donnees_fictives';
import { Categorie, Depense, Recette } from '../../../modeles/finance.model';
import { Panier } from '../../../modeles/panier.model';
import { Client } from '../../../modeles/clients.model';
import { User } from '../../../modeles/user.model';

// Enregistrer les éléments nécessaires dans Chart.js
ChartJS.register(...registerables);

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit, AfterViewInit {
  @ViewChild('ventesChart') ventesChartRef!: ElementRef;
  @ViewChild('paiementsChart') paiementsChartRef!: ElementRef;
  @ViewChild('comparaisonMagasinsChart') comparaisonMagasinsChartRef!: ElementRef;

  // Variables de vue d'ensemble
  valeurTotaleStockAchatInitial = 0; // Calculée dynamiquement
  totalProduits = 0; // Calculé dynamiquement
  produitsEnAlerte = 0; // Calculé dynamiquement
  produitsRupture = 0; // Calculé dynamiquement
  valeurTotaleVenteStockAchatFinal = 0; // Calculé dynamiquement
  produitsPerissable = 0; // Calculé dynamiquement
  produitsUniques = 0; // Calculé dynamiquement
  produitsEnSurStock = 0; // Calculé dynamiquement
  produitsAReapprovisionne = 0; // Calculé dynamiquement
  // Indicateurs clés
  chiffreAffaires = 0;
  totalDepenses = 0;
  autresRecettes = 0;
  beneficeNet = 0;
  nbVentes = 0;
  nbAutresRecettes = 0;
  nbDepenses = 0;
  // Ajoutez dans la section des propriétés
  soldeTresorerie = 0;
  evolutionCA: { pourcentage: number; tendance: 'hausse' | 'baisse' | 'stable' } = {
    pourcentage: 0,
    tendance: 'stable',
  };
  periodePrecedenteCA = 0;
  // Ajoutez dans la section des propriétés
  fluxTresorerie: {
    soldeInitial: number;
    recettesPeriod: number;
    depensesPeriod: number;
    soldeFinal: number;
  } = { soldeInitial: 0, recettesPeriod: 0, depensesPeriod: 0, soldeFinal: 0 };

  tendances: {
    evolutionCA: { valeur: number; tendance: '↑' | '↓' | '→' };
    evolutionBenefices: { valeur: number; tendance: '↑' | '↓' | '→' };
    evolutionCouts: { valeur: number; tendance: '↑' | '↓' | '→' };
  } = {
    evolutionCA: { valeur: 0, tendance: '→' },
    evolutionBenefices: { valeur: 0, tendance: '→' },
    evolutionCouts: { valeur: 0, tendance: '→' },
  };

  // Variables d'état
  today = new Date();
  isAdmin = true; // À remplacer par le vrai check de rôle
  selectedMagasinId = -1;
  periodeActive = '7j';
  periodes = ['24h', '7j', '30j', '90j'];
  alertes: { message: string; lien?: string }[] = [];

  // Variables pour les filtres
  magasins: Magasin[] = [];
  magasinSelectionne: Magasin | null = null;
  filteredProduits: Produits[] = [];
  filteredMouvements: MouvementsStock[] = [];
  allStocks: Stock[] = []; // Tous les stocks de tous les magasins
  allProduits: Produits[] = []; // Tous les produits de tous les magasins
  allMouvements: MouvementsStock[] = []; // Tous les produits de tous les magasins
  allTransferts: Transfert[] = []; // Tous les produits de tous les magasins
  stocks: Stock[] = [];
  allDepenses: Depense[] = [];
  allRecettes: Recette[] = [];
  depensesInitial: Depense[] = [];
  recettesInitial: Recette[] = [];
  filteredDepenses: Depense[] = [];
  filteredRecettes: Recette[] = [];
  allCategories: Categorie[] = [];
  filteredCategories: Categorie[] = [];
  categoriesDepense: Categorie[] = [];
  categoriesRecette: Categorie[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modesPaiement: any[] = [];
  allVentes: Panier[] = [];
  filteredVentes: Panier[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allClients: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vendeurs: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statmodesPaiement: any;

  // Top listes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topProduits: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topClients: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vendeursPerformance: any[] = [];

  triVendeursPar: 'ca' | 'transactions' | 'moyenne' = 'ca';

  // Indicateurs clés
  totalVentes = 0;
  chiffreAffairesHT = 0;
  chiffreAffairesTTC = 0;
  margeBeneficiaire = 0;
  ticketMoyen = 0;
  panierMoyen = 0;
  evolutionVolume: { valeur: number; tendance: '↑' | '↓' | '→' } = { valeur: 0, tendance: '→' };

  // Références aux graphiques
  ventesChart!: Chart;
  paiementsChart!: Chart;
  comparaisonMagasinsChart!: Chart;
  dateDebut = '';
  dateFin = '';

  private cdr = inject(ChangeDetectorRef);
  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadMagasins();
    //this.loadData();
    this.checkAlertes();
  }

  ngAfterViewInit(): void {
    this.initCharts();
  }

  loadMagasins(): void {
    this.magasins = magasins;
    this.allProduits = produits;
    this.allMouvements = mouvements;
    this.allStocks = stocks;
    this.stocks = [...this.allStocks]; // Initialiser avec tous les stocks
    this.filteredProduits = [...this.allProduits]; // Initialiser avec tous les produits
    this.filteredMouvements = [...this.allMouvements]; // Initialiser avec tous les mouvements filtrés

    this.allRecettes = recettes;
    this.allCategories = categories;
    this.filteredDepenses = [...this.allDepenses];
    this.filteredRecettes = [...this.allRecettes];
    this.filteredCategories = [...this.allCategories];
    this.categoriesDepense = this.filteredCategories.filter((cat) => cat.type === 'DEPENSE');
    this.categoriesRecette = this.filteredCategories.filter((cat) => cat.type === 'RECETTE');

    this.vendeurs = vendeurs;

    this.modesPaiement = modesPaiement;

    // Générer des données de vente fictives
    this.allVentes = paniers;
    this.allClients = clients;
    this.filteredVentes = [...this.allVentes];
  }

  getStatistiquesModesPaiementArrayFinancier(
    recettes: Recette[],
  ): { mode: string; montantTotal: number; occurrences: number }[] {
    const statsMap = new Map<string, { montantTotal: number; occurrences: number }>();

    recettes.forEach((recette) => {
      const current = statsMap.get(recette.paymentMode) || { montantTotal: 0, occurrences: 0 };
      statsMap.set(recette.paymentMode, {
        montantTotal: current.montantTotal + recette.montant,
        occurrences: current.occurrences + 1,
      });
    });

    return Array.from(statsMap.entries()).map(([mode, stats]) => ({
      mode,
      ...stats,
    }));
  }
  getStatistiquesModesPaiementArray(): {
    mode: string;
    montantTotal: number;
    occurrences: number;
  }[] {
    const statsMap = new Map<string, { montantTotal: number; occurrences: number }>();

    // Parcourir toutes les ventes filtrées
    this.filteredVentes.forEach((vente) => {
      // Parcourir tous les paiements de chaque vente
      vente.paiements?.forEach((paiement) => {
        // Trouver le libellé du mode de paiement à partir de l'ID
        const modePaiement = this.modesPaiement.find((mp) => mp.id === paiement.methodePaiement);
        const modeLabel = modePaiement?.libelle || 'Inconnu';

        // Récupérer ou initialiser les statistiques pour ce mode de paiement
        const current = statsMap.get(modeLabel) || { montantTotal: 0, occurrences: 0 };

        // Mettre à jour les statistiques
        statsMap.set(modeLabel, {
          montantTotal: current.montantTotal + paiement.montant,
          occurrences: current.occurrences + 1,
        });
      });
    });

    // Convertir la Map en tableau d'objets
    return Array.from(statsMap.entries()).map(([mode, stats]) => ({
      mode,
      ...stats,
    }));
  }

  private resetTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  initDateFilters(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    this.dateDebut = this.formatDate(monday);
    this.dateFin = this.formatDate(today);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  filtrerDonnees(): void {
    if (!this.dateDebut || !this.dateFin) return;

    const startDate = this.resetTime(new Date(this.dateDebut));
    const endDate = this.resetTime(new Date(this.dateFin));

    this.filteredVentes = this.allVentes.filter(
      (v) =>
        this.resetTime(new Date(v.dateCreation)) >= startDate &&
        this.resetTime(new Date(v.dateCreation)) <= endDate &&
        (this.selectedMagasinId === -1 || v.magasinId === this.selectedMagasinId),
      //(this.selectedVendeurId === -1 || /* logique pour filtrer par vendeur */ true)
    );

    // Filtrer par date et magasin
    const depensesFiltrees = this.allDepenses.filter(
      (d) =>
        this.resetTime(new Date(d.date)) >= startDate &&
        this.resetTime(new Date(d.date)) <= endDate &&
        (this.selectedMagasinId === -1 || d.magasinId === this.selectedMagasinId),
    );

    const recettesFiltrees = this.allRecettes.filter(
      (r) =>
        this.resetTime(new Date(r.date)) >= startDate &&
        this.resetTime(new Date(r.date)) <= endDate &&
        (this.selectedMagasinId === -1 || r.magasinId === this.selectedMagasinId),
    );

    this.filteredDepenses = [...depensesFiltrees];
    this.filteredRecettes = [...recettesFiltrees];
    // Mettre à jour les graphiques
    //this.updateMaxItems();
    // Calculer les indicateurs
    this.calculerIndicateursFinanciers(this.filteredRecettes, this.filteredDepenses);
    this.modesPaiement = this.getStatistiquesModesPaiementArrayFinancier(this.filteredRecettes);
    this.fluxTresorerie = this.calculerFluxTresorerie();
    this.tendances = this.calculerTendances();

    this.calculerIndicateurs();
    this.calculerTopListes();
    this.statmodesPaiement = this.getStatistiquesModesPaiementArray();
    this.cdr.detectChanges();

    this.stocks = this.allStocks.filter((stock) => {
      const stockDate = this.resetTime(new Date(stock.dateDerniereMiseAJour));
      const isInDateRange = stockDate >= startDate && stockDate <= endDate;
      return this.selectedMagasinId === -1
        ? isInDateRange
        : stock.magasinId === this.selectedMagasinId && isInDateRange;
    });

    this.filteredProduits = this.allProduits.filter((produit) =>
      this.stocks.some((stock) => stock.produitId === produit.id),
    );
    this.filteredMouvements = this.allMouvements.filter((mvt) =>
      this.stocks.some((stock) => stock.id === mvt.stockId),
    );

    this.updateGlobalStats();

    setTimeout(() => {
      this.mettreAJourGraphiques();
      this.updateCharts();
    }, 100);
  }

  updateGlobalStats(): void {
    this.valeurTotaleStockAchatInitial = this.getStatGlobauxProduits().totalValeurStockInitial;
    this.valeurTotaleVenteStockAchatFinal = this.getStatGlobauxProduits().totalValeurStockFinal;
    this.produitsEnAlerte = Stock.compterProduitsEnAlerte(this.stocks);
    this.produitsRupture = Stock.compterProduitsEnRupture(this.stocks);
    this.totalProduits = Stock.compterProduitsTotal(this.stocks);
    this.produitsPerissable = Stock.compterProduitsPerissables(this.stocks, this.filteredProduits);
    this.produitsUniques = Stock.compterProduitsUniques(this.stocks);
    this.produitsAReapprovisionne = Stock.compterProduitsAReapprovisionner(this.stocks);
    this.produitsEnSurStock = Stock.compterProduitsEnSurstock(this.stocks);
  }
  getStatGlobauxProduits() {
    return MouvementsStock.calculerStatistiquesGlobaux(
      this.filteredMouvements,
      this.stocks,
      new Date(this.dateDebut),
      new Date(this.dateFin),
      this.selectedMagasinId,
    );
  }

  mettreAJourGraphiques(): void {
    /* this.creerGraphiqueEvolutionVentes();
        this.creerGraphiquePaiements();
        this.creerGraphiqueTopProduits(); */
  }

  calculerIndicateursFinanciers(recettes: Recette[], depenses: Depense[]): void {
    // Associer chaque recette à sa catégorie
    const recettesAvecCategories = recettes.map((r) => ({
      ...r,
      categorie: this.categoriesRecette.find((c) => c.id === r.categoryId),
    }));

    // Recettes de type "vente"
    const recettesVente = recettesAvecCategories.filter(
      (r) =>
        r.categorie &&
        (r.categorie.name.toLowerCase().includes('vente') ||
          r.categorie.description?.toLowerCase().includes('vente')),
    );

    this.chiffreAffaires = recettesVente.reduce((sum, r) => sum + r.montant, 0);
    this.nbVentes = recettesVente.length;

    // Autres recettes (hors ventes)
    const autresRecettes = recettesAvecCategories.filter(
      (r) =>
        !r.categorie ||
        (!r.categorie.name.toLowerCase().includes('vente') &&
          !r.categorie.description?.toLowerCase().includes('vente')),
    );

    this.autresRecettes = autresRecettes.reduce((sum, r) => sum + r.montant, 0);
    this.nbAutresRecettes = autresRecettes.length;

    // Dépenses
    this.totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
    this.nbDepenses = depenses.length;

    // const flux = this.calculerFluxTresorerie();
    // this.soldeTresorerie = flux.soldeFinal; // Utilisez le solde final du flux
    // Bénéfice net
    this.beneficeNet = this.chiffreAffaires + this.autresRecettes - this.totalDepenses;

    // Calculer le solde et l'évolution du CA
    this.calculerSoldeEtEvolution();
  }

  private calculerSoldeEtEvolution(): void {
    // Calcul du solde de trésorerie (argent disponible)
    this.soldeTresorerie = this.chiffreAffaires + this.autresRecettes - this.totalDepenses;

    // Calcul de l'évolution du CA par rapport à la période précédente
    const startDate = this.resetTime(new Date(this.dateDebut));
    const endDate = this.resetTime(new Date(this.dateFin));

    // Calculer la durée de la période en jours
    const dureePeriode =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculer la date de début de la période précédente
    const startDatePrecedent = new Date(startDate);
    startDatePrecedent.setDate(startDate.getDate() - dureePeriode);

    // Calculer la date de fin de la période précédente
    const endDatePrecedent = new Date(startDate);
    endDatePrecedent.setDate(startDate.getDate() - 1);

    // Filtrer les recettes de la période précédente
    const recettesPrecedentes = this.filteredRecettes.filter((r) => {
      const dateRecette = this.resetTime(new Date(r.date));
      return (
        dateRecette >= startDatePrecedent &&
        dateRecette <= endDatePrecedent &&
        (this.selectedMagasinId === -1 || r.magasinId === this.selectedMagasinId)
      );
    });

    // Calculer le CA de la période précédente
    this.periodePrecedenteCA = recettesPrecedentes
      .filter((r) => {
        const categorie = this.categoriesRecette.find((c) => c.id === r.categoryId);
        return (
          categorie &&
          (categorie.name.toLowerCase().includes('vente') ||
            categorie.description?.toLowerCase().includes('vente'))
        );
      })
      .reduce((sum, r) => sum + r.montant, 0);

    // Calculer l'évolution en pourcentage
    if (this.periodePrecedenteCA > 0) {
      this.evolutionCA.pourcentage = Math.round(
        ((this.chiffreAffaires - this.periodePrecedenteCA) / this.periodePrecedenteCA) * 100,
      );
      this.evolutionCA.tendance =
        this.chiffreAffaires > this.periodePrecedenteCA
          ? 'hausse'
          : this.chiffreAffaires < this.periodePrecedenteCA
            ? 'baisse'
            : 'stable';
    } else {
      this.evolutionCA.pourcentage = this.chiffreAffaires > 0 ? 100 : 0;
      this.evolutionCA.tendance = this.chiffreAffaires > 0 ? 'hausse' : 'stable';
    }
  }

  calculerIndicateurs(): void {
    // Chiffre d'affaires
    this.totalVentes = this.filteredVentes.length;
    this.chiffreAffairesHT = this.filteredVentes.reduce((sum, v) => sum + v.totalHT, 0);
    this.chiffreAffairesTTC = this.filteredVentes.reduce((sum, v) => sum + v.totalTTC, 0);

    // Marge bénéficiaire (si prix d'achat connu)
    this.margeBeneficiaire = this.filteredVentes.reduce((sum, v) => {
      const margeVente = v.articles.reduce(
        (s, a) => s + ((a.prixVenteUnitaire || 0) - (a.prixAchatUnitaire || 0)),
        0,
      );
      return sum + margeVente;
    }, 0);

    // Ticket moyen et panier moyen
    this.ticketMoyen = this.totalVentes > 0 ? this.chiffreAffairesTTC / this.totalVentes : 0;
    this.panierMoyen =
      this.totalVentes > 0
        ? this.filteredVentes.reduce((sum, v) => sum + v.articles.length, 0) / this.totalVentes
        : 0;
  }

  // Nouveaux calculs pour le flux de trésorerie
  private calculerFluxTresorerie(): {
    soldeInitial: number;
    recettesPeriod: number;
    depensesPeriod: number;
    soldeFinal: number;
  } {
    // 1. Préparer les dates (en ignorant les heures)
    const dateDebut = this.resetTime(new Date(this.dateDebut));
    const dateFin = this.resetTime(new Date(this.dateFin));

    // 2. Calculer la veille de la date de début
    const dateVeille = new Date(dateDebut);
    dateVeille.setDate(dateDebut.getDate() - 1);
    this.resetTime(dateVeille);

    // 3. Calcul du solde initial (toutes les transactions AVANT dateDebut)
    let soldeInitial = 0;
    const transactionsExistantes = this.allRecettes.length > 0 || this.allDepenses.length > 0;

    if (transactionsExistantes) {
      soldeInitial =
        this.allRecettes
          .filter((r) => this.resetTime(new Date(r.date)) < dateDebut)
          .reduce((sum, r) => sum + r.montant, 0) -
        this.allDepenses
          .filter((d) => this.resetTime(new Date(d.date)) < dateDebut)
          .reduce((sum, d) => sum + d.montant, 0);
    }

    // 4. Calcul des transactions de la période (INCLUSIVE dateDebut à dateFin)
    const recettesPeriod = this.allRecettes
      .filter((r) => {
        const date = this.resetTime(new Date(r.date));
        return date >= dateDebut && date <= dateFin;
      })
      .reduce((sum, r) => sum + r.montant, 0);

    const depensesPeriod = this.allDepenses
      .filter((d) => {
        const date = this.resetTime(new Date(d.date));
        return date >= dateDebut && date <= dateFin;
      })
      .reduce((sum, d) => sum + d.montant, 0);

    // 5. Solde final
    const soldeFinal = soldeInitial + recettesPeriod - depensesPeriod;

    return {
      soldeInitial,
      recettesPeriod,
      depensesPeriod,
      soldeFinal,
    };
  }
  private getPeriodePrecedente(): {
    chiffreAffaires: number;
    beneficeNet: number;
    totalDepenses: number;
  } {
    const startDate = new Date(this.dateDebut);
    const endDate = new Date(this.dateFin);

    // 1. Calculer la durée de la période actuelle en jours
    const dureePeriode =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 2. Calculer les dates de la période précédente
    const startDatePrecedent = new Date(startDate);
    startDatePrecedent.setDate(startDate.getDate() - dureePeriode);

    const endDatePrecedent = new Date(startDate);
    endDatePrecedent.setDate(startDate.getDate() - 1);

    // 3. Filtrer les données pour la période précédente
    const depensesPrecedentes = this.allDepenses.filter(
      (d) =>
        this.resetTime(new Date(d.date)) >= this.resetTime(startDatePrecedent) &&
        this.resetTime(new Date(d.date)) <= this.resetTime(endDatePrecedent) &&
        (this.selectedMagasinId === -1 || d.magasinId === this.selectedMagasinId),
    );

    const recettesPrecedentes = this.allRecettes.filter(
      (r) =>
        this.resetTime(new Date(r.date)) >= this.resetTime(startDatePrecedent) &&
        this.resetTime(new Date(r.date)) <= this.resetTime(endDatePrecedent) &&
        (this.selectedMagasinId === -1 || r.magasinId === this.selectedMagasinId),
    );

    // 4. Calculer les indicateurs pour la période précédente
    const chiffreAffairesPrecedent = recettesPrecedentes
      .filter((r) => {
        const categorie = this.categoriesRecette.find((c) => c.id === r.categoryId);
        return (
          categorie &&
          (categorie.name.toLowerCase().includes('vente') ||
            categorie.description?.toLowerCase().includes('vente'))
        );
      })
      .reduce((sum, r) => sum + r.montant, 0);

    const autresRecettesPrecedent = recettesPrecedentes
      .filter((r) => {
        const categorie = this.categoriesRecette.find((c) => c.id === r.categoryId);
        return (
          !categorie ||
          (!categorie.name.toLowerCase().includes('vente') &&
            !categorie.description?.toLowerCase().includes('vente'))
        );
      })
      .reduce((sum, r) => sum + r.montant, 0);

    const totalDepensesPrecedent = depensesPrecedentes.reduce((sum, d) => sum + d.montant, 0);
    const beneficeNetPrecedent =
      chiffreAffairesPrecedent + autresRecettesPrecedent - totalDepensesPrecedent;

    return {
      chiffreAffaires: chiffreAffairesPrecedent,
      beneficeNet: beneficeNetPrecedent,
      totalDepenses: totalDepensesPrecedent,
    };
  }

  // Helper pour calculer l'évolution
  private calculerEvolution(
    valeurActuelle: number,
    valeurPrecedente: number,
  ): {
    valeur: number;
    tendance: '↑' | '↓' | '→';
  } {
    if (valeurPrecedente === 0) return { valeur: 0, tendance: '→' };

    const evolution = ((valeurActuelle - valeurPrecedente) / valeurPrecedente) * 100;
    return {
      valeur: Math.round(evolution),
      tendance: evolution > 0 ? '↑' : evolution < 0 ? '↓' : '→',
    };
  }
  // Nouvelle méthode pour les tendances
  private calculerTendances(): {
    evolutionCA: { valeur: number; tendance: '↑' | '↓' | '→' };
    evolutionBenefices: { valeur: number; tendance: '↑' | '↓' | '→' };
    evolutionCouts: { valeur: number; tendance: '↑' | '↓' | '→' };
  } {
    try {
      const periodePrecedente = this.getPeriodePrecedente();

      // Vérification que les données précédentes sont valides
      const donneesValides =
        periodePrecedente.chiffreAffaires !== undefined &&
        periodePrecedente.beneficeNet !== undefined &&
        periodePrecedente.totalDepenses !== undefined;

      return {
        evolutionCA: donneesValides
          ? this.calculerEvolution(this.chiffreAffaires, periodePrecedente.chiffreAffaires)
          : { valeur: 0, tendance: '→' },
        evolutionBenefices: donneesValides
          ? this.calculerEvolution(this.beneficeNet, periodePrecedente.beneficeNet)
          : { valeur: 0, tendance: '→' },
        evolutionCouts: donneesValides
          ? this.calculerEvolution(this.totalDepenses, periodePrecedente.totalDepenses)
          : { valeur: 0, tendance: '→' },
      };
    } catch (error) {
      console.error('Erreur dans le calcul des tendances', error);
      return {
        evolutionCA: { valeur: 0, tendance: '→' },
        evolutionBenefices: { valeur: 0, tendance: '→' },
        evolutionCouts: { valeur: 0, tendance: '→' },
      };
    }
  }
  calculerTopListes(): void {
    const produitsMap = new Map<
      number,
      {
        produit: Produits;
        quantite: number;
        ca: number;
        marge: number;
        nombreVentes: number;
      }
    >();

    this.filteredVentes.forEach((v) => {
      const produitsDéjàComptés = new Set<number>(); // pour cette vente

      v.articles.forEach((a) => {
        const produitId = a.produit.id!;
        const quantite = a.quantite || 0;
        const prixVente = a.prixVenteUnitaire || 0;
        const prixAchat = a.prixAchatUnitaire || 0;

        const existant = produitsMap.get(produitId) || {
          produit: a.produit,
          quantite: 0,
          ca: 0,
          marge: 0,
          nombreVentes: 0,
        };

        const dejaCompte = produitsDéjàComptés.has(produitId);

        produitsMap.set(produitId, {
          produit: a.produit,
          quantite: existant.quantite + quantite,
          ca: existant.ca + quantite * prixVente,
          marge: existant.marge + quantite * (prixVente - prixAchat),
          nombreVentes: existant.nombreVentes + (dejaCompte ? 0 : 1),
        });

        produitsDéjàComptés.add(produitId);
      });
    });

    this.topProduits = Array.from(produitsMap.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 10);

    // Top clients
    const clientsMap = new Map<
      number,
      { client: Client; nbAchats: number; ca: number; dernierAchat: Date }
    >();

    this.filteredVentes.forEach((v) => {
      if (!v.clientId) return;

      const client = this.allClients.find((c) => c.id === v.clientId);
      if (!client) return;

      const existant = clientsMap.get(v.clientId) || {
        client,
        nbAchats: 0,
        ca: 0,
        dernierAchat: new Date(0),
      };

      clientsMap.set(v.clientId, {
        client,
        nbAchats: existant.nbAchats + 1,
        ca: existant.ca + v.totalTTC,
        dernierAchat:
          v.dateCreation > existant.dernierAchat ? v.dateCreation : existant.dernierAchat,
      });
    });

    this.topClients = Array.from(clientsMap.values())
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    // Performance vendeurs
    const vendeursMap = new Map<
      number,
      { vendeur: User; nbVentes: number; caHT: number; caTTC: number }
    >();

    this.filteredVentes.forEach((v) => {
      const vendeurId = v.agentId;
      const vendeur = this.vendeurs.find((vu) => vu.id === vendeurId);

      if (!vendeur) return; // vendeur introuvable, on ignore cette vente

      const existant = vendeursMap.get(vendeurId!) || {
        vendeur,
        nbVentes: 0,
        caHT: 0,
        caTTC: 0,
      };

      vendeursMap.set(vendeurId!, {
        vendeur,
        nbVentes: existant.nbVentes + 1,
        caHT: existant.caHT + v.totalHT,
        caTTC: existant.caTTC + v.totalTTC,
      });
    });

    this.vendeursPerformance = Array.from(vendeursMap.values()).map((v) => ({
      ...v,
      ticketMoyen: v.nbVentes > 0 ? v.caTTC / v.nbVentes : 0,
    }));

    this.trierVendeurs();
  }

  trierVendeurs(): void {
    switch (this.triVendeursPar) {
      case 'ca':
        this.vendeursPerformance.sort((a, b) => b.caTTC - a.caTTC);
        break;
      case 'transactions':
        this.vendeursPerformance.sort((a, b) => b.nbVentes - a.nbVentes);
        break;
      case 'moyenne':
        this.vendeursPerformance.sort((a, b) => b.ticketMoyen - a.ticketMoyen);
        break;
    }
  }

  // Vérifie les alertes critiques
  checkAlertes(): void {
    /* if (this.dashboardData.produitsRupture > 0) {
      this.alertes.push({
        message: `${this.dashboardData.produitsRupture} produit(s) en rupture de stock`,
        lien: '/stock'
      });
    }
    
    if (this.dashboardData.soldeTresorerie < 100000) {
      this.alertes.push({
        message: 'Trésorerie critique (< 100 000 F CFA)',
        lien: '/finances'
      });
    } */
  }

  // Initialise les graphiques
  initCharts(): void {
    // Graphique des ventes
    this.ventesChart = new Chart(this.ventesChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [
          {
            label: "Chiffre d'affaires (F CFA)",
            data: [120000, 190000, 150000, 200000, 180000, 250000, 220000],
            borderColor: '#4e73df',
            backgroundColor: 'rgba(78, 115, 223, 0.05)',
            tension: 0.3,
          },
          {
            label: 'Nombre de ventes',
            data: [15, 22, 18, 25, 20, 30, 26],
            borderColor: '#1cc88a',
            backgroundColor: 'rgba(28, 200, 138, 0.05)',
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: "Chiffre d'affaires",
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: 'Nombre de ventes',
            },
          },
        },
      },
    });

    // Graphique des modes de paiement
    /* this.paiementsChart = new Chart(this.paiementsChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.dashboardData.modesPaiement.map(m => m.mode),
        datasets: [{
          data: this.dashboardData.modesPaiement.map(m => m.montantTotal),
          backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc'],
          hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf'],
          hoverBorderColor: "rgba(234, 236, 244, 1)",
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    }); */

    // Graphique de comparaison des magasins (admin seulement)
    if (this.isAdmin) {
      this.comparaisonMagasinsChart = new Chart(this.comparaisonMagasinsChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Magasin A', 'Magasin B', 'Magasin C'],
          datasets: [
            {
              label: "CA aujourd'hui",
              data: [450000, 380000, 420000],
              backgroundColor: 'rgba(78, 115, 223, 0.5)',
            },
            {
              label: 'CA hier',
              data: [420000, 350000, 410000],
              backgroundColor: 'rgba(78, 115, 223, 0.2)',
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Chiffre d'affaires (F CFA)",
              },
            },
          },
        },
      });
    }
  }

  // Change la période affichée
  changerPeriode(periode: string): void {
    this.periodeActive = periode;
    // Ici, vous rechargeriez les données pour la nouvelle période
  }

  // Filtre par magasin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMagasinSelect(event: any): void {
    this.selectedMagasinId = event.target.value;
    this.filtrerDonnees();
    this.updateCharts();
  }

  // Actualise les données
  refreshData(): void {
    this.filtrerDonnees();
    this.updateCharts();
  }

  // Met à jour les graphiques
  updateCharts(): void {
    if (this.ventesChart) {
      this.ventesChart.update();
    }
    if (this.paiementsChart) {
      //this.paiementsChart.data.labels = this.dashboardData.modesPaiement.map(m => m.mode);
      //this.paiementsChart.data.datasets[0].data = this.dashboardData.modesPaiement.map(m => m.montantTotal);
      this.paiementsChart.update();
    }
    if (this.comparaisonMagasinsChart) {
      this.comparaisonMagasinsChart.update();
    }
  }

  // Export en Excel
  async exportToExcel(): Promise<void> {
    /*  const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tableau de Bord';
    workbook.created = new Date();

    // Feuille Résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    
    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    // En-tête
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Tableau de Bord - ' + new Date().toLocaleDateString();
    titleCell.style = {
      font: { bold: true, size: 14 },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    // Données principales
    summarySheet.addRow(['Indicateur', "Aujourd'hui", 'Hier', 'Évolution']).eachCell(cell => {
      cell.style = headerStyle;
    });

    const indicators = [
      ['Chiffre d\'affaires', this.dashboardData.ca, this.dashboardData.caHier, 
       `${this.dashboardData.evolutionCA.valeur}% ${this.dashboardData.evolutionCA.tendance}`],
      ['Nombre de ventes', this.dashboardData.nbVentes, 'N/A', 
       `${this.dashboardData.evolutionVentes.valeur}% ${this.dashboardData.evolutionVentes.tendance}`],
      ['Produits en alerte', this.dashboardData.produitsEnAlerte, 'N/A', ''],
      ['Produits en rupture', this.dashboardData.produitsRupture, 'N/A', '']
    ];

    indicators.forEach(row => {
      summarySheet.addRow(row);
    });

    // Génération du fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, `dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`);*/
  }
}
