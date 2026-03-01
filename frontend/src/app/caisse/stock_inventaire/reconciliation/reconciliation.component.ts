import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MouvementsStock, Reconciliation, Stock } from '../../../modeles/entrees-sorties.model';
import { Produits } from '../../../modeles/produit.modele';
import { catchError, finalize, forkJoin, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
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

  pageSize = 5;
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

  private loadData() {
    this.isLoading = true;
    forkJoin([
      this.produitsService.getAllProduits(this.codeStructure!),
      this.stockService.getStocksByStructure(this.codeStructure!),
      this.reconciliationService.getByStructure(this.codeStructure!)
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([produits, stocks, reconciliations]) => {
          this.produits = produits;
          this.stock = stocks;
          // Transformer les réconciliations et enrichir avec les données de stock
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.reconciliations = reconciliations.map((raw: any) => Reconciliation.fromRaw(raw));
          /* this.reconciliations = reconciliations.map((raw: any) => {
            const rec = Reconciliation.fromRaw(raw);
            const stockProduit = this.stock.find(s => s.produitId === rec.produitId);
            if (stockProduit) {
              rec.stockTheorique = stockProduit.quantiteTotale;
            }
            return rec;
          }); */

          this.buildHistorique();
          this.filteredReconciliations = [...this.reconciliations];
          this.filteredProduits = [...produits];
        },
        error: (err) => {
          console.error('Erreur chargement données', err);
          this.toastr.error('Erreur lors du chargement des données');
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
    console.log('Produit sélectionné:', prod);
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
    const produit = this.produits.find(p => p.id === produitId);
    return produit ? produit.designation : 'Produit introuvable';
  }

  onSearchChange(): void {
    const searchText = this.searchTextReconciliation.toLowerCase();
    this.filteredReconciliations = this.reconciliations.filter(rec =>
      this.getNomProduitById(rec.produitId).toLowerCase().includes(searchText) ||
      rec.stockTheorique.toString().includes(searchText) ||
      rec.stockPhysique.toString().includes(searchText)
    );
    this.currentPageReconciliation = 1;
  }

  getPaginatedReconciliations() {
    const start = (this.currentPageReconciliation - 1) * this.pageSize;
    return this.filteredReconciliations.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredReconciliations.length / this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPageReconciliation = page;
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

  
 /*  modifierReconciliation(reconciliation: Reconciliation) {
    this.isEditing = true;
    this.selectedReconciliation = reconciliation;
    
    const produit = this.produits.find(p => p.id === reconciliation.produitId);
    if (produit) {
      this.selectedProduct = produit;
      this.searchInput = produit.designation;

      this.reconciliationForm.get('produitId')?.setValue(produit.id, {
        emitEvent: false // ⭐ empêche ouverture dropdown
      });
    }

    //this.reconciliationForm.patchValue(reconciliation);
    this.reconciliationForm.patchValue({
      produitId: reconciliation.produitId,
      stockTheorique: reconciliation.stockTheorique,
      stockPhysique: reconciliation.stockPhysique,
      note: reconciliation.note
    });
    this.openModal();
  }
 */

  modifierReconciliation(reconciliation: Reconciliation) {
  console.log('Modification réconciliation:', reconciliation);
  
  this.isEditing = true;
  this.selectedReconciliation = reconciliation;
  
  // Récupérer le produit correspondant
  const produit = this.produits.find(p => p.id === reconciliation.produitId);
  console.log('Produit trouvé:', produit);
  
  if (produit) {
    this.selectedProduct = produit;
    this.searchInput = produit.designation; // Pour l'affichage dans l'input
  }
  
  // Remplir le formulaire avec les données de la réconciliation
  this.reconciliationForm.patchValue({
    produitId: reconciliation.produitId,
    stockTheorique: reconciliation.stockTheorique,
    stockPhysique: reconciliation.stockPhysique,
    note: reconciliation.note || ''
  });
  
  // IMPORTANT: Désactiver la recherche de produit en mode édition
  this.isEditing = true; // Nouvelle variable à ajouter
  
  this.openModal();
}
  /* supprimerReconciliation(reconciliation: Reconciliation) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette réconciliation ?')) {
      this.isLoading = true;
      this.reconciliationService.delete(reconciliation.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Réconciliation supprimée avec succès');
            this.loadData();
          },
          error: (err) => {
            this.isLoading = false;
            const message = err.error?.message || 'Erreur lors de la suppression';
            this.toastr.error(message);
          }
        });
    }
  } */

  
  supprimerReconciliation(reconciliation: Reconciliation) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette réconciliation ?')) {
      this.isLoading = true;

      // Avant de supprimer, on doit annuler l'impact sur le stock
      // et supprimer le mouvement de correction associé
      this.reconciliationService.getById(reconciliation.id!)
        .pipe(
          switchMap((rec: Reconciliation) => {
            // Rechercher le mouvement de correction associé
            return this.mouvementsStockService.getByStructure(this.codeStructure!).pipe(
              map(mouvements => {
                return mouvements.find(m => 
                  m.description?.includes(`réconciliation du ${new Date(rec.dateReconciliation).toLocaleDateString()}`) &&
                  m.produitId === rec.produitId
                );
              }),
              switchMap(mouvementCorrection => {
                // Si un mouvement de correction existe, le supprimer
                if (mouvementCorrection) {
                  return this.mouvementsStockService.delete(mouvementCorrection.id!).pipe(
                    switchMap(() => {
                      // Annuler l'effet sur le stock
                      const variation = rec.ecart; // Inverse de la correction initiale
                      return this.stockService.getStockByProduitId(rec.produitId).pipe(
                        switchMap(stock => {
                          return this.stockService.adjustQuantiteTotale(stock.id, variation);
                        })
                      );
                    })
                  );
                }
                return of(null);
              }),
              switchMap(() => {
                // Enfin, supprimer la réconciliation
                return this.reconciliationService.delete(reconciliation.id!);
              })
            );
          }),
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: () => {
            this.toastr.success('Réconciliation et mouvements associés supprimés avec succès');
            this.loadData();
          },
          error: (err) => {
            console.error('Erreur:', err);
            const message = err.error?.message || 'Erreur lors de la suppression';
            this.toastr.error(message);
            this.isLoading = false;
          }
        });
    }
  }

  enregistrerReconciliation() {
    if (this.reconciliationForm.invalid) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isLoading = true;
    const formValue = this.reconciliationForm.value;
    //const ecart = formValue.stockPhysique - formValue.stockTheorique;

    // Préparer les données de réconciliation
    const reconciliationData = new Reconciliation ({
      produitId: formValue.produitId,
      stockTheorique: formValue.stockTheorique,
      stockPhysique: formValue.stockPhysique,
      //ecart: ecart,
      note: formValue.note,
      magasinId:this.magasinId!,
      code_structure: this.codeStructure!,
      responsable: this.agentId!,
      dateReconciliation: new Date()
    });

    if (this.isEditing && this.selectedReconciliation) {
      this.updateReconciliation(reconciliationData);
    } else {
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
          console.log('Réconciliation créée',reconciliation)
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
