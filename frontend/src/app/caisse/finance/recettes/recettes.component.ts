import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Categorie, Recette } from '../../../modeles/finance.model';
import { User } from '../../../modeles/user.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';
import { RecettesService } from '../../../services/recettes.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recettes',
  standalone: true,
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './recettes.component.html',
  styleUrl: './recettes.component.css'
})
export class RecettesComponent implements OnInit, OnDestroy {

  @Input() categories: Categorie[] = [];
  @Input() code_structure: string | null = null;
  @Input() magasinId: number | null = null;
  @Input() agentId: number | null = null;
  @Input() currentUser: User | null = null;

  @Output() categoryAction = new EventEmitter<{ action: string; category: Categorie }>();
  @Output() recetteAction = new EventEmitter<{ action: string; recette: Recette }>();
  @Output() refreshCategories = new EventEmitter<void>();

  // Données
  recettes: Recette[] = [];
  filteredRecettes: Recette[] = [];

  // États du formulaire
  showForm = false;
  selectedRecette: Recette | null = null;
  selectedFile: File | null = null;

  // Formulaire
  recetteForm!: FormGroup;

  // Pagination et recherche
  searchTerm = '';
  itemsPerPage = 5;
  currentPage = 1;

  // États
  isLoading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private recetteService = inject(RecettesService);
  private toastr = inject(ToastrService);

