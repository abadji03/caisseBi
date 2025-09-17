import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AnalyseEcart,
  MouvementsStock,
  Reconciliation,
  Stock,
} from '../../../modeles/entrees-sorties.model';
import { Produits } from '../../../modeles/produit.modele';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { finalize, forkJoin } from 'rxjs';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { ToastrService } from 'ngx-toastr';
import { MouvementsStockService } from '../../../services/mouvements-stock.service';
import { ReconciliationService } from '../../../services/reconciliation.service';
@Component({
  selector: 'app-entrees-sorties',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './entrees-sorties.component.html',
  styleUrl: './entrees-sorties.component.css',
})
export class EntreesSortiesComponent implements OnInit {
  pageSize = 5;

  // Formulaire unique pour les mouvements de stock
  mouvementForm!: FormGroup;
  mouvements: MouvementsStock[] = [];
  filteredMouvements: MouvementsStock[] = [];
  filteredEcarts: AnalyseEcart[] = [];
  searchTextMouvement = '';
  searchTextEcart = '';
  currentPageMouvement = 1;
  currentPageEcarts = 1;
  currentPageReconcialiation = 1;
  code_structure = 'MASTRUCTURET-NZNC';
  isLoading = false;
  agentId = 15;
  magasinId = 1;
  stock: Stock[] = [];

  // Ajoutez une variable pour gérer l'état du formulaire
  isEditing = false;
  currentMouvement: MouvementsStock | null = null; // Pour stocker le mouvement à éditer

  reconciliations: Reconciliation[] = [];
  searchTextReconciliation = '';
  filteredReconciliations: Reconciliation[] = [];
  analysesEcarts: AnalyseEcart[] = [];
  reconciliationForm!: FormGroup;
  isEditingReconciliation = false;
  selectedReconciliation: Reconciliation | null = null;
  historiqueSelectionne: { date: Date; ecart: number; note?: string }[] = [];

  detailsSelectionnes: { date: Date; ecart: number; corrige?: boolean }[] = [];
  produits: Produits[] = [];
  filteredProduits: Produits[] = [];
  fournisseurs: Fournisseur[] = [];
  searchInput = ''; // input de recherche pour ngModel
  searchInputBis = '';

  selectedProduct: Produits | null = null; // produit sélectionné
  idStockPoduct = 0;

  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private produitsService = inject(ProduitsService);
  private stockServcice = inject(StockInventaireService);
  // private fournisseurService = inject(FournisseursService);
  private mouvementsStockService = inject(MouvementsStockService);
  private reconciliationService = inject(ReconciliationService);
  private toastr = inject(ToastrService);

  ngOnInit() {
    this.loadMouvementStock();
    this.loadReconciliation();
    this.loadDataProdFourStock();

    this.mouvementForm = this.fb.group({
      //produitId: [null], // Utilisé après sélection
      //ref: ['', Validators.required], // Autocomplétion
      uniteStock: [{ value: '', disabled: false }, Validators.required],
      quantite: [null, [Validators.required, Validators.min(0.01)]],
      typeMouvement: ['', Validators.required],
      description: ['', Validators.required],
      prixUnitaire: [{ value: '', disabled: false }, Validators.required],
      //fournisseurId: ['', Validators.required]
    });

    this.reconciliationForm = this.fb.group({
      produitId: ['', Validators.required],
      stockTheorique: ['', Validators.required],
      stockPhysique: ['', Validators.required],
      note: [''], // Champ optionnel
    });
    // Abonnement: dès que le type de mouvement change, on recalcule le prix
    this.mouvementForm.get('typeMouvement')!.valueChanges.subscribe((type) => {
      this.updatePrixUnitaire(type);
    });
  }

  filterProduits(): void {
    const input = this.searchInput.trim().toLowerCase();
    this.filteredProduits = this.produits.filter((p) =>
      p.designation.toLowerCase().includes(input),
    );
  }

  filterProduitsReconciliation(): void {
    const input = this.searchInputBis.trim().toLowerCase();
    this.filteredProduits = this.produits.filter((p) =>
      p.designation.toLowerCase().includes(input),
    );
  }

