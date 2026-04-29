import { Component,inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Categorie, Depense } from '../../../modeles/finance.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { DepencesService, DepensesFilter, DepensesResponse } from '../../../services/depences.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ModePaiement } from '../../../modeles/paiement.model';
import { CategoriesDepencesRecettesService } from '../../../services/categories-depences-recettes.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let bootstrap: any; // Déclaration pour Bootstrap

@Component({
  selector: 'app-depenses',
  standalone: true,
  imports: [CommonModule,FormsModule, ReactiveFormsModule],
  templateUrl: './depenses.component.html',
  styleUrl: './depenses.component.css'
})
export class DepensesComponent implements OnInit, OnDestroy {

  categories: Categorie[] = [];
  @Input() code_structure: string | null = null;
  @Input() magasinId: number | null = null;
  @Input() agentId: number | null = null;
  @Input() isAdmin = false;
  @Input() modesPaiement : ModePaiement [] = [];


  /* @Output() categoryAction = new EventEmitter<{ action: string; category: Categorie }>();
  @Output() depenseAction = new EventEmitter<{ action: string; depense: Depense }>();
  @Output() refreshCategories = new EventEmitter<void>(); */

   // Données
  depenses: Depense[] = [];
  
  // Statistiques
  stats: DepensesResponse['statistiques'] | null = null;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  // Filtres
  filters: DepensesFilter = {
    page: 1,
    limit: 10,
    search: '',
    categoryId: '',
    paymentMode: '',
    typeDepense: '',
    statut: ''
  };

  // États du formulaire
  showForm = false;
  selectedDepense: Depense | null = null;
  selectedFile: File | null = null;

  // Formulaire
  depenseForm!: FormGroup;

  // États
  isLoadingDepenses = false;
  isLoadingCategorie = false;
  isLoadingStats = false;
  errorMessage = '';

  // Options pour les selects
  paymentModes = ['Espèce', 'Carte', 'Orange Money','Wave', 'Virement', 'Chèque','Autre'];
  typeDepenses = ['STANDARD', 'STOCK', 'FRAIS', 'INVESTISSEMENT'];
  statuts = ['validé', 'annulé'];

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private depenseService = inject(DepencesService);
  private toastr = inject(ToastrService);
  private searchSubject = new Subject<string>();
  private categorieService = inject(CategoriesDepencesRecettesService);
  

  // Pour le template
  Math = Math;

  ngOnInit(): void {
    this.initForm();

    //Charger les données
     if (this.code_structure) {
    this.loadDepenses();
  }
    // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      this.loadDepenses();
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Ouvrir le modal
  openStatsModal(): void {
    const modalElement = document.getElementById('statsModal');
    //this.loadDepenses();
    // NE PAS recharger les données si elles existent déjà
    if (!this.stats && !this.isLoadingStats) {
      this.loadDepenses();
    }
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Fermer le modal
  closeStatsModal(): void {
    const modalElement = document.getElementById('statsModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  }

  /**
   * Initialiser le formulaire
   */
  private initForm(): void {
    this.depenseForm = this.fb.group({
      categoryId: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]],
      paymentMode: ['Espèce', Validators.required],
      description: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      type: ['STANDARD', Validators.required]
    });
  }

  /**
   * Charger les dépenses
   */
  
loadDepenses(): void {
    if (!this.code_structure) return;

    this.isLoadingDepenses = true;
    this.errorMessage = '';

    const filters: DepensesFilter = {
      page: this.filters.page,
      limit: this.itemsPerPage,
      search: this.filters.search || undefined,
      categoryId: this.filters.categoryId || undefined,
      paymentMode: this.filters.paymentMode || undefined,
      typeDepense: this.filters.typeDepense || undefined,
      statut: this.filters.statut || undefined
    };

    this.depenseService.getDepensesByStructureBis(this.code_structure, filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingDepenses = false)
      )
      .subscribe({
        next: (response: DepensesResponse) => {
          this.depenses = response.items;
          this.stats = response.statistiques;
          
          // Mise à jour de la pagination
          this.totalItems = response.pagination.total;
          this.currentPage = response.pagination.page;
          this.totalPages = response.pagination.totalPages;
          this.hasNext = response.pagination.hasNext;
          this.hasPrev = response.pagination.hasPrev;
          
          console.log('Dépenses chargées:', response.items.length);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des dépenses';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement dépenses:', err);
        }
      });
  }

