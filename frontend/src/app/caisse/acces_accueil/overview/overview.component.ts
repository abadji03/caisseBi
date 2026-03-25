/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  OnDestroy,
} from '@angular/core';
import { Chart } from 'chart.js';
import { Chart as ChartJS, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Magasin } from '../../../modeles/magasin.model'
import { User } from '../../../modeles/user.model';
import { AuthService } from '../../../services/auth.service';
import { KpiCaisseService } from '../../../services/kpi-caisse.service';
import { RapportStockService } from '../../../services/rapport-stock.service';
import { RapportsFinanciersService } from '../../../services/rapports-financiers.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { ToastrService } from 'ngx-toastr';
import { finalize, forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { DonneesFinancieresDashboard, DonneesStockDashboard, DonneesVentesDashboard } from '../../../modeles/kpiCaisse.model';

// Enregistrer les éléments nécessaires dans Chart.js
ChartJS.register(...registerables);

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit, OnDestroy {

  @ViewChild('evolutionVentesChart') evolutionVentesChartRef!: ElementRef;
  @ViewChild('paiementsChart') paiementsChartRef!: ElementRef;
  @ViewChild('stockEvolutionChart') stockEvolutionChartRef!: ElementRef;
  @ViewChild('evolutionFinanciereChart') evolutionFinanciereChartRef!: ElementRef;
  @ViewChild('depensesChart') depensesChartRef!: ElementRef;
  @ViewChild('recettesChart') recettesChartRef!: ElementRef;

  // Graphiques
  evolutionVentesChart: Chart | undefined;
  paiementsChart: Chart | undefined;
  stockEvolutionChart: Chart | undefined;
  evolutionFinanciereChart: Chart | undefined;
  depensesChart: Chart | undefined;
  recettesChart: Chart | undefined;

  // Services
  private authService = inject(AuthService);
  private kpiService = inject(KpiCaisseService);
  private stockService = inject(RapportStockService);
  private financeService = inject(RapportsFinanciersService);
  private magasinService = inject(MaagasinsService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  // Données
  donneesVentes: DonneesVentesDashboard | null = null;
  donneesStock: DonneesStockDashboard | null = null;
  donneesFinancieres: DonneesFinancieresDashboard | null = null;

  // Filtres
  dateGeneration = new Date();
  dateDebut = '';
  dateFin = '';
  dateReference = '';
  periodeSelectionnee = 'mois'; // Par défaut: mois en cours
  periodesDisponibles = [
    { value: 'jour', label: 'Aujourd\'hui' },
    { value: 'semaine', label: 'Cette semaine' },
    { value: 'mois', label: 'Ce mois' },
    { value: 'annee', label: 'Cette année' },
    { value: 'personnalisee', label: 'Période personnalisée' }
  ];

  magasins: Magasin[] = [];
  selectedMagasinId = -1;
  code_structure: string | null = null;
  currentUser: User | null = null;

  // États
  isLoading = false;
  errorMessage = '';
  isPrinting = false;
  isAdmin = false;

  private userSubscription!: Subscription;

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      this.code_structure = user?.code_structure || null;
      this.isAdmin = this.authService.hasRole('Administrateur');

      if (this.code_structure) {
        this.initDateFilters();
        this.chargerMagasins();
        this.chargerDonneesDashboard();
      } else {
        this.errorMessage = 'Code structure non disponible';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.detruireGraphiques();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private detruireGraphiques(): void {
    const charts = [
      this.evolutionVentesChart,
      this.paiementsChart,
      this.stockEvolutionChart,
      this.evolutionFinanciereChart,
      this.depensesChart,
      this.recettesChart
    ];
    charts.forEach(chart => {
      if (chart) {
        try {
          chart.destroy();
        } catch (e) {
          console.warn('Erreur destruction graphique:', e);
        }
      }
    });
  }

  initDateFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.dateDebut = this.formatDate(firstDayOfMonth);
    this.dateFin = this.formatDate(today);
    this.dateReference = this.formatDate(today);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  chargerMagasins(): void {
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (magasins) => {
          this.magasins = magasins;
        },
        error: (err) => {
          console.error('Erreur chargement magasins:', err);
        }
      });
  }

  construireFiltresCommuns(): any {
    const filters: any = {
      code_structure: this.code_structure
    };

    if (this.selectedMagasinId !== -1) {
      filters.magasinId = this.selectedMagasinId;
    }

    // Gestion de la période
    if (this.periodeSelectionnee !== 'personnalisee') {
      filters.periode = this.periodeSelectionnee;
      if (this.dateReference) {
        filters.dateReference = this.dateReference;
      }
    } else if (this.dateDebut && this.dateFin) {
      filters.fromDate = this.dateDebut;
      filters.toDate = this.dateFin;
    }

    return filters;
  }

  chargerDonneesDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filters = this.construireFiltresCommuns();

    // Préparer les appels API pour chaque section
    const ventes$ = this.kpiService.getRapportVente({
      ...filters,
      page: 1,
      limit: 10
    });

    const stock$ = forkJoin({
      indicateurs: this.stockService.getIndicateursStocks(filters),
      mouvements: this.stockService.getMouvementsPeriode({ ...filters, page: 1, limit: 10 }),
      evolutionStock: this.stockService.getStatsGraphiques({ ...filters })
    });

    const finance$ = forkJoin({
      indicateurs: this.financeService.getIndicateursFinanciers(filters),
      depenses: this.financeService.getDepensesDetaillees(filters),
      recettes: this.financeService.getRecettesDetaillees(filters),
      repartitionDepenses: this.financeService.getRepartitionDepenses(filters),
      repartitionRecettes: this.financeService.getRepartitionRecettes(filters),
      evolution: this.financeService.getDonneesEvolutives({ ...filters, groupBy: 'jour' })
    });

    forkJoin({
      ventes: ventes$,
      stock: stock$,
      finance: finance$
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (resultats) => {
        this.traiterDonneesVentes(resultats.ventes);
        this.traiterDonneesStock(resultats.stock);
        this.traiterDonneesFinancieres(resultats.finance);

        setTimeout(() => {
          this.creerGraphiques();
        }, 200);
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des données';
        this.toastr.error(this.errorMessage);
        console.error('Erreur dashboard:', err);
      }
    });
  }

  private traiterDonneesVentes(data: any): void {
    if (!data) return;

    this.donneesVentes = {
      totalVentes: data.totalVentes || 0,
      nbTransactions: data.ventes?.length || 0,
      caTTC: data.chiffreAffairesTTC || 0,
      caHT: data.chiffreAffairesHT || 0,
      marge: data.margeBeneficiaire || 0,
      tauxMarge: data.chiffreAffairesHT ? (data.margeBeneficiaire / data.chiffreAffairesHT) * 100 : 0,
      ticketMoyen: data.ticketMoyen || 0,
      evolutionParJour: data.evolutionParJour || [],
      modesPaiement: data.statmodesPaiement || [],
      topProduits: (data.topProduits || []).slice(0, 5)
    };
  }

  private traiterDonneesStock(data: any): void {
    if (!data.indicateurs) return;

    this.donneesStock = {
      totalProduits: data.indicateurs.totalProduits || 0,
      produitsUniques: data.indicateurs.produitsUniques || 0,
      valeurStockInitial: data.indicateurs.valeurStockInitial || 0,
      valeurStockFinalVente:data.indicateurs.valeurStockFinalVente||0,
      valeurStockInitialVente:data.indicateurs.valeurStockInitialVente||0,
      valeurStockFinal: data.indicateurs.valeurStockFinal || 0,
      produitsRupture: data.indicateurs.produitsRupture || 0,
      produitsEnAlerte: data.indicateurs.produitsEnAlerte || 0,
      produitsAReapprovisionner: data.indicateurs.produitsAReapprovisionner || 0,
      produitsEnSurStock: data.indicateurs.produitsEnSurStock || 0,
      produitsPerissable: data.indicateurs.produitsPerissable || 0,
      totalMouvements: data.mouvements?.total || 0,
      totalEntrees: data.mouvements?.mouvements?.filter((m: any) => m.typeMouvement === 'Entrée').length || 0,
      totalSorties: data.mouvements?.mouvements?.filter((m: any) => m.typeMouvement === 'Sortie').length || 0,
      graphique: data.evolutionStock || null,
      derniersMouvements: (data.mouvements?.mouvements || []).slice(0, 5)
    };
  }

  private traiterDonneesFinancieres(data: any): void {
    if (!data.indicateurs) return;

    const indicateurs = data.indicateurs;
    const repartitionDepenses = data.repartitionDepenses?.repartition || [];
    const repartitionRecettes = data.repartitionRecettes?.repartition || [];
    

    // Combiner dépenses et recettes pour les dernières transactions
    const dernieresTransactions = [
          ...(data.depenses.depenses || []).map((d: any) => ({ ...d, type: 'depense' })),
          ...(data.recettes.recettes || []).map((r: any) => ({ ...r, type: 'recette' }))
        ]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

    this.donneesFinancieres = {
      ca: indicateurs.chiffreAffaires || 0,
      beneficeNet: indicateurs.beneficeNet || 0,
      tauxMarge: indicateurs.chiffreAffaires ? (indicateurs.beneficeNet / indicateurs.chiffreAffaires) * 100 : 0,
      totalDepenses: indicateurs.totalDepenses || 0,
      nbDepenses: indicateurs.nbDepenses || 0,
      totalRecettes: indicateurs.totalRecettes || 0,
      nbRecettes: indicateurs.nbRecettes || 0,
      soldeInitial: indicateurs.fluxTresorerie?.soldeInitial || 0,
      soldeFinal: indicateurs.fluxTresorerie?.soldeFinal || 0,
      entrees: indicateurs.fluxTresorerie?.recettesPeriod || 0,
      sorties: indicateurs.fluxTresorerie?.depensesPeriod || 0,
      evolutionCA: indicateurs.evolutionCA || { pourcentage: 0, tendance: 'stable' },
      evolutionJournaliere: data.evolution?.donnees || [],
      topDepenses: repartitionDepenses.slice(0, 3).map((r: any) => ({
        categorieName: r.categorieName,
        pourcentage: r.pourcentage
      })),
      topRecettes: repartitionRecettes.slice(0, 3).map((r: any) => ({
        categorieName: r.categorieName,
        pourcentage: r.pourcentage
      })),
      dernieresTransactions
    };
  }

  private creerGraphiques(): void {
    this.detruireGraphiques();
    this.creerGraphiqueEvolutionVentes();
    this.creerGraphiquePaiements();
    this.creerGraphiqueEvolutionStock();
    this.creerGraphiqueEvolutionFinanciere();
    this.creerGraphiqueDepenses();
    this.creerGraphiqueRecettes();
  }

  private creerGraphiqueEvolutionVentes(): void {
    const ctx = this.evolutionVentesChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.donneesVentes?.evolutionParJour?.length) return;

    const donnees = this.donneesVentes.evolutionParJour; // Derniers 7 jours
    const labels = donnees.map((d: any) => {
      const date = new Date(d.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    this.evolutionVentesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'CA (F CFA)',
          data: donnees.map((d: any) => d.ca),
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${(context.raw as number).toLocaleString()} F CFA`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => (value as number).toLocaleString()
            }
          }
        }
      }
    });
  }

  private creerGraphiquePaiements(): void {
    const ctx = this.paiementsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.donneesVentes?.modesPaiement?.length) return;

    //const data = this.donneesVentes.modesPaiement.slice(0, 4);
    const couleurs = ['#0d6efd', '#198754', '#ffc107', '#dc3545','#9966FF', '#FF9F40'];

    this.paiementsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.donneesVentes.modesPaiement.map((d: any) => d.mode),
        datasets: [{
          data: this.donneesVentes.modesPaiement.map((d: any) => d.montantTotal),
          backgroundColor: couleurs.slice(0, this.donneesVentes.modesPaiement.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${(value).toLocaleString()} F CFA (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  creerGraphiqueEvolutionStock(): void {
  // Détruire le graphique existant
  if (this.stockEvolutionChart) {
    this.stockEvolutionChart.destroy();
    this.stockEvolutionChart = undefined;
  }

  // Vérifier les données
  if (!this.donneesStock?.graphique?.evolution.length) {
    return;
  }

  const ctx = this.stockEvolutionChartRef?.nativeElement?.getContext('2d');
  if (!ctx) return;

  const donnees = this.donneesStock.graphique.evolution;

  // Configuration simplifiée sans plugins complexes
  this.stockEvolutionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: donnees.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }),
      datasets: [
        {
          label: 'Stock total',
          data: donnees.map(d => d.solde),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Entrées',
          data: donnees.map(d => d.entrees),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Sorties',
          data: donnees.map(d => d.sorties),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          tension: 0.3,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.dataset.label}: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => value.toString()
          }
        }
      }
    }
  });
}

  private creerGraphiqueEvolutionFinanciere(): void {
    const ctx = this.evolutionFinanciereChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.donneesFinancieres?.evolutionJournaliere?.length) return;

    const donnees = this.donneesFinancieres.evolutionJournaliere;
    const labels = donnees.map((d: any) => {
      const date = new Date(d.periode);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    this.evolutionFinanciereChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Recettes',
            data: donnees.map((d: any) => d.recettes),
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            tension: 0.3
          },
          {
            label: 'Dépenses',
            data: donnees.map((d: any) => d.depenses),
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw as number;
                return `${label}: ${value.toLocaleString()} F CFA`;
              }
            }
          }
        }
      }
    });
  }

  private creerGraphiqueDepenses(): void {
    const ctx = this.depensesChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.donneesFinancieres?.topDepenses?.length) return;

    const donnees = this.donneesFinancieres.topDepenses;
    const couleurs = ['#dc3545', '#fd7e14', '#ffc107'];

    this.depensesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: donnees.map((d: any) => d.categorieName),
        datasets: [{
          data: donnees.map((d: any) => d.pourcentage),
          backgroundColor: couleurs.slice(0, donnees.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.raw}%`
            }
          }
        }
      }
    });
  }

  private creerGraphiqueRecettes(): void {
    const ctx = this.recettesChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.donneesFinancieres?.topRecettes?.length) return;

    const donnees = this.donneesFinancieres.topRecettes;
    const couleurs = ['#198754', '#20c997', '#0dcaf0'];

    this.recettesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: donnees.map((d: any) => d.categorieName),
        datasets: [{
          data: donnees.map((d: any) => d.pourcentage),
          backgroundColor: couleurs.slice(0, donnees.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.raw}%`
            }
          }
        }
      }
    });
  }

  // Gestionnaires d'événements
  onPeriodeChange(): void {
    if (this.periodeSelectionnee !== 'personnalisee') {
      this.dateDebut = '';
      this.dateFin = '';
    }
    this.appliquerFiltres();
  }

  appliquerFiltres(): void {
    if (this.periodeSelectionnee === 'personnalisee') {
      if (!this.dateDebut || !this.dateFin) {
        this.toastr.warning('Veuillez sélectionner une date de début et de fin');
        return;
      }
      if (new Date(this.dateDebut) > new Date(this.dateFin)) {
        this.toastr.warning('La date de début doit être antérieure à la date de fin');
        return;
      }
    }
    this.chargerDonneesDashboard();
  }

  rafraichirDonnees(): void {
    this.chargerDonneesDashboard();
    this.toastr.info('Rafraîchissement des données...');
  }

  getNomMagasin(id: number): string {
    const magasin = this.magasins.find(m => m.id === id);
    return magasin ? magasin.nom : 'Tous les magasins';
  }
  
}
