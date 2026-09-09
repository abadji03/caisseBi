import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MouvementsStock, StatsGlobalesStock, Stock, StockDashboardItem } from '../../../modeles/entrees-sorties.model';
import { FormsModule } from '@angular/forms';
import { Magasin } from '../../../modeles/magasin.model';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { catchError, finalize, Observable, Subject, Subscription, switchMap, takeUntil, throwError } from 'rxjs';
import { TableSearchComponent } from '../../../shared/table/table-search.component';
import { TablePaginationComponent } from '../../../shared/table/table-pagination.component';
import { TableStateComponent } from '../../../shared/table/table-state.component';
import { ListState, toListState } from '../../../shared/table/list-state';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { TransfertRequest, TransfertResponse, TransfertsService } from '../../../services/transferts.service';
import { MouvementsStockService } from '../../../services/mouvements-stock.service';

@Component({
  selector: 'app-stock-inventaires',
  standalone: true,
  imports: [CommonModule, FormsModule, TableSearchComponent, TablePaginationComponent, TableStateComponent],
  templateUrl: './stock-inventaires.component.html',
  styleUrl: './stock-inventaires.component.css',
})
export class StockInventairesComponent implements OnInit, OnDestroy {

  @Input() codeStructure: string | null = null;

  // Données
  stocks: StockDashboardItem[] = [];
  statsGlobales: StatsGlobalesStock | null = null;
  magasins: Magasin[] = [];
  isLoading = false;
  isAdmin = false;
  isGerant = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  /** État d'affichage de la liste stocks — voir shared/table */
  stocksListState: ListState = 'idle';

  // Filtres
  searchText = '';
  selectedMagasin = '';
  selectedStatut = 'tous';
  showPerissable = 'tous';
  showAlerte = 'tous';
  selectedTri = 'produitDesignation_asc';

  // Options pour les filtres
  statutsOptions = [
    { valeur: 'tous', label: 'Tous les statuts' },
    { valeur: 'En stock', label: 'En stock' },
    { valeur: 'À réapprovisionner', label: 'À réapprovisionner' },
    { valeur: 'Critique', label: 'Critique' },
    { valeur: 'En rupture', label: 'En rupture' }
  ];

  optionsTri = [
    { valeur: 'produitDesignation_asc', label: 'Produit (A-Z)' },
    { valeur: 'produitDesignation_desc', label: 'Produit (Z-A)' },
    { valeur: 'quantiteDisponible_desc', label: 'Plus de stock' },
    { valeur: 'quantiteDisponible_asc', label: 'Moins de stock' },
    { valeur: 'valeurStock_desc', label: 'Valeur (plus élevée)' },
    { valeur: 'joursAvantPeremption_asc', label: 'Expiration proche' }
  ];

  private userSubscription!: Subscription;

  // Propriétés pour le transfert
  showFormIndex: number | null = null;
  magasinDestinataire: number | null = null;
  quantiteTransfert: number | null = null;
  motifTransfert = '';
  stockSelectionne: StockDashboardItem | null = null;
  agentId: number | null = null;

  // Propriétés pour les transferts
  transferts: TransfertResponse[] = [];
  transfertsFiltres: TransfertResponse[] = [];
  isLoadingTransferts = false;
  filtreStatutTransfert = 'tous';
  rechercheTransfert = '';

  // Pagination des transferts
  currentPageTransferts = 1;
  pageSizeTransferts = 10;
  totalPagesTransferts = 1;
  hasNextTransferts = false;
  hasPrevTransferts = false;

  // Référence à la modal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transfertsModal: any;

  private destroy$ = new Subject<void>();

  private stockService = inject(StockInventaireService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private magasinService = inject(MaagasinsService);
  private transfertService = inject(TransfertsService);
  private mouvementService = inject(MouvementsStockService);
  

  ngOnInit() {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.codeStructure = user?.code_structure || null;
      this.agentId = user.id || null;
      this.isAdmin = this.authService.hasRole('Administrateur') || this.authService.hasRole('Administrateur secondaire');
      this.isGerant = this.authService.hasRole('Gérant');
    });

