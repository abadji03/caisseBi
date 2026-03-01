/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ToastrService } from 'ngx-toastr';
import { finalize, Subject, Subscription, takeUntil } from 'rxjs';

import { Magasin } from '../../../modeles/magasin.model';
import {
  DonneesRapport,
  IndicateursStocks,
  MouvementsResponse,
  MouvementStock,
  ProduitsSpecifiquesResponse,
  StatistiqueProduit,
  StatsGraphiquesResponse,
  StatsProduitsResponse,
} from '../../../modeles/kpiCaisse.model';
import { AuthService } from '../../../services/auth.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { StructureService } from '../../../services/structure.service';
import { RapportStockService } from '../../../services/rapport-stock.service';

@Component({
  selector: 'app-rapports-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-stocks.component.html',
  styleUrl: './rapports-stocks.component.css',
})
export class RapportsStocksComponent implements OnInit, OnDestroy {
  // Références aux canvas pour les graphiques
  @ViewChild('evolutionChart') evolutionChartRef!: ElementRef;
  @ViewChild('repartitionChart') repartitionChartRef!: ElementRef;
  @ViewChild('topProduitsChart') topProduitsChartRef!: ElementRef;

  // Graphiques
  evolutionChart: Chart | undefined;
  repartitionChart: Chart | undefined;
  topProduitsChart: Chart | undefined;

  // Services
  private rapportsService = inject(RapportStockService);
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
  //categories: string[] = [];
  //statutsDisponibles = ['En stock', 'En alerte', 'En rupture'];

  selectedMagasinId = -1;
  selectedCategorie = 'all';
  selectedStatut = 'all';
  code_structure: string | null = null;

  // État du composant
  isAdmin = false;
  isPrinting = false;
  isGeneratingPDF = false;
  isLoading = false;
  progress = 0;

  // Données provenant de l'API
  indicateursStocks: IndicateursStocks | null = null;
  statsProduits: StatsProduitsResponse | null = null;
  mouvements: MouvementsResponse | null = null;
  graphiques: StatsGraphiquesResponse | null = null;
  produitsSpecifiques: ProduitsSpecifiquesResponse | null = null;

  
  // Pagination et recherche
  currentPage = 1;
  currentPageMvt = 1;
  pageSize = 10;
  searchTerm = '';

  // Données locales filtrées
  filteredProduits: StatistiqueProduit[] = [];
  filteredMouvements: any[] = [];

  constructor() {
    try {
    // Enregistrer les composants Chart.js
    Chart.register(...registerables);
    
    // Configuration globale pour éviter les problèmes
    Chart.defaults.font.family = "'Helvetica', 'Arial', sans-serif";
    Chart.defaults.font.size = 12;
    //Chart.defaults.plugins.legend.labels.generateLabels = undefined; // Désactiver la génération personnalisée
    
    console.log('Chart.js initialisé avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de Chart.js:', error);
  }
  }

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.code_structure = user?.code_structure || null;
      this.isAdmin = this.authService.hasRole('Administrateur');

      if (this.code_structure) {
        this.initDateFilters();
        this.chargerMagasins();
        this.chargerDonnees();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
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
  chargerMagasins(): void {
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (magasins) => {
          this.magasins = magasins;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des magasins:', error);
        }
      });
  }

  // Construire les filtres pour l'API
  construireFiltres(): any {
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

    // Pagination
    filters.page = this.currentPage;
    filters.limit = this.pageSize;

    // Recherche
    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }

    // Filtres supplémentaires
    if (this.selectedCategorie !== 'all') {
      filters.category = this.selectedCategorie;
    }

    if (this.selectedStatut !== 'all') {
      filters.statut = this.selectedStatut;
    }

    return filters;
  }

