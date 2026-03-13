import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Categorie, Recette } from '../../../modeles/finance.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, Subject, takeUntil } from 'rxjs';
import { RecettesFilter, RecettesResponse, RecettesService } from '../../../services/recettes.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ModePaiement } from '../../../modeles/paiement.model';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let bootstrap: any; // En haut du fichier


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
  @Input() isAdmin = false;
  @Input() modesPaiement : ModePaiement [] = [];

  @Output() categoryAction = new EventEmitter<{ action: string; category: Categorie }>();
  @Output() recetteAction = new EventEmitter<{ action: string; recette: Recette }>();
  @Output() refreshCategories = new EventEmitter<void>();

   // Données
  recettes: Recette[] = [];
  
  // Statistiques
  stats: RecettesResponse['statistiques'] | null = null;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  // Filtres
  filters: RecettesFilter = {
    page: 1,
    limit: 10,
    search: '',
    categoryId: '',
    paymentMode: '',
    statut: ''
  };

  // États du formulaire
  showForm = false;
  selectedRecette: Recette | null = null;
  selectedFile: File | null = null;

  // Formulaire
  recetteForm!: FormGroup;

  // États
  isLoading = false;
  errorMessage = '';

  // Options pour les selects
  paymentModes = ['Espèce', 'Carte', 'Mobile Money', 'Virement', 'Chèque'];
  statuts = ['validé', 'annulé'];

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private recetteService = inject(RecettesService);
  private toastr = inject(ToastrService);
  private searchSubject = new Subject<string>();

  // Pour le template
  Math = Math;

  ngOnInit(): void {
    this.initForm();

    if (this.code_structure) {
      this.loadRecettes();
    }
    // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      this.loadRecettes();
    });
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
  /* loadRecettes(): void {
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
 */

  loadRecettes(): void {
    if (!this.code_structure) {
      console.error('code_structure est null');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const filters: RecettesFilter = {
      page: this.filters.page,
      limit: this.itemsPerPage,
      search: this.filters.search || undefined,
      categoryId: this.filters.categoryId || undefined,
      paymentMode: this.filters.paymentMode || undefined,
      statut: this.filters.statut || undefined
    };

    console.log('Chargement des recettes avec filtres:', filters);

    this.recetteService.getByStructureBis(this.code_structure, filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response: RecettesResponse) => {
          console.log('✅ Réponse API reçue:', response);
          this.recettes = response.items;
          this.stats = response.statistiques;
          
          // Mise à jour de la pagination
          this.totalItems = response.pagination.total;
          this.currentPage = response.pagination.page;
          this.totalPages = response.pagination.totalPages;
          this.hasNext = response.pagination.hasNext;
          this.hasPrev = response.pagination.hasPrev;
          
          console.log('Recettes chargées:', response.items.length);
          console.log('Stats chargées:', this.stats);
        },
        error: (err) => {
          console.error('❌ Erreur API complète:', err);
          this.errorMessage = err.error?.message || 'Erreur lors du chargement des recettes';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  /**
   * Appliquer les filtres
   */
  applyFilters(): void {
    this.filters.page = 1;
    this.loadRecettes();
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
      statut: ''
    };
    this.loadRecettes();
  }

  // Méthode pour ouvrir le modal
  openStatsModal(): void {
    const modalElement = document.getElementById('statsModal');
    this.loadRecettes();
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
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
  /* onSearchChange(): void {
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
 */
  
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
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
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
    )
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
        /* complete: () => {
          this.isLoading = false;
        } */
      });
  }

  /**
   * Mettre à jour une recette existante
   */
  private updateRecette(formData: FormData): void {
    this.recetteService.updateRecette(this.selectedRecette!.id!, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
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
 /*  deleteRecette(recette: Recette): void {
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
  } */

  deleteRecette(recette: Recette): void {
    if (!recette.id) return;

    if (!confirm(`Voulez-vous vraiment supprimer cette recette ?`)) return;

    this.isLoading = true;
    this.recetteService.deleteRecette(recette.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Recette supprimée avec succès');
          this.loadRecettes();
          this.recetteAction.emit({ action: 'deleted', recette });
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la suppression');
          console.error(err);
        },
        //complete: () => this.isLoading = false
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
   * Obtenir le montant par mode de paiement
   */
  getMontantParMode(mode: string): number {
    if (!this.stats || !this.stats.globales.repartitionParMode) return 0;
    
    const modeMap: Record<string, string> = {
      'espèce': 'espece',
      'carte': 'carte',
      'orange money': 'orangeMoney',
      'Wave': 'wave',
      'virement': 'virement',
      'chèque': 'cheque',
      'Autre': 'autre',
    };
    
    const key = modeMap[mode.toLowerCase()];
    const repartition = this.stats.globales.repartitionParMode;
    
    if (key && key in repartition) {
      return repartition[key as keyof typeof repartition] || 0;
    }
    
    return 0;
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
   * Obtenir le maximum mensuel pour l'échelle des graphiques
   */
  getMaxMensuel(): number {
    if (!this.stats?.evolutionMensuelle || this.stats.evolutionMensuelle.length === 0) {
      return 1;
    }
    return Math.max(...this.stats.evolutionMensuelle.map(m => m.montantTotal));
  }

   getStatistiquesRecettes() {
    if (!this.stats) return [];
    
    return [
      { 
        titre: 'Total Recettes', 
        valeur: this.formatMontant(this.stats.globales.montantTotal),
        sousTitre: `${this.stats.globales.totalRecettes} transactions`,
        couleur: 'bg-primary',
        icone: 'bi-cash-stack'
      },
      { 
        titre: 'Moyenne', 
        valeur: this.formatMontant(this.stats.globales.montantMoyen),
        sousTitre: 'par transaction',
        couleur: 'bg-success',
        icone: 'bi-graph-up-arrow'
      },
      { 
        titre: 'Maximum', 
        valeur: this.formatMontant(this.stats.globales.montantMax),
        sousTitre: 'recette la plus élevée',
        couleur: 'bg-info',
        icone: 'bi-arrow-up-circle'
      },
      { 
        titre: 'Minimum', 
        valeur: this.formatMontant(this.stats.globales.montantMin),
        sousTitre: 'recette la plus faible',
        couleur: 'bg-warning',
        icone: 'bi-arrow-down-circle'
      }
    ];
  }
  /**
   * Pagination - Obtenir les éléments de la page courante
   */
  /* get paginatedRecettes() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredRecettes.slice(start, start + this.itemsPerPage);
  } */

  /**
   * Pagination - Obtenir le nombre total de pages
   */
  /* get totalPages(): number {
    return Math.ceil(this.filteredRecettes.length / this.itemsPerPage);
  } */

  /**
   * Pagination - Changer de page
   */
  /* onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  } */
  onPageChange(page: number): void {
      if (page >= 1 && page <= this.totalPages) {
        this.filters.page = page;
        this.loadRecettes();
      }
    }

  /**
   * Changer le nombre d'éléments par page
   */
  onItemsPerPageChange(limit: number): void {
    this.itemsPerPage = limit;
    this.filters.limit = limit;
    this.filters.page = 1;
    this.loadRecettes();
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
