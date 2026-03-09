import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Categorie, Depense } from '../../../modeles/finance.model';
import { User } from '../../../modeles/user.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';
import { DepencesService } from '../../../services/depences.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-depenses',
  standalone: true,
  imports: [CommonModule,FormsModule, ReactiveFormsModule],
  templateUrl: './depenses.component.html',
  styleUrl: './depenses.component.css'
})
export class DepensesComponent implements OnInit, OnDestroy {

  @Input() categories: Categorie[] = [];
  @Input() codeStructure!: string | null;
  @Input() magasinId!: number | null;
  @Input() agentId!: number | null;
  @Input() currentUser!: User | null;

  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() errorChange = new EventEmitter<string>();
  @Output() categoriesRefreshNeeded = new EventEmitter<void>();

  // Données
  depenses: Depense[] = [];
  filteredDepenses: Depense[] = [];

  // États du formulaire
  showForm = false;
  selectedDepense: Depense | null = null;
  selectedFile: File | null = null;

  // Formulaire
  depenseForm!: FormGroup;

  // Pagination et recherche
  searchTerm = '';
  itemsPerPage = 5;
  currentPage = 1;

  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private depenseService = inject(DepencesService);
  private toastr = inject(ToastrService);

  ngOnInit(): void {
    this.initForm();
    this.loadDepenses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    /* if(this.userSubscription) {
      this.userSubscription.unsubscribe();
    } */
  }
  private initForm(): void {
    this.depenseForm = this.fb.group({
      categoryId: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]],
      paymentMode: ['', Validators.required],
      description: [''],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      type: ['STANDARD', Validators.required]
    });
  }

  loadDepenses(): void {
    if (!this.codeStructure) return;

    this.loadingChange.emit(true);
    
    this.depenseService.getDepensesByStructure(this.codeStructure)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loadingChange.emit(false))
      )
      .subscribe({
        next: (depenses) => {
          this.depenses = depenses;
          this.filteredDepenses = [...this.depenses];
        },
        error: (err) => {
          this.errorChange.emit('Erreur lors du chargement des dépenses');
          console.error('Erreur chargement dépenses:', err);
        }
      });
  }

  onSearchChange(): void {
    if (!this.searchTerm) {
      this.filteredDepenses = [...this.depenses];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDepenses = this.depenses.filter(depense =>
        this.getCategoryName(depense.categoryId).toLowerCase().includes(term) ||
        depense.type.toLowerCase().includes(term) ||
        depense.montant.toString().includes(term) ||
        new Date(depense.date).toLocaleDateString().toLowerCase().includes(term) ||
        (depense.description && depense.description.toLowerCase().includes(term))
      );
    }
    this.currentPage = 1;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

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
    }
    this.showForm = !this.showForm;
  }

  onSubmit(): void {
    if (this.depenseForm.invalid) {
      this.depenseForm.markAllAsTouched();
      this.toastr.warning('Veuillez remplir correctement le formulaire');
      return;
    }

    this.loadingChange.emit(true);
    
    const formData = new FormData();
    const depenseData = this.depenseForm.value;

    formData.append('code_structure', this.codeStructure!);
    formData.append('magasinId', this.magasinId!.toString());
    formData.append('agentId', this.agentId!.toString());
    formData.append('categoryId', depenseData.categoryId);
    formData.append('montant', depenseData.montant);
    formData.append('paymentMode', depenseData.paymentMode);
    formData.append('description', depenseData.description || '');
    formData.append('type', depenseData.type);
    formData.append('date', depenseData.date);

    if (this.selectedFile) {
      formData.append('receipt', this.selectedFile);
    }

    if (this.selectedDepense?.id) {
      this.updateDepense(formData);
    } else {
      this.createDepense(formData);
    }
  }

  private createDepense(formData: FormData): void {
    this.depenseService.createDepense(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Dépense enregistrée avec succès');
          this.loadDepenses();
          this.resetForm();
        },
        error: (err) => {
          this.errorChange.emit('Erreur lors de l\'enregistrement');
          console.error('Erreur création dépense:', err);
        },
        complete: () => this.loadingChange.emit(false)
      });
  }

  private updateDepense(formData: FormData): void {
    this.depenseService.updateDepense(this.selectedDepense!.id!, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Dépense modifiée avec succès');
          this.loadDepenses();
          this.resetForm();
        },
        error: (err) => {
          this.errorChange.emit('Erreur lors de la modification');
          console.error('Erreur modification dépense:', err);
        },
        complete: () => this.loadingChange.emit(false)
      });
  }

  deleteDepense(depense: Depense): void {
    if (!depense.id) return;

    if (!confirm(`Voulez-vous vraiment supprimer cette dépense ?`)) return;

    this.loadingChange.emit(true);
    
    this.depenseService.deleteDepense(depense.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.depenses = this.depenses.filter(d => d.id !== depense.id);
          this.filteredDepenses = [...this.depenses];
          this.toastr.success('Dépense supprimée avec succès');
        },
        error: (err) => {
          this.errorChange.emit('Erreur lors de la suppression');
          console.error('Erreur suppression dépense:', err);
        },
        complete: () => this.loadingChange.emit(false)
      });
  }

  private resetForm(): void {
    this.depenseForm.reset({
      paymentMode: 'Espèce',
      type: 'STANDARD',
      date: new Date().toISOString().split('T')[0]
    });
    this.selectedFile = null;
    this.selectedDepense = null;
    this.showForm = false;
    
    const fileInput = document.getElementById('receipt') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Non défini';
  }

  // Pagination
  get paginatedDepenses() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDepenses.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredDepenses.length / this.itemsPerPage);
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