// Charger les données
chargerDonnees(): void {
  this.isLoading = true;
  this.progress = 0;
  const filters = this.construireFiltres();

  // Réinitialiser les pages à 1 pour les nouvelles recherches
  this.currentPage = 1;
  this.currentPageMvt = 1;

  // Incrémenter la progression
  const updateProgress = () => {
    this.progress += 20;
    this.cdr.detectChanges();
  };

  Promise.all([
    this.rapportsService.getIndicateursStocks(filters).toPromise().then(data => { updateProgress(); return data; }),
    this.rapportsService.getStatsProduits({
      ...filters,
      page: 1,//this.currentPage,
      limit: this.pageSize,
      //search: this.searchTerm,
      categoryId: this.selectedCategorie !== 'all' ? Number(this.selectedCategorie) : undefined,
      statut: this.selectedStatut !== 'all' ? this.selectedStatut : undefined
    }).toPromise().then(data => { updateProgress(); return data; }),
    this.rapportsService.getMouvementsPeriode({
      ...filters,
      page: 1,//this.currentPageMvt,
      limit: this.pageSize,
      //search: this.searchTerm
    }).toPromise().then(data => { updateProgress(); return data; }),
    this.rapportsService.getStatsGraphiques(filters).toPromise().then(data => { updateProgress(); return data; }),
    this.rapportsService.getProduitsSpecifiques(filters).toPromise().then(data => { updateProgress(); return data; })
  ])
    .then(([
      indicateurs,
      produits,
      mouvements,
      graphiques,
      produitsSpecifiques
    ]) => {
      console.log('Données reçues:', { indicateurs, produits, mouvements, graphiques, produitsSpecifiques });
      
      this.indicateursStocks = indicateurs || null;
      
      // Adapter les produits
      if (produits) {
        this.statsProduits = {
          ...produits,
          produits: produits.produits || [] // Pour la compatibilité
        };
        this.filteredProduits = this.statsProduits.produits;
      } else {
        this.statsProduits = null;
        this.filteredProduits = [];
      }
      
      // Adapter les mouvements
      if (mouvements) {
        this.mouvements = {
          ...mouvements,
          mouvements: mouvements.mouvements || [] // Pour la compatibilité
        };
        this.filteredMouvements = this.mouvements.mouvements;
      } else {
        this.mouvements = null;
        this.filteredMouvements = [];
      }
      
      this.graphiques = graphiques || null;
      this.produitsSpecifiques = produitsSpecifiques || null;

      // Extraire les catégories uniques
      /* if (this.statsProduits?.produits) {
        this.categories = [...new Set(
          this.statsProduits.produits
            .map(p => p.produit.categorie)
            .filter((nom): nom is string => !!nom)
        )];

      } */

      // Mettre à jour les listes filtrées
      //this.filteredProduits = this.statsProduits?.produits || [];
      //this.filteredMouvements = this.mouvements?.mouvements || [];

      // Mettre à jour les graphiques
      setTimeout(() => {
        this.mettreAJourGraphiques();
      }, 100);
      
      this.progress = 100;
      this.toastr.success('Données chargées avec succès');
    })
    .catch(error => {
      console.error('Erreur lors du chargement des données:', error);
      this.toastr.error('Erreur lors du chargement des données');
    })
    .finally(() => {
      this.isLoading = false;
      setTimeout(() => {
        this.progress = 0;
      }, 500);
      this.cdr.detectChanges();
    });
}

rechargerDonnees(): void {
  // Réinitialiser les données filtrées
  this.filteredProduits = [];
  this.filteredMouvements = [];
  
  // Recharger les données
  this.chargerDonnees();
}

/**
 * Adapte les données de l'API pour les rendre compatibles avec le composant
 */
private adapterDonneesAPI(
  indicateurs: any,
  produits: any,
  mouvements: any,
  graphiques: any,
  produitsSpecifiques: any
): DonneesRapport {
  return {
    indicateurs: indicateurs || null,
    
    // Adapter la structure des produits
    produits: produits ? {
      niveau: produits.niveau,
      periode: produits.periode,
      total: produits.total,
      page: produits.page,
      totalPages: produits.totalPages,
      limit: produits.limit,
      items: produits.produits || [], // items pour le template
      produits: produits.produits || [] // garder la structure originale
    } : null,
    
    // Adapter la structure des mouvements
    mouvements: mouvements ? {
      niveau: mouvements.niveau,
      periode: mouvements.periode,
      total: mouvements.total,
      page: mouvements.page,
      totalPages: mouvements.totalPages,
      limit: mouvements.limit,
      items: mouvements.mouvements || [], // items pour le template
      mouvements: mouvements.mouvements || [] // garder la structure originale
    } : null,
    
    graphiques: graphiques || null,
    produitsSpecifiques: produitsSpecifiques || null
  };
}

 
  // ============================================
