/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { finalize, Subject, Subscription, takeUntil } from 'rxjs';

import { Magasin } from '../../../modeles/magasin.model';
import { User } from '../../../modeles/user.model';
import { AuthService } from '../../../services/auth.service';
import { KpiCaisseService } from '../../../services/kpi-caisse.service';
import {
  RapportVenteParams,
  RapportVenteResponse,
  VendeurDetailsResponse,
  ComparaisonOptions,
  ComparaisonResponse,
  VendeurInfo,
} from '../../../modeles/kpiCaisse.model';
import { UserService } from '../../../services/user.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { StructureService } from '../../../services/structure.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-rapports-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-ventes.component.html',
  styleUrl: './rapports-ventes.component.css',
})
export class RapportsVentesComponent implements OnInit, OnDestroy,AfterViewInit {
  // Références aux canvas pour les graphiques
  @ViewChild('evolutionVentesChart') evolutionVentesChartRef!: ElementRef;
  @ViewChild('paiementsChart') paiementsChartRef!: ElementRef;
  @ViewChild('topProduitsChart') topProduitsChartRef!: ElementRef;
  @ViewChild('vendeurEvolutionChart') vendeurEvolutionChartRef!: ElementRef;
  @ViewChild('comparaisonChart') comparaisonChartRef!: ElementRef;

  // Graphiques
  evolutionVentesChart: Chart | undefined;
  paiementsChart: Chart | undefined;
  topProduitsChart: Chart | undefined;
  vendeurEvolutionChart: Chart | undefined;
  comparaisonChart: Chart | undefined;

  // Services
  private kpiService = inject(KpiCaisseService);
  private magasinService = inject(MaagasinsService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private pdfMakerService = inject(PdfMakerServiceService);
  private structureService = inject(StructureService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  // Filtres
  dateGeneration = new Date();
  dateDebut = '';
  dateFin = '';
  dateReference = '';

  private userSubscription!: Subscription;
  private destroy$ = new Subject<void>();

  // Périodes prédéfinies
  periodeSelectionnee = 'personnalisee';
  periodesDisponibles = [
    { value: 'jour', label: 'Aujourd\'hui' },
    { value: 'semaine', label: 'Cette semaine' },
    { value: 'mois', label: 'Ce mois' },
    { value: 'annee', label: 'Cette année' },
    { value: 'personnalisee', label: 'Période personnalisée' }
  ];

  // Données du composant
  magasins: Magasin[] = [];
  vendeurs: User[] = [];
  
  selectedMagasinId = -1;
  selectedVendeurId = -1;
  code_structure: string | null = null;
  currentUser: User | null = null;

  // État du composant
  isAdmin = false;
  isPrinting = false;
  isGeneratingPDF = false;
  isLoading = false;
  progress = 0;

  // Données du rapport
  rapportData: RapportVenteResponse | null = null;
  filteredVentes: any[] = [];

  // Indicateurs clés
  totalVentes = 0;
  chiffreAffairesHT = 0;
  chiffreAffairesTTC = 0;
  margeBeneficiaire = 0;
  ticketMoyen = 0;
  //panierMoyen = 0;
  evolutionCA: { valeur: number; tendance: '↑' | '↓' | '→' } = { valeur: 0, tendance: '→' };
  evolutionVolume: { valeur: number; tendance: '↑' | '↓' | '→' } = { valeur: 0, tendance: '→' };

  // Top listes
  topProduits: any[] = [];
  topClients: any[] = [];
  vendeursPerformance: any[] = [];
  statmodesPaiement: any[] = [];
  evolutionParJour: any[] = [];

  // Détails vendeur
  selectedVendeurDetails: VendeurInfo | null = null;
  showVendeurModal = false;
  vendeurStats: VendeurDetailsResponse|null = null;

  // Comparaison
  comparaisonType: 'periode' | 'vendeur' | 'magasin' = 'periode';
  comparaisonElement1: any = '';
  comparaisonElement2: any = '';
  comparaisonData: ComparaisonResponse | null = null;
  comparaisonLabels: string[] = [];
  comparisonOptions: ComparaisonOptions[] = [];
  
  // Pagination et recherche
  currentPage = 1;
  pageSize = 10;
  searchTerm = '';
  triVendeursPar: 'ca' | 'transactions' | 'moyenne' = 'ca';

  // Message d'erreur
  errorMessage = '';

  constructor() {
    try {
      Chart.register(...registerables);
      Chart.defaults.font.family = "'Helvetica', 'Arial', sans-serif";
      Chart.defaults.font.size = 12;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Chart.js:', error);
    }
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.code_structure = user?.code_structure || null;
      this.isAdmin = this.authService.hasRole('Administrateur');

      if (this.code_structure) {
        this.initDateFilters();
        this.loadMagasins();
        this.loadVendeurs();
        this.chargerRapport();
        this.loadStructureInfo();
      } else {
        this.errorMessage = 'Code structure non disponible';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    this.destroyGraphiques();
  }
  ngAfterViewInit(): void {
    if (this.rapportData) {
      requestAnimationFrame(() => this.mettreAJourGraphiques());
    }
  }
  private destroyGraphiques(): void {
    const charts = [
      this.evolutionVentesChart,
      this.paiementsChart,
      this.topProduitsChart,
      this.vendeurEvolutionChart,
      this.comparaisonChart
    ];
    
    charts.forEach(chart => {
      if (chart) {
        try {
          chart.destroy();
        } catch (e) {
          console.warn('Erreur lors de la destruction du graphique:', e);
        }
      }
    });
  }

  // Initialiser les filtres de date
  initDateFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.dateDebut = this.formatDate(firstDayOfMonth);
    this.dateFin = this.formatDate(today);
    this.dateReference = this.formatDate(today);
  }

  // Formater la date en YYYY-MM-DD
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Charger les magasins
  loadMagasins(): void {
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (magasins) => {
          this.magasins = magasins;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des magasins:', err);
        }
      });
  }