  ngOnInit(): void {
    this.initForm();
    if (this.code_structure) {
      this.loadRecettes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialiser le formulaire
   */
  private initForm(): void {
    this.recetteForm = this.fb.group({
      categoryId: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]],
      paymentMode: ['', Validators.required],
      description: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required]
    });
  }

  /**
   * Charger les recettes
   */
  loadRecettes(): void {
    if (!this.code_structure) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.recetteService.getByStructure(this.code_structure)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (recettes) => {
          console.log('Liste des recette chargées',recettes)
          this.recettes = recettes;
          this.filteredRecettes = [...this.recettes];
          this.toastr.success(`${recettes.length} recettes chargées`);
          console.log('Recettes chargées:', recettes);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des recettes';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement recettes:', err);
        }
      });
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
  onSearchChange(): void {
    if (!this.searchTerm) {
      this.filteredRecettes = [...this.recettes];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredRecettes = this.recettes.filter(recette =>
        this.getCategoryName(recette.categoryId).toLowerCase().includes(term) ||
        recette.montant.toString().includes(term) ||
        new Date(recette.date).toLocaleDateString().toLowerCase().includes(term) ||
        (recette.description && recette.description.toLowerCase().includes(term)) ||
        (recette.paymentMode && recette.paymentMode.toLowerCase().includes(term))
      );
    }
    this.currentPage = 1;
  }

  /**
   * Gestionnaire de fichier
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Fichier sélectionné:', this.selectedFile.name);
    }
  }

  /**
   * Afficher/masquer le formulaire
   */
  toggleForm(recette?: Recette): void {
    if (recette) {
      this.selectedRecette = recette;
      this.recetteForm.patchValue({
        categoryId: recette.categoryId,
        montant: recette.montant,
        paymentMode: recette.paymentMode,
        description: recette.description,
        date: new Date(recette.date).toISOString().split('T')[0]
      });
      // Stocker le fichier existant si présent
      if (recette.receipt) {
        this.selectedFile = null; // On ne peut pas pré-remplir un input file
      }
    } else {
      this.selectedRecette = null;
      this.recetteForm.reset({
        paymentMode: 'Espèce',
        date: new Date().toISOString().split('T')[0]
      });
      this.selectedFile = null;
    }
    this.showForm = !this.showForm;
    
    // Réinitialiser l'input fichier
    if (!this.showForm) {
      const fileInput = document.getElementById('recetteReceipt') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }

  /**
   * Annuler le formulaire
   */
  cancelForm(): void {
    this.showForm = false;
    this.selectedRecette = null;
    this.selectedFile = null;
    this.recetteForm.reset({
      paymentMode: 'Espèce',
      date: new Date().toISOString().split('T')[0]
    });
    
    // Réinitialiser l'input fichier
    const fileInput = document.getElementById('recetteReceipt') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.recetteForm.invalid) {
      this.recetteForm.markAllAsTouched();
      
      // Afficher des messages d'erreur spécifiques
      const errors = [];
      if (this.recetteForm.get('categoryId')?.invalid) errors.push('Catégorie');
      if (this.recetteForm.get('montant')?.invalid) errors.push('Montant');
      if (this.recetteForm.get('paymentMode')?.invalid) errors.push('Mode de paiement');
      if (this.recetteForm.get('date')?.invalid) errors.push('Date');
      
      this.toastr.warning(`Veuillez remplir correctement les champs : ${errors.join(', ')}`);
      return;
    }

    this.isLoading = true;
    
    // Créer FormData pour envoyer les données
    const formData = new FormData();
    const recetteData = this.recetteForm.value;

    // Ajouter les données au FormData
    formData.append('code_structure', this.code_structure!);
    formData.append('magasinId', this.magasinId!.toString());
    formData.append('agentId', this.agentId!.toString());
    formData.append('categoryId', recetteData.categoryId.toString());
    formData.append('montant', recetteData.montant.toString());
    formData.append('paymentMode', recetteData.paymentMode);
    formData.append('description', recetteData.description || '');
    formData.append('date', recetteData.date);

    // Ajouter le fichier si présent
    if (this.selectedFile) {
      formData.append('receipt', this.selectedFile);
    }

    if (this.selectedRecette?.id) {
      this.updateRecette(formData);
    } else {
      this.createRecette(formData);
    }
  }

  /**
   * Créer une nouvelle recette
   */
  private createRecette(formData: FormData): void {
    this.recetteService.createRecette(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newRecette) => {
          this.toastr.success('Recette enregistrée avec succès');
          this.loadRecettes(); // Recharger la liste
          this.recetteAction.emit({ action: 'created', recette: newRecette });
          this.cancelForm();
        },
        error: (err) => {
          console.error('Détails de l\'erreur:', err);
          this.toastr.error(err.error?.message || 'Erreur lors de l\'enregistrement de la recette');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  /**
   * Mettre à jour une recette existante
   */
  private updateRecette(formData: FormData): void {
    this.recetteService.updateRecette(this.selectedRecette!.id!, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRecette) => {
          this.toastr.success('Recette modifiée avec succès');
          this.loadRecettes(); // Recharger la liste
          this.recetteAction.emit({ action: 'updated', recette: updatedRecette });
          this.cancelForm();
        },
        error: (err) => {
          console.error('Détails de l\'erreur:', err);
          this.toastr.error(err.error?.message || 'Erreur lors de la modification de la recette');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  /**
   * Supprimer une recette
   */
  deleteRecette(recette: Recette): void {
    if (!recette.id) return;

    const dateFormatee = new Date(recette.date).toLocaleDateString('fr-FR');
    if (!confirm(`Voulez-vous vraiment supprimer cette recette du ${dateFormatee} ?`)) return;

    this.isLoading = true;
    this.recetteService.deleteRecette(recette.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recettes = this.recettes.filter(r => r.id !== recette.id);
          this.filteredRecettes = [...this.recettes];
          this.toastr.success('Recette supprimée avec succès');
          this.recetteAction.emit({ action: 'deleted', recette });
        },
        error: (err) => {
          console.error('Détails de l\'erreur:', err);
          this.toastr.error(err.error?.message || 'Erreur lors de la suppression');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
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

  /**
   * Pagination - Obtenir les éléments de la page courante
   */
  get paginatedRecettes() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRecettes.slice(start, start + this.itemsPerPage);
  }

  /**
   * Pagination - Obtenir le nombre total de pages
   */
  get totalPages(): number {
    return Math.ceil(this.filteredRecettes.length / this.itemsPerPage);
  }

  /**
   * Pagination - Changer de page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * Pagination - Définir le nombre d'éléments par page
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItemsPerPage(event: any): void {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1;
  }

  /**
   * Rafraîchir la liste des recettes
   */
  refreshList(): void {
    this.loadRecettes();
  }

}
