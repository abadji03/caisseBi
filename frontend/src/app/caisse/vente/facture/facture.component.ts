import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs';
import { Facture, FactureFilter } from '../../../modeles/facture.model';
import { FactureService } from '../../../services/facture.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-facture',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facture.component.html',
  styleUrl: './facture.component.css'
})
export class FactureComponent implements OnInit,OnDestroy {

  // État
  isLoading = false;
  @Input() code_structure: string | null = null;
  @Input() isAdmin = false;
  @Input() typeEntite :string | null = null;
  
  // Données
  factures: Facture[] = [];
  selectedFacture: Facture | null = null;
  showDetails = false;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  Math = Math;
  
  // Filtres
  filters: FactureFilter = {
    page: 1,
    limit: 10,
    search: '',
    statut: 'tous',
    type_facture: 'tous'
  };
  
  statutOptions = ['tous', 'brouillon', 'emise', 'annulee'];
  typeFactureOptions = ['tous', 'vente', 'avoir', 'regularisation', 'acompte','achat'];
  
  // Date filters
  startDate?: string;
  endDate?: string;
  
  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Services
  private factureService = inject(FactureService);
  //private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  
  ngOnInit(): void {
    /* this.authService.currentUser.subscribe(user => {
      this.code_structure = user?.code_structure || null;
      this.isAdmin = this.authService.hasRole('Administrateur') || 
                     this.authService.hasRole('Administrateur secondaire');
      
      
    }); */

    console.log('FactureComponent - Inputs:', {
      code_structure: this.code_structure,
      isAdmin: this.isAdmin,
      typeEntite: this.typeEntite
    });
    
    if (this.code_structure) {
      this.loadFactures();
    }
    else {
    console.warn('code_structure manquant dans FactureComponent');
  }
    // Debounce search
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      this.loadFactures();
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Charger les factures
   */
  loadFactures(): void {
    //if (!this.code_structure) return;
    if (!this.code_structure) {
        console.error('code_structure manquant');
        this.toastr.error('Structure non identifiée');
        return;
    }
    
    /* console.log('Chargement factures avec:', {
        code_structure: this.code_structure,
        filters: this.filters
    }); */
    
    // Préparer les filtres pour l'API
    const apiFilters: FactureFilter = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      statut: this.filters.statut === 'tous' ? undefined : this.filters.statut,
      type_facture: this.filters.type_facture === 'tous' ? undefined : this.filters.type_facture,
      startDate: this.startDate,
      endDate: this.endDate,
      search: this.filters.search || undefined,
    };

    console.log('Chargement factures avec:', {
      code_structure: this.code_structure,
      typeEntite: this.typeEntite,
      filters: apiFilters
    });
    
    this.isLoading = true;

    this.factureService.getFactures(this.code_structure,this.typeEntite, apiFilters)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          //console.log('Chargement des factures :', response)
          console.log('Réponse brute de l\'API:', response);
          this.factures = response.items;
          this.totalItems = response.pagination.total;
          this.currentPage = response.pagination.page;
          this.totalPages = response.pagination.totalPages;
          this.hasNext = this.currentPage < this.totalPages;
          this.hasPrev = this.currentPage > 1;
        },
        error: (err) => {
          console.error('Erreur chargement factures:', err);
          this.toastr.error('Erreur lors du chargement des factures');
        }
      });
  }
  
  /**
   * Recherche
   */
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }
  
  /**
   * Changement de page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadFactures();
    }
  }
  
  /**
   * Changement du nombre d'éléments par page
   */
  onLimitChange(limit: number): void {
    this.itemsPerPage = limit;
    this.filters.limit = limit;
    this.filters.page = 1;
    this.loadFactures();
  }
  
  /**
   * Filtre par statut
   */
  onStatutChange(statut: string): void {
    this.filters.statut = statut === 'tous' ? undefined : statut;
    this.filters.page = 1;
    this.loadFactures();
  }
  
  /**
   * Filtre par type
   */
  onTypeChange(type: string): void {
    this.filters.type_facture = type === 'tous' ? undefined : type;
    this.filters.page = 1;
    this.loadFactures();
  }
  
  /**
   * Filtre par date
   */
  onDateChange(): void {
    this.filters.startDate = this.startDate;
    this.filters.endDate = this.endDate;
    this.filters.page = 1;
    this.loadFactures();
  }
  
  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: this.itemsPerPage,
      statut: undefined,
      type_facture: undefined
    };
    this.startDate = undefined;
    this.endDate = undefined;
    this.loadFactures();
  }
  
  /**
   * Afficher les détails d'une facture
   */
  viewDetails(facture: Facture): void {
    this.selectedFacture = facture;
    this.showDetails = true;
  }
  
  /**
   * Fermer les détails
   */
  closeDetails(): void {
    this.showDetails = false;
    this.selectedFacture = null;
  }
  
  /**
   * Télécharger le PDF
   */
  downloadPDF(facture: Facture): void {
    this.factureService.downloadPDF(facture.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${facture.numero_facture}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastr.success('PDF téléchargé avec succès');
      },
      error: (err) => {
        console.error('Erreur téléchargement PDF:', err);
        this.toastr.error('Erreur lors du téléchargement du PDF');
      }
    });
  }
  
  /**
   * Annuler une facture
   */
  annulerFacture(facture: Facture): void {
    if (!confirm(`Êtes-vous sûr de vouloir annuler la facture ${facture.numero_facture} ?`)) {
      return;
    }
    
    this.factureService.annulerFacture(facture.id).subscribe({
      next: () => {
        this.toastr.success('Facture annulée avec succès');
        this.loadFactures();
        if (this.selectedFacture?.id === facture.id) {
          this.closeDetails();
        }
      },
      error: (err) => {
        console.error('Erreur annulation:', err);
        this.toastr.error('Erreur lors de l\'annulation');
      }
    });
  }
  
  /**
   * Obtenir la classe CSS pour le badge de statut
   */
  getStatutClass(statut: string): string {
    const classes: Record<string, string> = {
      'brouillon': 'bg-warning text-dark',
      'emise': 'bg-success',
      'annulee': 'bg-danger'
    };
    return classes[statut] || 'bg-secondary';
  }
  
  /**
   * Obtenir le libellé du type
   */
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'vente': 'Vente',
      'achat': 'Achat',
      'avoir': 'Avoir',
      'regularisation': 'Régularisation',
      'acompte': 'Acompte'
    };
    return labels[type] || type;
  }
  
  /**
   * Formater un montant
   */
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(montant) + ' F CFA';
  }
}
