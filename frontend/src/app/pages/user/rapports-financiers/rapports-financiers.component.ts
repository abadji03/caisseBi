import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { Chart, ChartConfiguration, registerables, TooltipItem } from 'chart.js';
import * as ExcelJS from 'exceljs';
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
    const recettesPrecedentes = this.allRecettes.filter(r => {
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
private calculerFluxTresorerie(): {
  soldeInitial: number,
  recettesPeriod: number,
  depensesPeriod: number,
  soldeFinal: number
} {
  // 1. Solde initial (somme de toutes les entrées/sorties AVANT la période)
  const soldeInitial = this.allRecettes
    .filter(r => new Date(r.date) < new Date(this.dateDebut))
    .reduce((sum, r) => sum + r.montant, 0)
    -
    this.allDepenses
    .filter(d => new Date(d.date) < new Date(this.dateDebut))
    .reduce((sum, d) => sum + d.montant, 0);

  // 2. Recettes/Dépenses de la période
  const recettesPeriod = this.filteredRecettes.reduce((sum, r) => sum + r.montant, 0);
  const depensesPeriod = this.filteredDepenses.reduce((sum, d) => sum + d.montant, 0);

  // 3. Solde final
  const soldeFinal = soldeInitial + recettesPeriod - depensesPeriod;

  return { soldeInitial, recettesPeriod, depensesPeriod, soldeFinal };
}

// Nouvelle méthode pour les tendances
private calculerTendances(): {
  evolutionCA: { valeur: number, tendance: '↑' | '↓' | '→' },
  evolutionBenefices: { valeur: number, tendance: '↑' | '↓' | '→' },
  evolutionCouts: { valeur: number, tendance: '↑' | '↓' | '→' }
} {
  // Calcul des valeurs de la période précédente (utilisez la méthode existante calculerSoldeEtEvolution)
  const periodePrecedente = this.getPeriodePrecedente();

  // Évolution en %
  const evolutionCA = this.calculerEvolution(
    this.chiffreAffaires,
    periodePrecedente.chiffreAffaires
  );

  const evolutionBenefices = this.calculerEvolution(
    this.beneficeNet,
    periodePrecedente.beneficeNet
  );

  const evolutionCouts = this.calculerEvolution(
    this.totalDepenses,
    periodePrecedente.totalDepenses
  );

  return { evolutionCA, evolutionBenefices, evolutionCouts };
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
  const startDate = new Date(this.dateDebut);
  const endDate = new Date(this.dateFin);

  // Calculer la durée de la période en jours
  const dureePeriode = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Calculer les dates de la période décalée
  const startDateDecale = new Date(startDate);
  startDateDecale.setDate(startDate.getDate() + (decalage * dureePeriode));

  const endDateDecale = new Date(endDate);
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


  // Méthodes d'export
  async exportToPDF(): Promise<void> {
    this.isGeneratingPDF = true;
    this.progress = 0;

    await this.preparerGraphiquesPourExport();

    const element = document.getElementById('rapport-financier');
    if (!element) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const canvas = await html2canvas(element, { scale: 2 });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = pdf.internal.pageSize.getWidth() - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save('rapport-financier.pdf');

    this.isGeneratingPDF = false;
    this.progress = 100;
  }

  async exportToExcel(): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    // Feuille Résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    summarySheet.addRow(['Rapport Financier']);
    summarySheet.addRow(['Période', `${this.dateDebut} au ${this.dateFin}`]);
    summarySheet.addRow(['Magasin', this.selectedMagasinId === -1 ? 'Tous' : this.getNomMagasin(this.selectedMagasinId)]);
    summarySheet.addRow([]);

    // Indicateurs clés
    summarySheet.addRow(['Indicateur', 'Valeur']);
    summarySheet.addRow(['Chiffre d\'affaires', this.chiffreAffaires]);
    summarySheet.addRow(['Dépenses totales', this.totalDepenses]);
    summarySheet.addRow(['Autres recettes', this.autresRecettes]);
    summarySheet.addRow(['Bénéfice net', this.beneficeNet]);

    // Feuille Dépenses
    const depensesSheet = workbook.addWorksheet('Dépenses');
    depensesSheet.addRow(['Date', 'Catégorie', 'Montant', 'Mode paiement', 'Description']);
    this.filteredDepenses.forEach(d => {
      depensesSheet.addRow([
        new Date(d.date).toLocaleDateString(),
        this.getNomCategorie(d.categoryId),
        d.montant,
        d.paymentMode,
        d.description
      ]);
    });

    // Feuille Recettes
    const recettesSheet = workbook.addWorksheet('Recettes');
    recettesSheet.addRow(['Date', 'Catégorie', 'Montant', 'Mode paiement', 'Description']);
    this.filteredRecettes.forEach(r => {
      recettesSheet.addRow([
        new Date(r.date).toLocaleDateString(),
        this.getNomCategorie(r.categoryId),
        r.montant,
        r.paymentMode,
        r.description
      ]);
    });

    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rapport-financier_${new Date().toISOString().slice(0,10)}.xlsx`;
    a.click();
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

  private getNomMagasin(id: number): string {
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
