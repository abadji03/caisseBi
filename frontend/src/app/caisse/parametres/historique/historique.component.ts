/* eslint-disable @typescript-eslint/no-explicit-any */
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HistoriqueAction, HistoriqueConnexion, HistoriqueService } from '../../../services/historique.service';
import { ToastrService } from 'ngx-toastr';
import { finalize, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationAdvancedComponent } from '../../../sharedComposants/pagination-advanced/pagination-advanced.component';
import { UserService } from '../../../services/user.service';
import { StructureService } from '../../../services/structure.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationAdvancedComponent],
  templateUrl: './historique.component.html',
  styleUrl: './historique.component.css'
})
export class HistoriqueComponent implements OnInit,OnDestroy,AfterViewInit  {

  private destroy$ = new Subject<void>();
  private historiqueService = inject(HistoriqueService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private userService = inject(UserService);
  private structureService = inject(StructureService);

   // ViewChild pour référencer le canvas
  @ViewChild('actionsChartCanvas') actionsChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  // États
  activeTab: 'actions' | 'connexions' | 'stats' = 'actions';
  isLoading = false;
  
  // Données
  actions: HistoriqueAction[] = [];
  connexions: HistoriqueConnexion[] = [];
  users: any[] = [];
  structures: any[] = [];
  stats: any = {};
  
  // Filtres
  filtreUserId: number | string = 'all';
  filtreStructureId = 'all';
  filtreCategorie = '';
  dateDebut = '';
  dateFin = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  limit = 10;
  totalItems = 0;
  
  // Utilisateur courant
  currentUser: any;
  isAdminGeneral = false;
  isAdminStructure = false;

  code_structure : string|null = null;

  actionsChart: Chart | null = null;
  private chartInitialized = false;
  
  // Modal
  selectedActionDetails: any = null;
  
  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.isAdminGeneral = this.authService.hasRole('Administrateur Général');
      this.isAdminStructure = this.authService.hasRole('Administrateur') && !this.isAdminGeneral;
      
      this.loadUsers();
      if (this.isAdminGeneral) {
        this.loadStructures();
      }
      this.loadData();
    });
  }
  
  ngAfterViewInit(): void {
    // Initialiser le graphique après le chargement de la vue
    setTimeout(() => {
      this.initChart();
    }, 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Détruire le graphique pour éviter les fuites mémoire
    if (this.actionsChart) {
      this.actionsChart.destroy();
      this.actionsChart = null;
    }
  }
  
  setActiveTab(tab: 'actions' | 'connexions' | 'stats'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadData();
     // Si on passe à l'onglet stats, réinitialiser le graphique
    if (tab === 'stats') {
      setTimeout(() => {
        this.initChart();
        this.loadStats();
      }, 200);
    }
  }
  

  // Dans historique.component.ts

loadUsers(): void {
  this.isLoading = true;
  
  const filters = {
    page: 1,
    limit: 10000
  };
  
  // Déterminer quel service appeler
  //let request$: Observable<any>;
  
  /* if (this.isAdminGeneral) {
    // Admin général : tous les utilisateurs de toutes les structures
    console.log('Admin Général - Chargement de tous les utilisateurs');
    request$ = this.userService.getAllsBis(filters);
  } 
  else if (this.code_structure) {
    // Administrateur normal : utilisateurs de sa structure uniquement
    console.log(`Administrateur - Chargement des utilisateurs de la structure: ${this.code_structure}`);
    request$ = this.userService.getByStructureBis(this.code_structure,filters);
  } 
  else {
    console.warn('Aucune structure définie pour l\'utilisateur');
    this.users = [];
    this.isLoading = false;
    return;
  } */
  
  this.userService.getAllsBis(filters).pipe(
    takeUntil(this.destroy$),
    finalize(() => this.isLoading = false)
  ).subscribe({
    next: (response) => {
      // Extraction des utilisateurs
      console.log('Données users chargées depuis API :',response);
      this.users = this.extractUsers(response);
      console.log('Données users extraction :',this.users);
      
      // Extraction des structures (si admin général)
      /* if (this.isAdminGeneral && response.structures) {
        this.structures = response.structures;
      } */
      
      console.log(`✅ ${this.users.length} utilisateur(s) chargé(s)`);
    },
    error: (err) => {
      console.error('❌ Erreur chargement utilisateurs:', err);
      this.toastr.error('Erreur lors du chargement des utilisateurs');
      this.users = [];
    }
  });
}

// Méthode d'extraction robuste
private extractUsers(response: any): any[] {
  if (!response) return [];
  
  // Cas 1: réponse directe avec tableau users
  if (response.users && Array.isArray(response.users)) {
    return response.users;
  }
  
  // Cas 2: réponse avec items (pagination standard)
  if (response.items && Array.isArray(response.items)) {
    return response.items;
  }
  
  // Cas 3: réponse avec data
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  // Cas 4: réponse directement un tableau
  if (Array.isArray(response)) {
    return response;
  }
  
  console.warn('Format de réponse non reconnu:', response);
  return [];
}
  
  loadStructures(): void {
    // Charger toutes les structures pour l'admin général
    this.structureService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (strs) => {
          this.structures = strs;
        },
        error: (err) => {
          console.error('Erreur chargement des structures:', err);
        }
      });
  }
  
  loadData(): void {
    if (this.activeTab === 'actions') {
      this.loadActions();
    } else if (this.activeTab === 'connexions') {
      this.loadConnexions();
    } else if (this.activeTab === 'stats') {
      this.loadStats();
    }
  }
  
  loadActions(): void {
    this.isLoading = true;
    const userId = this.filtreUserId === 'all' ? 'all' : this.filtreUserId;
    
    this.historiqueService.getActionsByUser(userId, {
      page: this.currentPage,
      limit: this.limit,
      actionCategory: this.filtreCategorie || undefined,
      structureId: this.filtreStructureId !== 'all' ? this.filtreStructureId : undefined,
      dateDebut: this.dateDebut ? new Date(this.dateDebut) : undefined,
      dateFin: this.dateFin ? new Date(this.dateFin) : undefined
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Chargement des action',response);
          this.actions = response.items;
          this.totalPages = response.pagination.totalPages;
          this.totalItems = response.pagination.total; // AJOUT
          this.isLoading = false;
        },
        error: (err) => {
          console.log('Erreur lors du chargement des actions', err)
          this.toastr.error('Erreur lors du chargement des actions');
          this.isLoading = false;
        }
      });
  }
  
  loadConnexions(): void {
    this.isLoading = true;
    const userId = this.filtreUserId === 'all' ? 'all' : this.filtreUserId;
    
    this.historiqueService.getConnexionsByUser(userId, {
      page: this.currentPage,
      limit: this.limit,
      structureId: this.filtreStructureId !== 'all' ? this.filtreStructureId : undefined,
      dateDebut: this.dateDebut ? new Date(this.dateDebut) : undefined,
      dateFin: this.dateFin ? new Date(this.dateFin) : undefined
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Chargement des connexions',response);
          this.connexions = response.items;
          this.totalPages = response.pagination.totalPages;
          this.totalItems = response.pagination.total; // AJOUT
          this.isLoading = false;
        },
        error: (err) => {
          console.log('Erreur lors du chargement des connexions', err)
          this.toastr.error('Erreur lors du chargement des connexions');
          this.isLoading = false;
        }
      });
  }

  loadStats(): void {
    this.historiqueService.getHistoriqueStats({ period: 'month' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          console.log('Actions statistiques chargés',stats.actionsByType)
          this.stats = stats;
          // Mettre à jour le graphique après avoir reçu les stats
          setTimeout(() => {
            this.updateChart();
          }, 100);
        },
        error: (err) => {
          console.error('Erreur chargement stats:', err);
        }
      }); 

  }
  

