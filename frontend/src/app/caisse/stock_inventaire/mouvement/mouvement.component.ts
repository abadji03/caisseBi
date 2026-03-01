import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MouvementsStock, Stock } from '../../../modeles/entrees-sorties.model';
import { Produits } from '../../../modeles/produit.modele';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { MouvementsStockService } from '../../../services/mouvements-stock.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mouvement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './mouvement.component.html',
  styleUrl: './mouvement.component.css'
})
export class MouvementComponent implements OnInit, OnDestroy {

  @Input() codeStructure: string | null = null;
  @Input() magasinId: number | null = null;
  @Input() agentId: number | null = null;

  pageSize = 5;
  mouvementForm!: FormGroup;
  mouvements: MouvementsStock[] = [];
  filteredMouvements: MouvementsStock[] = [];
  searchTextMouvement = '';
  currentPageMouvement = 1;
  isLoading = false;
  isEditing = false;
  currentMouvement: MouvementsStock | null = null;

  produits: Produits[] = [];
  stock: Stock[] = [];
  filteredProduits: Produits[] = [];
  searchInput = '';
  selectedProduct: Produits | null = null;
  idStockPoduct = 0;

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private produitsService = inject(ProduitsService);
  private stockService = inject(StockInventaireService);
  private mouvementsStockService = inject(MouvementsStockService);
  private toastr = inject(ToastrService);

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    this.mouvementForm = this.fb.group({
      uniteStock: [{ value: '', disabled: false }, Validators.required],
      quantite: [null, [Validators.required, Validators.min(0.01)]],
      typeMouvement: ['', Validators.required],
      description: ['', Validators.required],
      prixUnitaire: [{ value: '', disabled: false }, Validators.required],
    });