  selectProduit(prod: Produits): void {
    this.selectedProduct = prod; // ➜ mémorisé
    this.searchInput = prod.designation;
    this.filteredProduits = [];
    const stk = this.stock.find((stoc) => stoc.produitId === this.selectedProduct?.id);
    if (stk) this.idStockPoduct = stk?.id;
    console.log(this.idStockPoduct);
    this.mouvementForm.patchValue({
      //produitId:  prod.id,
      uniteStock: prod.unite,
    });

    // Met à jour le prix selon le type déjà choisi (si l’utilisateur l’a sélectionné avant)
    this.updatePrixUnitaire(this.mouvementForm.get('typeMouvement')!.value);
    //this.mouvementForm.controls['produitId'].markAsTouched();
  }

  selectProduitReconciliation(prod: Produits): void {
    this.selectedProduct = prod; // ➜ mémorisé
    this.searchInputBis = prod.designation;
    this.filteredProduits = [];
    const stk = this.stock.find((stoc) => stoc.produitId === this.selectedProduct?.id);
    if (stk) this.idStockPoduct = stk?.id;
    console.log(this.idStockPoduct);
    this.reconciliationForm.patchValue({
      produitId: prod.id,
      stockTheorique: stk?.quantiteTotale,
    });

  }

  private updatePrixUnitaire(type: 'Entrée' | 'Sortie' | null) {
    if (!this.selectedProduct || !type) {
      this.mouvementForm.patchValue({ prixUnitaire: null });
      return;
    }

    const prix =
      type === 'Entrée'
        ? this.selectedProduct.prixAchatUnitaire
        : this.selectedProduct.prixVenteUnitaire;

    this.mouvementForm.patchValue({ prixUnitaire: prix });
  }