  /**
   * Charger les catégories (données partagées)
   */
  loadCategories(): void {
    if (!this.code_structure) return;
    
    this.isLoadingCategorie = true;
    this.errorMessage = '';

    this.categorieService.getAllByStructure(this.code_structure)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingCategorie = false;
        })
      )
      .subscribe({
        next: (categories) => {

          // Séparation selon le type
          this.categories = categories.filter(
            cat => cat.type === 'DEPENSE'
          );

          console.log('Catégories chargées:', categories.length);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des catégories';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement catégories:', err);
        }
      });
  }

  /**
   * Appliquer les filtres
   */
  applyFilters(): void {
    this.filters.page = 1;
    this.loadDepenses();
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: this.itemsPerPage,
      search: '',
      categoryId: '',
      paymentMode: '',
      typeDepense: '',
      statut: ''
    };
    this.loadDepenses();
  }

  /**
   * Réagir aux changements de catégories
   */
  onCategoriesChange(categories: Categorie[]): void {
    this.categories = categories;
  }

  /**
   * Gestionnaire de recherche
   */
  
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }
  /**
   * Gestionnaire de fichier
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  /**
   * Afficher/masquer le formulaire
   */
  toggleForm(depense?: Depense): void {
    if (depense) {
      this.selectedDepense = depense;
      this.depenseForm.patchValue({
        categoryId: depense.categoryId,
        montant: depense.montant,
        paymentMode: depense.paymentMode,
        description: depense.description,
        type: depense.type,
        date: new Date(depense.date).toISOString().split('T')[0]
      });
    } else {
      this.selectedDepense = null;
      this.depenseForm.reset({
        paymentMode: 'Espèce',
        type: 'STANDARD',
        date: new Date().toISOString().split('T')[0]
      });
      this.selectedFile = null;
    }
    this.showForm = !this.showForm;
  }

  /**
   * Annuler le formulaire
   */
  cancelForm(): void {
    this.showForm = false;
    this.selectedDepense = null;
    this.selectedFile = null;
    this.depenseForm.reset({
      paymentMode: 'Espèce',
      type: 'STANDARD',
      date: new Date().toISOString().split('T')[0]
    });
  }
