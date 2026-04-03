/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { HistoriqueAction, HistoriqueConnexion, HistoriqueService } from '../../../services/historique.service';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationAdvancedComponent } from '../../../sharedComposants/pagination-advanced/pagination-advanced.component';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationAdvancedComponent],
  templateUrl: './historique.component.html',
  styleUrl: './historique.component.css'
})
export class HistoriqueComponent implements OnInit,OnDestroy {

  private destroy$ = new Subject<void>();
  private historiqueService = inject(HistoriqueService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  
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
  limit = 20;
  totalItems = 0;
  
  // Utilisateur courant
  currentUser: any;
  isAdminGeneral = false;
  isAdminStructure = false;
  
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
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  setActiveTab(tab: 'actions' | 'connexions' | 'stats'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadData();
  }
  
  loadUsers(): void {
    // Charger les utilisateurs selon les droits
    // Appel au service user avec filtrage par structure
  }
  
  loadStructures(): void {
    // Charger toutes les structures pour l'admin général
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
  
  /* loadActions(): void {
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
          this.actions = response.items;
          this.totalPages = response.pagination.totalPages;
          this.isLoading = false;
        },
        error: (err) => {
          this.toastr.error('Erreur lors du chargement des actions',err);
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
          this.connexions = response.items;
          this.totalPages = response.pagination.totalPages;
          this.isLoading = false;
        },
        error: (err) => {
          this.toastr.error('Erreur lors du chargement des connexions', err);
          this.isLoading = false;
        }
      });
  } */
  
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
          this.stats = stats;
        },
        error: (err) => {
          console.error('Erreur chargement stats:', err);
        }
      });
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
  }
}