  // Charger les vendeurs
  loadVendeurs(): void {
    this.userService.getByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vendeurs) => {
          this.vendeurs = vendeurs.filter(v =>
            v.roles?.some(r => r.nom === 'Caissier' || r.nom === 'Gérant' || r.nom === 'Employé')
          );
        },
        error: (err) => {
          console.error('Erreur lors du chargement des vendeurs:', err);
        }
      });
  }

  // Charger les informations de la structure pour le PDF
  private loadStructureInfo(): void {
    this.structureService.getByCodeStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (structure) => {
          this.pdfMakerService.setStructureInfo(structure);
        },
        error: (err) => {
          console.error('Erreur chargement structure:', err);
        }
      });
  }

  // Construire les filtres pour l'API
  construireFiltres(): RapportVenteParams {
    const filters: RapportVenteParams = {
      code_structure: this.code_structure!
    };

    if (this.selectedMagasinId !== -1) {
      filters.magasinId = this.selectedMagasinId;
    }

    if (this.selectedVendeurId !== -1) {
      filters.agentId = this.selectedVendeurId;
    }

    // Gestion de la période
    if (this.periodeSelectionnee !== 'personnalisee') {
      filters.periode = this.periodeSelectionnee as 'jour' | 'semaine' | 'mois' | 'annee';
      if (this.dateReference) {
        filters.dateReference = this.dateReference;
      }
    } else if (this.dateDebut && this.dateFin) {
      filters.fromDate = this.dateDebut;
      filters.toDate = this.dateFin;
    }

    // Pagination et recherche
    filters.page = this.currentPage;
    filters.limit = this.pageSize;
    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }

    return filters;
  }

  // Charger le rapport de vente
  chargerRapport(): void {
    if (!this.code_structure) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.progress = 0;

    const filters = this.construireFiltres();

    this.kpiService.getRapportVente(filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          setTimeout(() => {
            this.progress = 0;
          }, 500);
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.rapportData = data;
          this.filteredVentes = data.ventes || [];
          this.mettreAJourIndicateurs();

          this.cdr.detectChanges();
          requestAnimationFrame(() => this.mettreAJourGraphiques());
          
          this.progress = 100;
          this.toastr.success('Rapport chargé avec succès');
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement du rapport';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement rapport:', err);
        }
      });
  }

  // Mettre à jour les indicateurs à partir des données
  mettreAJourIndicateurs(): void {
    if (!this.rapportData) return;

    this.totalVentes = this.rapportData.totalVentes || 0;
    this.chiffreAffairesTTC = this.rapportData.chiffreAffairesTTC || 0;
    this.chiffreAffairesHT = this.rapportData.chiffreAffairesHT || 0;
    this.margeBeneficiaire = this.rapportData.margeBeneficiaire || 0;
    this.ticketMoyen = this.rapportData.ticketMoyen || 0;
    //this.panierMoyen = this.rapportData.panierMoyen || 0;
    this.evolutionCA = this.rapportData.evolutionCA || { valeur: 0, tendance: '→' };
    this.evolutionVolume = this.rapportData.evolutionVolume || { valeur: 0, tendance: '→' };
    this.topProduits = this.rapportData.topProduits || [];
    this.topClients = this.rapportData.topClients || [];
    this.vendeursPerformance = this.rapportData.vendeursPerformance || [];
    this.statmodesPaiement = this.rapportData.statmodesPaiement || [];
    this.evolutionParJour = this.rapportData.evolutionParJour || [];
  }

  // ============================================
  // GRAPHIQUES
  // ============================================

  mettreAJourGraphiques(): void {
    this.destroyGraphiques();

    /* setTimeout(() => {
      try {
        if (this.evolutionParJour?.length && this.evolutionVentesChartRef?.nativeElement) {
          this.creerGraphiqueEvolutionVentes();
        }
        
        if (this.statmodesPaiement?.length && this.paiementsChartRef?.nativeElement) {
          this.creerGraphiquePaiements();
        }
        
        if (this.topProduits?.length && this.topProduitsChartRef?.nativeElement) {
          this.creerGraphiqueTopProduits();
        }
      } catch (error) {
        console.error('Erreur lors de la création des graphiques:', error);
      }
    }, 100); */
    requestAnimationFrame(() => {
      try {
        if (this.evolutionParJour?.length && this.evolutionVentesChartRef?.nativeElement) {
          this.creerGraphiqueEvolutionVentes();
        }
        if (this.statmodesPaiement?.length && this.paiementsChartRef?.nativeElement) {
          this.creerGraphiquePaiements();
        }
        if (this.topProduits?.length && this.topProduitsChartRef?.nativeElement) {
          this.creerGraphiqueTopProduits();
        }
        if (this.comparaisonData && this.comparaisonChartRef?.nativeElement) {
          this.creerGraphiqueComparaison();
        }
        if (this.vendeurStats && this.vendeurEvolutionChartRef?.nativeElement) {
          this.creerGraphiqueEvolutionVendeur(this.vendeurStats.evolution);
        }
      } catch (error) {
        console.error('Erreur lors de la création des graphiques:', error);
      }
    });
  }

  creerGraphiqueEvolutionVentes(): void {
    const ctx = this.evolutionVentesChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.evolutionParJour?.length) return;

    const labels = this.evolutionParJour.map(e => {
      const date = new Date(e.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const dataCA = this.evolutionParJour.map(e => e.ca);
    const dataVolume = this.evolutionParJour.map(e => e.nombreVentes);

    this.evolutionVentesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: "Chiffre d'affaires (F CFA)",
            data: dataCA,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            yAxisID: 'y',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Nombre de ventes',
            data: dataVolume,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
            fill: true,
          },
        ],
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
                const value = context.raw as number;
                return `${context.dataset.label}: ${value.toLocaleString('fr-FR')}`;
              },
            },
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: "Chiffre d'affaires (F CFA)",
            },
            ticks: {
              callback: (value) => (value as number).toLocaleString('fr-FR'),
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Nombre de ventes',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  creerGraphiquePaiements(): void {
    const ctx = this.paiementsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.statmodesPaiement?.length) return;

    const backgroundColors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
    ];

    this.paiementsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.statmodesPaiement.map(p => p.mode),
        datasets: [{
          data: this.statmodesPaiement.map(p => p.montantTotal),
          backgroundColor: backgroundColors.slice(0, this.statmodesPaiement.length),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value.toLocaleString('fr-FR')} F CFA (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  creerGraphiqueTopProduits(): void {
    const ctx = this.topProduitsChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !this.topProduits?.length) return;

    this.topProduitsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.topProduits.map(p => 
          p.produit.designation.length > 15 ? 
          p.produit.designation.substring(0, 15) + '...' : 
          p.produit.designation
        ),
        datasets: [
          {
            label: 'Quantité vendue',
            data: this.topProduits.map(p => p.quantite),
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: "Chiffre d'affaires (F CFA)",
            data: this.topProduits.map(p => p.ca),
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
        ],
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
                const value = context.raw as number;
                return `${context.dataset.label}: ${value.toLocaleString('fr-FR')}`;
              },
            },
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Quantité vendue',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: "Chiffre d'affaires (F CFA)",
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: (value) => (value as number).toLocaleString('fr-FR'),
            },
          },
        },
      },
    });
  }

  creerGraphiqueEvolutionVendeur(evolution: any[]): void {
    if (this.vendeurEvolutionChart) {
      this.vendeurEvolutionChart.destroy();
      this.vendeurEvolutionChart = undefined;
    }

    const ctx = this.vendeurEvolutionChartRef?.nativeElement?.getContext('2d');
    if (!ctx || !evolution?.length) return;

    const labels = evolution.map(e => {
      const date = new Date(e.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const dataCA = evolution.map(e => e.ca);
    const dataVolume = evolution.map(e => e.nombreVentes);

    this.vendeurEvolutionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: "Chiffre d'affaires (F CFA)",
            data: dataCA,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            yAxisID: 'y',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Nombre de ventes',
            data: dataVolume,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: 'Performance quotidienne',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: "Chiffre d'affaires (F CFA)",
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Nombre de ventes',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  creerGraphiqueComparaison(): void {
    if (!this.comparaisonData) return;

    /* if (this.comparaisonChart) {
      this.comparaisonChart.destroy();
      this.comparaisonChart = undefined;
    } */

    const ctx = this.comparaisonChartRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.comparaisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Chiffre d\'affaires', 'Ticket moyen'],
        datasets: [
          {
            label: this.comparaisonLabels[0],
            data: [
              this.comparaisonData.ca1,
              //this.comparaisonData.ventes1,
              this.comparaisonData.ticketMoyen1,
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
          },
          {
            label: this.comparaisonLabels[1],
            data: [
              this.comparaisonData.ca2,
              //this.comparaisonData.ventes2,
              this.comparaisonData.ticketMoyen2,
            ],
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          title: {
            display: true,
            text: 'Analyse comparative',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                const value = context.raw as number;
                if (context.dataIndex === 0 || context.dataIndex === 2) {
                  label += `: ${value.toLocaleString('fr-FR')} F CFA`;
                } else {
                  label += `: ${value}`;
                }
                return label;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                if (typeof value === 'number') {
                  return value.toLocaleString('fr-FR');
                }
                return value;
              },
            },
          },
        },
      },
    });
  }

  // ============================================
  // GESTIONNAIRES D'ÉVÉNEMENTS
  // ============================================

  onPeriodeChange(): void {
    if (this.periodeSelectionnee !== 'personnalisee') {
      this.dateDebut = '';
      this.dateFin = '';
    }
    this.filtrerDates();
  }

  onMagasinSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMagasinId = Number(target.value) || -1;
    this.filtrerDates();
  }

  onVendeurSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedVendeurId = Number(target.value) || -1;
    this.filtrerDates();
  }

  filtrerDates(): void {
    if (this.periodeSelectionnee === 'personnalisee') {
      if (this.dateDebut && this.dateFin) {
        if (new Date(this.dateDebut) > new Date(this.dateFin)) {
          this.toastr.warning('La date de début doit être antérieure à la date de fin');
          return;
        }
        this.currentPage = 1;
        this.chargerRapport();
      } else {
        this.toastr.warning('Veuillez sélectionner une date de début et une date de fin');
      }
    } else {
      this.currentPage = 1;
      this.chargerRapport();
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearchChange();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.chargerRapport();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.chargerRapport();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.chargerRapport();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.chargerRapport();
    }
  }

  get totalPages(): number {
    return this.rapportData?.pagination?.totalPages || 1;
  }

  get getPaginatedVentes(): any[] {
    return this.filteredVentes;
  }

  // ============================================
  // TRI DES VENDEURS
  // ============================================

  trierVendeurs(): void {
    if (!this.vendeursPerformance || this.vendeursPerformance.length === 0) {
      return;
    }

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

  // ============================================
  // DÉTAILS VENDEUR
  // ============================================

  // Ajouter cette fonction utilitaire dans votre composant
  private formatDateForAPI(date: string | undefined, type: 'start' | 'end'): string | undefined {
    if (!date) return undefined;
    
    if (type === 'start') {
      return `${date}T00:00:00.000Z`;
    } else {
      return `${date}T23:59:59.999Z`;
    }
  }

  voirDetailsVendeur(vendeurId: number): void {
    if (!this.code_structure) return;

    /* const params: RapportVenteParams = {
      periode:this.periodeSelectionnee as 'jour' | 'semaine' | 'mois' | 'annee',
      code_structure: this.code_structure,
      fromDate: this.dateDebut,
      toDate: this.dateFin,
      magasinId: this.selectedMagasinId !== -1 ? this.selectedMagasinId : undefined
    };  */
    const filters: RapportVenteParams = {
      code_structure: this.code_structure!
    };

    if (this.selectedMagasinId !== -1) {
      filters.magasinId = this.selectedMagasinId;
    }

    if (this.selectedVendeurId !== -1) {
      filters.agentId = this.selectedVendeurId;
    }

    // Gestion de la période
    if (this.periodeSelectionnee !== 'personnalisee') {
      filters.periode = this.periodeSelectionnee as 'jour' | 'semaine' | 'mois' | 'annee';
      if (this.dateReference) {
        filters.dateReference = this.dateReference;
      }
    } else if (this.dateDebut && this.dateFin) {
      filters.fromDate = this.dateDebut;
      filters.toDate = this.dateFin;
    }



    this.isLoading = true;
    this.kpiService.getDetailsVendeur(vendeurId, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.selectedVendeurDetails = details.vendeur;
          //console.log('Détails vendeur depuis selectedVendeurDetails', this.selectedVendeurDetails);
          this.vendeurStats = details;
          this.mettreAJourGraphiques();
          //console.log('Statitisques vendeur ', this.vendeurStats, details.stats);
          this.showVendeurModal = true;
          this.isLoading = false;

          requestAnimationFrame(() => {
            if (details.evolution) {
              this.creerGraphiqueEvolutionVendeur(details.evolution);
            }
          });
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  fermerModalVendeur(): void {
    this.showVendeurModal = false;
    this.selectedVendeurDetails = null;
    this.vendeurStats = null;
  }

  // ============================================
  // COMPARAISON
  // ============================================

  initializeComparison(): void {
    this.updateComparisonOptions();
  }

  onComparaisonTypeChange(): void {
    this.comparaisonElement1 = '';
    this.comparaisonElement2 = '';
    this.comparaisonData = null;
    this.updateComparisonOptions();
  }

  updateComparisonOptions(): void {
    if (!this.code_structure) return;

    this.kpiService.getOptionsComparaison(this.comparaisonType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.comparisonOptions = options;
        },
        error: (err) => {
          console.error('Erreur chargement options comparaison:', err);
        }
      });
  }

  genererComparaison(): void {
    if (!this.comparaisonElement1 || !this.comparaisonElement2) {
      this.toastr.warning('Veuillez sélectionner deux éléments à comparer');
      return;
    }

    if (this.comparaisonElement1 === this.comparaisonElement2) {
      this.toastr.warning('Veuillez sélectionner deux éléments différents');
      return;
    }

    this.isLoading = true;

    const data = {
      type: this.comparaisonType,
      element1: this.comparaisonElement1,
      element2: this.comparaisonElement2,
      fromDate: this.dateDebut,
      toDate: this.dateFin,
      magasinId: this.selectedMagasinId !== -1 ? this.selectedMagasinId : undefined,
      agentId: this.selectedVendeurId !== -1 ? this.selectedVendeurId : undefined
    };

    this.kpiService.genererComparaison(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.comparaisonData = result;
          this.comparaisonLabels = [
            this.getLabelForElement(this.comparaisonElement1),
            this.getLabelForElement(this.comparaisonElement2)
          ];
          this.isLoading = false;
          this.mettreAJourGraphiques();
          

          //setTimeout(() => {
            //this.creerGraphiqueComparaison();
          //}, 100);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la génération de la comparaison';
          this.toastr.error(this.errorMessage);
          console.error(this.errorMessage);
          this.isLoading = false;
        }
      });
  }

  getLabelForElement(element: any): string {
    const option = this.comparisonOptions.find(opt => opt.value === element);
    return option ? option.label : 'Élément inconnu';
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  getNomMagasin(id: number): string {
    const magasin = this.magasins.find(m => m.id === id);
    return magasin ? magasin.nom : 'Tous les magasins';
  }

  get libellePeriodeSelectionnee(): string {
    const periode = this.periodesDisponibles.find(p => p.value === this.periodeSelectionnee);
    return periode ? periode.label : '';
  }

  get periodeAffichage(): string {
    if (this.periodeSelectionnee !== 'personnalisee') {
      const dateRef = this.dateReference ? new Date(this.dateReference) : new Date();
      const formattedDate = dateRef.toLocaleDateString('fr-FR');
      return `${this.libellePeriodeSelectionnee} (${formattedDate})`;
    } else if (this.dateDebut && this.dateFin) {
      return `Du ${new Date(this.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(this.dateFin).toLocaleDateString('fr-FR')}`;
    }
    return 'Période non définie';
  }

  // ============================================
  // IMPRESSION ET EXPORT
  // ============================================

  // Dans votre composant
async impression(): Promise<void> {
  try {
    this.isGeneratingPDF = true;
    this.progress = 0;

    // Construire les paramètres (comme pour le PDF)
    const params = this.construireFiltresPDF();
    
    // Ajouter un paramètre pour indiquer que c'est pour impression
    //params.print = true;

    // Générer le PDF
    const pdfBlob = await this.pdfMakerService.generateRapportVentePDF(params).toPromise();

    if(!pdfBlob){
      return;
    }

    // Créer une URL pour le PDF
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Ouvrir dans une nouvelle fenêtre et imprimer
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      // Attendre que le PDF soit chargé puis imprimer
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      // Si popup bloquée, proposer le téléchargement
      this.toastr.warning('Popup bloquée. Téléchargez le PDF et imprimez-le manuellement.');
      this.pdfMakerService.savePDF(pdfBlob, 'rapport-a-imprimer.pdf');
    }

    this.progress = 100;
    setTimeout(() => {
      this.isGeneratingPDF = false;
      this.progress = 0;
    }, 500);

  } catch (error) {
    console.error('❌ Erreur impression:', error);
    this.toastr.error('Erreur lors de la préparation de l\'impression');
    this.isGeneratingPDF = false;
    this.progress = 0;
  }
}
  
