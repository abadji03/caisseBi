import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { Chart, ChartConfiguration, registerables, TooltipItem } from 'chart.js';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Magasin } from '../../../modeles/magasin.model';
import html2canvas from 'html2canvas';
import { Paiement } from '../../../modeles/paiement.model';
import { categories, depenses, magasins, recettes } from '../../../modeles/donnees_fictives';
import { Categorie, Depense, Recette } from '../../../modeles/finance.model';
@Component({
  selector: 'app-rapports-financiers',
  standalone:true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-financiers.component.html',
  styleUrl: './rapports-financiers.component.css'
})
export class RapportsFinanciersComponent implements OnInit  {


  @ViewChild('evolutionChart') evolutionChartRef!: ElementRef;
  @ViewChild('depensesChart') depensesChartRef!: ElementRef;
  @ViewChild('recettesChart') recettesChartRef!: ElementRef;
  @ViewChild('tendancesChart') tendancesChartRef!: ElementRef;
  tendancesChart: any;
  evolutionChart: any;
  depensesChart: any;
  recettesChart: any;

  // Données et filtres
  dateGeneration = new Date();
  dateDebut: string = "";
  dateFin: string = "";
  magasins: Magasin[] = [];
  selectedMagasinId: number = -1;
  isAdmin: boolean = true;
  isPrinting: boolean = false;
  isGeneratingPDF: boolean = false;
  progress: number = 0;

  // Données financières
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
  modesPaiement: any[] = [];

  maxItems: number = 0;

  // Indicateurs clés
  chiffreAffaires: number = 0;
  totalDepenses: number = 0;
  autresRecettes: number = 0;
  beneficeNet: number = 0;
  nbVentes : number = 0;
  nbAutresRecettes : number = 0;
  nbDepenses : number = 0;
  // Ajoutez dans la section des propriétés
  soldeTresorerie: number = 0;
  evolutionCA: { pourcentage: number, tendance: 'hausse' | 'baisse' | 'stable' } = { pourcentage: 0, tendance: 'stable' };
  periodePrecedenteCA: number = 0;
  // Ajoutez dans la section des propriétés
fluxTresorerie: {
  soldeInitial: number,
  recettesPeriod: number,
  depensesPeriod: number,
  soldeFinal: number
} = { soldeInitial: 0, recettesPeriod: 0, depensesPeriod: 0, soldeFinal: 0 };

tendances: {
  evolutionCA: { valeur: number, tendance: '↑' | '↓' | '→' },
  evolutionBenefices: { valeur: number, tendance: '↑' | '↓' | '→' },
  evolutionCouts: { valeur: number, tendance: '↑' | '↓' | '→' }
} = {
  evolutionCA: { valeur: 0, tendance: '→' },
  evolutionBenefices: { valeur: 0, tendance: '→' },
  evolutionCouts: { valeur: 0, tendance: '→' }
};

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  currentPagerecette:number = 1;
  searchTerm = ''; // Recherche

  constructor(private cdr: ChangeDetectorRef) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.initDateFilters();
    this.loadDonneesFinancieres();
    this.filtrerDonnees()
  }

  initDateFilters(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    this.dateDebut = this.formatDate(monday);
    this.dateFin = this.formatDate(today);
  }