    this.loadData();
    this.chargerMagasins();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  loadData() {
    if (!this.codeStructure) return;

    this.isLoading = true;
    this.stocksListState = 'loading';

    this.stockService.getStocksByStructureBis(
      this.codeStructure,
      this.currentPage,
      this.pageSize,
      this.searchText,
      this.selectedStatut !== 'tous' ? this.selectedStatut : '',
      this.showPerissable !== 'tous' ? this.showPerissable : '',
      this.showAlerte !== 'tous' ? this.showAlerte : '',
      this.selectedTri
    )
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    )
    .subscribe({
      next: (response) => {

        this.stocks = response.stocks;
        this.statsGlobales = response.statsGlobales;
        this.stocksListState = toListState(false, false, this.stocks);
        
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.hasNext = response.pagination.hasNext;
        this.hasPrev = response.pagination.hasPrev;
      },
      error: (err) => {
        this.stocksListState = 'error';
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadData();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.loadData();
  }

  onPageChange(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadData();
  }

  onPageSizeChange(limit: number) {
    this.pageSize = Number(limit);
    this.currentPage = 1;
    this.loadData();
  }

  resetFilters() {
    this.searchText = '';
    this.selectedMagasin = '';
    this.selectedStatut = 'tous';
    this.showPerissable = 'tous';
    this.showAlerte = 'tous';
    this.selectedTri = 'produitDesignation_asc';
    this.currentPage = 1;
    this.loadData();
  }

  getStatutBadgeClass(statut: string): string {
    const classes: Record<string, string> = {
      'Critique': 'bg-danger',
      'À réapprovisionner': 'bg-warning',
      'En stock': 'bg-success',
      'En rupture': 'bg-secondary'
    };
    return classes[statut] || 'bg-info';
  }

  getAlerteBadgeClass(niveau: string): string {
    const classes: Record<string, string> = {
      'Critique': 'bg-danger',
      'Attention': 'bg-warning',
      'Normal': 'bg-success'
    };
    return classes[niveau] || 'bg-info';
  }

  getJoursPeremptionClass(jours: number | null): string {
    if (jours === null) return '';
    if (jours < 0) return 'text-danger fw-bold';
    if (jours <= 7) return 'text-warning fw-bold';
    return 'text-success';
  }

  get pagesToShow(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, this.currentPage + 2);
      
      if (this.currentPage <= 3) end = Math.min(this.totalPages, maxVisible);
      if (this.currentPage >= this.totalPages - 2) start = Math.max(1, this.totalPages - maxVisible + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  }

  //.................Pour les transferts................................//
  /**
   * Ouvre le formulaire de transfert pour un stock spécifique
   */
  openTransferForm(index: number, stock: StockDashboardItem): void {
    this.showFormIndex = index;
    this.stockSelectionne = stock;
    this.magasinDestinataire = null;
    this.quantiteTransfert = null;
    this.motifTransfert = '';
  }

  /**
   * Annule le formulaire de transfert
   */
  cancelTransferForm(): void {
    this.showFormIndex = null;
    this.stockSelectionne = null;
    this.magasinDestinataire = null;
    this.quantiteTransfert = null;
    this.motifTransfert = '';
  }

  chargerMagasins(): void {
    this.isLoading = true;
    this.magasinService.getMagasinsByStructure(this.codeStructure!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (magasins) => {
        this.isLoading = false;
        this.magasins = magasins;
      },

      error: (err) => {
        this.isLoading = false;
        console.error('Erreur lors du chargement des magasins', err);
      },
    });
  }

  /**
   * Récupère la liste des magasins autres que celui du stock source
   */
  getAutresMagasins(magasinSourceId: number): Magasin[] {
    return this.magasins.filter(m => m.id !== magasinSourceId);
  }

validerTransfert(transfert: TransfertResponse) {
  if (!confirm(`Valider le transfert ${transfert.reference} ?`)) return;

  if(!this.isAdmin){
    this.toastr.error('Vous n\'êtes pas autorisé(e) à poursuivre cette action.');
    return;
  }
  
  this.isLoadingTransferts = true;
  
  this.transfertService.validerTransfert(transfert.id!)
  .pipe(
    takeUntil(this.destroy$),
    finalize(() => this.isLoadingTransferts = false)
  )
  .subscribe({
    next: (response) => {
      this.toastr.success(`Transfert ${transfert.reference} validé avec succès`);
      this.chargerTransferts(this.currentPageTransferts);
      this.loadData(); // Recharger les stocks
    },
    error: (err) => {
      console.error('Erreur validation:', err);
      const message = err.error?.message || err.message || 'Erreur lors de la validation';
      this.toastr.error(message);
    }
  });
}

/**
 * Gère le stock du magasin destinataire (création ou mise à jour)
 */
private gererStockDestination(
  stockSource: StockDashboardItem,
  mouvementEntree: Partial<MouvementsStock>,
  _transfert: TransfertResponse
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Observable<any> {
  
  // Vérifier si le stock destination existe déjà
  return this.transfertService.getStockByProduitAndMagasin(
    stockSource.produitId, 
    this.magasinDestinataire!
  ).pipe(
    switchMap((stockDestExistant) => {
      if (stockDestExistant) {
        
        // Mettre à jour le stock existant
        return this.stockService.adjustQuantiteTotale(
          stockDestExistant.id, 
          this.quantiteTransfert!
        ).pipe(
          switchMap((stockMisAJour) => {
            
            // Mettre à jour le mouvement d'entrée avec le bon stockId
            mouvementEntree.stockId = stockDestExistant.id;
            
            // Créer le mouvement d'entrée
            return this.mouvementService.create(mouvementEntree as MouvementsStock);
          })
        );
      } else {
        
        // Créer un nouveau stock dans le magasin destination
        const nouveauStock: Partial<Stock> = {
          produitId: stockSource.produitId,
          magasinId: this.magasinDestinataire!,
          code_structure: this.codeStructure!,
          quantiteTotale: this.quantiteTransfert!,
          quantiteReservee: 0,
          seuilAlerte: 5,
          seuilReapprovisionnement: 10,
          statutStock: 'En stock'
        };
        
        return this.stockService.createStock(nouveauStock as Stock).pipe(
          switchMap((stockCree) => {
            
            // Mettre à jour le mouvement d'entrée avec le bon stockId
            mouvementEntree.stockId = stockCree.id;
            
            // Créer le mouvement d'entrée
            return this.mouvementService.create(mouvementEntree as MouvementsStock);
          })
        );
      }
    }),
    catchError(error => {
      console.error('Erreur dans la gestion du stock destination:', error);
      
      // Si le stock n'existe pas (404), on crée un nouveau stock
      if (error.status === 404) {
        
        const nouveauStock: Partial<Stock> = {
          produitId: stockSource.produitId,
          magasinId: this.magasinDestinataire!,
          code_structure: this.codeStructure!,
          quantiteTotale: this.quantiteTransfert!,
          quantiteReservee: 0,
          seuilAlerte: 5,
          seuilReapprovisionnement: 10,
          statutStock: 'En stock'
        };
        
        return this.stockService.createStock(nouveauStock as Stock).pipe(
          switchMap((stockCree) => {
            mouvementEntree.stockId = stockCree.id;
            return this.mouvementService.create(mouvementEntree as MouvementsStock);
          })
        );
      }
      
      return throwError(() => error);
    })
  );
}

  /**
   * Récupère le nom d'un magasin par son ID
   */
  getNomMagasin(magasinId: number): string {
    const magasin = this.magasins.find(m => m.id === magasinId);
    return magasin ? magasin.nom : 'Magasin inconnu';
  }


  // Créer une demande de transfert
creerDemandeTransfert(stock: StockDashboardItem) {
  if (!this.magasinDestinataire || !this.quantiteTransfert) return;

  if (this.quantiteTransfert > stock.quantiteDisponible) {
      this.toastr.error('Quantité insuffisante dans le stock disponible');
      return;
    }

    if (!this.agentId) {
      this.toastr.error('Agent non identifié');
      return;
    }
  
  const transfertData : TransfertRequest = {
    produitId: stock.produitId,
    quantite: this.quantiteTransfert,
    magasinSource: stock.magasinId,
    magasinDestination: this.magasinDestinataire,
    motif: this.motifTransfert || 'Transfert entre magasins',
    agentResponsable: this.agentId!,
    //code_structure: this.codeStructure!
  };
  
  this.isLoading = true;
  this.transfertService.createTransfert(transfertData)
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    )
    .subscribe({
      next: (transfert) => {
        this.toastr.success('Demande de transfert créée avec succès');
        this.cancelTransferForm();
        
        // Recharger les transferts si la modal est ouverte
        if (this.transfertsModal && this.transfertsModal._isShown) {
          this.chargerTransferts();
        }
      },
      error: (err) => {
        console.error('Erreur création transfert:', err);
        this.toastr.error(err.error?.message || 'Erreur lors de la création du transfert');
      }
    });
}

  // Méthode pour ouvrir la modal et charger les transferts
  openTransfertsModal() {
    this.chargerTransferts();
    /* if (this.transfertsModal) {
      this.transfertsModal.show();
    } */
   const modalElement = document.getElementById('transfertsModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Charger les transferts
// Dans le composant, remplacer chargerTransferts()

chargerTransferts(page = 1) {
  if (!this.codeStructure) return;
  
  this.isLoadingTransferts = true;
  
  this.transfertService.getByStructure(
    this.codeStructure,
    page,
    this.pageSizeTransferts,
    this.rechercheTransfert,
    this.filtreStatutTransfert,
   
  )
  .pipe(
    takeUntil(this.destroy$),
    finalize(() => this.isLoadingTransferts = false)
  )
  .subscribe({
    next: (response) => {
      this.transferts = response.transferts;
      this.totalPagesTransferts = response.pagination.total;
      this.totalPagesTransferts = response.pagination.totalPages;
      this.currentPageTransferts = response.pagination.page;
      this.hasNextTransferts = response.pagination.hasNext;
      this.hasPrevTransferts = response.pagination.hasPrev;
      
      // Mettre à jour la liste filtrée (si on veut garder la logique existante)
      this.transfertsFiltres = this.transferts;
    },
    error: (err) => {
      console.error('Erreur chargement transferts:', err);
    }
  });
}

// Méthode pour gérer le changement de page
pageTransfertsChange(page: number) {
  if (page < 1 || page > this.totalPagesTransferts) return;
  this.currentPageTransferts = page;
  this.chargerTransferts(page);
}

// Méthode pour appliquer les filtres
appliquerFiltresTransferts() {
  this.currentPageTransferts = 1;
  this.chargerTransferts(1);
}

// Remplacer filtrerTransferts() par cette méthode
filtrerTransferts() {
  this.currentPageTransferts = 1;
  this.chargerTransferts(1);
}
/* // Filtrer les transferts
filtrerTransferts() {
  let resultats = this.transferts;
  
  // Filtre par statut
  if (this.filtreStatutTransfert !== 'tous') {
    resultats = resultats.filter(t => t.statut === this.filtreStatutTransfert);
  }
  
  // Filtre par recherche
  if (this.rechercheTransfert) {
    const search = this.rechercheTransfert.toLowerCase();
    resultats = resultats.filter(t => 
      t.reference.toLowerCase().includes(search)// ||
      //this.getNomProduitById(t.produitId)?.toLowerCase().includes(search)
    );
  }
  
  // Pagination
  const debut = (this.currentPageTransferts - 1) * this.pageSizeTransferts;
  this.totalPagesTransferts = Math.ceil(resultats.length / this.pageSizeTransferts);
  this.transfertsFiltres = resultats.slice(debut, debut + this.pageSizeTransferts);
}
 */
  // Refuser un transfert
  refuserTransfert(transfert: TransfertResponse) {
    if (!confirm(`Refuser le transfert ${transfert.reference} ?`)) return;

    if(!this.isAdmin){
      this.toastr.error('Vous n\'êtes pas autorisé(e) à poursuivre cette action.');
      return;
    }
    
    this.isLoadingTransferts = true;
    
    // Appel API pour refuser (à implémenter dans le backend)
    this.transfertService.refuserTransfert(transfert.id!)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingTransferts = false)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Transfert refusé');
          this.chargerTransferts();
        },
        error: (err) => {
          console.error('Erreur refus:', err);
          this.toastr.error('Erreur lors du refus');
        }
      }); 
  }

  // Pagination des transferts
 /*  pageTransfertsChange(page: number) {
    this.currentPageTransferts = page;
    this.filtrerTransferts();
  } */

  get pagesTransferts(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPageTransferts - 2);
    const end = Math.min(this.totalPagesTransferts, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Méthodes utilitaires
  getNomMagasinById(magasinId: number): string {
    const magasin = this.magasins.find(m => m.id === magasinId);
    return magasin ? magasin.nom : 'Magasin inconnu';
  }

  getAgentNomById(agentId: number): string {
    // À implémenter selon votre gestion des utilisateurs
    return `Agent ${agentId}`;
  }

}