  loadMouvementStock(): void {
    this.isLoading = true;
    this.mouvementsStockService.getByStructure(this.code_structure).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.mouvements = data;
        this.filteredMouvements = [...this.mouvements];
        this.updateTable('mouvement');
      },
      error: (err) => {
        this.isLoading = false;
        console.log(err);
      },
    });
  }

  loadReconciliation(): void {
  this.isLoading = true;

  this.reconciliationService.getByStructure(this.code_structure).subscribe({
    next: (data) => {
      this.isLoading = false;

      // Transformer en instances de `Reconciliation`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.reconciliations = data.map((raw: any) => Reconciliation.fromRaw(raw));

      // Construire l’historique pour chaque réconciliation
      this.reconciliations.forEach((rec) => {
        rec.historiqueEcart = this.reconciliations
          .filter((r) => r.produitId === rec.produitId) // même produit
          .filter((r) => r.dateReconciliation <= rec.dateReconciliation) // jusqu’à la date courante
          .map((r) => ({
            date: r.dateReconciliation,
            ecart: r.ecart,
            note: r.note,
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime()); // tri chronologique
      });

      // Dupliquer pour la table filtrée
      this.filteredReconciliations = [...this.reconciliations];

      // Mise à jour de la table
      this.updateTable('reconciliation');
      this.chargerAnalysesEcarts();
      this.updateTable('ecart');
    },
    error: (err) => {
      this.isLoading = false;
      console.error(err);
    },
  });
}


  loadDataProdFourStock(): void {
    this.isLoading = true;
    forkJoin([
      //this.fournissseurService.getFournisseursByStructure(this.code_structure),
      this.produitsService.getAllProduits(this.code_structure),
      //this.isGeneralAdmin ? this.structureService.getAll() : of([])
      this.stockServcice.getStocksByStructure(this.code_structure),
    ])
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ([produits, stocks]) => {
          //this.fournisseurs = four
          this.stock = stocks;
          this.produits = produits;
          this.filteredProduits = [...this.produits];
        },
        error: (err) => console.error('Erreur chargement données', err),
      });
  }

  voirHistorique(reconciliation: Reconciliation) {
    this.historiqueSelectionne = reconciliation.historiqueEcart || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const historiqueModal = new (window as any).bootstrap.Modal(
      document.getElementById('historiqueModal')!,
    );
    historiqueModal.show();
  }

  voirDetails(analyse: AnalyseEcart) {
    this.detailsSelectionnes = analyse.ecartsDetail || []; // Charge les détails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailsModal = new (window as any).bootstrap.Modal(
      document.getElementById('detailsModal')!,
    );
    detailsModal.show();
  }

  // Filtrage des mouvements
  updateTable(table: string) {
    if (table === 'mouvement') {
      this.filteredMouvements = this.mouvements.slice(
        (this.currentPageMouvement - 1) * 10,
        this.currentPageMouvement * 10,
      );
    } else if (table === 'reconciliation') {
      this.filteredReconciliations = this.reconciliations.slice(
        (this.currentPageReconcialiation - 1) * 10,
        this.currentPageReconcialiation * 10,
      );
    } else if (table === 'ecart') {
      this.filteredEcarts = this.analysesEcarts.slice(
        (this.currentPageEcarts - 1) * 10,
        this.currentPageEcarts * 10,
      );
    } else {
      console.log('Pas de choix correspondant à la valeur de table');
    }
  }

  // Gestion de la recherche
  onSearchChange(): void {
    this.filteredMouvements = this.mouvements.filter(
      (mvt) =>
        mvt.ref.toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
        this.getNomProduitById(mvt.produitId, this.produits).includes(
          this.searchTextMouvement.toLowerCase(),
        ) ||
        mvt.typeMouvement.toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
        mvt.quantite?.toString().toLowerCase().includes(this.searchTextMouvement.toLowerCase()) ||
        new Date(mvt.dateMouvement)
          .toLocaleDateString()
          .toLowerCase()
          .includes(this.searchTextMouvement.toLowerCase()),
    );
    this.currentPageMouvement = 1;
  }
  onSearchChangeEcart(): void {
    this.filteredEcarts = this.analysesEcarts.filter(
      (ecart) =>
        this.getNomProduitById(ecart.produitId, this.produits)
          .toLowerCase()
          .includes(this.searchTextEcart.toLowerCase()) ||
        new Date(ecart.dernierEcart)
          .toLocaleDateString()
          .toLowerCase()
          .includes(this.searchTextEcart.toLowerCase()) ||
        ecart.nombreReconciliations
          ?.toString()
          .toLowerCase()
          .includes(this.searchTextEcart.toLowerCase()),
    );
    this.currentPageEcarts = 1;
  }
  onSearchReconciliation(): void {
    const searchText = this.searchTextReconciliation.toLowerCase();
    this.filteredReconciliations = this.reconciliations.filter(
      (reconciliation) =>
        this.getNomProduitById(reconciliation.produitId, this.produits)
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        reconciliation.stockTheorique.toString().toLowerCase().includes(searchText.toLowerCase()) ||
        reconciliation.stockPhysique.toString().toLowerCase().includes(searchText.toLowerCase()),
    );
    this.currentPageReconcialiation = 1;
  }
  get getPaginatedMouvements() {
    return this.paginate(this.filteredMouvements, this.currentPageMouvement, this.pageSize);
  }

  get getPaginatedReconciliations() {
    return this.paginate(
      this.filteredReconciliations,
      this.currentPageReconcialiation,
      this.pageSize,
    );
  }

  get getPaginatedEcarts() {
    return this.paginate(this.filteredEcarts, this.currentPageEcarts, this.pageSize);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paginate(data: any[], currentPage: number, itemsPerPage: number) {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }

  onPageChange(page: number, table: string) {
    if (table === 'mouvement') {
      this.currentPageMouvement = page;
    } else if (table === 'reconciliation') {
      this.currentPageReconcialiation = page;
    } else if (table === 'ecart') {
      this.currentPageEcarts = page;
    } else {
      console.log('Pas de choix correspondant à la valeur de table');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.pageSize);
  }

  // Suppression d'un mouvement
  supprimerMouvement(mouvement: MouvementsStock) {
    /* const index = this.mouvements.indexOf(mouvement);
  if (index > -1) {
    this.mouvements.splice(index, 1);
  }
  console.log("Mouvement supprimé", mouvement); */
    if (confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) {
      this.isLoading = true;
      const variation =
        mouvement.typeMouvement === 'Sortie'
          ? Number(mouvement.quantite)
          : -Number(mouvement.quantite);
      // D'abord, récupérer les permissions associées au rôle
      this.mouvementsStockService
        .delete(mouvement.id)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: () => {
            this.stockServcice.adjustQuantiteTotale(mouvement.stockId, variation).subscribe({
              next: () => {
                this.toastr.success('Mouvement supprimé avec succès');
                this.loadMouvementStock();
              },
              error: (err) => {
                this.toastr.error(
                  'Erreur lors de la mise à jour du stock après suppression du mouvement',
                  err,
                );
              },
            });
          },
          error: (err) => {
            //this.isLoading = false;
            this.toastr.error('Erreur lors de la suppression du mouvement', err);
          },
        });
    }
  }

  // Méthode pour charger les données d'un mouvement dans le formulaire
  modifierMouvement(mouvement: MouvementsStock) {
    // Changer le mode édition et stocker le mouvement à éditer
    this.isEditing = true;
    this.currentMouvement = mouvement;
    this.searchInput = this.getNomProduitById(mouvement.produitId, this.produits);

    // Remplir le formulaire avec les données du mouvement sélectionné
    this.mouvementForm.patchValue({
      ...mouvement,
      uniteStock: this.getUniteProduitById(mouvement.produitId, this.produits),
    });

    const modalElement = document.getElementById('mouvementModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowsPerPageChange(event: any) {
    this.pageSize = Number(event.target.value);

    this.currentPageMouvement = 1;
    this.currentPageReconcialiation = 1;
    this.currentPageEcarts = 1;

    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  enregistrerMouvement() {
    if (this.mouvementForm.invalid) {
      this.toastr.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const f = this.mouvementForm.value;
    //console.log(f.prixUnitaire);
    const variation = f.typeMouvement === 'Sortie' ? -Number(f.quantite) : Number(f.quantite);

    /** Corps JSON complet à envoyer */
    const payload = {
      ...f,
      produitId:
        this.isEditing && this.currentMouvement
          ? this.currentMouvement.produitId
          : this.selectedProduct?.id,
      uniteStock:
        this.isEditing && this.currentMouvement
          ? this.getUniteProduitById(this.currentMouvement.produitId, this.produits)
          : this.selectedProduct?.unite,
      prixUnitaire:
        this.isEditing && this.currentMouvement
          ? this.currentMouvement.prixUnitaire
          : Number(f.prixUnitaire),
      code_structure: this.code_structure,
      acteurId:
        this.isEditing && this.currentMouvement ? this.currentMouvement.acteurId : this.agentId,
      ref:
        this.isEditing && this.currentMouvement ? this.currentMouvement.ref : `MVT-${Date.now()}`,
      stockId:
        this.isEditing && this.currentMouvement
          ? this.currentMouvement.stockId
          : this.idStockPoduct,
      magasinId:
        this.isEditing && this.currentMouvement ? this.currentMouvement.magasinId : this.magasinId,
      //dateMouvement:  new Date().toISOString()
    };
    if (this.isEditing && this.currentMouvement) {
      this.mouvementsStockService.update(this.currentMouvement.id, payload).subscribe({
        next: () => {
          // Mise à jour du stock après la mise à jour du mouvement
          this.stockServcice.adjustQuantiteTotale(this.idStockPoduct, variation).subscribe({
            next: () => {
              this.toastr.success('Mouvement mis à jour avec succès');
              this.loadMouvementStock();
              this.resetForm();
            },
            error: (stockError) => {
              console.error('Erreur mise à jour stock:', stockError);
              this.toastr.error('Erreur lors de la mise à jour du stock');
            },
          });
        },
        error: (mvtError) => {
          console.error('Erreur mise à jour mouvement:', mvtError);
          this.toastr.error('Erreur lors de la mise à jour du mouvement');
        },
      });
    } else {
      this.mouvementsStockService.create(payload).subscribe({
        next: () => {
          this.stockServcice.adjustQuantiteTotale(this.idStockPoduct, variation).subscribe({
            next: () => {
              this.toastr.success('Mouvement enregistré avec succès');
              this.loadMouvementStock();
              this.resetForm();
            },
            error: (err) => {
              console.error(err);
              this.toastr.error('Erreur lors de la mise à jour du stock');
            },
          });
        },
        error: (err) => {
          console.error('Erreur création mouvement:' + err, err);
          this.toastr.error('Erreur lors de la création du mouvement');
        },
      });
    }
  }

  // Méthode pour réinitialiser le formulaire
  resetForm() {
    this.searchInput = '';
    this.selectedProduct = null;
    this.mouvementForm.reset();
    this.isEditing = false;
    this.currentMouvement = null;
    //this.closeModal('mouvement');
  }
  getNomProduitById(produitId: number, produits: Produits[]): string {
    const produit = produits.find((p) => p.id === produitId);
    return produit ? produit.designation : 'Produit introuvable';
  }

  getUniteProduitById(produitId: number, produits: Produits[]): string {
    const produit = produits.find((p) => p.id === produitId);
    return produit ? produit.unite : 'Produit introuvable';
  }


  enregistrerReconciliation() {
      if (this.reconciliationForm.invalid) return;

      // Récupération des valeurs du formulaire
      const reconciliationData = this.reconciliationForm.value;

      // Création de l’objet à envoyer en JSON
      const reconciliation = {
        ...reconciliationData, // toutes les valeurs du formulaire
        code_structure: this.code_structure,
        responsable: this.agentId,
      };

      if (this.isEditingReconciliation && this.selectedReconciliation) {
        this.reconciliationService.update(this.selectedReconciliation.id!, reconciliation).subscribe({
          next: () => {
            this.toastr.success('Réconciliation mise à jour avec succès');
            this.reconciliationForm.reset();
            this.isEditingReconciliation = false;
            this.selectedReconciliation = null;
            this.selectedProduct = null;
            this.searchInputBis = '';
            this.loadReconciliation();            
          },
          error: (err) => {
            const message = err.error?.message || 'Erreur lors de la mise à jour de la réconciliation.';
            this.toastr.error(message);
          },
        });
      } else {
        this.reconciliationService.create(reconciliation).subscribe({
          next: () => {
            this.toastr.success('Réconciliation enregistrée avec succès');
            this.reconciliationForm.reset();
            this.selectedProduct = null;
            this.searchInputBis = '';
            this.loadReconciliation();
          },
          error: (err) => {
            const message = err.error?.message || 'Erreur lors de l\'enregistrement de la réconciliation.';
            this.toastr.error(message);
          },
        });
      }
 }


  modifierReconciliation(reconciliation: Reconciliation) {
    this.isEditingReconciliation = true;
    this.selectedReconciliation = reconciliation;
    this.reconciliationForm.patchValue(reconciliation);

    const modalElement = document.getElementById('reconciliationModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  supprimerReconciliation(reconciliation: Reconciliation) {
    /* this.reconciliations = this.reconciliations.filter((r) => r.id !== reconciliation.id);
    this.chargerAnalysesEcarts(); */
     if (confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ?')) {
      this.isLoading = true;
      this.reconciliationService.delete(reconciliation.id!).subscribe({
        next: () => {
            this.isLoading = false;
            this.toastr.success("Reconciliation supprimé avec succès");
            this.loadReconciliation();
        },
        error: (err) => {
          this.isLoading = false;
          const message = err.error?.message || 'Erreur lors de la suppressionde la réconciliation.';
            this.toastr.error(message);
        }
      });
     }
  }

  chargerAnalysesEcarts() {
    const analysesMap = new Map<number, AnalyseEcart>();

    this.reconciliations.forEach((reconciliation) => {
      let existing = analysesMap.get(reconciliation.produitId);

      if (existing) {
        existing.ecartTotal += reconciliation.ecart;
        existing.nombreReconciliations = (existing.nombreReconciliations ?? 0) + 1;
        existing.ecartsDetail?.push({
          date: reconciliation.dateReconciliation,
          ecart: reconciliation.ecart,
          corrige: false, // Ajoute un statut par défaut (ajuster si nécessaire)
        });
        existing.dernierEcart = reconciliation.dateReconciliation;
      } else {
        // Créer une instance de `AnalyseEcart`
        existing = new AnalyseEcart({
          produitId: reconciliation.produitId,
          ecartTotal: reconciliation.ecart,
          dernierEcart: reconciliation.dateReconciliation,
          nombreReconciliations: 1,
          ecartsDetail: [
            {
              date: reconciliation.dateReconciliation,
              ecart: reconciliation.ecart,
              corrige: false,
            },
          ],
        });

        analysesMap.set(reconciliation.produitId, existing);
      }
    });

    this.analysesEcarts = Array.from(analysesMap.values());
  }
}