    this.mouvementForm.get('typeMouvement')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        this.updatePrixUnitaire(type);
      });
  }

  private loadData() {
    this.isLoading = true;
    forkJoin([
      this.produitsService.getAllProduits(this.codeStructure!),
      this.stockService.getStocksByStructure(this.codeStructure!),
      this.mouvementsStockService.getAll()
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([produits, stocks, mouvements]) => {
          this.produits = produits;
          this.stock = stocks;
          this.mouvements = mouvements;
          this.filteredMouvements = [...mouvements];
          this.filteredProduits = [...produits];
        },
        error: (err) => {
          console.error('Erreur chargement données', err);
          this.toastr.error('Erreur lors du chargement des données');
        }
      });
  }

  filterProduits(): void {
    const input = this.searchInput.trim().toLowerCase();
    this.filteredProduits = this.produits.filter(p =>
      p.designation.toLowerCase().includes(input)
    );
  }

  selectProduit(prod: Produits): void {
    this.selectedProduct = prod;
    this.searchInput = prod.designation;
    this.filteredProduits = [];
    
    const stk = this.stock.find(stoc => stoc.produitId === this.selectedProduct?.id);
    if (stk) this.idStockPoduct = stk.id;

    this.mouvementForm.patchValue({ uniteStock: prod.unite });
    this.updatePrixUnitaire(this.mouvementForm.get('typeMouvement')!.value);
  }

  private updatePrixUnitaire(type: 'Entrée' | 'Sortie' | null) {
    if (!this.selectedProduct || !type) {
      this.mouvementForm.patchValue({ prixUnitaire: null });
      return;
    }

    const prix = type === 'Entrée'
      ? this.selectedProduct.prixAchatUnitaire
      : this.selectedProduct.prixVenteUnitaire;

    this.mouvementForm.patchValue({ prixUnitaire: prix });
  }

  onSearchChange(): void {
    this.filteredMouvements = this.mouvements.filter(mvt =>
      mvt.ref.toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
      this.getNomProduitById(mvt.produitId).toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
      mvt.typeMouvement.toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
      mvt.quantite?.toString().includes(this.searchTextMouvement.toLowerCase()) ||
      new Date(mvt.dateMouvement).toLocaleDateString().toLowerCase().includes(this.searchTextMouvement.toLowerCase())
    );
    this.currentPageMouvement = 1;
  }

  getNomProduitById(produitId: number): string {
    const produit = this.produits.find(p => p.id === produitId);
    return produit ? produit.designation : 'Produit introuvable';
  }

  getUniteProduitById(produitId: number): string {
    const produit = this.produits.find(p => p.id === produitId);
    return produit ? produit.unite : 'Produit introuvable';
  }

  getPaginatedMouvements() {
    const start = (this.currentPageMouvement - 1) * this.pageSize;
    return this.filteredMouvements.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredMouvements.length / this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPageMouvement = page;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowsPerPageChange(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPageMouvement = 1;
    this.cdr.detectChanges();
  }

  modifierMouvement(mouvement: MouvementsStock) {
    this.isEditing = true;
    this.currentMouvement = mouvement;
    this.searchInput = this.getNomProduitById(mouvement.produitId);
    
    const produit = this.produits.find(p => p.id === mouvement.produitId);
    if (produit) {
      this.selectedProduct = produit;
      const stk = this.stock.find(s => s.produitId === produit.id);
      if (stk) this.idStockPoduct = stk.id;
    }

    this.mouvementForm.patchValue({
      ...mouvement,
      uniteStock: this.getUniteProduitById(mouvement.produitId)
    });

    this.openModal();
  }

  supprimerMouvement(mouvement: MouvementsStock) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) {
      this.isLoading = true;
      const variation = mouvement.typeMouvement === 'Sortie' 
        ? Number(mouvement.quantite) 
        : -Number(mouvement.quantite);

      this.mouvementsStockService.delete(mouvement.id!)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: () => {
            this.stockService.adjustQuantiteTotale(mouvement.stockId, variation).subscribe({
              next: () => {
                this.toastr.success('Mouvement supprimé avec succès');
                this.loadData();
              },
              error: () => this.toastr.error('Erreur lors de la mise à jour du stock')
            });
          },
          error: () => this.toastr.error('Erreur lors de la suppression du mouvement')
        });
    }
  }

  enregistrerMouvement() {
    if (this.mouvementForm.invalid) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const f = this.mouvementForm.value;
    const variation = f.typeMouvement === 'Sortie' ? -Number(f.quantite) : Number(f.quantite);

    const payload = {
      ...f,
      produitId: this.isEditing && this.currentMouvement 
        ? this.currentMouvement.produitId 
        : this.selectedProduct?.id,
      uniteStock: this.isEditing && this.currentMouvement 
        ? this.getUniteProduitById(this.currentMouvement.produitId)
        : this.selectedProduct?.unite,
      prixUnitaire: this.isEditing && this.currentMouvement 
        ? this.currentMouvement.prixUnitaire 
        : Number(f.prixUnitaire),
      code_structure: this.codeStructure,
      acteurId: this.isEditing && this.currentMouvement ? this.currentMouvement.acteurId : this.agentId,
      ref: this.isEditing && this.currentMouvement 
        ? this.currentMouvement.ref 
        : `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      stockId: this.isEditing && this.currentMouvement ? this.currentMouvement.stockId : this.idStockPoduct,
      magasinId: this.isEditing && this.currentMouvement ? this.currentMouvement.magasinId : this.magasinId,
    };

    const operation = this.isEditing && this.currentMouvement
      ? this.mouvementsStockService.update(this.currentMouvement.id!, payload)
      : this.mouvementsStockService.create(payload);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.stockService.adjustQuantiteTotale(this.idStockPoduct, variation).subscribe({
          next: () => {
            this.toastr.success(this.isEditing ? 'Mouvement mis à jour' : 'Mouvement enregistré');
            this.loadData();
            this.resetForm();
            this.closeModal();
          },
          error: () => this.toastr.error('Erreur lors de la mise à jour du stock')
        });
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.toastr.error('Erreur lors de l\'opération');
      }
    });
  }

  resetForm() {
    this.searchInput = '';
    this.selectedProduct = null;
    this.mouvementForm.reset();
    this.isEditing = false;
    this.currentMouvement = null;
  }

  openModal() {
    const modalElement = document.getElementById('mouvementModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  closeModal() {
    const modalElement = document.getElementById('mouvementModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
    }
  }

}
