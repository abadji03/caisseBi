import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MouvementsStock, StatistiquesMouvement, Stock } from '../../../modeles/entrees-sorties.model';
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
  @Input() isAdmin = false;

  mouvementForm!: FormGroup;
  mouvements: MouvementsStock[] = [];
  searchTextMouvement = '';
  isLoading = false;
  isEditing = false;
  currentMouvement: MouvementsStock | null = null;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  statistiques:StatistiquesMouvement|null = null;
  
  // Filtres
  selectedTypeMouvement = 'tous';
  
  // Loading state pour la pagination
  isLoadingMore = false;

  produits: Produits[] = [];
  stock: Stock[] = [];
  filteredProduits: Produits[] = [];
  searchInput = '';
  selectedProduct: Produits | null = null;
  idStockPoduct = 0;

  private destroy$ = new Subject<void>();
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
      produitId: [null], // Ajout du champ produitId
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
    this.mouvementsStockService.getByStructure(
      this.codeStructure!,
      this.currentPage,
      this.pageSize,
      this.searchTextMouvement,
      this.selectedTypeMouvement,
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (response) => {
          console.log('Statistique mvt',response)
          this.mouvements = response.items;
          this.totalItems = response.pagination.total;
          this.totalPages = response.pagination.totalPages;
          this.hasNext = response.pagination.hasNext;
          this.hasPrev = response.pagination.hasPrev;
          this.statistiques = response.statistiquesMvt;
          

          this.loadProduitsEtStocks()
        },
        error: (err) => {
          console.error('Erreur chargement données', err);
          this.toastr.error('Erreur lors du chargement des données');
        }
      });
  }


  // Nouvelle méthode pour charger produits et stocks
  private loadProduitsEtStocks() {
    forkJoin([
      this.produitsService.getAllProduits(this.codeStructure!,1,10000),
      this.stockService.getStocksByStructure(this.codeStructure!)
    ])
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ([produits, stocks]) => {
        this.produits = produits.items;
        this.stock = stocks;
        this.filteredProduits = [...produits.items];
        console.log('Produits et stocks chargés');
      },
      error: (err) => {
        console.error('Erreur chargement produits/stocks', err);
      }
    });
  }

  filterProduits(): void {
    const input = this.searchInput.trim().toLowerCase();
    this.filteredProduits = this.produits.filter(p =>
      p.designation.toLowerCase().includes(input)
    );
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

  selectProduit(prod: Produits): void {
    console.log('Produit sélectionné:', prod);
    
    this.selectedProduct = prod;
    this.searchInput = prod.designation;
    this.filteredProduits = [];
    
    const stk = this.stock.find(stoc => stoc.produitId === prod.id);
    if (stk) {
      this.idStockPoduct = stk.id;
      console.log('Stock associé:', stk);
    }

    this.mouvementForm.patchValue({ 
      produitId: prod.id,  // Important : mettre à jour produitId
      uniteStock: prod.unite 
    });
    
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
    this.currentPage = 1; // Revenir à la première page
    this.loadData();
  }

  canEditTransaction(transaction: MouvementsStock): boolean {
  
      const today = new Date();
      const transactionDate = new Date(transaction.dateMouvement);
  
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
  

  getNomProduitById(produitId: number | null | undefined): string {
    if (!produitId) {
      console.warn('getNomProduitById appelé avec produitId null/undefined');
      return 'Produit non spécifié';
    }
    
    const produit = this.produits.find(p => p.id === produitId);
    if (!produit) {
      console.warn(`Produit avec ID ${produitId} non trouvé dans la liste`);
      return `Produit (ID: ${produitId})`;
    }
    
    return produit.designation;
  }

  getUniteProduitById(produitId: number): string {
    const produit = this.produits.find(p => p.id === produitId);
    return produit ? produit.unite : 'Produit introuvable';
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.loadData();
  }
  
  onTypeMouvementChange(): void {
      this.currentPage = 1;
      this.loadData();
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPageSizeChange(event: any): void {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.loadData();
  }  

  modifierMouvement(mouvement: MouvementsStock) {
    console.log('=== MODIFICATION MOUVEMENT ===');
    console.log('Mouvement à modifier:', mouvement);
    
    this.isEditing = true;
    this.currentMouvement = mouvement;
    
    // Récupérer le produit correspondant
    const produit = this.produits.find(p => p.id === mouvement.produitId);
    console.log('Produit trouvé:', produit);
    
    if (produit) {
      this.selectedProduct = produit;
      this.searchInput = produit.designation; // Pour l'affichage
      
      // Récupérer le stock pour ce produit
      const stk = this.stock.find(s => s.produitId === produit.id);
      if (stk) {
        this.idStockPoduct = stk.id;
        console.log('Stock trouvé:', stk);
      }
    }
    
    // Remplir le formulaire avec les données du mouvement
    this.mouvementForm.patchValue({
      produitId: mouvement.produitId,
      uniteStock: this.getUniteProduitById(mouvement.produitId),
      quantite: mouvement.quantite,
      typeMouvement: mouvement.typeMouvement,
      description: mouvement.description,
      prixUnitaire: mouvement.prixUnitaire
    });
    
    console.log('Formulaire après patch:', this.mouvementForm.value);
    
    this.openModal();
  }

  supprimerMouvement(mouvement: MouvementsStock) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) {
      this.isLoading = true;
      const variation = mouvement.typeMouvement === 'Sortie' 
        ? Number(mouvement.quantite) 
        : -Number(mouvement.quantite);

      this.mouvementsStockService.updateStatut(mouvement.id!,'annulé')
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
    console.log('=== ENREGISTREMENT MOUVEMENT ===');
    console.log('isEditing:', this.isEditing);
    console.log('Valeurs formulaire:', this.mouvementForm.value);

    if (this.mouvementForm.invalid) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const f = this.mouvementForm.value;
    // Vérification critique : produitId doit être défini
    const produitId = this.isEditing && this.currentMouvement 
      ? this.currentMouvement.produitId 
      : this.selectedProduct?.id;
      
    if (!produitId) {
      console.error('produitId est undefined!');
      this.toastr.error('Erreur: Produit non sélectionné');
      return;
    }
    const variation = f.typeMouvement === 'Sortie' ? -Number(f.quantite) : Number(f.quantite);

    const payload = {
      ...f,
      produitId: produitId,
      uniteStock: this.isEditing && this.currentMouvement 
        ? this.getUniteProduitById(this.currentMouvement.produitId)
        : this.selectedProduct?.unite,
      prixUnitaire: this.isEditing && this.currentMouvement 
        ? this.currentMouvement.prixUnitaire 
        : Number(f.prixUnitaire),
      code_structure: this.codeStructure,
      //acteurId: this.isEditing && this.currentMouvement ? this.currentMouvement.acteurId : this.agentId,
      ref: this.isEditing && this.currentMouvement 
        ? this.currentMouvement.ref 
        : `MVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      stockId: this.isEditing && this.currentMouvement ? this.currentMouvement.stockId : this.idStockPoduct,
      //magasinId: this.isEditing && this.currentMouvement ? this.currentMouvement.magasinId : this.magasinId,
    };

    // Ajouter magasinId seulement lors de la création
      if (!this.isEditing && this.magasinId && this.agentId) {
        payload.magasinId = this.magasinId;
        payload.acteurId = this.agentId
      }


    console.log('Payload préparé:', payload);

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
    console.log('Réinitialisation du formulaire');
    
    this.mouvementForm.reset({
      produitId: null,
      uniteStock: '',
      quantite: null,
      typeMouvement: '',
      description: '',
      prixUnitaire: ''
    });
    
    this.searchInput = '';
    this.selectedProduct = null;
    this.isEditing = false;
    this.currentMouvement = null;
    this.idStockPoduct = 0;
    this.filteredProduits = [];
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
