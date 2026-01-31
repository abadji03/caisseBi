/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
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

@Component({
  selector: 'app-rapports-financiers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-financiers.component.html',
  styleUrl: './rapports-financiers.component.css',
})
export class RapportsFinanciersComponent implements OnInit {
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

  // Filtres
  dateGeneration = new Date();
  dateDebut = '';
  dateFin = '';
  dateReference = ''; 

  
  // Nouveau filtre période prédéfinie
  periodeSelectionnee = 'personnalisee';
  periodesDisponibles = [
    { value: 'jour', label: 'Aujourd\'hui' },
    { value: 'semaine', label: 'Cette semaine' },
    { value: 'mois', label: 'Ce mois' },
    /* { value: 'trimestre', label: 'Ce trimestre' }, */
    { value: 'annee', label: 'Cette année' },
    { value: 'personnalisee', label: 'Période personnalisée' }
  ];
  
  magasins: Magasin[] = [];
  selectedMagasinId?: number;
  selectedAgentId?: number;
  code_structure = 'MASTRUCTURET-NZNC'; // À remplacer par la vraie valeur

  // État du composant
  isAdmin = true;
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
    this.initDateFilters();
    this.chargerMagasins();
    this.chargerDonnees();
    this.loadStructureInfo();
  }

  // Initialiser les filtres de date
  initDateFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.dateDebut = this.formatDate(firstDayOfMonth);
    this.dateFin = this.formatDate(today);

    // Initialiser la date de référence avec aujourd'hui
    this.dateReference = this.formatDate(today);
  }

  // Charger les magasins
  chargerMagasins(): void {
    this.magasinService.getMagasinsByStructure(this.code_structure).subscribe({
      next: (magasins) => {
        this.magasins = magasins;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des magasins:', error);
      }
    });
  }

  // Charger toutes les données
  chargerDonnees(): void {
    this.isLoading = true;

    const filters = this.construireFiltres();

    // Charger toutes les données en parallèle
    const requests = {
      indicateurs: this.rapportsService.getIndicateursFinanciers(filters),
      repartitionDepenses: this.rapportsService.getRepartitionDepenses(filters),
      repartitionRecettes: this.rapportsService.getRepartitionRecettes(filters),
      modesPaiement: this.rapportsService.getStatistiquesModesPaiement(filters),
      depenses: this.rapportsService.getDepensesDetaillees(filters),
      recettes: this.rapportsService.getRecettesDetaillees(filters),
      evolution: this.rapportsService.getDonneesEvolutives({...filters, groupBy: 'jour'})
    };

    // Exécuter toutes les requêtes en parallèle
    Promise.all([
      requests.indicateurs.toPromise(),
      requests.repartitionDepenses.toPromise(),
      requests.repartitionRecettes.toPromise(),
      requests.modesPaiement.toPromise(),
      requests.depenses.toPromise(),
      requests.recettes.toPromise(),
      requests.evolution.toPromise()
    ]).then(([
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
      
      this.isLoading = false;
      this.cdr.detectChanges();
      
      // Mettre à jour les graphiques
      setTimeout(() => {
        this.mettreAJourGraphiques();
      }, 100);
      
      // Charger les données comparatives
      this.chargerDonneesComparatives();
      
    }).catch(error => {
      console.error('Erreur lors du chargement des données:', error);
      this.isLoading = false;
    });
  }

  // Charger les données comparatives
  chargerDonneesComparatives(): void {
    const filters = this.construireFiltres();
    this.rapportsService.getDonneesComparatives(filters).subscribe({
      next: (comparatives) => {
        this.donneesComparatives = comparatives;
        this.cdr.detectChanges();
        // Recréer le graphique de tendances avec les nouvelles données
        this.creerGraphiqueTendances();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données comparatives:', error);
      }
    });
  }

  // Construire les filtres pour l'API
  construireFiltres(): any {
    const filters: any = {
      code_structure: this.code_structure
    };

    // Ajouter magasinId si sélectionné
    if (this.selectedMagasinId !== undefined) {
      filters.magasinId = this.selectedMagasinId;
    }

    // Ajouter agentId si sélectionné
    if (this.selectedAgentId !== undefined) {
      filters.agentId = this.selectedAgentId;
    }

    // Gestion de la période
    if (this.periodeSelectionnee !== 'personnalisee') {
        filters.periode = this.periodeSelectionnee;
        
        // Utiliser la date de référence choisie par l'utilisateur, sinon aujourd'hui
        if (this.dateReference) {
          filters.dateReference = new Date(this.dateReference);
        } 
        else {
          filters.dateReference = new Date(); // Par défaut: aujourd'hui
          // Optionnel: initialiser la dateReference avec aujourd'hui
          if (!this.dateReference) {
            this.dateReference = this.formatDate(new Date());
          }
        }
    }
    else if (this.dateDebut && this.dateFin) {
      filters.fromDate = new Date(this.dateDebut);
      filters.toDate = new Date(this.dateFin);
    } 
    else {
      // Par défaut, utiliser le mois en cours
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filters.fromDate = firstDayOfMonth;
      filters.toDate = today;
    }

    // Ajouter pagination pour les détails
    if (this.depensesDetaillees || this.recettesDetaillees) {
      filters.page = this.currentPageDepenses;
      filters.limit = this.pageSize;
    }

    // Ajouter recherche si spécifiée
    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }

    return filters;
  }

  // Gestion des événements de filtre
  onPeriodeChange(): void {
    if (this.periodeSelectionnee !== 'personnalisee') {
      // Réinitialiser les dates personnalisées
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
    if (this.periodeSelectionnee === 'personnalisee' && this.dateDebut && this.dateFin) {
      this.filtrerDonnees();
    }
  }

  // Recherche
  onSearchChange(): void {
    this.currentPageDepenses = 1;
    this.currentPageRecettes = 1;
    
    const filters = this.construireFiltres();
    
    // Recharger seulement les détails avec recherche
    this.rapportsService.getDepensesDetaillees(filters).subscribe({
      next: (depenses) => {
        this.depensesDetaillees = depenses;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche des dépenses:', error);
      }
    });

    this.rapportsService.getRecettesDetaillees(filters).subscribe({
      next: (recettes) => {
        this.recettesDetaillees = recettes;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche des recettes:', error);
      }
    });
  }

  // Pagination
  onPageChange(page: number, type: 'depenses' | 'recettes'): void {
    const filters = this.construireFiltres();
    filters.page = page;
    filters.limit = this.pageSize;
    
    if (type === 'depenses') {
      this.currentPageDepenses = page;
      this.rapportsService.getDepensesDetaillees(filters).subscribe({
        next: (depenses) => {
          this.depensesDetaillees = depenses;
        },
        error: (error) => {
          console.error('Erreur lors du changement de page des dépenses:', error);
        }
      });
    } else {
      this.currentPageRecettes = page;
      this.rapportsService.getRecettesDetaillees(filters).subscribe({
        next: (recettes) => {
          this.recettesDetaillees = recettes;
        },
        error: (error) => {
          console.error('Erreur lors du changement de page des recettes:', error);
        }
      });
    }
  }

  // Méthodes pour les graphiques
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
          // Formater la date selon le groupBy
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

  // Méthodes utilitaires
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
    /* if (this.periodeSelectionnee !== 'personnalisee') {
      return this.libellePeriodeSelectionnee;
    } else if (this.dateDebut && this.dateFin) {
      return `Du ${new Date(this.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(this.dateFin).toLocaleDateString('fr-FR')}`;
    }
    return 'Période non définie'; */
    if (this.periodeSelectionnee !== 'personnalisee') {
      const dateRef = this.dateReference ? new Date(this.dateReference) : new Date();
      const formattedDate = dateRef.toLocaleDateString('fr-FR');
      return `${this.libellePeriodeSelectionnee} (${formattedDate})`;
    } else if (this.dateDebut && this.dateFin) {
      return `Du ${new Date(this.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(this.dateFin).toLocaleDateString('fr-FR')}`;
    }
    return 'Période non définie';
  }