async exportToPDF(): Promise<void> {
  try {
    this.isGeneratingPDF = true;
    this.progress = 0;

    // Animation de progression
    const updateProgress = () => {
      if (this.progress < 30) {
        this.progress += 5;
        setTimeout(updateProgress, 200);
      }
    };
    updateProgress();

    // Construire les paramètres
    const params = this.construireFiltresPDF();

    // Appel API
    const pdfBlob = await this.pdfMakerService.generateRapportVentePDF(params).toPromise();
    if(!pdfBlob){
      return;
    }
    // Progression rapide vers 100%
    this.progress = 100;

    // Sauvegarder avec un nom personnalisé
    const fileName = this.generateFileName();
    this.pdfMakerService.savePDF(pdfBlob, fileName);

    this.toastr.success('PDF généré avec succès');

  } catch (error) {
    this.handlePDFError(error);
  } finally {
    // Réinitialiser après un délai
    setTimeout(() => {
      this.isGeneratingPDF = false;
      this.progress = 0;
    }, 800);
  }
}

private construireFiltresPDF(): any {
  const params: any = {};

  // Période
  if (this.periodeSelectionnee !== 'personnalisee') {
    params.periode = this.periodeSelectionnee;
    if (this.dateReference) {
      params.dateReference = this.dateReference;
    }
  } else {
    if (this.dateDebut) params.fromDate = this.dateDebut;
    if (this.dateFin) params.toDate = this.dateFin;
  }

  // Filtres
  if (this.selectedMagasinId !== -1) {
    params.magasinId = this.selectedMagasinId;
  }

  if (this.selectedVendeurId !== -1) {
    params.agentId = this.selectedVendeurId;
  }
  // AJOUT LES PARAMÈTRES DE COMPARAISON SI UNE COMPARAISON EST ACTIVE
  if (this.comparaisonData) {
    //params.comparaisonType = this.comparaisonType;
    //params.comparaisonElement1 = this.comparaisonElement1;
    //params.comparaisonElement2 = this.comparaisonElement2;
    params.comparaisonLabels = this.comparaisonLabels;
    params.comparaisonData = JSON.stringify(this.comparaisonData);
  }


  // Nettoyer les undefined
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  );
}

