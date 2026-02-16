/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { Chart, registerables } from 'chart.js';
import * as ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import saveAs from 'file-saver';
import { finalize, Subject, takeUntil } from 'rxjs';

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
  VendeurInfo
} from '../../../modeles/kpiCaisse.model';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../services/user.service';
import { MaagasinsService } from '../../../services/maagasins.service';

@Component({
  selector: 'app-rapports-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-ventes.component.html',
  styleUrl: './rapports-ventes.component.css',
})
export class RapportsVentesComponent implements OnInit,OnDestroy {
  @ViewChild('evolutionVentesChart') evolutionVentesChartRef!: ElementRef;
  @ViewChild('paiementsChart') paiementsChartRef!: ElementRef;
  @ViewChild('topProduitsChart') topProduitsChartRef!: ElementRef;
  @ViewChild('vendeurEvolutionChart') vendeurEvolutionChartRef!: ElementRef;
  @ViewChild('comparaisonChart') comparaisonChartRef!: ElementRef;

  // Graphiques
  evolutionVentesChart: any;
  paiementsChart: any;
  topProduitsChart: any;
  vendeurEvolutionChart: any;
  comparaisonChart: any;

  // Données et filtres
  dateGeneration = new Date();
  dateDebut = '';
  dateFin = '';
  magasins: Magasin[] = [];
  vendeurs: User[] = [];
  selectedMagasinId = -1;
  selectedVendeurId = -1;
  isPrinting = false;
  isGeneratingPDF = false;
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
  panierMoyen = 0;
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
  vendeurStats: any = null;

  // Comparaison
  comparaisonType: 'periode' | 'vendeur' | 'magasin' = 'periode';
  comparaisonElement1: any = '';
  comparaisonElement2: any = '';
  comparaisonData: ComparaisonResponse | null = null;
  comparaisonLabels: string[] = [];
  comparisonOptions: ComparaisonOptions[] = [];
  isLoading = false;

  // Pagination et recherche
  currentPage = 1;
  pageSize = 10;
  searchTerm = '';
  triVendeursPar: 'ca' | 'transactions' | 'moyenne' = 'ca';

  // États
  errorMessage = '';
  code_structure: string | null = null;
  currentUser: User | null = null;

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private kpiService = inject(KpiCaisseService);
  private toastr = inject(ToastrService);
  private userService = inject(UserService);
  private magasinService = inject(MaagasinsService);

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      this.code_structure = user?.code_structure || null;

