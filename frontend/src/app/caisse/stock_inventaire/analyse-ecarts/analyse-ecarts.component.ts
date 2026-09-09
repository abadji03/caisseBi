import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyseEcartDTO, StatsGlobales } from '../../../modeles/entrees-sorties.model';
import { ReconciliationService } from '../../../services/reconciliation.service';

@Component({
  selector: 'app-analyse-ecarts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analyse-ecarts.component.html',
  styleUrl: './analyse-ecarts.component.css'
})
export class AnalyseEcartsComponent implements OnInit, OnDestroy {
  @Input() codeStructure: string | null = null;

  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  // Données
  analyses: AnalyseEcartDTO[] = [];
  statsGlobales: StatsGlobales | null = null;
  isLoading = false;

  // Filtres
  searchText = '';
  triSelectionne = 'ecartTotal_desc';

  // Options de tri
  optionsTri = [
    { valeur: 'produitDesignation_asc', label: 'Produit (A-Z)' },
    { valeur: 'produitDesignation_desc', label: 'Produit (Z-A)' },
    { valeur: 'ecartTotal_desc', label: 'Écart total (plus grand)' },
    { valeur: 'ecartTotal_asc', label: 'Écart total (plus petit)' },
    { valeur: 'nombreReconciliations_desc', label: 'Plus de réconciliations' },
    { valeur: 'tauxCorrection_desc', label: 'Taux de correction (plus haut)' },
    { valeur: 'dernierEcart_desc', label: 'Récent d\'abord' }
  ];

  // Détails
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detailsSelectionnes: any[] = [];

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private analyseService = inject(ReconciliationService);
  private toastr = inject(ToastrService);

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData() {
    if (!this.codeStructure) return;

    this.isLoading = true;

    this.analyseService.getAnalyse(
      this.codeStructure,
      this.currentPage,
      this.pageSize,
      this.searchText,
      this.triSelectionne
    )
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    )
    .subscribe({
      next: (response) => {


        this.analyses = response.analyses;
        this.statsGlobales = response.statsGlobales;
        
        // Pagination
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.hasNext = response.pagination.hasNext;
        this.hasPrev = response.pagination.hasPrev;
      },
      error: (err) => {
        console.error('Erreur chargement analyses:', err);
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadData();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPageSizeChange(event: any): void {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.loadData();
  }

  onDateChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  onTriChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  resetFilters(): void {
    this.searchText = '';
    this.triSelectionne = 'ecartTotal_desc';
    this.currentPage = 1;
    this.loadData();
  }

  voirDetails(analyse: AnalyseEcartDTO) {
    this.detailsSelectionnes = analyse.ecartsDetail || [];
    this.openDetailsModal();
  }

  getTendanceIcon(tendance: string): string {
    switch(tendance) {
      case '↑': return 'text-success';
      case '↓': return 'text-danger';
      default: return 'text-muted';
    }
  }

  openDetailsModal() {
    const modalElement = document.getElementById('detailsModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Pour la pagination
  get pagesToShow(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, this.currentPage + 2);
      
      if (this.currentPage <= 3) end = Math.min(this.totalPages, maxVisiblePages);
      if (this.currentPage >= this.totalPages - 2) start = Math.max(1, this.totalPages - maxVisiblePages + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  }
}