// Initialisation du graphique
private initChart(): void {
  // Vérifier si on est sur l'onglet stats
  if (this.activeTab !== 'stats') return;
  
  // Vérifier si le canvas existe
  const canvas = this.actionsChartCanvas?.nativeElement;
  if (!canvas) {
    console.warn('Canvas non trouvé');
    return;
  }
  
  // Détruire l'ancien graphique s'il existe
  if (this.actionsChart) {
    this.actionsChart.destroy();
    this.actionsChart = null;
  }
  
  try {
    // Initialiser avec des données vides, on mettra à jour après
    this.actionsChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12 },
              padding: 10,
             generateLabels: (chart) => {
                const data = chart.data.datasets[0].data;
                //const labels = chart.data.labels as (string | number)[];
                const labels = (chart.data.labels ?? []) as string[];
                return labels
                  .map((label, i) => ({
                    text: String(label), // ✅ correction ici
                    fillStyle: (chart.data.datasets[0].backgroundColor as string[])[i],
                    hidden: false,
                    index: i,
                    datasetIndex: 0
                  }))
                  .filter((_, index) => (data[index] as number) > 0);
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw as number;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '50%'
      }
    });
    
    this.chartInitialized = true;
    console.log('Graphique initialisé avec succès');
    
    // Mettre à jour avec les données existantes
    this.updateChart();
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du graphique:', error);
  }
}