// Méthode appeler quand on change les dates de début et de fin
filtrerDates(): void {
  this.filtrerDonnees();
}
  loadDonneesFinancieres(): void {
    // Simuler des données (à remplacer par des appels API)
    this.magasins = magasins;
    this.allDepenses = depenses;
    this.allRecettes = recettes;
    this.allCategories = categories;
    this.filteredDepenses = [...this.allDepenses];
    this.filteredRecettes = [...this.allRecettes];
    this.filteredCategories = [...this.allCategories];
    this.categoriesDepense = this.filteredCategories.filter(cat => cat.type === "DEPENSE");
    this.categoriesRecette = this.filteredCategories.filter(cat => cat.type === "RECETTE")

    //this.filtrerDonnees();
  }
  onMagasinSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMagasinId = Number(target.value) || -1;
    this.filtrerDonnees();
  }


  filtrerDonnees(): void {
    if (!this.dateDebut || !this.dateFin) return;

  const startDate = this.resetTime(new Date(this.dateDebut));
  const endDate = this.resetTime(new Date(this.dateFin));

    // Filtrer par date et magasin
    const depensesFiltrees = this.allDepenses.filter(d =>
      this.resetTime(new Date(d.date)) >= startDate &&
      this.resetTime(new Date(d.date)) <= endDate &&
      (this.selectedMagasinId === -1 || d.magasinId === this.selectedMagasinId)
    );

    const recettesFiltrees = this.allRecettes.filter(r =>
      this.resetTime(new Date(r.date)) >= startDate &&
      this.resetTime(new Date(r.date)) <= endDate &&
      (this.selectedMagasinId === -1 || r.magasinId === this.selectedMagasinId)
    );

    this.filteredDepenses = [...depensesFiltrees];
    this.filteredRecettes = [...recettesFiltrees];
    // Mettre à jour les graphiques
    this.updateMaxItems();
    // Calculer les indicateurs
    this.calculerIndicateurs(this.filteredRecettes, this.filteredDepenses);
    this.modesPaiement = this.getStatistiquesModesPaiementArray(this.filteredRecettes);
    this.fluxTresorerie = this.calculerFluxTresorerie();
    this.tendances = this.calculerTendances();

    this.cdr.detectChanges();
    setTimeout(() => {
      this.mettreAJourGraphiques();
    }, 100);
  }

  calculerIndicateurs(recettes: Recette[], depenses: Depense[]): void {

    // Associer chaque recette à sa catégorie
    const recettesAvecCategories = recettes.map(r => ({
      ...r,
      categorie: this.categoriesRecette.find(c => c.id === r.categoryId)
    }));

    // Recettes de type "vente"
    const recettesVente = recettesAvecCategories.filter(r =>
      r.categorie &&
      (r.categorie.name.toLowerCase().includes('vente') ||
       r.categorie.description?.toLowerCase().includes('vente'))
    );

    this.chiffreAffaires = recettesVente.reduce((sum, r) => sum + r.montant, 0);
    this.nbVentes = recettesVente.length;

    // Autres recettes (hors ventes)
    const autresRecettes = recettesAvecCategories.filter(r =>
      !r.categorie ||
      (!r.categorie.name.toLowerCase().includes('vente') &&
       !r.categorie.description?.toLowerCase().includes('vente'))
    );

    this.autresRecettes = autresRecettes.reduce((sum, r) => sum + r.montant, 0);
    this.nbAutresRecettes = autresRecettes.length;

    // Dépenses
    this.totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
    this.nbDepenses = depenses.length;

    // const flux = this.calculerFluxTresorerie();
    // this.soldeTresorerie = flux.soldeFinal; // Utilisez le solde final du flux
    // Bénéfice net
    this.beneficeNet = (this.chiffreAffaires + this.autresRecettes) - this.totalDepenses;

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
    const dureePeriode = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculer la date de début de la période précédente
    const startDatePrecedent = new Date(startDate);
    startDatePrecedent.setDate(startDate.getDate() - dureePeriode);

    // Calculer la date de fin de la période précédente
    const endDatePrecedent = new Date(startDate);
    endDatePrecedent.setDate(startDate.getDate() - 1);

    // Filtrer les recettes de la période précédente
    const recettesPrecedentes = this.filteredRecettes.filter(r => {
      const dateRecette = this.resetTime(new Date(r.date));
      return dateRecette >= startDatePrecedent &&
             dateRecette <= endDatePrecedent &&
             (this.selectedMagasinId === -1 || r.magasinId === this.selectedMagasinId);
    });

    // Calculer le CA de la période précédente
    this.periodePrecedenteCA = recettesPrecedentes
      .filter(r => {
        const categorie = this.categoriesRecette.find(c => c.id === r.categoryId);
        return categorie &&
               (categorie.name.toLowerCase().includes('vente') ||
                categorie.description?.toLowerCase().includes('vente'));
      })
      .reduce((sum, r) => sum + r.montant, 0);

    // Calculer l'évolution en pourcentage
    if (this.periodePrecedenteCA > 0) {
      this.evolutionCA.pourcentage = Math.round(((this.chiffreAffaires - this.periodePrecedenteCA) / this.periodePrecedenteCA) * 100);
      this.evolutionCA.tendance = this.chiffreAffaires > this.periodePrecedenteCA ? 'hausse' :
                                 this.chiffreAffaires < this.periodePrecedenteCA ? 'baisse' : 'stable';
    } else {
      this.evolutionCA.pourcentage = this.chiffreAffaires > 0 ? 100 : 0;
      this.evolutionCA.tendance = this.chiffreAffaires > 0 ? 'hausse' : 'stable';
    }
  }

  // Nouveaux calculs pour le flux de trésorerie
/*  private calculerFluxTresorerie(): {
    soldeInitial: number,
    recettesPeriod: number,
    depensesPeriod: number,
    soldeFinal: number
  } {
    // 1. Trouver la date la plus ancienne dans les données
    const datesExistantes = [
      ...this.filteredRecettes.map(r => this.resetTime(new Date(r.date)).getTime()),
      ...this.filteredDepenses.map(d => this.resetTime(new Date(d.date)).getTime())
    ];
    const datePlusAncienne = datesExistantes.length > 0
      ? new Date(Math.min(...datesExistantes))
      : null;

    // 2. Calcul du solde initial (seulement si dateDebut > datePlusAncienne)
    let soldeInitial = 0;
    const dateDebut = this.resetTime(new Date(this.dateDebut));
    //console.log('....................Date de début.........................')
    if (datePlusAncienne && dateDebut > this.resetTime(datePlusAncienne)) {
      soldeInitial = this.allRecettes
        .filter(r => this.resetTime(new Date(r.date)) < dateDebut)
        .reduce((sum, r) => sum + r.montant, 0)
        -
        this.allDepenses
        .filter(d => this.resetTime(new Date(d.date)) < dateDebut)
        .reduce((sum, d) => sum + d.montant, 0);
    }
    this.recettesInitial = this.allRecettes
    .filter(r => this.resetTime(new Date(r.date)) < dateDebut);



    this.depensesInitial = this.allDepenses
    .filter(r => this.resetTime(new Date(r.date)) < dateDebut);


    // 3. Recettes/Dépenses de la période (inchangé)
    const recettesPeriod = this.filteredRecettes.reduce((sum, r) => sum + r.montant, 0);
    const depensesPeriod = this.filteredDepenses.reduce((sum, d) => sum + d.montant, 0);

    // 4. Solde final
    const soldeFinal = soldeInitial + recettesPeriod - depensesPeriod;

    return { soldeInitial, recettesPeriod, depensesPeriod, soldeFinal };
  }
 */