// Dans le composant TypeScript
getMontantParMode(mode: string): number {
  if (!this.stats) return 0;
  
  const modeMap: Record<string, string> = {
    'espèce': 'espece',
    'carte': 'carte',
    'orange money': 'orangeMoney',
    'wave': 'wave',
    'virement': 'virement',
    'chèque': 'cheque',
    'autre': 'autre'
  };
  
  const key = modeMap[mode.toLowerCase()];
  return this.stats.globales.repartitionParMode[key as keyof typeof this.stats.globales.repartitionParMode] || 0;
}
  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if(!confirm('Confirmer votre action ?')) return;
    if (this.depenseForm.invalid) {
      this.depenseForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir correctement le formulaire');
      return;
    }

    this.isLoadingDepenses = true;
    
    const formData = new FormData();
    const depenseData = this.depenseForm.value;

    formData.append('code_structure', this.code_structure!);
    //formData.append('magasinId', this.magasinId!.toString());
    formData.append('agentId', this.agentId!.toString());
    formData.append('categoryId', depenseData.categoryId);
    formData.append('montant', depenseData.montant);
    formData.append('paymentMode', depenseData.paymentMode);
    formData.append('description', depenseData.description || '');
    formData.append('type', depenseData.type);
    formData.append('date', depenseData.date);

    if (!this.selectedDepense?.id && this.magasinId) {
      formData.append('magasinId', this.magasinId.toString());
    }

    if (this.selectedFile) {
      formData.append('receipt', this.selectedFile);
    }

    console.log('Données à envoyer :', formData);
    if (this.selectedDepense?.id) {
      this.updateDepense(formData);
    } else {
      this.createDepense(formData);
    }
  }

  private createDepense(formData: FormData): void {
    this.depenseService.createDepense(formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingDepenses = false; // S'exécute dans tous les cas
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Dépense enregistrée avec succès');
          this.loadDepenses();
          this.cancelForm();
          //this.depenseAction.emit({ action: 'created', depense: this.selectedDepense! });
          console.log({ action: 'created', depense: this.selectedDepense! });
        },
        error: (err) => {
          this.toastr.error('Erreur lors de l\'enregistrement');
          console.error(err);
        },
        //complete: () => this.isLoading = false
      });
  }

  private updateDepense(formData: FormData): void {
    this.depenseService.updateDepense(this.selectedDepense!.id!, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingDepenses = false; // S'exécute dans tous les cas
        })
      )
      .subscribe({
        next: () => {
          this.toastr.success('Dépense modifiée avec succès');
          this.loadDepenses();
          this.cancelForm();
          //this.depenseAction.emit({ action: 'updated', depense: this.selectedDepense! });
          console.log({ action: 'updated', depense: this.selectedDepense! });
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la modification');
          console.error(err);
        },
        //complete: () => this.isLoading = false
      });
  }

  /**
   * Supprimer une dépense
   */
  deleteDepense(depense: Depense): void {
    if (!depense.id) return;

    if (!confirm(`Voulez-vous vraiment annuler cette dépense ?`)) return;

    this.isLoadingDepenses = true;
    this.depenseService.updateStatut(depense.id,'annulé')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingDepenses = false)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Dépense annulée avec succès');
          this.loadDepenses();
          //this.depenseAction.emit({ action: 'deleted', depense });
          console.log({ action: 'deleted', depense });
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la suppression');
          console.error(err);
        },
        //complete: () => this.isLoading = false
      });
  }

  canEditTransaction(transaction: Depense): boolean {

    const today = new Date();
    const transactionDate = new Date(transaction.date);

    // différence en jours
    const diffTime = today.getTime() - transactionDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    // délai autorisé pour l'admin
    const ADMIN_DELAY = 30;

    if (this.isAdmin) {
      return diffDays <= ADMIN_DELAY;
    }

    // utilisateur normal → seulement le jour même
    return transactionDate.toDateString() === today.toDateString();
  }

  /**
   * Obtenir le nom de la catégorie
   */
  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Non défini';
  }

  /**
   * Formater le statut pour l'affichage
   */
  getStatutBadgeClass(statut?: string): string {
    switch (statut) {
      case 'validé':
        return 'bg-success';
      case 'annulé':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  get pagesToShow(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5; // Nombre maximum de pages visibles
    
    if (this.totalPages <= maxVisiblePages) {
      // Afficher toutes les pages si moins de 5
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculer les pages à afficher autour de la page courante
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, this.currentPage + 2);
      
      // Ajuster si on est au début
      if (this.currentPage <= 3) {
        end = Math.min(this.totalPages, maxVisiblePages);
      }
      
      // Ajuster si on est à la fin
      if (this.currentPage >= this.totalPages - 2) {
        start = Math.max(1, this.totalPages - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
   /**
   * Formater le montant
   */
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(montant) + ' F CFA';
  }

  /**
   * Obtenir le nom du jour de la semaine
   */
  getJourSemaine(jour: number): string {
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return jours[jour - 1] || 'Inconnu';
  }

  /**
   * Obtenir le libellé du mois
   */
  getMoisLabel(mois: string): string {
    const [annee, moisNum] = mois.split('-');
    const date = new Date(parseInt(annee), parseInt(moisNum) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  /**
   * Pagination
   */

 /*  onPageChange(page: number): void {
    this.currentPage = page;
  } */

  /**
   * Changer de page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadDepenses();
    }
  }

  /**
   * Changer le nombre d'éléments par page
   */
  onItemsPerPageChange(limit: number): void {
    this.itemsPerPage = limit;
    this.filters.limit = limit;
    this.filters.page = 1;
    this.loadDepenses();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItemsPerPage(event: any): void {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1;
  }

  // Dans depenses.component.ts, ajoutez ces méthodes :

  /**
   * Obtenir le libellé du type de dépense
   */
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'STANDARD': 'Standard',
      'STOCK': 'Approvisionnement Stock',
      'FRAIS': 'Frais de fonctionnement',
      'INVESTISSEMENT': 'Investissement'
    };
    return labels[type] || type;
  }

  /**
   * Obtenir la clé pour l'objet repartitionParType
   */
  getTypeKey(type: string): string {
    const keys: Record<string, string> = {
      'STANDARD': 'standard',
      'STOCK': 'stock',
      'FRAIS': 'frais',
      'INVESTISSEMENT': 'investissement'
    };
    return keys[type] || type.toLowerCase();
  }

  /**
   * Obtenir le montant maximum mensuel pour l'échelle des graphiques
   */
  getMaxMensuel(): number {
    if (!this.stats?.evolutionMensuelle || this.stats.evolutionMensuelle.length === 0) {
      return 1;
    }
    return Math.max(...this.stats.evolutionMensuelle.map(m => m.montantTotal));
  }

  /**
   * Obtenir le montant pour un type spécifique
   */
 // Dans depenses.component.ts
getMontantParType(type: string): number {
  if (!this.stats) return 0;
  
  const typeMap: Record<string, keyof typeof this.stats.globales.repartitionParType> = {
    'STANDARD': 'standard',
    'STOCK': 'stock',
    'FRAIS': 'frais',
    'INVESTISSEMENT': 'investissement'
  };
  
  const key = typeMap[type];
  return this.stats.globales.repartitionParType[key] || 0;
}

  /**
   * Obtenir le pourcentage pour un type
   */
  getPourcentageParType(type: string): number {
    const montant = this.getMontantParType(type);
    if (!this.stats || montant === 0) return 0;
    return (montant / this.stats.globales.montantTotal) * 100;
  }

  /**
   * Formater le mois pour l'affichage
   */
  formatMois(mois: string): string {
    const [annee, moisNum] = mois.split('-');
    const date = new Date(parseInt(annee), parseInt(moisNum) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  }
 }