private generateFileName(): string {
  const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  let suffix = '';

  if (this.selectedMagasinId !== -1) {
    const magasin = this.magasins.find(m => m.id === this.selectedMagasinId);
    suffix += `-${magasin?.nom || 'magasin'}`;
  }

  if (this.selectedVendeurId !== -1) {
    const vendeur = this.vendeurs.find(v => v.id === this.selectedVendeurId);
    suffix += `-${vendeur?.nom || 'vendeur'}`;
  }

  return `rapport-vente${suffix}-${date}.pdf`;
}

private handlePDFError(error: any): void {
  console.error('❌ Erreur PDF:', error);

  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 401:
        this.toastr.error('Session expirée. Veuillez vous reconnecter.');
        break;
      case 403:
        this.toastr.error('Vous n\'avez pas les droits pour générer ce rapport');
        break;
      case 400:
        this.toastr.error('Paramètres invalides: ' + (error.error?.error || 'Vérifiez vos filtres'));
        break;
      case 404:
        this.toastr.error('Service de génération PDF non disponible');
        break;
      case 500:
        this.toastr.error('Erreur serveur lors de la génération du PDF');
        break;
      default:
        this.toastr.error('Erreur: ' + (error.error?.error || error.message));
    }
  } else {
    this.toastr.error('Erreur de connexion au serveur');
  }
}

  // Dans votre composant (rapports-ventes.component.ts)