private calculerFluxTresorerie(): {
  soldeInitial: number,
  recettesPeriod: number,
  depensesPeriod: number,
  soldeFinal: number
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
    soldeInitial = this.allRecettes
      .filter(r => this.resetTime(new Date(r.date)) < dateDebut)
      .reduce((sum, r) => sum + r.montant, 0)
      -
      this.allDepenses
      .filter(d => this.resetTime(new Date(d.date)) < dateDebut)
      .reduce((sum, d) => sum + d.montant, 0);
  }

  // 4. Calcul des transactions de la période (INCLUSIVE dateDebut à dateFin)
  const recettesPeriod = this.allRecettes
    .filter(r => {
      const date = this.resetTime(new Date(r.date));
      return date >= dateDebut && date <= dateFin;
    })
    .reduce((sum, r) => sum + r.montant, 0);

  const depensesPeriod = this.allDepenses
    .filter(d => {
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
    soldeFinal
  };
}
// Nouvelle méthode pour les tendances
private calculerTendances(): {
  evolutionCA: { valeur: number, tendance: '↑' | '↓' | '→' },
  evolutionBenefices: { valeur: number, tendance: '↑' | '↓' | '→' },
  evolutionCouts: { valeur: number, tendance: '↑' | '↓' | '→' }
} {
  try {
    const periodePrecedente = this.getPeriodePrecedente();

    // Vérification que les données précédentes sont valides
    const donneesValides = periodePrecedente.chiffreAffaires !== undefined
      && periodePrecedente.beneficeNet !== undefined
      && periodePrecedente.totalDepenses !== undefined;

    return {
      evolutionCA: donneesValides
        ? this.calculerEvolution(this.chiffreAffaires, periodePrecedente.chiffreAffaires)
        : { valeur: 0, tendance: '→' },
      evolutionBenefices: donneesValides
        ? this.calculerEvolution(this.beneficeNet, periodePrecedente.beneficeNet)
        : { valeur: 0, tendance: '→' },
      evolutionCouts: donneesValides
        ? this.calculerEvolution(this.totalDepenses, periodePrecedente.totalDepenses)
        : { valeur: 0, tendance: '→' }
    };
  } catch (error) {
    console.error("Erreur dans le calcul des tendances", error);
    return {
      evolutionCA: { valeur: 0, tendance: '→' },
      evolutionBenefices: { valeur: 0, tendance: '→' },
      evolutionCouts: { valeur: 0, tendance: '→' }
    };
  }
}
private getDonneesComparatives(): {
  periode: string,
  chiffreAffaires: number,
  beneficeNet: number,
  totalDepenses: number
}[] {
  // 1. Période actuelle (déjà calculée dans le composant)
  const periodeActuelle = {
    periode: 'Période actuelle',
    chiffreAffaires: this.chiffreAffaires,
    beneficeNet: this.beneficeNet,
    totalDepenses: this.totalDepenses
  };

  // 2. Période précédente (n-1)
  const periodeN1 = this.getDonneesPourPeriode(-1);

  // 3. Période n-2 (encore avant)
  const periodeN2 = this.getDonneesPourPeriode(-2);

  return [periodeN2, periodeN1, periodeActuelle];
}

