import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Categorie, Depense, Recette } from '../../../modeles/finance.model';
import { Paiement } from '../../../modeles/paiement.model';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Client } from '../../../modeles/clients.model';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { Bon } from '../../../modeles/bon.model';
import { CategoriesDepencesRecettesService } from '../../../services/categories-depences-recettes.service';
import { ToastrService } from 'ngx-toastr';
import { finalize, Subject, takeUntil } from 'rxjs';
import { DepencesService } from '../../../services/depences.service';
import { RecettesService } from '../../../services/recettes.service';
import { PaiementsService } from '../../../services/paiements.service';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.css',
})
export class FinanceComponent implements OnInit,OnDestroy {
  // Onglet actif
  activeTab = 'depenses';
  categoryForm!: FormGroup;
  selectedCategory: Categorie | null = null;
  formVisible = false; // Contrôle l'affichage du formulaire
  selectedDepense: Depense | null = null; // Pour stocker la dépense sélectionnée pour modification
  selectedRecette: Recette | null = null; // Pour stocker la recette sélectionnée pour modification


  private destroy$ = new Subject<void>(); //Pour se désabonner des lorsqu'on change de composants

  paiementFormVisible = false;
  paiements: Paiement[] = [];

  newCategorie = false;
  showForm = false;
  showRecetteForm = false; // Nouvelle variable pour le formulaire de recette


  // Données
  depenses: Depense[] = [];
  recettes: Recette[] = [];

  categories: Categorie[] = [];

  filteredDepenses: Depense[] = [];
  filteredRecettes: Recette[] = [];
  filteredCategories: Categorie[] = [];
  filteredPaiements: Paiement[] = [];

  // Nouveaux objets pour les formulaires
  newDepense = new Depense();
  newRecette = new Recette();
  newPaiement = new Paiement();
  // Formulaires réactifs
  depenseForm!: FormGroup;
  recetteForm!: FormGroup;
  paiementForm!: FormGroup;

  // Variables pour la gestion des tables
  searchTerm = ''; // Recherche
  itemsPerPage = 5; // Nombre d'éléments par page
  currentPage = 1; // Page actuelle

  clients: Client[] = []; // Liste des clients
  fournisseurs: Fournisseur[] = []; // Liste des fournisseurs
  bons: Bon[] = []; // Liste des bons
  currentPageDepense = 1;
  currentPageRecette = 1;
  currentPagePaiement = 1;
  currentPageCategorie = 1;

  // Variables d'état
  isLoading = false;
  errorMessage = '';
  code_structure = 'MASTRUCTURET-NZNC'; // À adapter selon votre structure
  magasinId = 1; // À adapter selon votre contexte
  agentId = 1; // À adapter selon votre contexte

  // Fichier pour la dépense
  selectedFile: File | null = null;
  selectedRecetteFile: File | null = null; // Fichier pour la recette


  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private categorieService = inject(CategoriesDepencesRecettesService);
  private depenseService = inject(DepencesService);
  private paiementService = inject(PaiementsService);
  private recetteService = inject(RecettesService); // Injecter le service
  private toastr = inject(ToastrService);


