import { Component,inject, Input, OnDestroy, OnInit } from '@angular/core';
import { Categorie } from '../../../modeles/finance.model';
import { User } from '../../../modeles/user.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { CategoriesDepencesRecettesService, CategoriesFilter, CategoriesResponse } from '../../../services/categories-depences-recettes.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categorie-depense-recette',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './categorie-depense-recette.component.html',
  styleUrls: ['./categorie-depense-recette.component.css']
})
export class CategorieDepenseRecetteComponent implements OnInit, OnDestroy {
  @Input() code_structure: string | null = null;
  @Input() currentUser: User | null = null;

  /* @Output() categoryAction = new EventEmitter<{ action: string; category: Categorie }>();
  @Output() categoriesChange = new EventEmitter<void>(); */

  // Données
  categories: Categorie[] = [];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  // Filtres
  filters: CategoriesFilter = {
    page: 1,
    limit: 10,
    search: '',
    type: '',
    showInactive: false
  };

  // États du formulaire
  showForm = false;
  selectedCategory: Categorie | null = null;
  categoryForm!: FormGroup;
  
  // Recherche locale (pour l'input)
  searchTerm = '';
  
  // États
  isLoading = false;
  errorMessage = '';

  // Options pour les selects
  typeOptions = ['DEPENSE', 'RECETTE'];

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private categorieService = inject(CategoriesDepencesRecettesService);
  private toastr = inject(ToastrService);
  private searchSubject = new Subject<string>();

  // Pour le template
  Math = Math;

  ngOnInit(): void {
    this.initForm();
    
    // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      this.loadCategories();
    });

    if (this.code_structure) {
      this.loadCategories();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: ['DEPENSE', Validators.required],
      isActive: [true]
    });
  }

  /**
   * Charger les catégories avec pagination et filtres
   */
  loadCategories(): void {
    if (!this.code_structure) {
      console.error('code_structure est null');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const filters: CategoriesFilter = {
      page: this.filters.page,
      limit: this.itemsPerPage,
      search: this.filters.search || undefined,
      type: this.filters.type || undefined,
      showInactive: this.filters.showInactive
    };


    this.categorieService.getAllByStructureBis(this.code_structure, filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response: CategoriesResponse) => {
          this.categories = response.items;
          
          // Mise à jour de la pagination
          this.totalItems = response.pagination.total;
          this.currentPage = response.pagination.page;
          this.totalPages = response.pagination.totalPages;
          this.hasNext = response.pagination.hasNext;
          this.hasPrev = response.pagination.hasPrev;
          
          // Mettre à jour le searchTerm local pour refléter le filtre actuel
          if (response.filtres.search) {
            this.searchTerm = response.filtres.search;
          }
          
          //this.categoriesChange.emit();
        },
        error: (err) => {
          console.error('❌ Erreur API complète:', err);
          this.errorMessage = err.error?.message || 'Erreur lors du chargement des catégories';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  /**
   * Appliquer les filtres
   */
  applyFilters(): void {
    this.filters.page = 1;
    this.loadCategories();
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.filters = {
      page: 1,
      limit: this.itemsPerPage,
      search: '',
      type: '',
      showInactive: false
    };
    this.searchTerm = '';
    this.loadCategories();
  }

  /**
   * Gestionnaire de recherche avec debounce
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Changer de page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadCategories();
    }
  }

  /**
   * Changer le nombre d'éléments par page
   */
  onItemsPerPageChange(limit: number): void {
    this.itemsPerPage = limit;
    this.filters.limit = limit;
    this.filters.page = 1;
    this.loadCategories();
  }

  /**
   * Basculer l'affichage des catégories inactives
   */
  toggleShowInactive(): void {
    this.filters.showInactive = !this.filters.showInactive;
    this.filters.page = 1;
    this.loadCategories();
  }

  /**
   * Afficher/masquer le formulaire
   */
  toggleForm(category?: Categorie): void {
    if (category) {
      this.selectedCategory = category;
      this.categoryForm.patchValue({
        name: category.name,
        description: category.description,
        type: category.type,
        isActive: category.isActive
      });
    } else {
      this.selectedCategory = null;
      this.categoryForm.reset({
        type: 'DEPENSE',
        isActive: true
      });
    }
    this.showForm = true;
  }

  /**
   * Fermer le formulaire
   */
  closeForm(): void {
    this.showForm = false;
    this.selectedCategory = null;
    this.categoryForm.reset({
      type: 'DEPENSE',
      isActive: true
    });
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir correctement le formulaire');
      return;
    }

    this.isLoading = true;
    const formData = {
      ...this.categoryForm.value,
      code_structure: this.code_structure
    };

    if (this.selectedCategory?.id) {
      this.updateCategory(formData);
    } else {
      this.createCategory(formData);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createCategory(formData: any): void {
    this.categorieService.createCategorie(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newCategory) => {
          this.toastr.success('Catégorie créée avec succès');
          //this.categoryAction.emit({ action: 'created', category: newCategory });
          this.loadCategories(); // Recharger la liste avec pagination
          this.closeForm();
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Erreur lors de la création');
          console.error(err);
        },
        complete: () => this.isLoading = false
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateCategory(formData: any): void {
    this.categorieService.updateCategorie(this.selectedCategory!.id!, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCategory) => {
          this.toastr.success('Catégorie modifiée avec succès');
          //this.categoryAction.emit({ action: 'updated', category: updatedCategory });
          this.loadCategories(); // Recharger la liste avec pagination
          this.closeForm();
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Erreur lors de la modification');
          console.error(err);
        },
        complete: () => this.isLoading = false
      });
  }

  /**
   * Supprimer une catégorie
   */
  deleteCategory(category: Categorie): void {
    if (!category.id) return;

    if (!confirm(`Voulez-vous vraiment supprimer la catégorie "${category.name}" ?`)) return;

    this.isLoading = true;
    this.categorieService.deleteCategorie(category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Catégorie supprimée avec succès');
          //this.categoryAction.emit({ action: 'deleted', category });
          this.loadCategories(); // Recharger la liste avec pagination
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Erreur lors de la suppression');
          console.error(err);
        },
        complete: () => this.isLoading = false
      });
  }

  /**
   * Activer/Désactiver une catégorie
   */
  toggleActiveStatus(category: Categorie): void {
    if (!category.id) return;

    const action = category.isActive ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous vraiment ${action} cette catégorie ?`)) return;

    this.isLoading = true;
    this.categorieService.toggleActive(category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          category.isActive = response.isActive;
          this.toastr.success(`Catégorie ${action}ée avec succès`);
          //this.categoryAction.emit({ action: 'toggled', category });
          
          // Si on masque les inactives et qu'on vient de désactiver, recharger
          if (!this.filters.showInactive && !response.isActive) {
            this.loadCategories();
          }
        },
        error: (err) => {
          this.toastr.error(err.error?.message || `Erreur lors de la ${action}`);
          console.error(err);
        },
        complete: () => this.isLoading = false
      });
  }

  // Les getters pour la pagination (maintenant utilisés pour l'affichage direct)
  get paginatedCategories() {
    return this.categories; // La pagination est déjà gérée par le serveur
  }

  // Méthode utilitaire pour obtenir la classe CSS du badge de statut
  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'bg-success' : 'bg-danger';
  }

  // Méthode utilitaire pour obtenir le libellé du type
  getTypeLabel(type: string): string {
    return type === 'DEPENSE' ? 'Dépense' : 'Recette';
  }
}