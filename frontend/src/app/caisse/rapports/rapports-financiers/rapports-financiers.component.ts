/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { 
  IndicateursFinanciers, 
  RepartitionDepenses, 
  RepartitionRecettes, 
  ModesPaiementStats, 
  TransactionsResponse, 
  DonneesEvolutivesResponse,
  DonneesComparativesResponse,
  TransactionDetail
} from '../../../modeles/finance.model';
import { RapportsFinanciersService } from '../../../services/rapports-financiers.service';
import { Magasin } from '../../../modeles/magasin.model';
import { MaagasinsService } from '../../../services/maagasins.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { StructureService } from '../../../services/structure.service';
import { finalize, forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-rapports-financiers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-financiers.component.html',
  styleUrl: './rapports-financiers.component.css',
})
export class RapportsFinanciersComponent implements OnInit, OnDestroy {
  @ViewChild('evolutionChart') evolutionChartRef!: ElementRef;
  @ViewChild('depensesChart') depensesChartRef!: ElementRef;
  @ViewChild('recettesChart') recettesChartRef!: ElementRef;
  @ViewChild('tendancesChart') tendancesChartRef!: ElementRef;
  
  // Charts
  tendancesChart: Chart | undefined;
  evolutionChart: Chart | undefined;
  depensesChart: Chart | undefined;
  recettesChart: Chart | undefined;