  ngOnInit(): void {
    this.initForms();
    this.loadCategories();
    this.loadDepenses();
    this.loadRecettes(); // Remplacer la méthode statique
    // Initialisation des données, par exemple chargement des catégories et des recettes
    this.loadPaiement();
    this.loadClients();
    this.loadFournisseurs();
    this.loadBons();
    this.filteredCategories = [...this.categories];
    this.filteredDepenses = [...this.depenses];
    this.filteredPaiements = [...this.paiements];
    this.filteredRecettes = [...this.recettes];
    this.updatefilteredTable('depense');
    this.updatefilteredTable('recette');
    this.updatefilteredTable('paiement');
    this.updatefilteredTable('categorie');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Méthode pour mettre à jour les recettes, les dépenses, les paiement et les catégories
  updatefilteredTable(objet: string): void {
    if (objet === 'depense') {
      this.filteredDepenses = this.depenses.slice(
        (this.currentPage - 1) * 10,
        this.currentPage * 10,
      );
    } else if (objet === 'recette') {
      this.filteredRecettes = this.recettes.slice(
        (this.currentPage - 1) * 10,
        this.currentPage * 10,
      );
    } else if (objet === 'paiement') {
      this.filteredPaiements = this.paiements.slice(
        (this.currentPage - 1) * 10,
        this.currentPage * 10,
      );
    } else if (objet === 'categorie') {
      this.filteredCategories = this.categories.slice(
        (this.currentPage - 1) * 10,
        this.currentPage * 10,
      );
    }
  }

  // Gestion de la recherche
  onSearchChange(objet: string): void {
    if (objet === 'depense') {
      /* this.filteredDepenses = this.depenses.filter(
        (depense) =>
          this.getCategoryName(depense.categoryId)
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase()) ||
          depense.type.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          depense.montant.toString().includes(this.searchTerm) || // Filtrer par montant
          new Date(depense.date).toLocaleDateString().includes(this.searchTerm), // Filtrer par date
      );
      this.currentPageDepense = 1; // Réinitialiser à la première page après recherche */
      if (!this.searchTerm) {
        this.filteredDepenses = [...this.depenses];
      } else {
        this.filteredDepenses = this.depenses.filter(
          depense =>
            this.getCategoryName(depense.categoryId).toLowerCase().includes(this.searchTerm) ||
            depense.type.toLowerCase().includes(this.searchTerm) ||
            depense.montant.toString().includes(this.searchTerm) ||
            new Date(depense.date).toLocaleDateString().toLowerCase().includes(this.searchTerm) ||
            (depense.description && depense.description.toLowerCase().includes(this.searchTerm))
        );
      }
      this.currentPageDepense = 1;
    } else if (objet === 'recette') {
      this.filteredRecettes = this.recettes.filter(
        (recette) =>
          this.getCategoryName(recette.categoryId)
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase()) ||
          recette.montant.toString().includes(this.searchTerm) ||
          new Date(recette.date).toLocaleDateString().includes(this.searchTerm),
      );
      this.currentPageRecette = 1;
    } else if (objet === 'paiement') {
      this.filteredPaiements = this.paiements.filter(
        (paie) =>
          paie.typePaiement.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          paie.montant.toString().includes(this.searchTerm) ||
          new Date(paie.date).toLocaleDateString().includes(this.searchTerm),
      );
      this.currentPagePaiement = 1;
    } else if (objet === 'categorie') {
       const searchTerm = this.searchTerm.toLowerCase().trim();
      if (!searchTerm) {
        this.filteredCategories = [...this.categories];
      } else {
        this.filteredCategories = this.categories.filter(
          categorie =>
            categorie.name.toLowerCase().includes(searchTerm) ||
            categorie.type.toLowerCase().includes(searchTerm) ||
            (categorie.description && categorie.description.toLowerCase().includes(searchTerm))
        );
      }
      this.currentPageCategorie = 1;
      /* this.filteredCategories = this.categories.filter(
        (categorie) =>
          categorie.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          categorie.type.toString().includes(this.searchTerm.toLowerCase()),
      );
      this.currentPageCategorie = 1; */
    }
  }

  /* showFormCategorie() {
    this.newCategorie = true;
  } */

   /**
   * Afficher/masquer le formulaire de catégorie
   */
  showFormCategorie(category?: Categorie): void {
    this.newCategorie = true;
    if (category) {
      this.selectedCategory = category;
      this.categoryForm.patchValue(category);
    } else {
      this.selectedCategory = null;
      this.categoryForm.reset({
        type: 'DEPENSE',
        isActive: true,
        code_structure: this.code_structure
      });
    }
  }
  /* closeFormCategorie() {
    this.newCategorie = false;
  } */
 closeFormCategorie(): void {
    this.newCategorie = false;
    this.selectedCategory = null;
    this.categoryForm.reset({
      type: 'DEPENSE',
      isActive: true,
      code_structure: this.code_structure
    });
  }

  
  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.categorieService.getAllByStructure(this.code_structure)
      .pipe(takeUntil(this.destroy$),
        finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.filteredCategories = [...this.categories];
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

  /**
   * Charger les dépenses depuis l'API
   */
  loadDepenses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.depenseService.getDepensesByStructure(this.code_structure)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (depenses) => {
          this.depenses = depenses;
          this.filteredDepenses = [...this.depenses];
          this.toastr.success(`${depenses.length} dépenses chargées`);
          console.log('Dépenses chargées:', depenses);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des dépenses';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement dépenses:', err);
        }
      });
  }