// Charger les informations de la structure pour le PDF
private loadStructureInfo(): void {
    this.structureService.getByCodeStructure(this.code_structure)
      .subscribe({
        next: (structure) => {
          this.pdfMakerService.setStructureInfo(structure);
        },
        error: (err) => {
          console.error('Erreur chargement structure:', err);
        }
      });
  }

  // Méthodes d'export (simplifiées pour l'instant)
  async exportToPDF(): Promise<void> {
  try {
    this.isGeneratingPDF = true;
    this.progress = 0;

    // Charger TOUTES les données sans pagination
    const filters = this.construireFiltres();
    filters.page = 1;
    filters.limit = 1000; // Un grand nombre pour tout récupérer
    
    // Charger toutes les dépenses
    const toutesDepenses = await this.rapportsService.getDepensesDetaillees(filters).toPromise();
    // Charger toutes les recettes
    const toutesRecettes = await this.rapportsService.getRecettesDetaillees(filters).toPromise();

    
    // Préparer les données pour le PDF
    const rapportData = {
      periode: this.periodeAffichage,
      dateGeneration: new Date(),
      filters: {
        periodeSelectionnee: this.periodeSelectionnee,
        dateDebut: this.dateDebut,
        dateFin: this.dateFin,
        magasin: this.selectedMagasinId ? this.getNomMagasin(this.selectedMagasinId) : 'Tous',
        dateReference: this.dateReference
      },
      indicateursFinanciers: this.indicateursFinanciers,
      repartitionDepenses: this.repartitionDepenses,
      repartitionRecettes: this.repartitionRecettes,
      modesPaiementStats: this.modesPaiementStats,
      depensesDetaillees: toutesDepenses, // Utiliser TOUTES les dépenses
      recettesDetaillees: toutesRecettes, // Utiliser TOUTES les recettes
      donneesComparatives: this.donneesComparatives,
      donneesEvolutives: this.donneesEvolutives
    };

    // Simuler une progression
    const interval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 10;
      }
    }, 200);

    // Générer le PDF
    await this.pdfMakerService.generateRapportFinancier(rapportData);
    
    clearInterval(interval);
    this.progress = 100;
    
    setTimeout(() => {
      this.isGeneratingPDF = false;
      this.progress = 0;
    }, 500);
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    this.isGeneratingPDF = false;
    this.progress = 0;
    alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
  }
}

  async exportToExcel(): Promise<void> {
    // Implémentation simplifiée - à compléter avec votre logique existante
    alert('Export Excel fonctionnalité à implémenter');
  }

  async impression(): Promise<void> {
  this.isPrinting = true;
  
  // Préparer l'impression
  const printContent = document.getElementById('rapport');
  if (printContent) {
    const originalDisplay = printContent.style.display;
    printContent.style.display = 'block';
    
    // Attendre que tout soit rendu
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Imprimer
    window.print();
    
    // Restaurer l'affichage original
    printContent.style.display = originalDisplay;
  }
  
  this.isPrinting = false;
}

  // Méthodes pour préparer l'export
  async prepareChartsForExport(): Promise<void> {
    const charts = [this.evolutionChart, this.depensesChart, this.recettesChart, this.tendancesChart];
    charts.forEach(chart => {
      if (chart) {
        chart.resize();
        chart.render();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 400));
  }
}