  // Services
  private rapportsService = inject(RapportsFinanciersService);
  private magasinService = inject(MaagasinsService);
  private pdfMakerService = inject(PdfMakerServiceService);
  private structureService = inject(StructureService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  // Filtres
  dateGeneration = new Date();
  dateDebut = '';
  dateFin = '';
  dateReference = ''; 

  private userSubscription!: Subscription;
  
  // Nouveau filtre période prédéfinie
  periodeSelectionnee = 'personnalisee';
  periodesDisponibles = [
    { value: 'jour', label: 'Aujourd\'hui' },
    { value: 'semaine', label: 'Cette semaine' },
    { value: 'mois', label: 'Ce mois' },
    { value: 'annee', label: 'Cette année' },
    { value: 'personnalisee', label: 'Période personnalisée' }
  ];

  private destroy$ = new Subject<void>();
  
  magasins: Magasin[] = [];
  selectedMagasinId?: number;
  selectedAgentId?: number;
  code_structure : string|null = null;

  // État du composant
  isAdmin = false;
  isPrinting = false;
  isGeneratingPDF = false;
  isLoading = false;
  progress = 0;

  // Données financières provenant de l'API
  indicateursFinanciers: IndicateursFinanciers | null = null;
  repartitionDepenses: RepartitionDepenses | null = null;
  repartitionRecettes: RepartitionRecettes | null = null;
  modesPaiementStats: ModesPaiementStats | null = null;
  depensesDetaillees: TransactionsResponse | null = null;
  recettesDetaillees: TransactionsResponse | null = null;
  donneesEvolutives: DonneesEvolutivesResponse | null = null;
  donneesComparatives: DonneesComparativesResponse | null = null;

  // Pagination
  currentPageDepenses = 1;
  currentPageRecettes = 1;
  pageSize = 10;
  searchTerm = '';

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.code_structure = user?.code_structure || null;
      this.isAdmin = this.authService.hasRole('Administrateur');
    });
    this.initDateFilters();
    this.chargerMagasins();
    this.chargerDonnees();
    this.loadStructureInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if(this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  initDateFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.dateDebut = this.formatDate(firstDayOfMonth);
    this.dateFin = this.formatDate(today);
    this.dateReference = this.formatDate(today);
  }

  chargerMagasins(): void {
    this.isLoading = true;
    this.magasinService.getMagasinsByStructure(this.code_structure!)
    .pipe(takeUntil(this.destroy$),finalize(() => {
        this.isLoading = false;
      }))
    .subscribe({
      next: (magasins) => {
        this.magasins = magasins;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des magasins:', error);
      }
    });
  }

  chargerDonnees(): void {
    this.isLoading = true;

    const filters = this.construireFiltres();

    const requests = {
      indicateurs: this.rapportsService.getIndicateursFinanciers(filters),
      repartitionDepenses: this.rapportsService.getRepartitionDepenses(filters),
      repartitionRecettes: this.rapportsService.getRepartitionRecettes(filters),
      modesPaiement: this.rapportsService.getStatistiquesModesPaiement(filters),
      depenses: this.rapportsService.getDepensesDetaillees(filters),
      recettes: this.rapportsService.getRecettesDetaillees(filters),
      evolution: this.rapportsService.getDonneesEvolutives({...filters, groupBy: 'jour'})
    };

    forkJoin([
      requests.indicateurs,
      requests.repartitionDepenses,
      requests.repartitionRecettes,
      requests.modesPaiement,
      requests.depenses,
      requests.recettes,
      requests.evolution
    ]).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: ([
        indicateurs,
        repartitionDepenses,
        repartitionRecettes,
        modesPaiement,
        depenses,
        recettes,
        evolution
      ]) => {
        this.indicateursFinanciers = indicateurs || null;
        this.repartitionDepenses = repartitionDepenses || null;
        this.repartitionRecettes = repartitionRecettes || null;
        this.modesPaiementStats = modesPaiement || null;
        this.depensesDetaillees = depenses || null;
        this.recettesDetaillees = recettes || null;
        this.donneesEvolutives = evolution || null;

        setTimeout(() => {
          this.mettreAJourGraphiques();
        }, 100);

        this.chargerDonneesComparatives();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
      }
    });
  }

  chargerDonneesComparatives(): void {
    this.isLoading = true;
    const filters = this.construireFiltres();
    this.rapportsService.getDonneesComparatives(filters)
    .pipe(takeUntil(this.destroy$),finalize(() => {
        this.isLoading = false;
         this.cdr.detectChanges();
      }))
    .subscribe({
      next: (comparatives) => {
        this.donneesComparatives = comparatives;
        this.creerGraphiqueTendances();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données comparatives:', error);
      }
    });
  }

  construireFiltres(): any {
    const filters: any = {
      code_structure: this.code_structure
    };

    if (this.selectedMagasinId !== undefined) {
      filters.magasinId = this.selectedMagasinId;
    }

    if (this.selectedAgentId !== undefined) {
      filters.agentId = this.selectedAgentId;
    }

    if (this.periodeSelectionnee !== 'personnalisee') {
        filters.periode = this.periodeSelectionnee;
        if (this.dateReference) {
          filters.dateReference = new Date(this.dateReference);
        } else {
          filters.dateReference = new Date();
          if (!this.dateReference) {
            this.dateReference = this.formatDate(new Date());
          }
        }
    }
    else if (this.dateDebut && this.dateFin) {
      filters.fromDate = this.formatDate(new Date(this.dateDebut));
      filters.toDate = this.formatDate(new Date(this.dateFin));
    } 
    else {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filters.fromDate = this.formatDate(firstDayOfMonth);
      filters.toDate = this.formatDate(today);
    }

    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }

    return filters;
  }

  onPeriodeChange(): void {
    if (this.periodeSelectionnee !== 'personnalisee') {
      this.dateDebut = '';
      this.dateFin = '';
    }
    this.filtrerDonnees();
  }

  onMagasinSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMagasinId = target.value ? Number(target.value) : undefined;
    this.filtrerDonnees();
  }

  onAgentSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedAgentId = target.value ? Number(target.value) : undefined;
    this.filtrerDonnees();
  }

  filtrerDonnees(): void {
    this.currentPageDepenses = 1;
    this.currentPageRecettes = 1;
    this.chargerDonnees();
  }

  filtrerDates(): void {
   if (this.periodeSelectionnee === 'personnalisee') {
    if (this.dateDebut && this.dateFin) {
      if (new Date(this.dateDebut) > new Date(this.dateFin)) {
        this.toastr?.warning('La date de début doit être antérieure à la date de fin');
        return;
      }
      this.filtrerDonnees();
    } else {
      this.toastr?.warning('Veuillez sélectionner une date de début et une date de fin');
    }
  }
  }

  onSearchChange(): void {
    this.currentPageDepenses = 1;
    this.currentPageRecettes = 1;
    
    const filters = this.construireFiltres();
    
    this.rapportsService.getDepensesDetaillees(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (depenses) => {
        this.depensesDetaillees = depenses;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche des dépenses:', error);
      }
    });

    this.rapportsService.getRecettesDetaillees(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (recettes) => {
        this.recettesDetaillees = recettes;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche des recettes:', error);
      }
    });
  }

  onPageChange(page: number, type: 'depenses' | 'recettes'): void {
    const filters = this.construireFiltres();
    filters.page = page;
    filters.limit = this.pageSize;
    this.isLoading = true;
    
    if (type === 'depenses') {
      this.currentPageDepenses = page;
      this.rapportsService.getDepensesDetaillees(filters)
      .pipe(takeUntil(this.destroy$),finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: (depenses) => {
          this.depensesDetaillees = depenses;
        },
        error: (error) => {
          console.error('Erreur lors du changement de page des dépenses:', error);
        }
      });
    } else {
      this.currentPageRecettes = page;
      this.rapportsService.getRecettesDetaillees(filters)
      .pipe(takeUntil(this.destroy$),finalize(() => {
        this.isLoading = false;
      })).subscribe({
        next: (recettes) => {
          this.recettesDetaillees = recettes;
        },
        error: (error) => {
          console.error('Erreur lors du changement de page des recettes:', error);
        }
      });
    }
  }

  mettreAJourGraphiques(): void {
    this.creerGraphiqueEvolution();
    this.creerGraphiqueDepenses();
    this.creerGraphiqueRecettes();
    this.creerGraphiqueTendances();
  }

  creerGraphiqueEvolution(): void {
    if (!this.donneesEvolutives?.donnees?.length) {
      if (this.evolutionChart) {
        this.evolutionChart.destroy();
        this.evolutionChart = undefined;
      }
      return;
    }

    if (this.evolutionChart) {
      this.evolutionChart.destroy();
    }

    const ctx = this.evolutionChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    const donnees = this.donneesEvolutives.donnees;

    this.evolutionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: donnees.map(d => {
          if (this.donneesEvolutives?.groupBy === 'jour') {
            return new Date(d.periode).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
          } else if (this.donneesEvolutives?.groupBy === 'semaine') {
            return `Semaine ${d.periode}`;
          } else {
            return `Mois ${d.periode}`;
          }
        }),
        datasets: [
          {
            label: 'Recettes',
            data: donnees.map(d => d.recettes),
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Dépenses',
            data: donnees.map(d => d.depenses),
            borderColor: '#F44336',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            tension: 0.3,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Évolution des flux financiers',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.dataset.label}: ${value.toLocaleString('fr-FR')} F CFA`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => typeof value === 'number' ? 
                value.toLocaleString('fr-FR') + ' F CFA' : value
            }
          }
        }
      }
    });
  }

  creerGraphiqueDepenses(): void {
    if (!this.repartitionDepenses?.repartition?.length) {
      if (this.depensesChart) {
        this.depensesChart.destroy();
        this.depensesChart = undefined;
      }
      return;
    }

    if (this.depensesChart) {
      this.depensesChart.destroy();
    }

    const ctx = this.depensesChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    const repartition = this.repartitionDepenses.repartition;

    this.depensesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: repartition.map(r => r.categorieName),
        datasets: [{
          data: repartition.map(r => r.montantTotal),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#8AC926', '#1982C4',
            '#6A0572', '#00A8A8', '#FF6B6B', '#4ECDC4'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Répartition des dépenses',
          },
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const pourcentage = repartition[context.dataIndex].pourcentage;
                return `${context.label}: ${value.toLocaleString('fr-FR')} F CFA (${pourcentage.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }

  creerGraphiqueRecettes(): void {
    if (!this.repartitionRecettes?.repartition?.length) {
      if (this.recettesChart) {
        this.recettesChart.destroy();
        this.recettesChart = undefined;
      }
      return;
    }

    if (this.recettesChart) {
      this.recettesChart.destroy();
    }

    const ctx = this.recettesChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    const repartition = this.repartitionRecettes.repartition;

    this.recettesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: repartition.map(r => r.categorieName),
        datasets: [{
          data: repartition.map(r => r.montantTotal),
          backgroundColor: [
            '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B',
            '#2196F3', '#03A9F4', '#00BCD4', '#009688',
            '#FF9800', '#9C27B0', '#3F51B5', '#E91E63'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Sources de revenus',
          },
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const pourcentage = repartition[context.dataIndex].pourcentage;
                return `${context.label}: ${value.toLocaleString('fr-FR')} F CFA (${pourcentage.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }

  creerGraphiqueTendances(): void {
    if (!this.donneesComparatives?.donneesPeriodes?.length) {
      if (this.tendancesChart) {
        this.tendancesChart.destroy();
        this.tendancesChart = undefined;
      }
      return;
    }

    if (this.tendancesChart) {
      this.tendancesChart.destroy();
    }

    const ctx = this.tendancesChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    const periodes = this.donneesComparatives.donneesPeriodes;

    this.tendancesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: periodes.map(p => p.libelle),
        datasets: [
          {
            label: "Chiffre d'affaires",
            data: periodes.map(p => p.chiffreAffaires),
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Bénéfices',
            data: periodes.map(p => p.beneficeNet),
            backgroundColor: 'rgba(255, 206, 86, 0.7)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1,
          },
          {
            label: 'Dépenses',
            data: periodes.map(p => p.totalDepenses),
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Comparaison sur ${periodes.length} périodes`,
            font: { size: 16 },
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const value = context.raw;
                const label = context.dataset.label || '';
                return `${label}: ${Number(value).toLocaleString('fr-FR')} F CFA`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) =>
                typeof value === 'number' ? value.toLocaleString('fr-FR') : value,
            },
          },
        },
      },
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getDepensesPagines(): TransactionDetail[] {
    return this.depensesDetaillees?.depenses || [];
  }

  getRecettesPagines(): TransactionDetail[] {
    return this.recettesDetaillees?.recettes || [];
  }

  getTotalPagesDepenses(): number {
    return this.depensesDetaillees?.totalPages || 1;
  }

  getTotalPagesRecettes(): number {
    return this.recettesDetaillees?.totalPages || 1;
  }

  getNomMagasin(id: number): string {
    const magasin = this.magasins.find(m => m.id === id);
    return magasin ? magasin.nom : 'Non spécifié';
  }

  get libellePeriodeSelectionnee(): string {
    const periode = this.periodesDisponibles.find(
      p => p.value === this.periodeSelectionnee
    );
    return periode ? periode.label : '';
  }

  get totalMontantModesPaiement(): number {
  if (!this.modesPaiementStats?.modesPaiement?.length) {
    return 0;
  }

  return this.modesPaiementStats.modesPaiement.reduce(
    (sum, m) => sum + (m.montantTotal ?? 0),
    0
  );
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

private loadStructureInfo(): void {
    this.isLoading = true;
    this.structureService.getByCodeStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$),finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: (structure) => {
          this.pdfMakerService.setStructureInfo(structure);
        },
        error: (err) => {
          console.error('Erreur chargement structure:', err);
        }
      });
  }

async exportToPDF(): Promise<void> {
  try {
    this.isGeneratingPDF = true;
    this.progress = 0;

    const interval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
      }
    }, 300);

    const params = this.construireFiltresExport();


    const pdfBlob = await this.rapportsService.genererRapportPDF(params).toPromise();

    if(!pdfBlob){
      return;
    }

    clearInterval(interval);
    this.progress = 100;

    this.savePDF(pdfBlob);
    this.toastr.success('PDF généré avec succès');

  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    
    if (error.status === 401) {
      this.toastr.error('Session expirée. Veuillez vous reconnecter.');
    } else {
      this.toastr.error('Erreur lors de la génération du PDF');
    }
  } finally {
    setTimeout(() => {
      this.isGeneratingPDF = false;
      this.progress = 0;
    }, 500);
  }
}

/**
 * Construit les filtres communs pour les exportations PDF et Excel
 * Factorisé pour éviter la duplication B3
 */
private construireFiltresExport(): any {
  const params: any = {};

  if (this.periodeSelectionnee !== 'personnalisee') {
    params.periode = this.periodeSelectionnee;
    if (this.dateReference) {
      params.dateReference = this.dateReference;
    }
  } else {
    if (this.dateDebut) params.fromDate = this.dateDebut;
    if (this.dateFin) params.toDate = this.dateFin;
  }

  if (this.selectedMagasinId !== undefined) {
    params.magasinId = this.selectedMagasinId;
  }

  if (this.selectedAgentId !== undefined) {
    params.agentId = this.selectedAgentId;
  }

  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  );
}

private savePDF(blob: Blob): void {
  const fileName = `rapport-financier-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
}

async exportToExcel(): Promise<void> {
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
    this.isGeneratingPDF = true;
    this.progress = 0;

    const interval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
      }
    }, 300);

    const params = this.construireFiltresExport();


    const excelBlob = await this.rapportsService.exportRapportExcel(params).toPromise();

    if(!excelBlob){
      return;
    }

    clearInterval(interval);
    this.progress = 100;

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


private saveExcelFile(blob: Blob): void {
  const fileName = this.generateExcelFileName();
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.URL.revokeObjectURL(url);
}

private generateExcelFileName(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 19).replace(/:/g, '-');
  
  let suffix = '';
  
  if (this.periodeSelectionnee !== 'personnalisee') {
    const periode = this.periodesDisponibles.find(p => p.value === this.periodeSelectionnee);
    suffix += `-${periode?.label.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  if (this.selectedMagasinId !== undefined) {
    const magasin = this.magasins.find(m => m.id === this.selectedMagasinId);
    suffix += `-${magasin?.nom.toLowerCase().replace(/\s+/g, '-') || 'magasin'}`;
  }
  
  return `rapport-financier${suffix}-${dateStr}.xlsx`;
}

  async impression(): Promise<void> {
  try {
    this.isGeneratingPDF = true;
    this.progress = 0;

    const params = this.construireFiltresExport();
    
    const pdfBlob = await this.rapportsService.genererRapportPDF(params).toPromise();

    if(!pdfBlob){
      return;
    }

    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
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
}