// Version corrigée de la mise à jour du graphique
private updateChart(): void {
  if (!this.actionsChart || !this.chartInitialized) {
    console.warn('Graphique non initialisé');
    return;
  }
  
  if (!this.stats || !this.stats.actionsByType) {
    console.warn('Pas de données de stats disponibles');
    return;
  }
  
  const actionsByType = this.stats.actionsByType || {};
  console.log('Mise à jour du graphique avec:', actionsByType);
  
  // Compter les actions par catégorie
  const categoriesMap = new Map<string, number>();
  const colorMap = new Map<string, string>([
    ['Créations', '#28a745'],
    ['Modifications', '#ffc107'],
    ['Suppressions', '#dc3545'],
    ['Exports', '#17a2b8'],
    ['Connexions', '#007bff'],
    ['Changements statut', '#6c757d'],
    ['Génération', '#fd7e14'],       // orange
    ['Déconnexion', '#6610f2'],      // violet
    ['Autres', '#20c997'],           // vert turquoise
  ]);
  
  for (const [actionType, count] of Object.entries(actionsByType)) {
    const typeLower = actionType.toLowerCase();
    if (typeLower.includes('création') || typeLower.includes('creation') || typeLower.includes('create')) {
      categoriesMap.set('Créations', (categoriesMap.get('Créations') || 0) + (count as number));
    } else if (typeLower.includes('mise à jour') || typeLower.includes('update') || typeLower.includes('modification')) {
      categoriesMap.set('Modifications', (categoriesMap.get('Modifications') || 0) + (count as number));
    } else if (typeLower.includes('suppression') || typeLower.includes('delete')) {
      categoriesMap.set('Suppressions', (categoriesMap.get('Suppressions') || 0) + (count as number));
    } else if (typeLower.includes('export')) {
      categoriesMap.set('Exports', (categoriesMap.get('Exports') || 0) + (count as number));
    } else if (typeLower.includes('connexion') || typeLower.includes('login')) {
      categoriesMap.set('Connexions', (categoriesMap.get('Connexions') || 0) + (count as number));
    } else if (typeLower.includes('changement')|| typeLower.includes('statut') || typeLower.includes('status') || typeLower.includes('toggle')) {
      categoriesMap.set('Changements statut', (categoriesMap.get('Changements statut') || 0) + (count as number));
    } else if (typeLower.includes('génération')|| typeLower.includes('generation')) {
      categoriesMap.set('Génération', (categoriesMap.get('Génération') || 0) + (count as number));
    }
    else if (typeLower.includes('déconnexion')|| typeLower.includes('deconnexion') || typeLower.includes('logout')) {
      categoriesMap.set('Déconnexion', (categoriesMap.get('Déconnexion') || 0) + (count as number));
    }
    else {
      categoriesMap.set('Autres', (categoriesMap.get('Autres') || 0) + (count as number));
    }
  }
  
  // Filtrer pour ne garder que les catégories avec des valeurs > 0
  const filteredLabels: string[] = [];
  const filteredData: number[] = [];
  const filteredColors: string[] = [];
  
  for (const [label, value] of categoriesMap) {
    if (value > 0) {
      filteredLabels.push(label);
      filteredData.push(value);
      filteredColors.push(colorMap.get(label) || '#6c757d');
    }
  }
  
  // S'il n'y a aucune donnée, afficher un message
  if (filteredData.length === 0) {
    console.log('Aucune donnée à afficher dans le graphique');
    this.actionsChart.data.labels = ['Aucune donnée'];
    this.actionsChart.data.datasets[0].data = [1];
    this.actionsChart.data.datasets[0].backgroundColor = ['#e9ecef'];
    this.actionsChart.update();
    return;
  }
  
  // Mettre à jour les données
  this.actionsChart.data.labels = filteredLabels;
  this.actionsChart.data.datasets[0].data = filteredData;
  this.actionsChart.data.datasets[0].backgroundColor = filteredColors;
  
  this.actionsChart.update();
  console.log('Graphique mis à jour avec', filteredLabels.length, 'catégories');
}

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadData();
  }

  onLimitChange(limit: number): void {
    this.limit = limit;
    this.currentPage = 1; // Reset à la première page
    this.loadData();
  }
  
  getActionType(action: string): string {
    if (action.includes('Création')) return 'Création';
    if (action.includes('Mise à jour')) return 'Modification';
    if (action.includes('Suppression')) return 'Suppression';
    if (action.includes('Export')) return 'Export';
    if (action.includes('Connexion')) return 'Connexion';
    return 'Autre';
  }
  
  /* getActionBadgeClass(category: string): string {
    const classes = {
      'CREATE': 'bg-success',
      'UPDATE': 'bg-warning',
      'DELETE': 'bg-danger',
      'EXPORT': 'bg-info',
      'LOGIN': 'bg-primary',
      'STATUS': 'bg-secondary'
    };
    return classes[category] || 'bg-secondary';
  } */

  getActionBadgeClass(category: string): string {
  const classes: Record<string, string> = {
    CREATE: 'bg-success',
    UPDATE: 'bg-warning',
    DELETE: 'bg-danger',
    EXPORT: 'bg-info',
    LOGIN: 'bg-primary',
    STATUS: 'bg-secondary'
  };

  //return classes[category] || 'bg-secondary';
  return category ? (classes[category] || 'bg-secondary') : 'bg-secondary';
}
  
  showDetails(action: HistoriqueAction): void {
    this.selectedActionDetails = action.details;
    // Ouvrir modal
    const modalElement = document.getElementById('detailsModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }
}