private getDonneesPourPeriode(decalage: number): {
  periode: string,
  chiffreAffaires: number,
  beneficeNet: number,
  totalDepenses: number
} {
  const startDate = this.resetTime(new Date(this.dateDebut));
  const endDate = this.resetTime(new Date(this.dateFin));

  // Calculer la durée de la période en jours
  const dureePeriode = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Calculer les dates de la période décalée
  const startDateDecale = this.resetTime(new Date(startDate));
  startDateDecale.setDate(startDate.getDate() + (decalage * dureePeriode));

  const endDateDecale = this.resetTime(new Date(endDate));
  endDateDecale.setDate(endDate.getDate() + (decalage * dureePeriode));

  // Filtrer les données pour la période décalée
  const depenses = this.allDepenses.filter(d =>
    this.resetTime(new Date(d.date)) >= this.resetTime(startDateDecale) &&
    this.resetTime(new Date(d.date)) <= this.resetTime(endDateDecale) &&
    (this.selectedMagasinId === -1 || d.magasinId === this.selectedMagasinId)
  );

  const recettes = this.allRecettes.filter(r =>
    this.resetTime(new Date(r.date)) >= this.resetTime(startDateDecale) &&
    this.resetTime(new Date(r.date)) <= this.resetTime(endDateDecale) &&
    (this.selectedMagasinId === -1 || r.magasinId === this.selectedMagasinId)
  );

  // Calculer les indicateurs
  const chiffreAffaires = recettes
    .filter(r => {
      const categorie = this.categoriesRecette.find(c => c.id === r.categoryId);
      return categorie &&
             (categorie.name.toLowerCase().includes('vente') ||
              categorie.description?.toLowerCase().includes('vente'));
    })
    .reduce((sum, r) => sum + r.montant, 0);

  const autresRecettes = recettes
    .filter(r => {
      const categorie = this.categoriesRecette.find(c => c.id === r.categoryId);
      return !categorie ||
             (!categorie.name.toLowerCase().includes('vente') &&
              !categorie.description?.toLowerCase().includes('vente'));
    })
    .reduce((sum, r) => sum + r.montant, 0);

  const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
  const beneficeNet = (chiffreAffaires + autresRecettes) - totalDepenses;

  // Formater le libellé de période
  const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const libellePeriode = `Du ${formatDate(startDateDecale)} au ${formatDate(endDateDecale)}`;

  return {
    periode: libellePeriode,
    chiffreAffaires,
    beneficeNet,
    totalDepenses
  };
}
private creerGraphiqueTendances(): void {
  if (this.tendancesChart) {
    this.tendancesChart.destroy();
  }

  const ctx = this.tendancesChartRef?.nativeElement.getContext('2d');
  if (!ctx) return;

  const periodes = this.getDonneesComparatives();

  this.tendancesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: periodes.map(p => p.periode),
      datasets: [
        {
          label: 'Chiffre d\'affaires',
          data: periodes.map(p => p.chiffreAffaires),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Bénéfices',
          data: periodes.map(p => p.beneficeNet),
          backgroundColor: 'rgba(255, 206, 86, 0.7)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        },
        {
          label: 'Dépenses',
          data: periodes.map(p => p.totalDepenses),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Comparaison sur 3 périodes',
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'bar'>) => {
              const value = context.parsed.y;
              const label = context.dataset.label || '';
              return `${label}: ${Number(value).toLocaleString('fr-FR')} F CFA`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => typeof value === 'number'
              ? value.toLocaleString('fr-FR')
              : value
          }
        }
      }
    }
  });
}
private getPeriodePrecedente(): {
  chiffreAffaires: number,
  beneficeNet: number,
  totalDepenses: number
} {
  const startDate = new Date(this.dateDebut);
  const endDate = new Date(this.dateFin);

  // 1. Calculer la durée de la période actuelle en jours
  const dureePeriode = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // 2. Calculer les dates de la période précédente
  const startDatePrecedent = new Date(startDate);
  startDatePrecedent.setDate(startDate.getDate() - dureePeriode);

  const endDatePrecedent = new Date(startDate);
  endDatePrecedent.setDate(startDate.getDate() - 1);

  // 3. Filtrer les données pour la période précédente
  const depensesPrecedentes = this.allDepenses.filter(d =>
    this.resetTime(new Date(d.date)) >= this.resetTime(startDatePrecedent) &&
    this.resetTime(new Date(d.date)) <= this.resetTime(endDatePrecedent) &&
    (this.selectedMagasinId === -1 || d.magasinId === this.selectedMagasinId)
  );

  const recettesPrecedentes = this.allRecettes.filter(r =>
    this.resetTime(new Date(r.date)) >= this.resetTime(startDatePrecedent) &&
    this.resetTime(new Date(r.date)) <= this.resetTime(endDatePrecedent) &&
    (this.selectedMagasinId === -1 || r.magasinId === this.selectedMagasinId)
  );

  // 4. Calculer les indicateurs pour la période précédente
  const chiffreAffairesPrecedent = recettesPrecedentes
    .filter(r => {
      const categorie = this.categoriesRecette.find(c => c.id === r.categoryId);
      return categorie &&
             (categorie.name.toLowerCase().includes('vente') ||
              categorie.description?.toLowerCase().includes('vente'));
    })
    .reduce((sum, r) => sum + r.montant, 0);

  const autresRecettesPrecedent = recettesPrecedentes
    .filter(r => {
      const categorie = this.categoriesRecette.find(c => c.id === r.categoryId);
      return !categorie ||
             (!categorie.name.toLowerCase().includes('vente') &&
              !categorie.description?.toLowerCase().includes('vente'));
    })
    .reduce((sum, r) => sum + r.montant, 0);

  const totalDepensesPrecedent = depensesPrecedentes.reduce((sum, d) => sum + d.montant, 0);
  const beneficeNetPrecedent = (chiffreAffairesPrecedent + autresRecettesPrecedent) - totalDepensesPrecedent;

  return {
    chiffreAffaires: chiffreAffairesPrecedent,
    beneficeNet: beneficeNetPrecedent,
    totalDepenses: totalDepensesPrecedent
  };
}