      if (this.code_structure) {
        this.initDateFilters();
        this.loadMagasins();
        this.loadVendeurs();
        this.chargerRapport();
        this.initializeComparison();
      } else {
        this.errorMessage = 'Code structure non disponible';
        this.toastr.error(this.errorMessage);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initDateFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.dateDebut = this.formatDate(firstDayOfMonth);
    this.dateFin = this.formatDate(today);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  loadMagasins(): void {
    this.isLoading = true;
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (magasins) => {
          this.magasins = magasins;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors du chargement des magasins';
          this.toastr.error(this.errorMessage);
          this.isLoading = false;
        }
      });   
  }

  loadVendeurs(): void {
    this.isLoading = true;
    this.userService.getByStructure(this.code_structure!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (vendeurs) => {
        this.vendeurs = vendeurs.filter(v =>
          v.roles?.some(r => r.nom === 'Caissier' || r.nom === 'Gérant')
        );
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des vendeurs';
        this.toastr.error(this.errorMessage);
        this.isLoading = false;
      }
    }); 
  }

  chargerRapport(): void {
    if (!this.code_structure) return;

    this.isLoading = true;
    this.errorMessage = '';

    const params: RapportVenteParams = {
      code_structure: this.code_structure,
      fromDate: this.dateDebut,
      toDate: this.dateFin,
      magasinId: this.selectedMagasinId !== -1 ? this.selectedMagasinId : undefined,
      agentId: this.selectedVendeurId !== -1 ? this.selectedVendeurId : undefined,
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm
    };

    this.kpiService.getRapportVente(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.rapportData = data;
          this.filteredVentes = data.ventes;
          this.mettreAJourIndicateurs();
          this.mettreAJourGraphiques();
          this.toastr.success('Rapport chargé avec succès');
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement du rapport';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement rapport:', err);
        }
      });
  }

  mettreAJourIndicateurs(): void {
    if (!this.rapportData) return;

    this.totalVentes = this.rapportData.totalVentes;
    this.chiffreAffairesTTC = this.rapportData.chiffreAffairesTTC;
    this.chiffreAffairesHT = this.rapportData.chiffreAffairesHT;
    this.margeBeneficiaire = this.rapportData.margeBeneficiaire;
    this.ticketMoyen = this.rapportData.ticketMoyen;
    this.panierMoyen = this.rapportData.panierMoyen;
    this.evolutionCA = this.rapportData.evolutionCA;
    this.evolutionVolume = this.rapportData.evolutionVolume;
    this.topProduits = this.rapportData.topProduits;
    this.topClients = this.rapportData.topClients;
    this.vendeursPerformance = this.rapportData.vendeursPerformance;
    this.statmodesPaiement = this.rapportData.statmodesPaiement;
    this.evolutionParJour = this.rapportData.evolutionParJour;
  }

  mettreAJourGraphiques(): void {
    setTimeout(() => {
      this.creerGraphiqueEvolutionVentes();
      this.creerGraphiquePaiements();
      this.creerGraphiqueTopProduits();
    }, 200);
  }

  creerGraphiqueEvolutionVentes(): void {
    if (this.evolutionVentesChart) {
      this.evolutionVentesChart.destroy();
    }

    const ctx = this.evolutionVentesChartRef?.nativeElement.getContext('2d');
    if (!ctx || !this.evolutionParJour.length) return;

    const labels = this.evolutionParJour.map(e => {
      const date = new Date(e.date);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
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
          },
          {
            label: 'Nombre de ventes',
            data: dataVolume,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Évolution des ventes',
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

  creerGraphiquePaiements(): void {
    if (this.paiementsChart) {
      this.paiementsChart.destroy();
    }

    const ctx = this.paiementsChartRef?.nativeElement.getContext('2d');
    if (!ctx || !this.statmodesPaiement.length) return;

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
          title: {
            display: true,
            text: 'Répartition des modes de paiement',
          },
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce((a, b) => (a as number) + (b as number), 0);
                const percentage = Math.round((value / (total as number)) * 100);
                return `${label}: ${value.toLocaleString('fr-FR')} F CFA (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  creerGraphiqueTopProduits(): void {
    if (this.topProduitsChart) {
      this.topProduitsChart.destroy();
    }

    const ctx = this.topProduitsChartRef?.nativeElement.getContext('2d');
    if (!ctx || !this.topProduits.length) return;

    this.topProduitsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.topProduits.map(p => p.produit.designation.substring(0, 15) + '...'),
        datasets: [
          {
            label: 'Quantité vendue',
            data: this.topProduits.map(p => p.quantite),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: "Chiffre d'affaires (F CFA)",
            data: this.topProduits.map(p => p.ca),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 des produits',
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
          },
        },
      },
    });
  }

  // Filtres
  filtrerDates(): void {
    this.currentPage = 1;
    this.chargerRapport();
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

  // Détails vendeur
  voirDetailsVendeur(vendeurId: number): void {
    if (!this.code_structure) return;

    const params: RapportVenteParams = {  // ← Utiliser RapportVenteParams
    code_structure: this.code_structure,
    fromDate: this.dateDebut,
    toDate: this.dateFin,
    magasinId: this.selectedMagasinId !== -1 ? this.selectedMagasinId : undefined
  };
    
    this.isLoading = true;
    this.kpiService.getDetailsVendeur(vendeurId, params)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (details:VendeurDetailsResponse) => {
        this.selectedVendeurDetails = details.vendeur;
        this.vendeurStats = details.stats;
        this.showVendeurModal = true;
        this.isLoading = false;

        setTimeout(() => {
          this.creerGraphiqueEvolutionVendeur(details.evolution);
        }, 200);
      },
      error: (err) => {
        this.toastr.error('Erreur lors du chargement des détails du vendeur');
        console.error(err);
        this.isLoading = false;
      }
    });
  }
/**
 * Trie les vendeurs selon le critère sélectionné
 */
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
    default:
      this.vendeursPerformance.sort((a, b) => b.caTTC - a.caTTC);
  }
}

  creerGraphiqueEvolutionVendeur(evolution: any[]): void {
    if (this.vendeurEvolutionChart) {
      this.vendeurEvolutionChart.destroy();
    }

    const ctx = this.vendeurEvolutionChartRef?.nativeElement.getContext('2d');
    if (!ctx || !evolution.length) return;

    const labels = evolution.map(e => {
      const date = new Date(e.date);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
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
          },
          {
            label: 'Nombre de ventes',
            data: dataVolume,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
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

  fermerModalVendeur(): void {
    this.showVendeurModal = false;
    this.selectedVendeurDetails = null;
    this.vendeurStats = null;
  }

  // Comparaison
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

    this.isLoading = true;
    this.kpiService.getOptionsComparaison(this.comparaisonType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.comparisonOptions = options;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur chargement options comparaison:', err);
          this.isLoading = false;
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

          setTimeout(() => {
            this.creerGraphiqueComparaison();
          }, 100);
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la génération de la comparaison');
          console.error(err);
          this.isLoading = false;
        }
      });
  }

  getLabelForElement(element: any): string {
    const option = this.comparisonOptions.find(opt => opt.value === element);
    return option ? option.label : 'Élément inconnu';
  }

  creerGraphiqueComparaison(): void {
    if (!this.comparaisonData) return;

    if (this.comparaisonChart) {
      this.comparaisonChart.destroy();
    }

    const ctx = this.comparaisonChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    this.comparaisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Chiffre d\'affaires', 'Nombre de ventes', 'Ticket moyen'],
        datasets: [
          {
            label: this.comparaisonLabels[0],
            data: [
              this.comparaisonData.ca1,
              this.comparaisonData.ventes1,
              this.comparaisonData.ticketMoyen1,
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
          },
          {
            label: this.comparaisonLabels[1],
            data: [
              this.comparaisonData.ca2,
              this.comparaisonData.ventes2,
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
          title: {
            display: true,
            text: 'Analyse comparative',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (context.parsed.y !== null) {
                  if (context.dataIndex === 0) {
                    label += `: ${context.parsed.y.toLocaleString('fr-FR')} F CFA`;
                  } else if (context.dataIndex === 1) {
                    label += `: ${context.parsed.y}`;
                  } else {
                    label += `: ${context.parsed.y.toLocaleString('fr-FR')} F CFA`;
                  }
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

  // Pagination
  get getPaginatedVentes(): any[] {
    return this.filteredVentes;
  }

  get totalPages(): number {
    return this.rapportData?.pagination.totalPages || 1;
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

  onSearchChange(): void {
    this.currentPage = 1;
    this.chargerRapport();
  }

  // Utilitaires
  getNomMagasin(id: number): string {
    const magasin = this.magasins.find(m => m.id === id);
    return magasin ? magasin.nom : 'Inconnu';
  }

  getNomClient(id: number): string {
    const vente = this.filteredVentes.find(v => v.clientId === id);
    return vente ? vente.clientNom : 'Client anonyme';
  }

  getNomVendeur(id: number): string {
    const vendeur = this.vendeurs.find(v => v.id === id);
    return vendeur ? `${vendeur.nom}`.trim() : 'Inconnu';
  }

  getNomModePaiement(methode: string): string {
    return methode || 'Inconnu';
  }

  // Impression et export
  async impression() {
    this.isPrinting = true;

    await this.prepareChartsForExport();

    const printContent = document.getElementById('rapport');
    if (!printContent) return;

    await this.convertChartsToImages(printContent);

    const clone = printContent.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = '100%';
    clone.id = 'print-clone';

    const style = document.createElement('style');
    style.innerHTML = `
      body > * { display: none !important; }
      #print-clone { display: block !important; visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; background: white; }
      .no-printer { display: none !important; }
      .printer-only { display: block !important; }
    `;

    document.body.appendChild(style);
    document.body.appendChild(clone);

    setTimeout(() => {
      window.print();
      document.body.removeChild(clone);
      document.head.removeChild(style);
      this.isPrinting = false;
      this.mettreAJourGraphiques();
    }, 800);
  }

  private async convertChartsToImages(element: HTMLElement) {
    const canvases = element.querySelectorAll('canvas');
    for (const canvas of Array.from(canvases)) {
      const canvasEl = canvas as HTMLCanvasElement;
      const img = new Image();
      img.src = canvasEl.toDataURL('image/png', 1.0);
      img.style.width = canvasEl.offsetWidth + 'px';
      img.style.height = canvasEl.offsetHeight + 'px';

      const container = document.createElement('div');
      container.style.width = canvasEl.offsetWidth + 'px';
      container.style.height = canvasEl.offsetHeight + 'px';
      container.appendChild(img);

      canvasEl.parentNode?.replaceChild(container, canvasEl);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async exportToPDF() {
    this.isGeneratingPDF = true;
    this.progress = 0;
    this.isPrinting = true;

    await this.prepareChartsForExport();

    const noPrintElements = document.querySelectorAll('.no-printer');
    noPrintElements.forEach(el => el.classList.add('d-none'));

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const element = document.getElementById('rapport');
      if (!element) return;

      const pdf = new jsPDF('p', 'mm', 'a3');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const stepCount = Math.ceil(canvas.height / (pageHeight - 2 * margin));
      let step = 0;

      if (imgHeight > pageHeight - 2 * margin) {
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');

        let sY = 0;
        const dX = canvas.width;
        const dY = (pageHeight - 2 * margin) * (canvas.width / imgWidth);

        while (sY < canvas.height) {
          pageCanvas.width = dX;
          pageCanvas.height = dY;
          pageCtx?.drawImage(canvas, 0, sY, dX, dY, 0, 0, dX, dY);

          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, dY * (imgWidth / dX));

          sY += dY;
          step++;
          this.progress = Math.round((step / stepCount) * 100);

          if (sY < canvas.height) pdf.addPage();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        this.progress = 100;
      }

      pdf.save(`rapport_vente_${this.formatDate(new Date())}.pdf`);
    } catch (error) {
      console.error('Erreur PDF:', error);
    } finally {
      noPrintElements.forEach(el => el.classList.remove('d-none'));
      this.isPrinting = false;
      this.isGeneratingPDF = false;
      this.progress = 0;
    }
  }

  async prepareChartsForExport() {
    const charts = [
      this.evolutionVentesChart,
      this.comparaisonChart,
      this.paiementsChart,
      this.topProduitsChart,
    ];

    charts.forEach(chart => {
      if (chart) {
        chart.resize();
        chart.render();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 400));
  }

  async exportToExcel() {
    if (!ExcelJS) {
      console.error("ExcelJS n'est pas chargé.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Rapport de Vente';
    workbook.created = new Date();

    // Styles
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      }
    };

    const titleStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 14 },
      alignment: { vertical: 'middle', horizontal: 'center' }
    };

    // Feuille Résumé
    const summarySheet = workbook.addWorksheet('Résumé');
    summarySheet.mergeCells('A1:F2');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Rapport de Vente';
    Object.assign(titleCell.style, titleStyle);

    summarySheet.addRow([
      'Entreprise', "Nom de l'Entreprise", '', 'Date', new Date().toLocaleDateString('fr-FR')
    ]);
    summarySheet.addRow([
      'Période', `${this.dateDebut} au ${this.dateFin}`, '', 'Magasin',
      this.selectedMagasinId !== -1 ? this.getNomMagasin(this.selectedMagasinId) : 'Tous'
    ]);
    summarySheet.addRow([]);

    // Indicateurs clés
    summarySheet.mergeCells('A5:F5');
    const overviewTitle = summarySheet.getCell('A5');
    overviewTitle.value = "Vue d'ensemble";
    Object.assign(overviewTitle.style, titleStyle);

    summarySheet.addRow(['Indicateur', 'Valeur', 'Détail']).eachCell(cell => Object.assign(cell.style, headerStyle));
    summarySheet.addRow(['Total Ventes', this.totalVentes, `${this.totalVentes} transactions`]);
    summarySheet.addRow(['Chiffre d\'Affaires TTC', `${this.chiffreAffairesTTC.toLocaleString()} F CFA`, '']);
    summarySheet.addRow(['Chiffre d\'Affaires HT', `${this.chiffreAffairesHT.toLocaleString()} F CFA`, '']);
    summarySheet.addRow(['Marge bénéficiaire', `${this.margeBeneficiaire.toLocaleString()} F CFA`, `${((this.margeBeneficiaire / this.chiffreAffairesHT) * 100).toFixed(2)}%`]);
    summarySheet.addRow(['Ticket moyen', `${this.ticketMoyen.toLocaleString()} F CFA`, `${this.panierMoyen.toFixed(1)} produits/vente`]);

    // Feuille Modes Paiement
    const paymentSheet = workbook.addWorksheet('Modes Paiement');
    paymentSheet.mergeCells('A1:D1');
    const paymentTitle = paymentSheet.getCell('A1');
    paymentTitle.value = 'Répartition des modes de paiement';
    Object.assign(paymentTitle.style, titleStyle);

    paymentSheet.addRow(['Mode', 'Montant (F CFA)', 'Transactions', '%'])
      .eachCell(cell => Object.assign(cell.style, headerStyle));

    this.statmodesPaiement.forEach(mode => {
      paymentSheet.addRow([
        mode.mode,
        mode.montantTotal,
        mode.occurrences,
        `${((mode.montantTotal / this.chiffreAffairesTTC) * 100).toFixed(1)}%`
      ]);
    });

    // Sauvegarde
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `rapport_vente_${this.formatDate(new Date())}.xlsx`);
  }
}