/**
   * Charger les recettes depuis l'API
   */
  loadRecettes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.recetteService.getByStructure(this.code_structure)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (recettes) => {
          this.recettes = recettes;
          this.filteredRecettes = [...this.recettes];
          //this.toastr.success(`${recettes.length} recettes chargées`);
          console.log('Recettes chargées:', recettes);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des recettes';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement recettes:', err);
        }
      });
  }

  loadPaiement(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.paiementService.getByStructure(this.code_structure)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (paiement) => {
          this.paiements = paiement;
          this.filteredPaiements = [...this.paiements];
          //this.toastr.success(`${recettes.length} recettes chargées`);
          console.log('Recettes chargées:', paiement);
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des paiements';
          this.toastr.error(this.errorMessage);
          console.error('Erreur chargement paiements:', err);
        }
      });
  }

  /**
   * Gestion du fichier de reçu
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Fichier sélectionné:', this.selectedFile.name);
    }
  }
   /**
   * Gestion du fichier de reçu pour les recettes
   */
  onRecetteFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedRecetteFile = input.files[0];
      console.log('Fichier recette sélectionné:', this.selectedRecetteFile.name);
    }
  }
    /**
   * Afficher/masquer le formulaire de recette
   */
  toggleRecetteForm(recette?: Recette): void {
    if (recette) {
      this.selectedRecette = recette;
      this.recetteForm.patchValue({
        categoryId: recette.categoryId,
        montant: recette.montant,
        paymentMode: recette.paymentMode,
        description: recette.description,
        date: new Date(recette.date).toISOString().split('T')[0]
      });
    } else {
      this.selectedRecette = null;
      this.recetteForm.reset({
        paymentMode: 'Espèce',
        date: new Date().toISOString().split('T')[0]
      });
    }
    this.showRecetteForm = !this.showRecetteForm;
  }

  /**
   * Annuler le formulaire de recette
   */
  cancelRecetteForm(): void {
    this.resetRecetteForm();
  }

  cancelForm() {
    this.recetteForm.reset(); // Réinitialise le formulaire
    this.formVisible = false; // Cache le formulaire
  }

 /*  ajouterRecette() {
    if (this.recetteForm.valid) {
      const recetteData = this.recetteForm.value;
      // Logique pour ajouter la recette (enregistrement dans la base de données ou API)
      this.recettes.push({ ...recetteData, date: new Date() });
      this.cancelForm(); // Cache le formulaire après ajout
    }
  } */

  /**
   * Ajouter ou modifier une recette
   */
  ajouterRecette(): void {
    if (this.recetteForm.invalid) {
      this.recetteForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir correctement le formulaire');
      return;
    }

    this.isLoading = true;
    
    // Créer FormData pour envoyer les données
    const formData = new FormData();
    const recetteData = this.recetteForm.value;

    // Ajouter les données au FormData
    formData.append('code_structure', this.code_structure);
    formData.append('magasinId', this.magasinId.toString());
    formData.append('agentId', this.agentId.toString());
    formData.append('categoryId', recetteData.categoryId);
    formData.append('montant', recetteData.montant);
    formData.append('paymentMode', recetteData.paymentMode);
    formData.append('description', recetteData.description || '');
    formData.append('date', recetteData.date);

    // Ajouter le fichier si présent
    if (this.selectedRecetteFile) {
      formData.append('receipt', this.selectedRecetteFile);
    }

    // Si c'est une modification
    if (this.selectedRecette && this.selectedRecette.id) {
      this.updateRecette(formData, this.selectedRecette.id);
    } else {
      // Sinon c'est une création
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
        next: () => {
          this.toastr.success('Recette enregistrée avec succès');
          this.loadRecettes();
          this.resetRecetteForm();
        },
        error: (err) => {
          this.toastr.error('Erreur lors de l\'enregistrement de la recette');
          console.error('Erreur création recette:', err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  /**
   * Mettre à jour une recette existante
   */
  private updateRecette(formData: FormData, recetteId: number): void {
    this.recetteService.updateRecette(recetteId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadRecettes();
          this.toastr.success('Recette modifiée avec succès');
          this.resetRecetteForm();
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la modification de la recette');
          console.error('Erreur modification recette:', err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  /**
   * Réinitialiser le formulaire de recette
   */
  private resetRecetteForm(): void {
    this.recetteForm.reset({
      paymentMode: 'Espèce',
      date: new Date().toISOString().split('T')[0]
    });
    
    this.selectedRecetteFile = null;
    this.selectedRecette = null;
    this.showRecetteForm = false;
    
    // Réinitialiser l'input fichier
    const fileInput = document.getElementById('recetteReceipt') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

 /**
   * Éditer une recette
   */
  editRecette(recette: Recette): void {
    this.toggleRecetteForm(recette);
  }

  /**
   * Supprimer une recette
   */
  deleteRecette(recette: Recette): void {
    if (!recette.id) return;

    if (!confirm(`Voulez-vous vraiment supprimer cette recette du ${new Date(recette.date).toLocaleDateString()} ?`)) {
      return;
    }

    this.isLoading = true;
    this.recetteService.deleteRecette(recette.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recettes = this.recettes.filter(r => r.id !== recette.id);
          this.filteredRecettes = [...this.recettes];
          this.toastr.success('Recette supprimée avec succès');
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la suppression');
          console.error('Erreur suppression recette:', err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  // Initialisation des formulaires
  private initForms() {
    this.depenseForm = this.fb.group({
      categoryId: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]],
      paymentMode: ['', Validators.required],
      description: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      type: ['STANDARD', Validators.required],
      receipt: [''],
    });

    this.recetteForm = this.fb.group({
      categoryId: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(0)]],
      paymentMode: ['', Validators.required],
      description: [''],
      receipt: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required],

    });

    this.paiementForm = this.fb.group({
      typePaiement: ['', Validators.required], // Nouveau champ ajouté
      numero: ['', Validators.required],
      montant: [0, [Validators.required, Validators.min(1)]],
      methodePaiement: ['', Validators.required],
      clientId: [null],
      fournisseurId: [null],
      bonId: [null],
      notes: [''],
    });

    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      type: ['DEPENSE', Validators.required],
      isActive: [true],
    });
  }

  // Gestion des ajouts
  /* ajouterDepense() {
    if (this.depenseForm.valid) {
      this.depenses.push(new Depense({ ...this.depenseForm.value, date: new Date() }));
      this.depenseForm.reset();
    }
  } */

   /**
   * Créer une nouvelle dépense
   */
  ajouterDepense(): void {
    if (this.depenseForm.invalid) {
      this.depenseForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir correctement le formulaire');
      return;
    }

    this.isLoading = true;
    
    // Créer FormData pour envoyer les données
    const formData = new FormData();
    const depenseData = this.depenseForm.value;

    // Ajouter les données au FormData
    formData.append('code_structure', this.code_structure);
    formData.append('magasinId', this.magasinId.toString());
    formData.append('agentId', this.agentId.toString());
    formData.append('categoryId', depenseData.categoryId);
    formData.append('montant', depenseData.montant);
    formData.append('paymentMode', depenseData.paymentMode);
    formData.append('description', depenseData.description || '');
    formData.append('type', depenseData.type);
    formData.append('date', depenseData.date);

    // Ajouter le fichier si présent
    if (this.selectedFile) {
      formData.append('receipt', this.selectedFile);
    }

    // Si c'est une modification
    if (this.selectedDepense && this.selectedDepense.id) {
      this.updateDepense(formData, this.selectedDepense.id);
    } else {
      // Sinon c'est une création
      this.createDepense(formData);
    }

  }

  /**
 * Créer une nouvelle dépense
 */
private createDepense(formData: FormData): void {
  this.depenseService.createDepense(formData)
  .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        /* this.depenses.unshift(newDepense); // Ajouter au début
        this.filteredDepenses = [...this.depenses];*/
        this.toastr.success('Dépense enregistrée avec succès'); 
        this.loadDepenses();
        this.resetDepenseForm();
      },
      error: (err) => {
        this.toastr.error('Erreur lors de l\'enregistrement de la dépense');
        console.error('Erreur création dépense:', err);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
}

/**
 * Mettre à jour une dépense existante
 */
private updateDepense(formData: FormData, depenseId: number): void {
  this.depenseService.updateDepense(depenseId, formData)
  .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // Mettre à jour la dépense dans la liste
       /*  const index = this.depenses.findIndex(d => d.id === updatedDepense.id);
        if (index !== -1) {
          this.depenses[index] = updatedDepense;
          this.filteredDepenses = [...this.depenses];
        } */
       this.loadDepenses();
        this.toastr.success('Dépense modifiée avec succès');
        
        this.resetDepenseForm();
      },
      error: (err) => {
        this.toastr.error('Erreur lors de la modification de la dépense');
        console.error('Erreur modification dépense:', err);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
}

/**
 * Réinitialiser le formulaire de dépense
 */
private resetDepenseForm(): void {
  this.depenseForm.reset({
    paymentMode: 'Espèce',
    type: 'STANDARD',
    date: new Date().toISOString().split('T')[0]
  });
  
  this.selectedFile = null;
  this.selectedDepense = null;
  this.showForm = false;
  
  // Réinitialiser l'input fichier
  const fileInput = document.getElementById('receipt') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
}
  // ajouterRecette() {
  //   if (this.recetteForm.valid) {
  //     this.recettes.push(new Recette({ ...this.recetteForm.value, date: new Date() }));
  //     this.recetteForm.reset();
  //   }
  // }

  /*   ajouterPaiement() {
    if (this.paiementForm.valid) {
      this.paiements.push(new Paiement({ ...this.paiementForm.value, date: new Date() }));
      this.paiementForm.reset();
    }
  } */

  /* setActiveTab(tab: string) {
    this.activeTab = tab;
  } */

  /* editDepense(depense: Depense) {
    // Logic for editing the expense
    console.log('Editing depense', depense);
  } */

  /**
   * Modifier une dépense
   */
  editDepense(depense: Depense): void {
    this.selectedDepense = depense;
    this.showForm = true;
    
    // Pré-remplir le formulaire
    this.depenseForm.patchValue({
      categoryId: depense.categoryId,
      montant: depense.montant,
      paymentMode: depense.paymentMode,
      description: depense.description,
      type: depense.type,
      date: new Date(depense.date).toISOString().split('T')[0]
    });
    // Stocker le nom du fichier existant si présent
    if (depense.receipt) {
      this.selectedFile = null; // On pourrait charger l'ancien fichier si nécessaire
    }
    // TODO: Gérer la modification avec le service updateDepense
    //this.toastr.info('Fonctionnalité de modification à implémenter');
  }


  /* deleteDepense(depense: Depense) {
    // Logic for deleting the expense
    console.log('Deleting depense', depense);
  } */
  /**
   * Supprimer une dépense
   */
  deleteDepense(depense: Depense): void {
    if (!depense.id) return;

    if (!confirm(`Voulez-vous vraiment supprimer cette dépense du ${new Date(depense.date).toLocaleDateString()} ?`)) {
      return;
    }

    this.isLoading = true;
    this.depenseService.deleteDepense(depense.id)
    .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.depenses = this.depenses.filter(d => d.id !== depense.id);
          this.filteredDepenses = [...this.depenses];
          this.toastr.success('Dépense supprimée avec succès');
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la suppression');
          console.error('Erreur suppression dépense:', err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  /**
   * Annuler l'ajout de dépense
   */
  cancelDepenseForm(): void {
    this.resetDepenseForm();
  }

  viewDepenseDetails(depense: Depense) {
    // Logic for viewing the details of the expense
    console.log('Viewing depense details', depense);
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find((cat) => cat.id === categoryId);
    return category ? category.name : 'Non défini';
  }

  /* onSubmitCategoryForm() {
    if (this.selectedCategory) {
      // Modification de la catégorie
      const index = this.categories.findIndex((cat) => cat.id === this.selectedCategory?.id);
      if (index !== -1) {
        this.categories[index] = { ...this.selectedCategory, ...this.categoryForm.value };
      }
    } else {
      // Création d'une nouvelle catégorie
      const newCategory = new Categorie(this.categoryForm.value);
      newCategory.id = this.categories.length + 1; // id simulé
      this.categories.push(newCategory);
    }
    this.resetForm();
  } */

  /**
   * Soumettre le formulaire de catégorie (création ou modification)
   */
  onSubmitCategoryForm(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir correctement le formulaire');
      return;
    }

    this.isLoading = true;
    const formData = this.categoryForm.value;
    const categorieDta={
      ...formData,
      code_structure: this.code_structure
    };

    if (this.selectedCategory) {
      // Modification
      this.categorieService.updateCategorie(this.selectedCategory.id!, categorieDta)
        .subscribe({
          next: (updatedCategory) => {
            // Mettre à jour la catégorie dans la liste
            const index = this.categories.findIndex(c => c.id === updatedCategory.id);
            if (index !== -1) {
              this.categories[index] = updatedCategory;
              this.filteredCategories = [...this.categories];
            }
            this.toastr.success('Catégorie modifiée avec succès');
            this.closeFormCategorie();
          },
          error: (err) => {
            this.toastr.error('Erreur lors de la modification');
            console.error('Erreur modification catégorie:', err);
          },
          complete: () => {
            this.isLoading = false;
          }
        });
    } else {
      // Création
      this.categorieService.createCategorie(categorieDta)
        .subscribe({
          next: () => {

            // this.categories.push(newCategory);
            // this.filteredCategories = [...this.categories];
            this.loadCategories(); // Recharger les catégories pour inclure la nouvelle
            this.toastr.success('Catégorie créée avec succès');
            this.closeFormCategorie();
          },
          error: (err) => {
            this.toastr.error('Erreur lors de la création');
            console.error('Erreur création catégorie:', err.message);
          },
          complete: () => {
            this.isLoading = false;
          }
        });
    }
  }

  resetForm() {
    this.selectedCategory = null;
    this.categoryForm.reset({ type: 'DEPENSE', isActive: true });
  }

  /* editCategory(category: Categorie) {
    this.selectedCategory = category;
    this.categoryForm.patchValue(category);
  } */

    /**
   * Éditer une catégorie
   */
  editCategory(category: Categorie): void {
    this.showFormCategorie(category);
  }

  /* toggleActiveStatus(category: Categorie) {
    category.isActive = !category.isActive;
  } */

   /**
   * Activer/Désactiver une catégorie
   */
  toggleActiveStatus(category: Categorie): void {
    if (!category.id) return;

    const action = category.isActive ? 'désactiver' : 'activer';
    if (!confirm(`Voulez-vous vraiment ${action} cette catégorie ?`)) {
      return;
    }

    this.isLoading = true;
    this.categorieService.toggleActive(category.id)
      .subscribe({
        next: (response) => {
          category.isActive = response.isActive;
          this.toastr.success(`Catégorie ${action}ée avec succès`);
        },
        error: (err) => {
          this.toastr.error(`Erreur lors de la ${action}`);
          console.error(`Erreur ${action} catégorie:`, err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  /* deleteCategory(category: Categorie) {
    this.categories = this.categories.filter((cat) => cat.id !== category.id);
  } */

   /**
   * Supprimer une catégorie
   */
  deleteCategory(category: Categorie): void {
    if (!category.id) return;

    if (!confirm(`Voulez-vous vraiment supprimer la catégorie "${category.name}" ?`)) {
      return;
    }

    this.isLoading = true;
    this.categorieService.deleteCategorie(category.id)
      .subscribe({
        next: () => {
          this.categories = this.categories.filter(c => c.id !== category.id);
          this.filteredCategories = [...this.categories];
          this.toastr.success('Catégorie supprimée avec succès');
        },
        error: (err) => {
          this.toastr.error('Erreur lors de la suppression');
          console.error('Erreur suppression catégorie:', err);
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  togglePaiementForm() {
    this.paiementFormVisible = !this.paiementFormVisible;
  }

  // Détecter le changement du type de paiement
  onTypePaiementChange() {
    const typePaiement = this.paiementForm.value.typePaiement;

    if (typePaiement === 'client') {
      this.paiementForm.patchValue({ fournisseurId: null }); // Réinitialise fournisseur
    } else if (typePaiement === 'fournisseur') {
      this.paiementForm.patchValue({ clientId: null }); // Réinitialise client
    }
  }

  ajouterPaiement() {
    if (this.paiementForm.valid) {
      const formValues = this.paiementForm.value;

      const newPaiement = {
        ...formValues,
        date: new Date(),
        clientNom: this.getClientNom(formValues.clientId),
        fournisseurNom: this.getFournisseurNom(formValues.fournisseurId),
        bonNumero: this.getBonNumero(formValues.bonId),
      };

      this.paiements.push(newPaiement);
      this.paiementForm.reset();
      this.paiementFormVisible = false;
    }
  }

  editPaiement(paiement: Paiement) {
    this.paiementForm.patchValue(paiement);
    this.paiementFormVisible = true;
  }

  deletePaiement(paiement: Paiement) {
    this.paiements = this.paiements.filter((p) => p !== paiement);
  }

  cancelPaiementForm() {
    this.paiementForm.reset();
    this.paiementFormVisible = false;
  }

  // Fonctions pour récupérer les noms des clients, fournisseurs et numéros de bons
  getClientNom(clientId: number) {
    const client = this.clients.find((c) => c.id === clientId);
    return client ? client.nomComplet : 'N/A';
  }

  getFournisseurNom(fournisseurId: number) {
    const fournisseur = this.fournisseurs.find((f) => f.id === fournisseurId);
    return fournisseur ? fournisseur.nomComplet : 'N/A';
  }

  getBonNumero(bonId: number) {
    const bon = this.bons.find((b) => b.id === bonId);
    return bon ? bon.numero : 'N/A';
  }

  // Simuler le chargement des données
  loadClients() {
    /* this.clients = [
      { id: 1, nom: 'Aliou Diop' },
      { id: 2, nom: 'Mamadou Sow' },
    ]; */
  }

  loadFournisseurs() {
    /*  this.fournisseurs = [
      { id: 1, nom: 'Société ABC' },
      { id: 2, nom: 'Dakar Import' },
    ]; */
  }

  loadBons() {
    /*  this.bons = [
      { id: 1, numero: 'BON-2024-001' },
      { id: 2, numero: 'BON-2024-002' },
    ]; */
  }

  loadPaiements() {
    // Charger les paiements depuis un service ou localStorage
  }

  // Méthodes de pagination
  get getPaginatedDepenses() {
    return this.paginate(this.filteredDepenses, this.currentPageDepense, this.itemsPerPage);
  }

  get getPaginatedRecettes() {
    return this.paginate(this.filteredRecettes, this.currentPageRecette, this.itemsPerPage);
  }

  get getPaginatedPaiements() {
    return this.paginate(this.filteredPaiements, this.currentPagePaiement, this.itemsPerPage);
  }

  get getPaginatedCategories() {
    return this.paginate(this.filteredCategories, this.currentPageCategorie, this.itemsPerPage);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paginate(data: any[], currentPage: number, itemsPerPage: number) {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }

  onPageChange(page: number, instanceObj: string): void {
    if (instanceObj === 'depense') {
      this.currentPageDepense = page;
    } else if (instanceObj === 'recette') {
      this.currentPageRecette = page;
    } else if (instanceObj === 'paiement') {
      this.currentPagePaiement = page;
    } else if (instanceObj === 'categorie') {
      this.currentPageCategorie = page;
    }
    console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);
  }
  getTotalPages(list: unknown[]): number {
    return Math.ceil(list.length / this.itemsPerPage);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItemsPerPage(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPageCategorie = 1;
    this.currentPageDepense = 1;
    this.currentPagePaiement = 1;
    this.currentPageRecette = 1;

    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  nextPage() {
    this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.currentPage = 1;
  }
}