// Helper pour calculer l'évolution
private calculerEvolution(valeurActuelle: number, valeurPrecedente: number): {
  valeur: number,
  tendance: '↑' | '↓' | '→'
} {
  if (valeurPrecedente === 0) return { valeur: 0, tendance: '→' };

  const evolution = ((valeurActuelle - valeurPrecedente) / valeurPrecedente) * 100;
  return {
    valeur: Math.round(evolution),
    tendance: evolution > 0 ? '↑' : evolution < 0 ? '↓' : '→'
  };
}
  getStatistiquesModesPaiementArray(recettes: Recette[]): { mode: string, montantTotal: number, occurrences: number }[] {
    const statsMap = new Map<string, { montantTotal: number, occurrences: number }>();

    recettes.forEach(recette => {
        const current = statsMap.get(recette.paymentMode) || { montantTotal: 0, occurrences: 0 };
        statsMap.set(recette.paymentMode, {
            montantTotal: current.montantTotal + recette.montant,
            occurrences: current.occurrences + 1
        });
    });

    return Array.from(statsMap.entries()).map(([mode, stats]) => ({
        mode,
        ...stats
    }));
  }

  mettreAJourGraphiques(): void {
    this.creerGraphiqueEvolution();
    this.creerGraphiqueDepenses();
    this.creerGraphiqueRecettes();
    this.creerGraphiqueTendances();
  }

  creerGraphiqueEvolution(): void {
    if (this.evolutionChart) {
      this.evolutionChart.destroy();
    }

    const ctx = this.evolutionChartRef?.nativeElement.getContext('2d');
    if (ctx) {
      this.evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.getDatesBetween(new Date(this.dateDebut), new Date(this.dateFin)).map(d => this.formatDateForChart(d)),
          datasets: [
            {
              label: 'Entrées (Recettes)',
              data: this.getDonneesJournalieres('RECETTE'),
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.3
            },
            {
              label: 'Sorties (Dépenses)',
              data: this.getDonneesJournalieres('DEPENSE'),
              borderColor: '#F44336',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Évolution des flux financiers'
            }
          }
        }
      });
    }
  }

  creerGraphiqueDepenses(): void {
    if (this.depensesChart) {
        this.depensesChart.destroy();
    }

    const ctx = this.depensesChartRef?.nativeElement.getContext('2d');
    if (ctx) {
        // Filtrer les catégories pour ne garder que celles avec des dépenses
        const categoriesAvecDepenses = this.categoriesDepense
            .map(c => {
                const totalMontant = this.filteredDepenses
                    .filter(d => d.categoryId === c.id &&
                        this.resetTime(new Date(d.date)) >= this.resetTime(new Date(this.dateDebut)) &&
                        this.resetTime(new Date(d.date)) <= this.resetTime(new Date(this.dateFin)))
                    .reduce((sum, d) => sum + d.montant, 0);

                return { name: c.name, totalMontant };
            })
            .filter(c => c.totalMontant > 0); // Garder uniquement les catégories ayant des dépenses

        // Extraire les labels et les montants valides
        const labels = categoriesAvecDepenses.map(c => c.name);
        const data = categoriesAvecDepenses.map(c => c.totalMontant);

        this.depensesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Répartition des dépenses'
                    },
                    legend: {
                        display: labels.length > 0 // Afficher la légende seulement si des données existent
                    }
                }
            }
        });
    }
}

creerGraphiqueRecettes(): void {
  if (this.recettesChart) {
    this.recettesChart.destroy();
  }

  const ctx = this.recettesChartRef?.nativeElement.getContext('2d');
  if (ctx) {
    // Filtrer les catégories avec des recettes > 0
    const categoriesAvecRecettes = this.categoriesRecette
      .map(c => {
        const totalMontant = this.filteredRecettes
          .filter(r => r.categoryId === c.id &&
            this.resetTime(new Date(r.date)) >= this.resetTime(new Date(this.dateDebut)) &&
            this.resetTime(new Date(r.date)) <= this.resetTime(new Date(this.dateFin)))
          .reduce((sum, r) => sum + r.montant, 0);

        return { name: c.name, totalMontant };
      })
      .filter(c => c.totalMontant > 0);

    const labels = categoriesAvecRecettes.map(c => c.name);
    const data = categoriesAvecRecettes.map(c => c.totalMontant);

    this.recettesChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Sources de revenus'
          },
          legend: {
            display: labels.length > 0 // Légende visible uniquement s’il y a des données
          }
        }
      }
    });
  }
}

async impression() {
  this.isPrinting = true;

  // 1. Préparer les graphiques AVANT le clonage
  await this.prepareChartsForExport();

  // 2. Obtenir l'élément original
  const printContent = document.getElementById('rapport');
  if (!printContent) return;

  // 3. Convertir les canvas en images dans l'ORIGINAL avant clonage
  await this.convertChartsToImages(printContent);

  // 4. Maintenant cloner l'élément avec les images déjà converties
  const clone = printContent.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.width = '100%';
  clone.id = 'print-clone';

  // 5. Styles d'impression
  const style = document.createElement('style');
  style.innerHTML = `
    body > * {
      display: none !important;
    }
    #print-clone {
      display: block !important;
      visibility: visible !important;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white;
    }
    .no-printer {
      display: none !important;
    }
    .printer-only {
      display: block !important;
    }
  `;

  document.body.appendChild(style);
  document.body.appendChild(clone);

  // 6. Délai plus long pour assurer le rendu
  setTimeout(() => {
    window.print();

    // 7. Nettoyage
    document.body.removeChild(clone);
    document.head.removeChild(style);
    this.isPrinting = false;

    // 8. Re-créer les graphiques dans l'original si nécessaire
    this.recreateCharts();
  }, 800); // Délai augmenté
}

private recreateCharts() {
  // Implémentez la recréation des graphiques si nécessaire
  // Par exemple: this.initCharts();
  this.prepareChartsForExport(); // Redessine les graphiques dans la nouvelle fenêtre
}

