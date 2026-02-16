/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import * as ExcelJS from 'exceljs';
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
  categories: string[] = [];
  statutsDisponibles = ['En stock', 'En alerte', 'En rupture'];

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
        this.loadStructureInfo();
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

// Remplacer chargerDonnees() par cette version qui utilise les APIs individuelles
/* chargerDonnees(): void {
  this.isLoading = true;
  this.progress = 0;
  const filters = this.construireFiltres();

  // Utiliser Promise.all pour paralléliser les appels
  Promise.all([
    this.rapportsService.getIndicateursStocks(filters).toPromise(),
    this.rapportsService.getStatsProduits({
      ...filters,
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm,
      categoryId: this.selectedCategorie !== 'all' ? Number(this.selectedCategorie) : undefined,
      statut: this.selectedStatut !== 'all' ? this.selectedStatut : undefined
    }).toPromise(),
    this.rapportsService.getMouvementsPeriode({
      ...filters,
      page: this.currentPageMvt,
      limit: this.pageSize,
      search: this.searchTerm,
      typeMouvement: undefined
    }).toPromise(),
    this.rapportsService.getStatsGraphiques(filters).toPromise(),
    this.rapportsService.getProduitsSpecifiques(filters).toPromise()
  ])
    .then(([
      indicateurs,
      produits,
      mouvements,
      graphiques,
      produitsSpecifiques
    ]) => {
      // Mise à jour des données
      this.indicateursStocks = indicateurs || null;
      // Adapter la structure des produits
      if (produits) {
        this.statsProduits = {
          ...produits,
          // S'assurer que items existe pour le template
          produits: produits.produits || []
        };
      } else {
        this.statsProduits = null;
      }
      
      // Adapter la structure des mouvements
      if (mouvements) {
        this.mouvements = {
          ...mouvements,
          // S'assurer que items existe pour le template
          mouvements: mouvements.mouvements || []
        };
      } else {
        this.mouvements = null;
      }
      
      this.graphiques = graphiques || null;
      this.produitsSpecifiques = produitsSpecifiques || null;

      // Extraire les catégories uniques
      if (this.statsProduits?.produits) {
        this.categories = [...new Set(
        this.statsProduits.produits
          .map(p => p.produit.categorie)
          .filter((nom): nom is string => !!nom)
      )];

      }

      // Mettre à jour les listes filtrées
      this.filteredProduits = this.statsProduits?.produits || [];
      this.filteredMouvements = this.mouvements?.mouvements || [];

      // Mettre à jour les graphiques
      setTimeout(() => {
        this.mettreAJourGraphiques();
      }, 100);
    })
    .catch(error => {
      console.error('Erreur lors du chargement des données:', error);
      this.toastr.error('Erreur lors du chargement des données');
    })
    .finally(() => {
      this.isLoading = false;
      this.progress = 100;
      this.cdr.detectChanges();
    });
}
 */
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
      if (this.statsProduits?.produits) {
        this.categories = [...new Set(
          this.statsProduits.produits
            .map(p => p.produit.categorie)
            .filter((nom): nom is string => !!nom)
        )];

      }

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

  // Mettre à jour les graphiques
  /* mettreAJourGraphiques(): void {
    this.creerGraphiqueEvolution();
    this.creerGraphiqueRepartition();
    this.creerGraphiqueTopProduits();
  } */

  // ============================================
// MÉTHODES CORRIGÉES POUR LES GRAPHIQUES
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

/**
 * Préparer les graphiques pour l'export
 */