async exportToExcel(): Promise<void> {
  // Vérifier que les dates sont valides
  if (this.periodeSelectionnee === 'personnalisee') {
    if (!this.dateDebut || !this.dateFin) {
      this.toastr.warning('Veuillez sélectionner une période');
      return;
    }
    if (new Date(this.dateDebut) > new Date(this.dateFin)) {
      this.toastr.warning('La date de début doit être antérieure à la date de fin');
      return;
    }
  }

  try {
    this.isGeneratingPDF = true; // Réutiliser le même indicateur
    this.progress = 0;

    // Animation de progression
    const interval = setInterval(() => {
      if (this.progress < 90) this.progress += 10;
    }, 300);

    // Construire les paramètres (réutiliser la même méthode que pour le PDF)
    const params = this.construireFiltresExcel();


    // Appel API
    const excelBlob = await this.kpiService.exportRapportExcel(params).toPromise();

    if(!excelBlob){
      return;
    }

    clearInterval(interval);
    this.progress = 100;

    // Sauvegarder le fichier
    this.saveExcelFile(excelBlob);

    this.toastr.success('Export Excel réussi');

  } catch (error: any) {
    console.error('❌ Erreur export Excel:', error);
    
    if (error.status === 401) {
      this.toastr.error('Session expirée. Veuillez vous reconnecter.');
    } else if (error.status === 400) {
      this.toastr.error('Paramètres invalides: ' + (error.error?.error || ''));
    } else if (error.status === 500) {
      this.toastr.error('Erreur serveur lors de l\'export Excel');
    } else {
      this.toastr.error('Erreur lors de l\'export Excel');
    }
  } finally {
    setTimeout(() => {
      this.isGeneratingPDF = false;
      this.progress = 0;
    }, 500);
  }
}