private async convertChartsToImages(element: HTMLElement) {
  const canvases = element.querySelectorAll('canvas');

  for (const canvas of Array.from(canvases)) {
    const canvasEl = canvas as HTMLCanvasElement;

    // Créer une image de haute qualité
    const img = new Image();
    img.src = canvasEl.toDataURL('image/png', 1.0);
    img.style.width = canvasEl.offsetWidth + 'px';
    img.style.height = canvasEl.offsetHeight + 'px';

    // Créer un conteneur pour préserver l'espacement
    const container = document.createElement('div');
    container.style.width = canvasEl.offsetWidth + 'px';
    container.style.height = canvasEl.offsetHeight + 'px';
    container.appendChild(img);

    // Remplacer le canvas
    canvasEl.parentNode?.replaceChild(container, canvasEl);

    // Petite pause entre chaque conversion
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}


  // Méthodes d'export
  async exportToPDF() {
    this.isGeneratingPDF = true; // Afficher le loader
    this.progress = 0; // Initialisation de la barre de progression

    this.isPrinting = true; // Afficher les éléments avant la capture
    await this.prepareChartsForExport();

    const noPrintElements = document.querySelectorAll('.no-printer');
    noPrintElements.forEach(el => el.classList.add('d-none'));

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const element = document.getElementById('rapport');
      if (!element) {
        console.error("Élément 'rapport' non trouvé.");
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a3');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
      });

      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = margin;
      let currentHeight = imgHeight;

      let stepCount = Math.ceil(canvas.height / (pageHeight - 2 * margin)); // Nombre total d'étapes
      let step = 0; // Étape actuelle

      if (currentHeight > pageHeight - 2 * margin) {
        let pageCanvas = document.createElement('canvas');
        let pageCtx = pageCanvas.getContext('2d');

        let sX = 0, sY = 0, dX = canvas.width, dY = (pageHeight - 2 * margin) * (canvas.width / imgWidth);

        while (sY < canvas.height) {
          pageCanvas.width = dX;
          pageCanvas.height = dY;
          pageCtx?.drawImage(canvas, sX, sY, dX, dY, 0, 0, dX, dY);

          let pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, dY * (imgWidth / dX));

          sY += dY;
          step++; // Incrémentation de la progression
          this.progress = Math.round((step / stepCount) * 100); // Mise à jour de la barre

          if (sY < canvas.height) {
            pdf.addPage();
          }

          await new Promise(resolve => setTimeout(resolve, 100)); // Délai pour voir la progression
        }
      } else {
        let imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        this.progress = 100; // Fin de la progression
      }

      pdf.save('rapport_stock.pdf');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
    } finally {
      noPrintElements.forEach(el => el.classList.remove('d-none'));
      this.isPrinting = false;
      this.isGeneratingPDF = false; // Cacher le loader après la génération
      this.progress = 0;
    }
  }


  // Ajoutez cette méthode à votre composant
async prepareChartsForExport() {
  const charts = [
    this.evolutionChart,
    this.depensesChart,
    this.recettesChart,
    this.tendancesChart
  ];

  // Forcer le rendu des graphiques
  charts.forEach(chart => {
    if (chart) {
      chart.resize();
      chart.render();
    }
  });

  // Attendre que les graphiques soient rendus
  await new Promise(resolve => setTimeout(resolve, 400));
}

async exportToExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rapport Financier';
  workbook.created = new Date();
  workbook.modified = new Date();

  const getStyle = (options: Partial<ExcelJS.Style>): Partial<ExcelJS.Style> => ({
    font: { size: 11, ...options.font },
    alignment: { vertical: 'middle', horizontal: 'center', ...options.alignment },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      ...options.border
    },
    fill: options.fill
  });

  const headerStyle = getStyle({
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }
  });

  const titleStyle = getStyle({
    font: { bold: true, size: 14 }
  });

  const dataStyle = getStyle({});

  /** Résumé **/
  const summarySheet = workbook.addWorksheet('Résumé');
  summarySheet.mergeCells('A1:F2');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'Rapport Financier';
  Object.assign(titleCell.style, titleStyle);

  summarySheet.addRow(['Entreprise', 'Nom de l\'Entreprise', '', 'Date', new Date().toISOString().slice(0, 10)]);
  summarySheet.addRow(['Période', `${this.dateDebut} au ${this.dateFin}`, '', 'Magasin', this.selectedMagasinId !== -1 ? this.getNomMagasin(this.selectedMagasinId) : 'Tous']);
  summarySheet.addRow([]);

  summarySheet.addRow(['Indicateurs', 'Valeur']);
  const lastRow = summarySheet.lastRow;
  if (lastRow) {
    lastRow.eachCell(cell => {
      Object.assign(cell.style, headerStyle);
    });
  }
 /*  summarySheet.getRow(summarySheet.lastRow.number).eachCell(cell => {
    Object.assign(cell.style, headerStyle);
  }); */

  const indicators = [
    ['Chiffre d\'affaires', `${this.chiffreAffaires.toLocaleString()} F CFA`],
    ['Dépenses totales', `${this.totalDepenses.toLocaleString()} F CFA`],
    ['Autres recettes', `${this.autresRecettes.toLocaleString()} F CFA`],
    ['Bénéfice net', `${this.beneficeNet.toLocaleString()} F CFA`],
    ['Solde de trésorerie', `${this.soldeTresorerie.toLocaleString()} F CFA`],
    ['Évolution CA', `${this.evolutionCA.pourcentage}% ${this.evolutionCA.tendance === 'hausse' ? '↑' : '↓'}`]
  ];

  indicators.forEach(row => {
    const r = summarySheet.addRow(row);
    r.eachCell(cell => Object.assign(cell.style, dataStyle));
  });

  /** Flux Trésorerie **/
  const cashflowSheet = workbook.addWorksheet('Flux Trésorerie');
  cashflowSheet.mergeCells('A1:B1');
  const cfTitleCell = cashflowSheet.getCell('A1');
  cfTitleCell.value = 'Flux de Trésorerie';
  Object.assign(cfTitleCell.style, titleStyle);

  cashflowSheet.addRow(['Libellé', 'Montant (F CFA)']).eachCell(cell => Object.assign(cell.style, headerStyle));

  const cashflowData = [
    ['Solde initial', this.fluxTresorerie.soldeInitial],
    ['Entrées', this.fluxTresorerie.recettesPeriod],
    ['Sorties', this.fluxTresorerie.depensesPeriod],
    ['Solde final', this.fluxTresorerie.soldeFinal]
  ];
  cashflowData.forEach(row => {
    const r = cashflowSheet.addRow(row);
    r.eachCell(cell => Object.assign(cell.style, dataStyle));
  });

  /** Dépenses **/
  const expensesSheet = workbook.addWorksheet('Dépenses');
  expensesSheet.mergeCells('A1:D1');
  expensesSheet.getCell('A1').value = 'Détail des Dépenses';
  Object.assign(expensesSheet.getCell('A1').style, titleStyle);

  expensesSheet.columns = [
    { header: 'Catégorie', key: 'category', width: 25 },
    { header: 'Montant', key: 'amount', width: 15 },
    { header: 'Transactions', key: 'transactions', width: 15 },
    { header: 'Pourcentage', key: 'percentage', width: 15 }
  ];
  expensesSheet.getRow(2).eachCell(cell => Object.assign(cell.style, headerStyle));

  this.categoriesDepense.forEach(cat => {
    const stats = this.getOccurenceDepensesByCategory(cat.id ?? 0);
    expensesSheet.addRow({
      category: cat.name,
      amount: stats.montantTotal,
      transactions: stats.occurrences,
      percentage: `${(stats.montantTotal / this.totalDepenses * 100).toFixed(2)}%`
    });
  });

  /** Recettes **/
  const incomeSheet = workbook.addWorksheet('Recettes');
  incomeSheet.mergeCells('A1:D1');
  incomeSheet.getCell('A1').value = 'Détail des Recettes';
  Object.assign(incomeSheet.getCell('A1').style, titleStyle);

  incomeSheet.columns = [
    { header: 'Catégorie', key: 'category', width: 25 },
    { header: 'Montant', key: 'amount', width: 15 },
    { header: 'Transactions', key: 'transactions', width: 15 },
    { header: 'Pourcentage', key: 'percentage', width: 15 }
  ];
  incomeSheet.getRow(2).eachCell(cell => Object.assign(cell.style, headerStyle));

  this.categoriesRecette.forEach(cat => {
    const stats = this.getOccurenceRecettesByCategory(cat.id ?? 0);
    incomeSheet.addRow({
      category: cat.name,
      amount: stats.montantTotal,
      transactions: stats.occurrences,
      percentage: `${(stats.montantTotal / (this.chiffreAffaires + this.autresRecettes) * 100).toFixed(2)}%`
    });
  });

  /** Transactions **/
  const transactionsSheet = workbook.addWorksheet('Transactions');
  transactionsSheet.mergeCells('A1:D1');
  transactionsSheet.getCell('A1').value = 'Détail des Transactions';
  Object.assign(transactionsSheet.getCell('A1').style, titleStyle);

  transactionsSheet.addRow(['Dépenses']).getCell(1).style = {
    font: { bold: true, size: 12, color: { argb: 'FFFF0000' } }
  };

  transactionsSheet.columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Catégorie', key: 'category', width: 25 },
    { header: 'Montant', key: 'amount', width: 15 },
    { header: 'Mode Paiement', key: 'payment', width: 20 }
  ];

  transactionsSheet.getRow(transactionsSheet.rowCount).eachCell(cell => Object.assign(cell.style, headerStyle));

  this.filteredDepenses.forEach(dep => {
    transactionsSheet.addRow({
      date: new Date(dep.date).toISOString().slice(0, 10),
      category: this.getNomCategorieBis(dep.categoryId),
      amount: dep.montant,
      payment: dep.paymentMode
    });
  });

  transactionsSheet.addRow([]);
  transactionsSheet.addRow(['Recettes']).getCell(1).style = {
    font: { bold: true, size: 12, color: { argb: 'FF008000' } }
  };

  this.filteredRecettes.forEach(rec => {
    transactionsSheet.addRow({
      date: new Date(rec.date).toISOString().slice(0, 10),
      category: this.getNomCategorieBis(rec.categoryId),
      amount: rec.montant,
      payment: rec.paymentMode
    });
  });

  /** Génération du fichier Excel **/
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `rapport_financier_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

  // Méthodes utilitaires
  private getDatesBetween(start: Date, end: Date): Date[] {
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  /* getDepensesByCategory(id:number){
    return this.filteredDepenses
    .filter(d => d.categoryId === id &&
      this.resetTime(new Date(d.date)) >= this.resetTime(new Date(this.dateDebut)) &&
      this.resetTime(new Date(d.date)) <= this.resetTime(new Date(this.dateFin)))
    .reduce((sum, d) => sum + d.montant, 0)
  } */
  getOccurenceDepensesByCategory(id: number): { montantTotal: number, occurrences: number } {
    const depensesFiltrees = this.filteredDepenses.filter(d =>
        d.categoryId === id &&
        this.resetTime(new Date(d.date)) >= this.resetTime(new Date(this.dateDebut)) &&
        this.resetTime(new Date(d.date)) <= this.resetTime(new Date(this.dateFin))
    );

    return {
        montantTotal: depensesFiltrees.reduce((sum, d) => sum + d.montant, 0),
        occurrences: depensesFiltrees.length
    };
}
  /* getRecettesByCategory(id:number){
    return this.filteredRecettes
    .filter(d => d.categoryId === id &&
      this.resetTime(new Date(d.date)) >= this.resetTime(new Date(this.dateDebut)) &&
      this.resetTime(new Date(d.date)) <= this.resetTime(new Date(this.dateFin)))
    .reduce((sum, d) => sum + d.montant, 0)
  } */

  getOccurenceRecettesByCategory(id: number): { montantTotal: number, occurrences: number } {
    const depensesFiltrees = this.filteredRecettes.filter(d =>
        d.categoryId === id &&
        this.resetTime(new Date(d.date)) >= this.resetTime(new Date(this.dateDebut)) &&
        this.resetTime(new Date(d.date)) <= this.resetTime(new Date(this.dateFin))
    );

    return {
        montantTotal: depensesFiltrees.reduce((sum, d) => sum + d.montant, 0),
        occurrences: depensesFiltrees.length
    };
}
  private getDonneesJournalieres(type: 'DEPENSE' | 'RECETTE'): number[] {
    const source = type === 'DEPENSE' ? this.filteredDepenses : this.filteredRecettes;
    const dates = this.getDatesBetween(new Date(this.dateDebut), new Date(this.dateFin));

    return dates.map(date => {
      return source
        .filter(item => this.resetTime(new Date(item.date)).getTime() === this.resetTime(date).getTime())
        .reduce((sum, item) => sum + item.montant, 0);
    });
  }

  private resetTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateForChart(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  public getNomMagasin(id: number): string {
    const magasin = this.magasins.find(m => m.id === id);
    return magasin ? magasin.nom : 'Inconnu';
  }

  private getNomCategorie(id: number): string {
    const categorie = this.allCategories.find(c => c.id === id);
    return categorie ? categorie.name : 'Inconnue';
  }
  public getNomCategorieBis(id: number): string {
    const categorie = this.allCategories.find(c => c.id === id);
    return categorie ? categorie.name : 'Inconnue';
  }

  private async preparerGraphiquesPourExport(): Promise<void> {
    const charts = [this.evolutionChart, this.depensesChart, this.recettesChart];
    charts.forEach(chart => chart?.resize());
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  setItemsPerPage(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage =1;
    this.currentPagerecette =1;
    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  // Gestion de la recherche
  onSearchChange(typeSearch: string): void {
    const search = this.removeAccents(this.searchTerm.toLowerCase());

    if (typeSearch === 'depense') {
      this.filteredDepenses = this.allDepenses.filter(dep =>
        this.removeAccents(dep.paymentMode?.toLowerCase()).includes(search) ||
        this.removeAccents(this.getNomCategorie(dep.categoryId).toLowerCase()).includes(search)
      );
      this.currentPage = 1;
    }
    else if (typeSearch === 'recette') {
      this.filteredRecettes = this.allRecettes.filter(rec =>
        this.removeAccents(rec.paymentMode?.toLowerCase()).includes(search) ||
        this.removeAccents(this.getNomCategorie(rec.categoryId)?.toLowerCase()).includes(search)
      );
      this.currentPagerecette = 1;
    }
    else {
      console.log('Aucun choix correspondant');
    }
  }
  /**
   * Supprime les accents des chaînes de caractères
   */
  removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  updateMaxItems() {
    const produitsLength = this.filteredDepenses ? this.filteredDepenses.length : 0;
    const mouvementsLength = this.filteredRecettes ? this.filteredRecettes.length : 0;
    this.maxItems = Math.max(produitsLength, mouvementsLength);
  }

  get getPaginatedDepense() {
    return this.paginate(this.filteredDepenses, this.currentPage, this.pageSize);
  }

  get getPaginatedRcette() {
    return this.paginate(this.filteredRecettes, this.currentPagerecette, this.pageSize);
  }
  paginate(data: any[], currentPage: number, itemsPerPage: number): any[] {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }


  onPageChange(page: number, typeTable:string): void {
    if(typeTable ==='depense'){
      this.currentPage = page;
    }
    else if(typeTable ==='recette') {
      this.currentPagerecette = page;
    }
    else {
      console.log('Aucun choix correspondant')
    }
  }
  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.pageSize);
  }


}
