import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MouvementsStock, Reconciliation, Stock } from '../../../modeles/entrees-sorties.model';
import { Produits } from '../../../modeles/produit.modele';
import { catchError, finalize, forkJoin, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { ReconciliationService } from '../../../services/reconciliation.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { MouvementsStockService } from '../../../services/mouvements-stock.service';

@Component({
  selector: 'app-reconciliation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './reconciliation.component.html',
  styleUrl: './reconciliation.component.css'
})
export class ReconciliationComponent implements OnInit, OnDestroy {

  @Input() codeStructure: string | null = null;
  @Input() agentId: number | null = null;
  @Input() magasinId: number | null = null;
  @Input() isAdmin = false;

  reconciliationForm!: FormGroup;
  reconciliations: Reconciliation[] = [];
  filteredReconciliations: Reconciliation[] = [];
  searchTextReconciliation = '';
  currentPageReconciliation = 1;
  isLoading = false;
  isEditing = false;
  selectedReconciliation: Reconciliation | null = null;
  historiqueSelectionne: { date: Date; ecart: number; note?: string }[] = [];

  produits: Produits[] = [];
  stock: Stock[] = [];
  filteredProduits: Produits[] = [];
  searchInput = '';
  selectedProduct: Produits | null = null;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statistiques : any;
  

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private produitsService = inject(ProduitsService);
  private stockService = inject(StockInventaireService);
  private reconciliationService = inject(ReconciliationService);
  private toastr = inject(ToastrService);
  private mouvementsStockService = inject(MouvementsStockService); 

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    this.reconciliationForm = this.fb.group({
      produitId: ['', Validators.required],
      stockTheorique: ['', Validators.required],
      stockPhysique: ['', Validators.required],
      note: ['']
    });
  }

  // Modifier la méthode loadData()
  private loadData() {
    this.isLoading = true;
    
    
    this.reconciliationService.getByStructure(
      this.codeStructure!,
      this.currentPage,
      this.pageSize,
      this.searchTextReconciliation,
    )
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoading = false;
      })
    )
    .subscribe({
      next: (response) => {
        
        // Transformer les réconciliations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.reconciliations = response.items.map((raw: any) => {
          const rec = Reconciliation.fromRaw(raw);
          return rec;
        });
        
        // Mettre à jour les informations de pagination
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.hasNext = response.pagination.hasNext;
        this.hasPrev = response.pagination.hasPrev;
        
        this.statistiques = response.statistiquesRec
        // Construire l'historique pour chaque réconciliation
        this.buildHistorique();
        
        // Charger les produits et stocks en parallèle (si nécessaire)
        this.loadProduitsEtStocks();
      },
      error: (err) => {
        console.error('Erreur chargement réconciliations', err);
        this.isLoading = false;
      }
    });
  }

  // Nouvelle méthode pour charger produits et stocks
  private loadProduitsEtStocks() {
    forkJoin([
      this.produitsService.getProduitsDisponibles(this.codeStructure!),
      this.stockService.getStocksByStructure(this.codeStructure!)
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([produits, stocks]) => {
        this.produits = produits ;
        this.stock = stocks;
        this.filteredProduits = [...produits];
      },
      error: (err) => {
        console.error('Erreur chargement produits/stocks', err);
      }
    });
  }

  private buildHistorique() {
    this.reconciliations.forEach(rec => {
      rec.historiqueEcart = this.reconciliations
        .filter(r => r.produitId === rec.produitId && r.dateReconciliation <= rec.dateReconciliation)
        .map(r => ({
          date: r.dateReconciliation,
          ecart: r.ecart,
          note: r.note
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
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
    
    const stk = this.stock.find(s => s.produitId === prod.id);
    this.reconciliationForm.patchValue({
      produitId: prod.id,
      stockTheorique: stk?.quantiteTotale
    });
  }

  getNomProduitById(produitId: number): string {
  if (!produitId) {
    console.warn('getNomProduitById appelé avec produitId undefined');
    return 'Produit non spécifié';
  }
  
  const produit = this.produits.find(p => p.id === produitId);
  if (!produit) {
    console.warn(`Produit avec ID ${produitId} non trouvé`);
    return `Produit (ID: ${produitId})`;
  }
  
  return produit.designation;
} 

 onSearchChange(): void {
    this.currentPage = 1; // Revenir à la première page
    this.loadData();
  }

  getPaginatedReconciliations() {
    const start = (this.currentPageReconciliation - 1) * this.pageSize;
    return this.filteredReconciliations.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredReconciliations.length / this.pageSize);
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

  // Getter pour les pages à afficher (à ajouter dans le composant)
get pagesToShow(): number[] {
  const pages: number[] = [];
  const maxVisiblePages = 5;
  
  if (this.totalPages <= maxVisiblePages) {
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
  } else {
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, this.currentPage + 2);
    
    if (this.currentPage <= 3) {
      end = Math.min(this.totalPages, maxVisiblePages);
    }
    
    if (this.currentPage >= this.totalPages - 2) {
      start = Math.max(1, this.totalPages - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
  }
  
  return pages;
}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowsPerPageChange(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPageReconciliation = 1;
    this.cdr.detectChanges();
  }

  voirHistorique(reconciliation: Reconciliation) {
    this.historiqueSelectionne = reconciliation.historiqueEcart || [];
    this.openHistoriqueModal();
  }

modifierReconciliation(reconciliation: Reconciliation) {
  
  this.isEditing = true;
  this.selectedReconciliation = reconciliation;
  
  // Récupérer le produit correspondant
  const produit = this.produits.find(p => p.id === reconciliation.produitId);
  
  if (produit) {
    this.selectedProduct = produit;
    this.searchInput = produit.designation; // Pour l'affichage
  }
  
  // Remplir le formulaire avec les données de la réconciliation
  this.reconciliationForm.patchValue({
    produitId: reconciliation.produitId,
    stockTheorique: reconciliation.stockTheorique,
    stockPhysique: reconciliation.stockPhysique,
    note: reconciliation.note || ''
  });
  
  
  // Ouvrir le modal
  this.openModal();
}
  
canEditTransaction(transaction: Reconciliation): boolean {
  
      const today = new Date();
      const transactionDate = new Date(transaction.dateReconciliation);
  
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

supprimerReconciliation(reconciliation: Reconciliation) {

  //console.log('Reconciliation à supprimer',reconciliation);
  //console.log('ID reconciliation à supprimer',reconciliation.MouvementStocks?.[0]?.id);
  if (!confirm('Êtes-vous sûr de vouloir annuler cette réconciliation ?')) {
    return;
  }
  this.isLoading = true;

  const mouvementId = reconciliation.MouvementStocks?.[0]?.id;
  const ecart = reconciliation.ecart;
  const produitId = reconciliation.produitId;

  if (!mouvementId) {
    this.toastr.error('Mouvement associé introuvable');
    this.isLoading = false;
    return;
  }

  // 1️⃣ Annuler le mouvement
  this.mouvementsStockService.updateStatut(mouvementId, 'annulé')
    .pipe(

      // 2️⃣ Restaurer le stock (inverse de la correction)
      switchMap(() =>
        this.stockService.getStockByProduitId(produitId)
      ),

      switchMap(stock => {
        // on inverse l'écart
        const variation = -ecart;
        return this.stockService.adjustQuantiteTotale(stock.id, variation);
      }),

      // 3️⃣ Annuler la réconciliation
      switchMap(() =>
        this.reconciliationService.updateStatut(
          reconciliation.id!,
          'annulé'
        )
      ),

      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    )
    .subscribe({
      next: () => {
        this.toastr.success('Réconciliation annulée avec succès');
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Erreur lors de l’annulation');
      }
    });
}

  enregistrerReconciliation() {

    if (this.reconciliationForm.invalid) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    //this.isLoading = true;
    const formValue = this.reconciliationForm.value;
    //const ecart = formValue.stockPhysique - formValue.stockTheorique;
    if (!formValue.produitId) {
    console.error('produitId est undefined!');
    this.toastr.error('Erreur: Produit non sélectionné');
    return;
  }

    // Préparer les données de réconciliation
    const reconciliationData = new Reconciliation ({
      produitId: formValue.produitId,
      stockTheorique: formValue.stockTheorique,
      stockPhysique: formValue.stockPhysique,
      //ecart: ecart,
      note: formValue.note,
      //magasinId:this.magasinId!,
      code_structure: this.codeStructure!,
      //responsable: this.agentId!,
      dateReconciliation: new Date()
    });

    // Ajouter magasinId seulement lors de la création
    if (!this.isEditing && this.magasinId && this.agentId) {
      reconciliationData.magasinId = this.magasinId;
      reconciliationData.responsable = this.agentId;
    }


    if (this.isEditing && this.selectedReconciliation) {
        this.updateReconciliation(reconciliationData);
    } 
    else {
      this.createReconciliation(reconciliationData);
    }
  }
  resetForm() {
    this.reconciliationForm.reset();
    this.isEditing = false;
    this.selectedReconciliation = null;
    this.selectedProduct = null;
    this.searchInput = '';
  }

  private createReconciliation(reconciliationData: Reconciliation) {

    
    // 1. Créer la réconciliation
    this.reconciliationService.create(reconciliationData)
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        switchMap((raw: any) => {
          const reconciliation = Reconciliation.fromRaw(raw);
          
          const ecart = reconciliation.ecart;
          // 2. Si écart non nul, créer un mouvement de correction
          if (ecart !== 0) {
            return this.createCorrectionMouvement(reconciliation, ecart).pipe(
              switchMap(() => {
                // 3. Mettre à jour le stock après création du mouvement
                return this.updateStockAfterReconciliation(reconciliation.produitId, ecart);
              }),
              switchMap(() => {
                this.toastr.success('Réconciliation enregistrée avec mouvement de correction');
                return of(reconciliation);
              })
            );
          } else {
            // 3. Pas d'écart, pas de mouvement nécessaire
            this.toastr.success('Réconciliation enregistrée (aucun écart)');
            return of(reconciliation);
          }
        }),
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.resetForm();
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur:', err);
          const message = err.error?.message || "Erreur lors de l'enregistrement de la réconciliation";
          this.toastr.error(message);
          this.isLoading = false;
        }
      });
  }


  private updateReconciliation(reconciliationData: Reconciliation) {
    const oldReconciliation = this.selectedReconciliation;
    const ecartDifference = reconciliationData.ecart - (oldReconciliation?.ecart || 0);

    if(!reconciliationData.produitId){
      this.toastr.warning('Erreur: erreur pas de produitd');
      return;
    }

    this.reconciliationService.update(this.selectedReconciliation!.id!, reconciliationData)
      .pipe(
        switchMap((updatedReconciliation: Reconciliation) => {
          // Si l'écart a changé, ajuster le stock et créer un mouvement
          if (ecartDifference !== 0) {
            return this.createCorrectionMouvement(updatedReconciliation, -ecartDifference).pipe(
              switchMap(() => {
                return this.updateStockAfterReconciliation(
                  updatedReconciliation.produitId, 
                  -ecartDifference
                );
              }),
              switchMap(() => {
                this.toastr.success('Réconciliation mise à jour avec ajustement de stock');
                return of(updatedReconciliation);
              })
            );
          } else {
            this.toastr.success('Réconciliation mise à jour');
            return of(updatedReconciliation);
          }
        }),
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.resetForm();
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur:', err);
          const message = err.error?.message || 'Erreur lors de la mise à jour';
          this.toastr.error(message);
          this.isLoading = false;
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createCorrectionMouvement(reconciliation: Reconciliation, ecart: number): Observable<any> {
    // Déterminer le type de mouvement basé sur l'écart
    // Écart positif = stock physique > stock théorique = besoin d'une sortie pour corriger
    // Écart négatif = stock physique < stock théorique = besoin d'une entrée pour corriger
    const typeMouvement = ecart > 0 ? 'Entrée' : 'Sortie';
    const quantiteCorrection = Math.abs(ecart);

    // Récupérer le stock pour obtenir l'ID du stock
    return this.stockService.getStockByProduitId(reconciliation.produitId).pipe(
      switchMap((stock: Stock) => {
        const mouvement: Partial<MouvementsStock> = {
          produitId: reconciliation.produitId,
          reconciliationId:reconciliation.id,
          stockId: stock.id,
          typeMouvement: typeMouvement,
          quantite: quantiteCorrection,
          description: `Correction suite à la réconciliation du ${new Date().toLocaleDateString()} - Écart: ${ecart}`,
          prixUnitaire: 0, // Prix unitaire à 0 pour les mouvements de correction
          uniteStock: '', // Sera rempli par le service avec l'unité du produit
          code_structure: this.codeStructure!,
          acteurId: this.agentId!,
          magasinId: this.magasinId!,
          ref: `CORR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          dateMouvement: new Date()
        };

        return this.mouvementsStockService.create(mouvement as MouvementsStock);
      }),
      catchError(error => {
        console.error('Erreur lors de la création du mouvement de correction', error);
        this.toastr.warning('Réconciliation enregistrée mais échec de la création du mouvement de correction');
        return of(null);
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateStockAfterReconciliation(produitId: number, ecart: number): Observable<any> {
    // Pour la réconciliation, on met à jour directement la quantité totale
    // L'écart est inversé car :
    // Si écart positif (stock physique > stock théorique), on doit diminuer le stock
    // Si écart négatif (stock physique < stock théorique), on doit augmenter le stock
    if (!produitId) {
      console.error('produitId manquant');
      return of(null);
    }
    const variation = ecart;

    return this.stockService.getStockByProduitId(produitId).pipe(
      switchMap((stock: Stock) => {
        return this.stockService.adjustQuantiteTotale(stock.id, variation);
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour du stock', error);
        this.toastr.warning('Le stock n\'a pas pu être mis à jour automatiquement');
        return of(null);
      })
    );
  }
  openModal() {
    const modalElement = document.getElementById('reconciliationModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  closeModal() {
    const modalElement = document.getElementById('reconciliationModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
    }
  }

  openHistoriqueModal() {
    const modalElement = document.getElementById('historiqueModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }
}