/**
 * Construire les filtres spécifiques pour Excel
 */
private construireFiltresExcel(): any {
  const params: any = {};

  // Période
  if (this.periodeSelectionnee !== 'personnalisee') {
    params.periode = this.periodeSelectionnee;
    if (this.dateReference) {
      params.dateReference = this.dateReference;
    }
  } else {
    if (this.dateDebut) params.fromDate = this.dateDebut;
    if (this.dateFin) params.toDate = this.dateFin;
  }

  // Filtres magasin et vendeur
  if (this.selectedMagasinId !== -1) {
    params.magasinId = this.selectedMagasinId;
  }

  if (this.selectedVendeurId !== -1) {
    params.agentId = this.selectedVendeurId;
  }

  // Nettoyer les paramètres undefined
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  );
}

/**
 * Sauvegarder le fichier Excel
 */
private saveExcelFile(blob: Blob): void {
  // Générer un nom de fichier avec la date et les filtres
  const fileName = this.generateExcelFileName();
  
  // Créer un lien de téléchargement
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  // Ajouter au DOM, cliquer, puis retirer
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Nettoyer l'URL
  window.URL.revokeObjectURL(url);
}

/**
 * Générer un nom de fichier Excel pertinent
 */
private generateExcelFileName(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 19).replace(/:/g, '-');
  
  let suffix = '';
  
  // Ajouter la période
  if (this.periodeSelectionnee !== 'personnalisee') {
    const periode = this.periodesDisponibles.find(p => p.value === this.periodeSelectionnee);
    suffix += `-${periode?.label.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  // Ajouter le magasin si sélectionné
  if (this.selectedMagasinId !== -1) {
    const magasin = this.magasins.find(m => m.id === this.selectedMagasinId);
    suffix += `-${magasin?.nom.toLowerCase().replace(/\s+/g, '-') || 'magasin'}`;
  }
  
  // Ajouter le vendeur si sélectionné
  if (this.selectedVendeurId !== -1) {
    const vendeur = this.vendeurs.find(v => v.id === this.selectedVendeurId);
    suffix += `-${vendeur?.nom.toLowerCase().replace(/\s+/g, '-') || 'vendeur'}`;
  }
  
  return `rapport-vente${suffix}-${dateStr}.xlsx`;
}

  getNomVendeur(id: number): string {
    const vendeur = this.vendeurs.find(v => v.id === id);
    return vendeur ? vendeur.nom : 'Tous les vendeurs';
  }
}