// MÉTHODES POUR LES GRAPHIQUES
// ============================================

/**
 * Graphique d'évolution (line chart) - VERSION CORRIGÉE
 */
creerGraphiqueEvolution(): void {
  // Détruire le graphique existant
  if (this.evolutionChart) {
    this.evolutionChart.destroy();
    this.evolutionChart = undefined;
  }

  // Vérifier les données
  if (!this.graphiques?.evolution?.length) {
    return;
  }

  const ctx = this.evolutionChartRef?.nativeElement?.getContext('2d');
  if (!ctx) return;

  const donnees = this.graphiques.evolution;

  // Configuration simplifiée sans plugins complexes
  this.evolutionChart = new Chart(ctx, {
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

/**
 * Graphique de répartition (doughnut) - VERSION CORRIGÉE
 */
creerGraphiqueRepartition(): void {
  // Détruire le graphique existant
  if (this.repartitionChart) {
    this.repartitionChart.destroy();
    this.repartitionChart = undefined;
  }

  // Vérifier les données
  if (!this.graphiques?.repartitionCategories?.length) {
    return;
  }

  const ctx = this.repartitionChartRef?.nativeElement?.getContext('2d');
  if (!ctx) return;

  const repartition = this.graphiques.repartitionCategories;
  
  // Préparer les couleurs
  const couleurs = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#8AC926', '#1982C4',
    '#6A0572', '#00A8A8'
  ];

  // Configuration TRÈS simplifiée pour éviter l'erreur
  this.repartitionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: repartition.map(r => r.categorie),
      datasets: [{
        data: repartition.map(r => r.quantite),
        backgroundColor: couleurs.slice(0, repartition.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        // ✅ SOLUTION: Supprimer complètement la configuration legend
        // Laisser Chart.js gérer la légende par défaut
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw as number;
              const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${context.label}: ${value} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * Graphique des top produits (bar chart) - VERSION CORRIGÉE
 */
creerGraphiqueTopProduits(): void {
  // Détruire le graphique existant
  if (this.topProduitsChart) {
    this.topProduitsChart.destroy();
    this.topProduitsChart = undefined;
  }

  // Vérifier les données
  if (!this.graphiques?.topProduits?.length) {
    return;
  }

  const ctx = this.topProduitsChartRef?.nativeElement?.getContext('2d');
  if (!ctx) return;

  const topProduits = this.graphiques.topProduits;

  // Configuration simplifiée
  this.topProduitsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topProduits.map(p => p.designation.length > 15 ? p.designation.substring(0, 15) + '...' : p.designation),
      datasets: [
        {
          label: 'Quantité vendue',
          data: topProduits.map(p => p.quantiteVendue),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
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
              return `Quantité: ${context.raw}`;
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

/**
 * Méthode principale pour mettre à jour tous les graphiques
 */
mettreAJourGraphiques(): void {
  console.log('Mise à jour des graphiques...');

  // Détruire tous les graphiques existants
  [this.evolutionChart, this.repartitionChart, this.topProduitsChart].forEach(chart => {
    if (chart) {
      try {
        chart.destroy();
      } catch (e) {
        console.warn('Erreur lors de la destruction du graphique:', e);
      }
    }
  });

  // Réinitialiser les références
  this.evolutionChart = undefined;
  this.repartitionChart = undefined;
  this.topProduitsChart = undefined;

  // Attendre que le DOM soit prêt
  setTimeout(() => {
    try {
      // Vérifier que les références canvas existent
      if (this.evolutionChartRef?.nativeElement) {
        this.creerGraphiqueEvolution();
      }
      
      if (this.repartitionChartRef?.nativeElement) {
        this.creerGraphiqueRepartition();
      }
      
      if (this.topProduitsChartRef?.nativeElement) {
        this.creerGraphiqueTopProduits();
      }
    } catch (error) {
      console.error('Erreur lors de la création des graphiques:', error);
    }
  }, 100);
}

// Gestionnaires d'événements
  onPeriodeChange(): void {
    if (this.periodeSelectionnee !== 'personnalisee') {
      this.dateDebut = '';
      this.dateFin = '';
    }
    this.filtrerDonnees();
  }

  onMagasinSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMagasinId = Number(target.value);
    this.filtrerDonnees();
  }

  filtrerDonnees(): void {
    this.currentPage = 1;
    this.currentPageMvt = 1;
    this.chargerDonnees();
  }

  filtrerDates(): void {
    if (this.periodeSelectionnee === 'personnalisee') {
      if (this.dateDebut && this.dateFin) {
        if (new Date(this.dateDebut) > new Date(this.dateFin)) {
          this.toastr.warning('La date de début doit être antérieure à la date de fin');
          return;
        }
        this.filtrerDonnees();
      } else {
        this.toastr.warning('Veuillez sélectionner une date de début et une date de fin');
      }
    }
  }

  // Recherche
onSearchChange(type: string): void {
  const filters = this.construireFiltres();
  /* filters.search = this.searchTerm;
  filters.limit = this.pageSize;
  this.isLoading = true; */
  
  if (type === 'stock') {
    this.currentPage = 1;
    /* filters.page = 1;
    
    if (this.selectedCategorie !== 'all') {
      filters.categoryId = Number(this.selectedCategorie);
    }
    if (this.selectedStatut !== 'all') {
      filters.statut = this.selectedStatut;
    } */
    
    this.rapportsService.getStatsProduits(filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (produits) => {
          this.statsProduits = {
            ...produits,
            produits: produits.produits || []
          };
          this.filteredProduits = this.statsProduits.produits;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche des produits:', error);
          this.toastr.error('Erreur lors de la recherche');
        }
      });
  } 
  else if (type === 'mouvement') {
    this.currentPageMvt = 1;
    //filters.page = 1;
    
    this.rapportsService.getMouvementsPeriode(filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (mouvements) => {
          this.mouvements = {
            ...mouvements,
            mouvements: mouvements.mouvements || []
          };
          this.filteredMouvements = this.mouvements.mouvements;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche des mouvements:', error);
          this.toastr.error('Erreur lors de la recherche');
        }
      });
  }
}
  removeAccents(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Pagination
  
onPageChange(page: number, type: 'produits' | 'mouvements'): void {
  const filters = this.construireFiltres();
  filters.page = page;
  filters.limit = this.pageSize;
  this.isLoading = true;
  
  if (type === 'produits') {
    this.currentPage = page;
    // Ajouter les filtres spécifiques aux produits
    if (this.selectedCategorie !== 'all') {
      filters.categoryId = Number(this.selectedCategorie);
    }
    if (this.selectedStatut !== 'all') {
      filters.statut = this.selectedStatut;
    }
    
    this.rapportsService.getStatsProduits(filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (produits) => {
          this.statsProduits = {
            ...produits,
            produits: produits.produits || []
          };
          this.filteredProduits = this.statsProduits?.produits || [];
          this.toastr.success(`Page ${page} des produits chargée`);
        },
        error: (error) => {
          console.error('Erreur lors du changement de page des produits:', error);
          this.toastr.error('Erreur lors du chargement de la page');
        }
      });
  } 
  else if (type === 'mouvements') {
    this.currentPageMvt = page;
    
    this.rapportsService.getMouvementsPeriode(filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (mouvements) => {
          this.mouvements = {
            ...mouvements,
            mouvements: mouvements.mouvements || []
          };
          this.filteredMouvements = this.mouvements?.mouvements || [];
          this.toastr.success(`Page ${page} des mouvements chargée`);
        },
        error: (error) => {
          console.error('Erreur lors du changement de page des mouvements:', error);
          this.toastr.error('Erreur lors du chargement de la page');
        }
      });
  }
  this.mettreAJourGraphiques();
}

getPaginatedProduits(): StatistiqueProduit[] {
  return this.filteredProduits;
}

getPaginatedMouvements(): MouvementStock[] {
  return this.filteredMouvements;
}

getTotalPagesProduits(): number {
  return this.statsProduits?.totalPages || 
         Math.ceil((this.statsProduits?.total || 0) / this.pageSize) || 
         1;
}

getTotalPagesMouvements(): number {
  return this.mouvements?.totalPages || 
         Math.ceil((this.mouvements?.total || 0) / this.pageSize) || 
         1;
}

onPageSizeChange(type: string): void {
  if (type === 'produits') {
    this.currentPage = 1;
    this.onPageChange(1, 'produits');
  } else if (type === 'mouvements') {
    this.currentPageMvt = 1;
    this.onPageChange(1, 'mouvements');
  }
}
  // Utilitaires
  getNomMagasin(id: number): string {
    const magasin = this.magasins.find(m => m.id === id);
    return magasin ? magasin.nom : 'Non spécifié';
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

  // Export PDF
  // Méthode d'export PDF
async exportToPDF(): Promise<void> {
  // Vérifier les dates
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

    // Animation de progression
    const interval = setInterval(() => {
      if (this.progress < 90) this.progress += 10;
    }, 300);

    // Construire les paramètres
    const params = this.construireFiltresPDF();

    // Générer le PDF
    const pdfBlob = await this.rapportsService.generateRapportStockPDF(params).toPromise();

    if(!pdfBlob){
      console.log('Echec appel API pour générer le PDF');
      return;
    }

    clearInterval(interval);
    this.progress = 100;

    // Sauvegarder le fichier
    const fileName = this.generateStockFileName();
    this.rapportsService.savePDF(pdfBlob, fileName);

    this.toastr.success('PDF généré avec succès');

  } catch (error: any) {
    console.error('❌ Erreur génération PDF:', error);
    
    if (error.status === 401) {
      this.toastr.error('Session expirée. Veuillez vous reconnecter.');
    } else if (error.status === 400) {
      this.toastr.error('Paramètres invalides: ' + (error.error?.error || ''));
    } else if (error.status === 500) {
      this.toastr.error('Erreur serveur lors de la génération du PDF');
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
 * Construire les filtres spécifiques pour le PDF
 */
private construireFiltresPDF(): any {
  const params: any = {
    code_structure: this.code_structure
  };

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

  if (this.selectedCategorie !== 'all') {
    params.categorie = this.selectedCategorie;
  }

  if (this.selectedStatut !== 'all') {
    params.statut = this.selectedStatut;
  }

  // Nettoyer les paramètres undefined
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  );
}

/**
 * Générer un nom de fichier pour le rapport stock
 */
private generateStockFileName(): string {
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
  
  return `rapport-stock${suffix}-${dateStr}.pdf`;
}

// Export Excel
async exportToExcel(): Promise<void> {
  // Vérifier les dates
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

    // Construire les paramètres
    const params = this.construireFiltresExcel();

    // Appel API
    const excelBlob = await this.rapportsService.exportRapportStockExcel(params).toPromise();

    if(!excelBlob){
      console.log('Echec appel API pour générer un fichier excel');
      return;
    }

    clearInterval(interval);
    this.progress = 100;

    // Sauvegarder le fichier
    const fileName = this.generateStockExcelFileName();
    this.rapportsService.saveExcel(excelBlob, fileName);

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
  const params: any = {
    code_structure: this.code_structure
  };

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

  if (this.selectedCategorie !== 'all') {
    params.categorie = this.selectedCategorie;
  }

  if (this.selectedStatut !== 'all') {
    params.statut = this.selectedStatut;
  }

  // Nettoyer les paramètres undefined
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  );
}

/**
 * Générer un nom de fichier Excel pour le rapport stock
 */
private generateStockExcelFileName(): string {
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
  
  // Ajouter la catégorie si sélectionnée
  if (this.selectedCategorie !== 'all') {
    suffix += `-${this.selectedCategorie.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  return `rapport-stock${suffix}-${dateStr}.xlsx`;
}

//Impression
  async impression(): Promise<void> {
  try {
    this.isGeneratingPDF = true;
    this.progress = 0;

    // Construire les paramètres (comme pour le PDF)
    const params = this.construireFiltresPDF();
    
    // Ajouter un paramètre pour indiquer que c'est pour impression
    //params.print = true;

    // Générer le PDF
    const pdfBlob = await this.rapportsService.generateRapportStockPDF(params).toPromise();

    if(!pdfBlob){
      console.log('Echec appel API depuis backend');
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
}