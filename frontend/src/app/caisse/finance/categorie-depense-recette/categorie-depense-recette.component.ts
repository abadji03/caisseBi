import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Categorie } from '../../../modeles/finance.model';
import { User } from '../../../modeles/user.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CategoriesDepencesRecettesService } from '../../../services/categories-depences-recettes.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-categorie-depense-recette',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './categorie-depense-recette.component.html',
  styleUrl: './categorie-depense-recette.component.css'
})
export class CategorieDepenseRecetteComponent implements OnInit, OnDestroy {
  @Input() categories: Categorie[] = [];
  @Input() code_structure: string | null = null;
  @Input() currentUser: User | null = null;

  @Output() categoryAction = new EventEmitter<{ action: string; category: Categorie }>();
  @Output() categoriesChange = new EventEmitter<void>();

  // États
  showForm = false;
  selectedCategory: Categorie | null = null;
  categoryForm!: FormGroup;
 
  filteredCategories: Categorie[] = [];
  searchTerm = '';
  itemsPerPage = 5;
  currentPage = 1;
  
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private categorieService = inject(CategoriesDepencesRecettesService);
  private toastr = inject(ToastrService);

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
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

  /* loadCategories(): void {
    this.categoriesChange.emit();
  } */
   loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.categorieService.getAllByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$),
        finalize(() => {
        this.isLoading = false;
        //this.cdr.detectChanges();
      }))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.filteredCategories = [...this.categories];
          this.categoriesChange.emit();
          //this.toastr.success(`${categories.length} catégories chargées`);
          console.log('Catégories chargées:', categories);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des catégories';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement catégories:', err);
        }
      });
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredCategories = [...this.categories];
    } else {
      this.filteredCategories = this.categories.filter(cat =>
        cat.name.toLowerCase().includes(term) ||
        cat.type.toLowerCase().includes(term) ||
        (cat.description && cat.description.toLowerCase().includes(term))
      );
    }
    this.currentPage = 1;
  }

  toggleForm(category?: Categorie): void {
    if (category) {
      this.selectedCategory = category;
      this.categoryForm.patchValue(category);
    } else {
      this.selectedCategory = null;
      this.categoryForm.reset({
        type: 'DEPENSE',
        isActive: true
      });
    }
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedCategory = null;
    this.categoryForm.reset({
      type: 'DEPENSE',
      isActive: true
    });
  }

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
          this.categoryAction.emit({ action: 'created', category: newCategory });
          this.categoriesChange.emit();
          this.closeForm();
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la création');
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
          this.categoryAction.emit({ action: 'updated', category: updatedCategory });
          this.categoriesChange.emit();
          this.closeForm();
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la modification');
          console.error(err);
        },
        complete: () => this.isLoading = false
      });
  }

  deleteCategory(category: Categorie): void {
    if (!category.id) return;

    if (!confirm(`Voulez-vous vraiment supprimer la catégorie "${category.name}" ?`)) return;

    this.isLoading = true;
    this.categorieService.deleteCategorie(category.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Catégorie supprimée avec succès');
          this.categoryAction.emit({ action: 'deleted', category });
          this.categoriesChange.emit();
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la suppression');
          console.error(err);
        },
        complete: () => this.isLoading = false
      });
  }

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
          this.categoryAction.emit({ action: 'toggled', category });
          this.categoriesChange.emit();
        },
        error: (err) => {
          this.toastr.error(`Erreur lors de la ${action}`);
          console.error(err);
        },
        complete: () => this.isLoading = false
      });
  }

  // Pagination
  get paginatedCategories() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredCategories.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCategories.length / this.itemsPerPage);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItemsPerPage(event: any): void {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1;
  }

}