/* async prepareChartsForExport(): Promise<void> {
  // Attendre que les graphiques soient rendus
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Forcer le redimensionnement
  [this.evolutionChart, this.repartitionChart, this.topProduitsChart].forEach(chart => {
    if (chart) {
      try {
        chart.resize();
        chart.update();
      } catch (e) {
        console.warn('Erreur lors de la préparation du graphique:', e);
      }
    }
  });
  
  await new Promise(resolve => setTimeout(resolve, 200));
} */
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
  /* onSearchChange(type: string): void {
  
  if (type === 'stock') {
    this.currentPage = 1;
    const search = this.removeAccents(this.searchTerm.toLowerCase());

    if (this.statsProduits?.produits) {
      this.filteredProduits = this.statsProduits.produits.filter((p: StatistiqueProduit) => {
        const designation = this.removeAccents(p.produit.designation.toLowerCase());
        const categorie = this.removeAccents((p.produit.categorie || '').toLowerCase());
        const statut = this.removeAccents(p.statut.toLowerCase());
        
        return designation.includes(search) || 
               categorie.includes(search) || 
               statut.includes(search);
      });
    }
  } else if (type === 'mouvement') {
    this.currentPageMvt = 1;
    const search = this.removeAccents(this.searchTerm.toLowerCase());

    if (this.mouvements?.mouvements) {
      this.filteredMouvements = this.mouvements.mouvements.filter((m: MouvementStock) => {
        const ref = this.removeAccents(m.ref.toLowerCase());
        const produit = this.removeAccents(m.produit.toLowerCase());
        const description = this.removeAccents((m.description || '').toLowerCase());
        
        return ref.includes(search) || 
               produit.includes(search) || 
               description.includes(search);
      });
    }
  }
}
 */
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
  /* onPageChange(page: number, type: string): void {
    if (type === 'stock') {
      this.currentPage = page;
      this.updateFilteredProduits();
    } else if (type === 'mouvement') {
      this.currentPageMvt = page;
      this.updateFilteredMouvements();
    }
  } */
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
}
/* updateFilteredProduits(): void {
  if (!this.statsProduits?.produits) {
    this.filteredProduits = [];
    return;
  }
  
  const start = (this.currentPage - 1) * this.pageSize;
  const end = start + this.pageSize;
  // Utiliser 'produits' au lieu de 'items' car l'API renvoie 'produits'
  this.filteredProduits = this.statsProduits.produits.slice(start, end);
}

updateFilteredMouvements(): void {
  if (!this.mouvements?.mouvements) {
    this.filteredMouvements = [];
    return;
  }
  
  const start = (this.currentPageMvt - 1) * this.pageSize;
  const end = start + this.pageSize;
  // Utiliser 'mouvements' au lieu de 'items' car l'API renvoie 'mouvements'
  this.filteredMouvements = this.mouvements.mouvements.slice(start, end);
} */

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
  async exportToPDF(): Promise<void> {
    /* try {
      this.isGeneratingPDF = true;
      this.progress = 0;

      await this.prepareChartsForExport();

      const rapportData = {
        periode: this.periodeAffichage,
        dateGeneration: new Date(),
        filters: {
          periodeSelectionnee: this.periodeSelectionnee,
          dateDebut: this.dateDebut,
          dateFin: this.dateFin,
          magasin: this.selectedMagasinId !== -1 ? this.getNomMagasin(this.selectedMagasinId) : 'Tous',
          dateReference: this.dateReference
        },
        indicateursStocks: this.indicateursStocks,
        produits: this.statsProduits,
        mouvements: this.mouvements,
        graphiques: this.graphiques,
        produitsSpecifiques: this.produitsSpecifiques
      };

      const interval = setInterval(() => {
        if (this.progress < 90) {
          this.progress += 10;
        }
      }, 200);

      await this.pdfMakerService.generateRapportStock(rapportData);

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
      this.toastr.error('Erreur lors de la génération du PDF');
    } */
  }

  // Export Excel
  async exportToExcel(): Promise<void> {
    try {
      this.isGeneratingPDF = true;
      this.progress = 0;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Application de Gestion';
      workbook.created = new Date();

      // Feuille Résumé
      const summarySheet = workbook.addWorksheet('Résumé');

      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } }
      };

      // En-tête
      summarySheet.mergeCells('A1:D2');
      summarySheet.getCell('A1').value = 'Rapport des Stocks';
      summarySheet.getCell('A1').font = { bold: true, size: 18 };
      summarySheet.getCell('A1').alignment = { horizontal: 'center' };

      // Informations
      summarySheet.addRow(['Période', this.periodeAffichage]);
      summarySheet.addRow(['Magasin', this.selectedMagasinId !== -1 ? this.getNomMagasin(this.selectedMagasinId) : 'Tous']);
      summarySheet.addRow(['Date génération', new Date().toLocaleDateString('fr-FR')]);
      summarySheet.addRow([]);

      // Indicateurs
      summarySheet.addRow(['Indicateurs', 'Valeur']).eachCell(cell => {
        Object.assign(cell, headerStyle);
      });

      if (this.indicateursStocks) {
        summarySheet.addRow(['Total Produits', this.indicateursStocks.totalProduits]);
        summarySheet.addRow(['Produits Uniques', this.indicateursStocks.produitsUniques]);
        summarySheet.addRow(['Valeur Stock Initial', `${this.indicateursStocks.valeurStockInitial.toLocaleString()} F CFA`]);
        summarySheet.addRow(['Valeur Stock Final', `${this.indicateursStocks.valeurStockFinal.toLocaleString()} F CFA`]);
        summarySheet.addRow(['Produits en Rupture', this.indicateursStocks.produitsRupture]);
        summarySheet.addRow(['Produits en Alerte', this.indicateursStocks.produitsEnAlerte]);
        summarySheet.addRow(['Produits à Réapprovisionner', this.indicateursStocks.produitsAReapprovisionner]);
        summarySheet.addRow(['Produits en Surstock', this.indicateursStocks.produitsEnSurStock]);
        summarySheet.addRow(['Produits Périssables', this.indicateursStocks.produitsPerissable]);
      }

      // Feuille Produits
      const productsSheet = workbook.addWorksheet('Produits');
      productsSheet.columns = [
        { header: 'Produit', key: 'designation', width: 30 },
        { header: 'Catégorie', key: 'categorie', width: 20 },
        { header: 'Unité', key: 'unite', width: 10 },
        { header: 'Prix Achat', key: 'prixAchat', width: 15 },
        { header: 'Stock Initial', key: 'stockInitial', width: 15 },
        { header: 'Entrées', key: 'entrees', width: 10 },
        { header: 'Sorties', key: 'sorties', width: 10 },
        { header: 'Stock Final', key: 'stockFinal', width: 15 },
        { header: 'Taux Rotation', key: 'tauxRotation', width: 15 },
        { header: 'Statut', key: 'statut', width: 15 }
      ];

      productsSheet.getRow(1).eachCell(cell => {
        Object.assign(cell, headerStyle);
      });

      this.statsProduits?.produits.forEach((p:any) => {
        productsSheet.addRow({
          designation: p.produit.designation,
          categorie: p.produit.famille || 'Non catégorisé',
          unite: p.produit.unite,
          prixAchat: `${p.prixAchat.toLocaleString()} F CFA`,
          stockInitial: `${p.stockInitial} (${p.valeurStockInitial.toLocaleString()})`,
          entrees: p.entrees,
          sorties: p.sorties,
          stockFinal: `${p.stockFinal} (${p.valeurStockFinal.toLocaleString()})`,
          tauxRotation: p.tauxRotation.toFixed(2),
          statut: p.statut
        });
      });

      // Feuille Mouvements
      const movementsSheet = workbook.addWorksheet('Mouvements');
      movementsSheet.columns = [
        { header: 'Référence', key: 'ref', width: 15 },
        { header: 'Produit', key: 'produit', width: 25 },
        { header: 'Magasin', key: 'magasin', width: 20 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Quantité', key: 'quantite', width: 12 },
        { header: 'Prix Unitaire', key: 'prixUnitaire', width: 15 },
        { header: 'Prix Total', key: 'prixTotal', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Responsable', key: 'responsable', width: 20 }
      ];

      movementsSheet.getRow(1).eachCell(cell => {
        Object.assign(cell, headerStyle);
      });

      this.mouvements?.mouvements.forEach((m:any) => {
        movementsSheet.addRow({
          ref: m.ref,
          produit: m.produit,
          magasin: m.magasin,
          type: m.typeMouvement,
          quantite: m.quantite,
          prixUnitaire: `${m.prixUnitaire.toLocaleString()} F CFA`,
          prixTotal: `${m.prixTotal.toLocaleString()} F CFA`,
          date: new Date(m.dateMouvement).toLocaleDateString('fr-FR'),
          description: m.description || '-',
          responsable: m.acteur
        });
      });

      // Génération du fichier
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rapport_stock_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);

      this.isGeneratingPDF = false;
      this.progress = 0;

    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      this.isGeneratingPDF = false;
      this.progress = 0;
      this.toastr.error('Erreur lors de l\'export Excel');
    }
  }

  // Impression
  async impression(): Promise<void> {
    this.isPrinting = true;

    await this.prepareChartsForExport();

    const printContent = document.getElementById('rapport');
    if (printContent) {
      //const originalDisplay = printContent.style.display;
      printContent.style.display = 'block';

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
        #print-clone { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; }
        .no-printer { display: none !important; }
      `;

      document.body.appendChild(style);
      document.body.appendChild(clone);

      setTimeout(() => {
        window.print();

        document.body.removeChild(clone);
        document.head.removeChild(style);
        this.isPrinting = false;

        this.recreateCharts();
      }, 800);
    }
  }

  private async convertChartsToImages(element: HTMLElement): Promise<void> {
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

  private recreateCharts(): void {
    this.prepareChartsForExport();
  }

  async prepareChartsForExport(): Promise<void> {
    const charts = [this.evolutionChart, this.repartitionChart, this.topProduitsChart];
    charts.forEach(chart => {
      if (chart) {
        chart.resize();
        chart.render();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 400));
  }
}