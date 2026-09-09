import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { User } from '@sentry/angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { Bon, BonAvecFichier } from '../../../modeles/bon.model';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { Magasin } from '../../../modeles/magasin.model';
import { Operation } from '../../../modeles/operation.model';
import { Paiement, PaiementAvecFichier } from '../../../modeles/paiement.model';
import { Panier } from '../../../modeles/panier.model';
import { Produits } from '../../../modeles/produit.modele';
import { ApplicationService } from '../../../services/application.service';
import { AuthService } from '../../../services/auth.service';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { BonsFilter, BonsService } from '../../../services/bons.service';
import { DepencesService } from '../../../services/depences.service';
import { FournisseursFilter, FournisseursService } from '../../../services/fournisseurs.service';
import { TableSearchComponent } from '../../../shared/table/table-search.component';
import { TablePaginationComponent } from '../../../shared/table/table-pagination.component';
import { TableStateComponent } from '../../../shared/table/table-state.component';
import { ListState, toListState } from '../../../shared/table/list-state';
import { MaagasinsService } from '../../../services/maagasins.service';
import { OperationsService } from '../../../services/operations.service';
import { PaiementsFilter, PaiementsService } from '../../../services/paiements.service';
import { PaniersService } from '../../../services/paniers.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { ProduitsService } from '../../../services/produits.service';
import { StructureService } from '../../../services/structure.service';
import { ListeBonsComponent } from '../../../sharedComposants/liste-bons/liste-bons.component';
import { ListeOperationsComponent } from '../../../sharedComposants/liste-operations/liste-operations.component';
import { ListeVersementsComponent } from '../../../sharedComposants/liste-versements/liste-versements.component';
import { PaiementComponent } from '../../../sharedComposants/paiement/paiement.component';

import { v4 as uuidv4 } from 'uuid';
import { BonComponent } from '../../../sharedComposants/bon/bon.component';
import { CategoriesDepencesRecettesService } from '../../../services/categories-depences-recettes.service';
import { FactureService } from '../../../services/facture.service';
import { FactureComponent } from '../../vente/facture/facture.component';

@Component({
  selector: 'app-fournisseur',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    PaiementComponent, 
    BonComponent,
    ListeBonsComponent,
    ListeVersementsComponent,
    ListeOperationsComponent,
    FactureComponent,
    TableSearchComponent,
    TablePaginationComponent,
    TableStateComponent
  ],
  templateUrl: './fournisseur.component.html',
  styleUrl: './fournisseur.component.css'
})
export class FournisseurComponent implements OnInit, OnDestroy {

  /** État d'affichage de la liste fournisseurs — voir shared/table */
  fournisseursListState: ListState = 'idle';

  // Référence au composant Bon

  // État général
  isLoadingFournisseur = false;
  isLoadingStructure = false;
  isLoadingBon = false;
  isLoadingMagasin = false;
  isLoadingPaiement = false;
  isLoadingOperation = false;

  errorMessage = '';
  code_structure: string | null = null;
  magasinId: number | null = null;
  agentId: number | null = null;
  currentUser: User | null = null;
  typeEntite: 'client' | 'fournisseur' | 'autre' = 'fournisseur';

  // Données
  fournisseurs: Fournisseur[] = [];
  //archivedFournisseurs: Fournisseur[] = [];
  produits: Produits[] = [];
  filteredProducts: Produits[] = [];
  magasins: Magasin[] = [];
  
  // Sélection
  selectedFournisseur: Fournisseur | null = null;
  isRowSelected = false;
  showDetails = false;
  showBonDetailsSection = false;

  selectedMagasinId: number | null = null;
  magasinSoldes = new Map<number, number>();

  //Est admin
  isAdmin = false;

  // Formulaire
  fournisseurForm!: FormGroup;
  
  // Modal
  showModal = false;
  isEditMode = false;

  // Pagination et filtres pour les bons
  bonsCurrentPage = 1;
  bonsItemsPerPage = 10;
  bonsTotalItems = 0;
  bonsTotalPages = 0;
  bonsHasNext = false;
  bonsHasPrev = false;
  
  // Filtres pour les bons
  bonsFilters: BonsFilter = {
    page: 1,
    limit: 10,
    search: '',
    type: 'tous',
    statut: 'tous'
  };

  // Options pour les filtres
  bonTypeOptions = ['tous', 'commande', 'livraison', 'retour'];
  bonStatutOptions = ['tous', 'brouillon', 'validé', 'livré', 'facturé', 'annulé', 'retourné'];

  private bonsSearchSubject = new Subject<string>();

  
  // Pagination et filtres pour les versements
  paiementsCurrentPage = 1;
  paiementsItemsPerPage = 10;
  paiementsTotalItems = 0;
  paiementsTotalPages = 0;
  paiementsHasNext = false;
  paiementsHasPrev = false;
  
  // Filtres pour les versements
  paiementsFilters: PaiementsFilter = {
    page: 1,
    limit: 10,
    search: '',
    methodePaiement: 'tous',
    // dateDebut: '',
    // dateFin: ''
  };

  // Options pour les filtres
  methodePaiementOptions = ['tous', 'Espèce', 'Carte', 'Virement', 'Wave', 'Orange Money', 'Chèque', 'Autre'];

  private paiementsSearchSubject = new Subject<string>();

  // Pagination et filtres pour les fournisseurs
  fournisseursCurrentPage = 1;
  fournisseursItemsPerPage = 10;
  fournisseursTotalItems = 0;
  fournisseursTotalPages = 0;
  fournisseursHasNext = false;
  fournisseursHasPrev = false;
  
  // Filtres pour les fournisseurs
  fournisseursFilters: FournisseursFilter = {
    page: 1,
    limit: 10,
    search: '',
    statut: 'tous'
  };

  // Options pour les filtres
  fournisseurStatutOptions = ['tous', 'actif', 'inactif'];

  private fournisseursSearchSubject = new Subject<string>();


  // Gestion des formulaires de bon/paiement
  showBonForm = false;
  showPaiementForm = false;
  textBoutonNewBon = 'Nouveau bon';
  generatedNumero!: string;
  generatedNumeroPaiement!: string;
  
  // Brouillons
  bonBrouillon: Bon | null = null;
  panierBrouillon: Panier | null = null;
  resetPanierFlag = false;

  // Données pour les listes enfants
  bons: Bon[] = [];
  paiements: Paiement[] = [];
  operations: Operation[] = [];
  filteredOperations: Operation[] = [];

  // Dates pour le filtrage
  startDate?: string;
  endDate?: string;

  // Gestion des désabonnements
  private destroy$ = new Subject<void>();

  private categorieCache = new Map<string, number>();

  // Services injectés
  private fb = inject(FormBuilder);
  private paginationService = inject(ApplicationService);
  private cdr = inject(ChangeDetectorRef);
  private magasinService = inject(MaagasinsService);
  private fournisseurService = inject(FournisseursService);
  private toastr = inject(ToastrService);
  private produitsServices = inject(ProduitsService);
  private bonService = inject(BonsService);
  private panierService = inject(PaniersService);
  private operationService = inject(OperationsService);
  private paiementService = inject(PaiementsService);
  private authService = inject(AuthService);
  private bonBrouillonService = inject(BonBrouillonService);
  private pdfGenerator = inject(PdfMakerServiceService);
  private structureService = inject(StructureService);
  private depensesService = inject(DepencesService);
  private categoriesService = inject(CategoriesDepencesRecettesService);
  private factureService = inject(FactureService);

  Math = Math;

  ngOnInit(): void {
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
      this.isAdmin = this.authService.hasRole('Administrateur') || this.authService.hasRole('Administrateur secondaire');
      
      if (!this.isAdmin && this.magasinId) {
        this.selectedMagasinId = this.magasinId;
      }
      if (this.code_structure) {
        this.loadData();
        this.loadDataProduits();
        this.loadBonsAvecPagination();
        this.loadPaiementsAvecPagination();
        this.loadStructureInfo();
      }
    });

    this.initForm();
    
    // S'abonner aux brouillons
    this.bonBrouillonService.bonBrouillon$.pipe(takeUntil(this.destroy$))
      .subscribe(bon => this.bonBrouillon = bon);
    this.bonBrouillonService.panierBrouillon$.pipe(takeUntil(this.destroy$))
      .subscribe(panier => this.panierBrouillon = panier);

    // Debounce pour la recherche des bons
    this.bonsSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.bonsFilters.search = searchTerm;
      this.bonsFilters.page = 1;
      this.loadBonsAvecPagination();
    });

    this.paiementsSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.paiementsFilters.search = searchTerm;
      this.paiementsFilters.page = 1;
      this.loadPaiementsAvecPagination();
    });

    // Debounce pour la recherche des fournisseurs
    this.fournisseursSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.fournisseursFilters.search = searchTerm;
      this.fournisseursFilters.page = 1;
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialisation du formulaire
  initForm(): void {
    this.fournisseurForm = this.fb.group({
      nomComplet: ['', Validators.required],
      code_structure: [this.code_structure],
      adresse: ['', Validators.required],
      telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
      email: ['', [Validators.required, Validators.email]],
      banque: [''],
      numeroCompte: [''],
      statut: [true],
      montantAPayer: [0],
      termePaiement: [''],
      termeLivraison: [''],
      pays: [''],
      ville: [''],
      //magasinId: [this.magasinId, Validators.required],
      magasinIds: [[], Validators.required] // Changé: sélection multiple
    });
  }

  // Charger les paiements avec pagination
  loadPaiementsAvecPagination(): void {
    if (!this.code_structure) return;

    const filters: PaiementsFilter = {
      page: this.paiementsFilters.page,
      limit: this.paiementsItemsPerPage,
      search: this.paiementsFilters.search || undefined,
      methodePaiement: this.paiementsFilters.methodePaiement !== 'tous' ? this.paiementsFilters.methodePaiement : undefined,
      //dateDebut: this.paiementsFilters.dateDebut || undefined,
      //dateFin: this.paiementsFilters.dateFin || undefined
    };


    this.isLoadingPaiement = true;
    this.paiementService.getPaiementsFournisseurs(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingPaiement = false))
      .subscribe({
        next: (response: import('../../../services/paiements.service').PaiementsResponse) => {
        this.paiements = response.items || [];
        this.paiementsTotalItems = response.pagination?.total || 0;
        this.paiementsCurrentPage = response.pagination?.page || 1;
        this.paiementsTotalPages = response.pagination?.totalPages || 0;
        this.paiementsHasNext = response.pagination?.hasNext || false;
        this.paiementsHasPrev = response.pagination?.hasPrev || false;
        },
        error: (err: unknown) => {
          console.error('Erreur chargement paiements:', err);
        }
      });
  }

  // Gestionnaires d'événements pour ListeVersements
  onPaiementsPageChange(page: number): void {
    if (page >= 1 && page <= this.paiementsTotalPages) {
      this.paiementsFilters.page = page;
      this.loadPaiementsAvecPagination();
    }
  }

  onPaiementsSearchChange(searchTerm: string): void {
    this.paiementsSearchSubject.next(searchTerm);
  }

  onPaiementsRowsPerPageChange(limit: number): void {
    this.paiementsItemsPerPage = limit;
    this.paiementsFilters.limit = limit;
    this.paiementsFilters.page = 1;
    this.loadPaiementsAvecPagination();
  }

  onPaiementsMethodeChange(methode: string): void {
    this.paiementsFilters.methodePaiement = methode;
    this.paiementsFilters.page = 1;
    this.loadPaiementsAvecPagination();
  }

 /*  onPaiementsDateChange(dates: {dateDebut?: string, dateFin?: string}): void {
    this.paiementsFilters.dateDebut = dates.dateDebut;
    this.paiementsFilters.dateFin = dates.dateFin;
    this.paiementsFilters.page = 1;
    this.loadPaiementsAvecPagination();
  } */

  resetPaiementsFilters(): void {
    this.paiementsFilters = {
      page: 1,
      limit: this.paiementsItemsPerPage,
      search: '',
      methodePaiement: 'tous',
      // dateDebut: '',
      // dateFin: ''
    };
    this.loadPaiementsAvecPagination();
  }
  // Getter pour accéder facilement aux contrôles du formulaire
  get f() {
    return this.fournisseurForm.controls;
  }

  //Charger les magasins de la structure
  loadMagasins(): void {
    this.isLoadingMagasin = true;
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(
        takeUntil(this.destroy$),
        finalize( () => this.isLoadingMagasin = false)
      )
      .subscribe({
        next: (magasins) => {
          this.magasins = magasins;
        },
        error: err => console.error('Erreur chargement magasins', err)
      });
}

  // Charger les bons avec pagination
  loadBonsAvecPagination(): void {
    if (!this.code_structure) return;

    const filters: BonsFilter = {
      page: this.bonsFilters.page,
      limit: this.bonsItemsPerPage,
      search: this.bonsFilters.search || undefined,
      type: this.bonsFilters.type !== 'tous' ? this.bonsFilters.type : undefined,
      statut: this.bonsFilters.statut !== 'tous' ? this.bonsFilters.statut : undefined
    };

    this.isLoadingBon = true;
    this.bonService.getBonsFournisseursByStructureBis(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingBon = false))
      .subscribe({
        next: (response) => {
          this.bons = response.items;
          
          // Mise à jour de la pagination
          this.bonsTotalItems = response.pagination.total;
          this.bonsCurrentPage = response.pagination.page;
          this.bonsTotalPages = response.pagination.totalPages;
          this.bonsHasNext = response.pagination.hasNext;
          this.bonsHasPrev = response.pagination.hasPrev;
        },
        error: (err) => {
          console.error('Erreur chargement bons:', err);
        }
      });
  }

  // Gestionnaires d'événements pour ListeBons
  onBonsPageChange(page: number): void {
    if (page >= 1 && page <= this.bonsTotalPages) {
      this.bonsFilters.page = page;
      this.loadBonsAvecPagination();
    }
  }

  onBonsSearchChange(searchTerm: string): void {
    this.bonsSearchSubject.next(searchTerm);
  }

  onBonsRowsPerPageChange(limit: number): void {
    this.bonsItemsPerPage = limit;
    this.bonsFilters.limit = limit;
    this.bonsFilters.page = 1;
    this.loadBonsAvecPagination();
  }

  onBonsTypeChange(type: string): void {
    this.bonsFilters.type = type;
    this.bonsFilters.page = 1;
    this.loadBonsAvecPagination();
  }

  onBonsStatutChange(statut: string): void {
    this.bonsFilters.statut = statut;
    this.bonsFilters.page = 1;
    this.loadBonsAvecPagination();
  }

  resetBonsFilters(): void {
    this.bonsFilters = {
      page: 1,
      limit: this.bonsItemsPerPage,
      search: '',
      type: 'tous',
      statut: 'tous'
    };
    this.loadBonsAvecPagination();
  }

  loadData(): void {
    if (!this.code_structure) return;

    const filters: FournisseursFilter = {
      page: this.fournisseursFilters.page,
      limit: this.fournisseursItemsPerPage,
      search: this.fournisseursFilters.search || undefined,
      statut: this.fournisseursFilters.statut
    };

    this.isLoadingFournisseur = true;
    this.fournisseursListState = 'loading';
    this.fournisseurService.getFournisseursByStructureBis(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingFournisseur = false))
      .subscribe({
        next: (response) => {
          this.fournisseurs = response.items; //.filter(f => f.statut === true); 
          
          // Charger les magasins pour chaque fournisseur
        this.fournisseurs.forEach(fournisseur => {
          if (fournisseur.Magasins && fournisseur.Magasins.length > 0) {
            // Initialiser les soldes par magasin
            fournisseur.Magasins.forEach(magasin => {
              if (magasin.MagasinFournisseur) {
                this.magasinSoldes.set(
                  magasin.id!, 
                  magasin.MagasinFournisseur.solde
                );
              }
            });
          }
        });
          
          // Mise à jour de la pagination
          this.fournisseursTotalItems = response.pagination.total;
          this.fournisseursCurrentPage = response.pagination.page;
          this.fournisseursTotalPages = response.pagination.totalPages;
          this.fournisseursHasNext = response.pagination.hasNext;
          this.fournisseursHasPrev = response.pagination.hasPrev;
          this.fournisseursListState = toListState(false, false, this.fournisseurs);

          this.loadMagasins();
        },
        error: err => {
          this.fournisseursListState = 'error';
        }
      });
  }

  // Gestionnaires pour les fournisseurs
  onFournisseursPageChange(page: number): void {
    if (page >= 1 && page <= this.fournisseursTotalPages) {
      this.fournisseursFilters.page = page;
      this.loadData();
    }
  }

  onFournisseursSearchChange(searchTerm: string): void {
    this.fournisseursSearchSubject.next(searchTerm);
  }

  onFournisseursRowsPerPageChange(limit: number): void {
    this.fournisseursItemsPerPage = limit;
    this.fournisseursFilters.limit = limit;
    this.fournisseursFilters.page = 1;
    this.loadData();
  }

  onFournisseursStatutChange(statut: string): void {
    this.fournisseursFilters.statut = statut;
    this.fournisseursFilters.page = 1;
    this.loadData();
  }

  resetFournisseursFilters(): void {
    this.fournisseursFilters = {
      page: 1,
      limit: this.fournisseursItemsPerPage,
      search: '',
      statut: 'tous'
    };
    this.loadData();
  }


  loadDataProduits(): void {
    this.produitsServices.getProduitsDisponibles(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (produits) => {
          this.produits = produits;
          this.filteredProducts = this.produits;
        },
        error: err => console.error('Erreur chargement produits', err)
      });
  }

 
  loadOperations(): void {
    if (!this.selectedFournisseur) return;
    this.isLoadingOperation = true;
    
    this.operationService.getOperationsByFournisseur(
      this.code_structure!, 
      this.selectedFournisseur.id!, 
      { dateDebut: this.startDate, dateFin: this.endDate }
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ops) => {
          this.operations = ops;
          this.filteredOperations = [...this.operations];
          this.isLoadingOperation = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des opérations.';
          console.error(err);
          this.isLoadingOperation = false;
          this.cdr.detectChanges();
        }
      });
  }

  private loadStructureInfo(): void {
    this.structureService.getByCodeStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (structure) => this.pdfGenerator.setStructureInfo(structure),
        error: (err) => console.error('Erreur chargement structure:', err)
      });
  }

  // Gestion de la sélection
  onRowSelect(fournisseur: Fournisseur): void {
    this.selectedFournisseur = fournisseur;
    this.isRowSelected = true;
  }

  closeActions(): void {
    this.selectedFournisseur = null;
    this.isRowSelected = false;
  }

  // Gestion des actions
  onAction(action: string): void {
    if (this.selectedFournisseur) {
      if (action === 'operation') {
        this.checkBrouillonExists((exists) => {
          this.textBoutonNewBon = exists ? 'Modifier le bon brouillon' : 'Nouveau bon';
        });
        this.showBonDetails();
      } else if (action === 'modifier') {
        this.openModal(this.selectedFournisseur);
      } 
      /* else if (action === 'supprimer') {
        this.deleteFournisseur(this.selectedFournisseur.id!);
      }  */
      else if (action === 'statut') {
        this.toggleStatut(this.selectedFournisseur);
      }
    } else {
      this.openModal();
    }
  }

  // Affichage des détails
  showBonDetails(): void {
    this.showDetails = true;
    this.showBonDetailsSection = true;

    if (!this.selectedFournisseur) return;

    // 🔥 Initialiser le magasin sélectionné
  if (!this.isAdmin && this.magasinId) {
    this.selectedMagasinId = this.magasinId;
  } else {
    this.selectedMagasinId = null;
  }
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    
    this.loadOperations();
  }

  closeDetails(): void {
    this.showDetails = false;
    this.showBonDetailsSection = false;
    if (this.showBonForm) this.showBonForm = false;
    if (this.showPaiementForm) this.showPaiementForm = false;
  }

  // Gestion du modal
  openModal(fournisseur?: Fournisseur): void {
    if (fournisseur) {
      this.isEditMode = true;
      //this.fournisseurForm.patchValue(fournisseur);
      this.fournisseurForm.patchValue({
      ...fournisseur,
      magasinIds: fournisseur.Magasins?.map(m => m.id) || []
    });
    } else {
      this.isEditMode = false;
      this.fournisseurForm.reset({
        code_structure: this.code_structure,
        statut: true,
        montantAPayer: 0,
        //magasinId: this.magasinId
        magasinIds: this.magasinId ? [this.magasinId] : []
      });
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  onModalSubmit(): void {
    if (this.fournisseurForm.invalid) {
      this.fournisseurForm.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
      return;
    }

    if (this.isEditMode && this.selectedFournisseur) {
      this.updateFournisseur(this.selectedFournisseur.id!, this.fournisseurForm.value);
    } else {
      this.createFournisseur(this.fournisseurForm.value);
    }
  }

  // CRUD Fournisseurs
  createFournisseur(fournisseurData: Partial<Fournisseur>): void {
    const magasinIds = this.fournisseurForm.get('magasinIds')?.value;

    this.isLoadingFournisseur = true;
    this.fournisseurService.createFournisseur(fournisseurData as Fournisseur, magasinIds)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingFournisseur = false))
      .subscribe({
        next: () => {
          this.toastr.success('Fournisseur créé avec succès');
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  updateFournisseur(id: number, updateData: Partial<Fournisseur>): void {
    const magasinIds = this.fournisseurForm.get('magasinIds')?.value;

    this.isLoadingFournisseur = true;
    this.fournisseurService.updateFournisseur(id, updateData, magasinIds)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingFournisseur = false))
      .subscribe({
        next: () => {
          this.toastr.success('Fournisseur mis à jour avec succès');
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  // Nouvelle méthode pour afficher le solde par magasin
  getSoldeParMagasin(fournisseur: Fournisseur, magasinId: number): number {
    const magasin = fournisseur.Magasins?.find(m => m.id === magasinId);
    return magasin?.MagasinFournisseur?.solde || 0;
  }

  // Calculer le solde total (somme des soldes de tous les magasins)
  getSoldeTotal(fournisseur: Fournisseur): number {
    if (!fournisseur.Magasins) return 0;
    return fournisseur.Magasins.reduce((total, magasin) => {
      return total + (this.safeNumber(magasin.MagasinFournisseur?.solde) || 0);
    }, 0);
  }

  // Obtenir le solde actuel en fonction du magasin sélectionné
  getSoldeActuel(): number {
    if (!this.selectedFournisseur) return 0;
    
    // Pour les non-admins, utiliser automatiquement leur magasin
    const magasinIdAAfficher = this.selectedMagasinId ?? this.magasinId;
    
    if (magasinIdAAfficher) {
      const magasin = this.selectedFournisseur.Magasins?.find(m => m.id === magasinIdAAfficher);
      return magasin?.MagasinFournisseur?.solde || 0;
    }
    
    return this.getSoldeTotal(this.selectedFournisseur);
  }

  // Obtenir le nom du magasin sélectionné
 getNomMagasinSelectionne(): string {
    const magasinIdAAfficher = this.selectedMagasinId ?? this.magasinId;
    
    if (!magasinIdAAfficher || !this.selectedFournisseur?.Magasins) return 'tous les magasins';
    
    const magasin = this.selectedFournisseur.Magasins.find(m => m.id === magasinIdAAfficher);
    return magasin?.nom || 'ce magasin';
  }

  // Gérer le changement de magasin
  onMagasinChange(magasinId: number | null): void {
  // Si l'utilisateur n'est pas admin, ne pas permettre le changement
  if (!this.isAdmin) {
    return;
  }
  this.selectedMagasinId = magasinId;
  this.loadOperations();
}

private mettreAJourSoldeFournisseurDansMap(fournisseur: Fournisseur): void {
  if (fournisseur.Magasins && fournisseur.Magasins.length > 0) {
    fournisseur.Magasins.forEach(magasin => {
      if (magasin.MagasinFournisseur) {
        this.magasinSoldes.set(magasin.id!, magasin.MagasinFournisseur.solde);
      }
    });
  }
}

  deleteFournisseur(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    
    this.isLoadingFournisseur = true;
    this.fournisseurService.deleteFournisseur(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingFournisseur = false))
      .subscribe({
        next: () => {
          this.toastr.success('Fournisseur supprimé avec succès');
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la suppression';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  toggleStatut(fournisseur: Fournisseur): void {
    const action = fournisseur.statut ? 'désactiver' : 'activer';
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ce fournisseur ?`)) {
      return;
    }
    fournisseur.statut = !fournisseur.statut;
    this.updateStatus(fournisseur.id!, fournisseur.statut);
  }

  updateStatus(id: number, newStatus: boolean): void {
    this.isLoadingFournisseur = true;
    this.fournisseurService.updateFournisseurStatus(id, newStatus)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingFournisseur = false))
      .subscribe({
        next: () => {
          this.toastr.success('Statut mis à jour avec succès');
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du statut';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  // Gestion des brouillons
  checkBrouillonExists(callback: (exists: boolean) => void): void {
    this.bonService.getBonsBrouillons(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bonsBrouillons) => {
          const exists = bonsBrouillons.some(bon => bon.fournisseurId === this.selectedFournisseur?.id);
          callback(exists);
        },
        error: (err) => {
          console.error('Erreur chargement brouillons:', err);
          callback(false);
        }
      });
  }

  toggleBonForm(): void {
    this.generatedNumero = this.generateNumeroBon();
    this.showBonForm = !this.showBonForm;
    this.showPaiementForm = false;
    
    if (this.showBonForm) {
      this.chargerBrouillonsExistants();
    } else {
      this.reinitialiserEtMasquerFormulaires();
    }
  }

  togglePaiementForm(): void {
    this.generatedNumeroPaiement = this.generateNumero();
    this.showBonForm = false;
    this.showPaiementForm = !this.showPaiementForm;
  }

  private chargerBrouillonsExistants(): void {
    if (!this.selectedFournisseur) return;

    this.bonService.getBonsBrouillons(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bonsBrouillons) => {
          const brouillon = bonsBrouillons.find(bon => bon.fournisseurId === this.selectedFournisseur?.id);
          if (brouillon) {
            this.bonBrouillonService.setBonBrouillon(brouillon);
            this.bonBrouillon = brouillon;
            this.panierService.getPanierByBonId(brouillon.id!)
              .pipe(takeUntil(this.destroy$))
              .subscribe(panier => {
                this.bonBrouillonService.setPanierBrouillon(panier);
                this.panierBrouillon = panier;
                this.toastr.info('Brouillon existant chargé');
              });
          } else {
            this.creerNouveauBrouillon();
          }
        },
        error: (err) => {
          console.error('Erreur chargement brouillons:', err);
          this.creerNouveauBrouillon();
        }
      });
  }

  private creerNouveauBrouillon(): void {
    if (!this.selectedFournisseur) return;
    // Garde : magasin requis pour la validation des bons (sinon 400 côté backend)
    if (!this.magasinId) {
      console.warn('creerNouveauBrouillon: magasinId indisponible, création différée');
      return;
    }

    const bonBrouillonData = {
      bon: {
        type: 'Commande',
        numero: this.generatedNumero,
        description: '',
        montantTotal: 0,
        statutBon: 'brouillon',
        dateBon: new Date(),
        fournisseurId: this.selectedFournisseur.id,
        code_structure: this.code_structure,
        agentId: this.agentId,
        magasinId: this.magasinId
      },
      panier: {
        articles: [],
        totalHT: 0,
        tva: 0,
        totalTTC: 0,
        tauxTVA: 0,
        statut: 'en_cours',
        typeEntite: this.typeEntite,
        code_structure: this.code_structure,
        agentId: this.agentId,
        magasinId: this.magasinId
      },
      articles: [],
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      fournisseurId: this.selectedFournisseur.id,
      typeEntite: this.typeEntite
    };

    this.bonService.createBonComplet(bonBrouillonData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.bonBrouillon = result.bon;
          this.panierBrouillon = result.panier;
          this.bonBrouillonService.setBonBrouillon(result.bon);
          this.bonBrouillonService.setPanierBrouillon(result.panier);
          this.toastr.info('Nouveau bon brouillon créé');
        },
        error: (err) => {
          console.error('Erreur création brouillon:', err);
          this.toastr.error('Erreur lors de la création du brouillon');
        }
      });
  }

  private reinitialiserEtMasquerFormulaires(): void {
    this.showBonForm = false;
    this.textBoutonNewBon = 'Nouveau bon';
    
    /* if (this.bonComponent) {
      this.bonComponent.reinitialiserFormulaire();
    } */
    
    this.resetPanierFlag = true;
    this.cdr.detectChanges();
    this.resetPanierFlag = false;
  }

  // Génération de numéros
  generateNumero(): string {
    return `NP-${uuidv4()}`;
  }

  generateNumeroBon(): string {
    return `BON-${uuidv4()}`;
  }

  // Gestion des événements des composants enfants
  onBonEnregistre(event: BonAvecFichier): void {

    if(!confirm('Confirmer la transaction ?')) return;

    if (!this.selectedFournisseur || !this.bonBrouillon || !this.panierBrouillon) {
      this.toastr.error('Données manquantes pour l\'enregistrement');
      return;
    }

    if (event.bon.avance && (this.safeNumber(event.bon.netAPayer || event.bon.montantTotal) - this.safeNumber(event.bon.avance)) < 0) {
      this.toastr.error('Le montant de l\'avance dépasse le montant à payer au fournisseur');
      return;
    }

    event.bon.fournisseurId = this.selectedFournisseur.id;
    event.bon.statutBon = 'validé';
    event.bon.id = this.bonBrouillon.id;

    this.enregistrerBon(event.bon, event.bon.panier!, event.fichier);
    this.showBonForm = false;
    this.bonBrouillonService.clearBrouillons();
  }

  onBonAnnule(): void {
    this.reinitialiserEtMasquerFormulaires();
  }

  onPaiementEnregistre(event: PaiementAvecFichier): void {

    if(!confirm('Confirmer la transaction ?')) return;

    if (!this.selectedFournisseur) {
      this.toastr.error('Aucun fournisseur sélectionné');
      return;
    }

    if (event.paiement.montant <= 0 || 
        (this.getSoldeActuel() - event.paiement.montant) < 0) {
      this.toastr.error('Montant invalide ou dépasse la dette');
      return;
    }

    event.paiement.fournisseurId = this.selectedFournisseur.id;
    event.paiement.typePaiement = this.typeEntite;
    this.enregistrerPaiement(event.paiement, event.fichier);
    this.showPaiementForm = false;
  }

  onPaiementAnnule(): void {
    this.showPaiementForm = false;
  }

  // Enregistrement d'un bon
  private enregistrerBon(bon: Bon, panier: Panier, fichier: File | null): void {
    if (!this.selectedFournisseur) return;

    const bonCompletData = {
      bon: { ...bon, id: this.bonBrouillon?.id, fournisseurId: this.selectedFournisseur.id },
      panier: { 
        id: this.panierBrouillon?.id, 
        ...panier, 
        fournisseurId: this.selectedFournisseur.id, 
        statut: 'validé' 
      },
      articles: panier.articles.map(article => ({
        id: article.id,
        produitId: article.produit?.id || article.produitId,
        quantite: article.quantite,
        prixUnitaire: article.prixUnitaire,
        prixVenteUnitaire: article.prixVenteUnitaire,
        prixAchatUnitaire: article.prixAchatUnitaire,
        code_structure: this.code_structure,
        remise: article.remise,
        tauxTVA: article.tauxTVA,
        montantTVA: article.montantTVA,
        montantRemise: article.montantRemise,
        totalHT: article.totalHT,
        totalTTC: article.totalTTC
      })),
      fournisseurId: this.selectedFournisseur.id,
      typeEntite: this.typeEntite,
      paiement: bon.avance && bon.avance > 0 ? {
        numero: this.generatedNumeroPaiement,
        methodePaiement: bon.methodePaiement || 'Espèce',
        description: `Avance pour bon ${bon.numero}`,
        typePaiement: 'fournisseur'
      } : undefined
    };

    this.isLoadingBon = true;
    this.bonService.createBonComplet(bonCompletData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.paiement) {
            //this.createDepense(result.paiement);
             this.createDepenseAvecCategorie(result.paiement, 'PAIEMENT_FOURNISSEUR');
          }
          
          if (fichier && result.bon?.id) {
            this.uploadFichier(fichier, result.bon.id, result);
          } else {
            this.finaliserEnregistrement(result, false);
          }
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.toastr.error(error.error?.error || 'Erreur lors de l\'enregistrement');
          this.isLoadingBon = false;
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private uploadFichier(fichier: File, bonId: number, result: any): void {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('bonId', bonId.toString());

    this.bonService.uploadFichier(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Bon et fichier enregistrés avec succès!');
          this.finaliserEnregistrement(result, true);
        },
        error: (error) => {
          console.error('Erreur upload fichier:', error);
          this.toastr.warning('Bon enregistré mais erreur lors de l\'upload du fichier');
          this.finaliserEnregistrement(result, true);
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private finaliserEnregistrement(_result: any, _avecFichier: boolean): void {
    this.toastr.success('Bon enregistré avec succès!', 'Succès');

    this.rafraichirDonneesImmediatement();

    // Recharger les listes
    this.loadBonsAvecPagination();
    this.loadPaiementsAvecPagination();

    this.bonBrouillonService.clearBrouillons();
    this.bonBrouillon = null;
    this.panierBrouillon = null;
    this.reinitialiserEtMasquerFormulaires();
    this.isLoadingBon = false;
  }

  private async getCategoryId(code: string): Promise<number | null> {
  // Vérifier le cache
  if (this.categorieCache.has(code)) {
    return this.categorieCache.get(code)!;
  }

  // Requête API
  return new Promise((resolve) => {
    this.categoriesService.getCategorieByCode(code, this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categorie) => {
          if (categorie) {
            this.categorieCache.set(code, categorie.id!);
            resolve(categorie.id!);
          } else {
            resolve(null);
          }
        },
        error: () => resolve(null)
      });
  });
}

// Nouvelle méthode pour créer une dépense avec catégorie par code
// eslint-disable-next-line @typescript-eslint/no-explicit-any
private createDepenseAvecCategorie(paiement: any, categoryCode: string): void {
  this.getCategoryId(categoryCode).then(categoryId => {
    if (!categoryId) {
      console.error(`Catégorie avec code ${categoryCode} non trouvée`);
      this.toastr.error('Erreur de configuration: catégorie non trouvée');
      return;
    }

    const depense = {
      montant: paiement.montant,
      type: 'STOCK',
      date: paiement.date,
      paiementId: paiement.id,
      statutDepense: 'validé',
      description: `Paiement fournisseur ID: ${this.selectedFournisseur?.id} - Paiement ID: ${paiement.numero}`,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      categoryId: categoryId,
      paymentMode: paiement.methodePaiement
    };

    const formData = new FormData();
    Object.entries(depense).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    this.depensesService.createDepense(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Erreur création dépense:', err)
      });
  });
}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createDepense(paiement: any): void {
    /* const depense = {
      montant: paiement.montant,
      type: 'STOCK',
      date: paiement.date,
      paiementId: paiement.id,
      statutDepense: 'validé',
      description: `Paiement fournisseur ID: ${this.selectedFournisseur?.id} - Paiement ID: ${paiement.numero}`,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      categoryId: 13,
      paymentMode: paiement.methodePaiement
    };

    const formData = new FormData();
    Object.entries(depense).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    this.depensesService.createDepense(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Erreur création dépense:', err)
      }); */

    this.createDepenseAvecCategorie(paiement, 'PAIEMENT_FOURNISSEUR');
  }

  // Enregistrement d'un paiement
  private enregistrerPaiement(paiement: Paiement, fichier: File | null): void {
    if (!this.selectedFournisseur) return;

    const paiementComplet = {
      ...paiement,
      agentId: this.agentId,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      fournisseurId: this.selectedFournisseur.id
    };

    const formData = new FormData();
    Object.entries(paiementComplet).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    if (fichier) {
      formData.append('fichier', fichier);
    }

    this.isLoadingPaiement = true;
    this.paiementService.create(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          //this.createDepense(result);
          this.createDepenseAvecCategorie(result, 'PAIEMENT_FOURNISSEUR');
          this.toastr.success('Paiement enregistré avec succès');
          this.rafraichirDonneesImmediatement();
          this.showPaiementForm = false;
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.toastr.error(error.error?.error || 'Erreur lors de l\'enregistrement');
        },
        complete: () => this.isLoadingPaiement = false
      });
  }

  private rafraichirDonneesImmediatement(): void {
    if (!this.selectedFournisseur) return;
    this.loadOperations();
    this.rafraichirDonneesFournisseur();
  }

  /* private rafraichirDonneesFournisseur(): void {
    if (!this.selectedFournisseur) return;

    this.fournisseurService.getFournisseurById(this.selectedFournisseur.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fournisseurMisAJour) => {
          const index = this.fournisseurs.findIndex(f => f.id === fournisseurMisAJour.id);
          if (index !== -1) this.fournisseurs[index] = fournisseurMisAJour; 
          this.selectedFournisseur = fournisseurMisAJour;
          this.loadData();
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Erreur rafraîchissement fournisseur:', err)
      });
  } */

  private rafraichirDonneesFournisseur(): void {
  if (!this.selectedFournisseur) return;

  
  // Sauvegarder le magasin actuel
  const magasinActuel = this.selectedMagasinId;

  this.fournisseurService.getFournisseurWithMagasins(this.selectedFournisseur.id!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (fournisseurMisAJour) => {
        
        // Mettre à jour la liste
        const index = this.fournisseurs.findIndex(f => f.id === fournisseurMisAJour.id);
        if (index !== -1) this.fournisseurs[index] = fournisseurMisAJour;
        
        // Mettre à jour le Map des soldes
        this.mettreAJourSoldeFournisseurDansMap(fournisseurMisAJour);
        
        // Restaurer le magasin sélectionné
        if (!this.isAdmin && this.magasinId) {
          this.selectedMagasinId = this.magasinId;
        } else if (magasinActuel) {
          this.selectedMagasinId = magasinActuel;
        }
        
        this.selectedFournisseur = fournisseurMisAJour;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Erreur rafraîchissement fournisseur:', err)
    });
}

  // Gestion des événements de liste-operations
  onDateChange(dates: {startDate?: string, endDate?: string}): void {
    this.startDate = dates.startDate;
    this.endDate = dates.endDate;
    this.loadOperations();
  }

  onLivrerBon(bon: Bon): void {
    if (!confirm(`Livrer le bon ${bon.numero} ?`)) return;
    this.changerStatutBon(bon, 'livré', { dateLivraisonReelle: new Date() });
  }

  onAnnulerBon(bon: Bon): void {
    if (!confirm(`Annuler le bon ${bon.numero} ? Cette action est irréversible.`)) return;
    this.changerStatutBon(bon, 'annulé');
  }

  onRetournerBon(bon: Bon): void {
    if (!confirm(`Retourner le bon ${bon.numero} ?`)) return;
    this.changerStatutBon(bon, 'retourné', {
      description: `${bon.description || ''} (Retourné le ${new Date().toLocaleDateString()})`
    });
  }

  /* onFacturerBon(bon: Bon): void {

    if(!confirm(`Facturer le bon numéro ${bon.numero}`)) return;
    // Éviter la double facturation
    if (bon.statutBon === 'facturé') {
      this.toastr.warning(`Le bon ${bon.numero} est déjà facturé`);
      return;
    }

    // Vérifier que c'est un bon de livraison fournisseur ou commande livrée
    if (bon.type !== 'livraison') {
      this.toastr.warning(`Seuls les bons de livraison`);
      return;
    }

    if (bon.type === 'livraison' && bon.statutBon !== 'validé') {
      this.toastr.warning(`La livraison doit être validée avant d'être facturée`);
      return;
    }

    this.isLoadingBon = true;
    
    // Appel direct à createFactureAchat
    const fournisseurId = bon.fournisseurId || this.selectedFournisseur?.id;
    const magasinId = this.magasinId || bon.magasinId;
    
    if (!fournisseurId) {
      this.toastr.error('Fournisseur non identifié pour ce bon');
      this.isLoadingBon = false;
      return;
    }
    
    this.factureService.createFactureAchat(
      bon.id!,
      fournisseurId,
      magasinId ?? undefined,
      0,
      `Facture d'achat pour bon ${bon.numero}`
    )
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingBon = false)
    )
    .subscribe({
      next: (response) => {
        this.toastr.success(`Facture ${response.facture.numero_facture} créée avec succès`);
        
        // Mettre à jour le statut du bon
        this.changerStatutBon(bon, 'facturé', { 
          numeroFacture: response.facture.numero_facture
        });
        
        // Ouvrir le PDF
        this.openFacturePDF(response.facture.id, response.pdf);
        
        // Rafraîchir les données
        this.rafraichirDonneesApresFacturation();
      },
      error: (err) => {
        console.error('Erreur création facture:', err);
        this.toastr.error(err.error?.message || 'Erreur lors de la création de la facture');
        //this.isLoadingBon = false;
      }
    });
  } */


onFacturerBon(bon: Bon): void {

  if(!confirm(`Facturer le bon numéro ${bon.numero}`)) return;
  // Éviter la double facturation
  if (bon.statutBon === 'facturé') {
    this.toastr.warning(`Le bon ${bon.numero} est déjà facturé`);
    return;
  }

  // Vérifier que c'est un bon de livraison fournisseur
  if (bon.type !== 'livraison') {
    this.toastr.warning(`Seuls les bons de livraison peuvent être facturés`);
    return;
  }

  if (bon.statutBon !== 'validé') {
    this.toastr.warning(`Le bon de livraison doit être validé avant d'être facturé`);
    return;
  }

  this.isLoadingBon = true;

  // Créer d'abord la facture
  const fournisseurId = bon.fournisseurId || this.selectedFournisseur?.id;
  const magasinId = this.magasinId || bon.magasinId;

  if (!fournisseurId) {
    this.toastr.error('Fournisseur non identifié pour ce bon');
    this.isLoadingBon = false;
    return;
  }

  this.factureService.createFactureAchat(
    bon.id!,
    fournisseurId,
    magasinId ?? undefined,
    0,
    `Facture d'achat pour bon ${bon.numero}`
  ).subscribe({
    next: (response) => {
      this.toastr.success(`Facture ${response.facture.numero_facture} créée avec succès`);

      // Puis mettre à jour le statut du bon avec l'API simplifiée
      this.bonService.updateStatutBonBis(bon.id!, 'facturé', response.facture.numero_facture)
        .subscribe({
          next: (result) => {
            
            // Mettre à jour le bon dans la liste locale
            const index = this.bons.findIndex(b => b.id === bon.id);
            if (index !== -1) {
              this.bons[index] = { ...this.bons[index], statutBon: 'facturé', numeroFacture: response.facture.numero_facture };
            }
            
            // Ouvrir le PDF
            //this.openFacturePDF(response.facture.id, response.pdf);
            
            // Rafraîchir les données
            this.rafraichirDonneesApresFacturation();
          },
          error: (err) => {
            console.error('Erreur mise à jour statut bon:', err);
            this.toastr.warning('Facture créée mais erreur lors de la mise à jour du statut du bon');
            //this.openFacturePDF(response.facture.id, response.pdf);
            this.rafraichirDonneesApresFacturation();
          }
        });
    },
    error: (err) => {
      console.error('Erreur création facture:', err);
      this.toastr.error(err.error?.message || 'Erreur lors de la création de la facture');
      this.isLoadingBon = false;
    }
  });
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private changerStatutBon(bon: Bon, nouveauStatut: string, extraData: any = {}): void {
    this.isLoadingBon = true;
    const bonMiseAJour = { ...bon, ...extraData, statutBon: nouveauStatut };
    const bonCompletData = this.preparerDonneesPourMiseAJour(bonMiseAJour);

    this.bonService.createBonComplet(bonCompletData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.toastr.success(`Bon ${bon.numero} marqué comme ${nouveauStatut}`);
          this.mettreAJourBonDansListe(result.bon);
          this.rafraichirDonneesImmediatement();
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.toastr.error(error.error?.message || 'Erreur lors du changement de statut');
        },
        complete: () => this.isLoadingBon = false
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private preparerDonneesPourMiseAJour(bonMiseAJour: Bon): any {
    const panier = bonMiseAJour.Panier || bonMiseAJour.panier;
    const articles = panier?.articles?.map(article => ({
      id: article.id,
      produitId: article.produitId || article.Produit?.id,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      prixAchatUnitaire: article.prixAchatUnitaire,
      prixVenteUnitaire: article.prixVenteUnitaire,
      code_structure: this.code_structure,
      remise: article.remise,
      tauxTVA: article.tauxTVA,
      montantTVA: article.montantTVA,
      montantRemise: article.montantRemise,
      totalHT: article.totalHT,
      totalTTC: article.totalTTC
    })) || [];

    let statutPanier;
    if (bonMiseAJour.statutBon === 'annulé' || bonMiseAJour.statutBon === 'retourné') {
      statutPanier = 'annulé';
    } else if (bonMiseAJour.statutBon === 'livré' || bonMiseAJour.statutBon === 'facturé') {
      statutPanier = 'validé';
    } else {
      statutPanier = panier?.statut;
    }

    return {
      bon: {
        id: bonMiseAJour.id,
        type: bonMiseAJour.type,
        numero: bonMiseAJour.numero,
        description: bonMiseAJour.description,
        statutBon: bonMiseAJour.statutBon,
        montantTotal: bonMiseAJour.montantTotal,
        remise: bonMiseAJour.remise || 0,
        avance: bonMiseAJour.avance || 0,
        clientId: bonMiseAJour.clientId,
        fournisseurId: bonMiseAJour.fournisseurId,
        dateLivraisonReelle: bonMiseAJour.dateLivraisonReelle,
        numeroFacture: bonMiseAJour.numeroFacture
      },
      panier: panier ? {
        id: panier.id,
        totalHT: panier.totalHT,
        tva: panier.tva,
        totalTTC: panier.totalTTC,
        tauxTVA: panier.tauxTVA,
        statut: statutPanier
      } : null,
      articles: articles,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      fournisseurId: bonMiseAJour.fournisseurId,
      typeEntite: this.typeEntite
    };
  }

  private mettreAJourBonDansListe(bonMisAJour: Bon): void {
    const index = this.bons.findIndex(b => b.id === bonMisAJour.id);
    if (index !== -1) this.bons[index] = bonMisAJour;
    this.cdr.detectChanges();
  }

  // Génération de PDF
  onImprimerBon(bon: Bon): void {
    if(!confirm('Imprimer l\'opération?')) return;
    /* if (!bon) return;
    
    const articlesFormates = (bon.Panier?.articles || []).map(article => ({
      ...article,
      produit: article.produit || article.Produit,
      prixUnitaire: this.safeNumber(article.prixUnitaire || article.prixAchatUnitaire),
      quantite: this.safeNumber(article.quantite),
      total: this.safeNumber(article.quantite) * this.safeNumber(article.prixUnitaire || article.prixAchatUnitaire)
    }));

    const bonData = {
      numero: bon.numero,
      date: bon.dateBon,
      fournisseur: this.selectedFournisseur ? {
        nomComplet: this.selectedFournisseur.nomComplet,
        adresse: this.selectedFournisseur.adresse,
        telephone: this.selectedFournisseur.telephone,
        email: this.selectedFournisseur.email
      } : { nomComplet: 'Fournisseur non spécifié', adresse: '', telephone: '', email: '' },
      articles: articlesFormates,
      totaux: {
        sousTotal: this.safeNumber(bon.Panier?.totalHT),
        tauxTVA: this.safeNumber(bon.Panier?.tauxTVA),
        montantTVA: this.safeNumber(bon.Panier?.tva),
        totalTTC: this.safeNumber(bon.Panier?.totalTTC),
        remise: this.safeNumber(bon.remise),
        avance: this.safeNumber(bon.avance),
        netAPayer: this.safeNumber(bon.resteAPayer)
      },
      titre: `Bon de ${bon.type || 'Commande'}`,
      typeBon: bon.type,
      statut: bon.statutBon,
      commentaire: bon.description
    };

    this.pdfGenerator.generateBonFournisseur(bonData); */
    if (!bon) {
      this.toastr.error('Aucun bon sélectionné');
      return;
    }

    try {
      this.isLoadingBon = true;
      

      // Valider et formater les articles avec une meilleure gestion des nombres
      const articlesFormates = (bon.Panier?.articles || []).map(article => {
        if (!article) return null;
        
        // Calculer les valeurs avec sécurité
        const prixUnitaire = this.safeNumber(article.prixUnitaire || article.prixAchatUnitaire);
        const quantite = this.safeNumber(article.quantite);
        const total = prixUnitaire * quantite;


        return {
          ...article,
          designation: article.Produit?.designation || article.produit?.designation || 'Produit sans nom',
          prixUnitaire: prixUnitaire,
          quantite: quantite,
          total: total
        };
      }).filter(article => article != null);

      // Préparer les totaux avec sécurité
      const sousTotal = this.safeNumber(bon.Panier?.totalHT);
      const tauxTVA = this.safeNumber(bon.Panier?.tauxTVA);
      const montantTVA = this.safeNumber(bon.Panier?.tva);
      const totalTTC = this.safeNumber(bon.Panier?.totalTTC);


      const bonData = {
        numero: bon.numero || 'N/A',
        date: bon.dateBon || new Date(),
        fournisseur: this.selectedFournisseur ? {
          nomComplet: this.selectedFournisseur.nomComplet || 'N/A',
          adresse: this.selectedFournisseur.adresse || '',
          telephone: this.selectedFournisseur.telephone || '',
          email: this.selectedFournisseur.email || ''
        } : { 
          nomComplet: 'Fournisseur non spécifié', 
          adresse: '', 
          telephone: '', 
          email: '' 
        },
        articles: articlesFormates,
        totaux: {
          sousTotal: sousTotal,
          tauxTVA: tauxTVA,
          montantTVA: montantTVA,
          totalTTC: totalTTC,
          // Ajouter les totaux du bon au cas où
          totalHT: sousTotal,
          tva: montantTVA
        },
        titre: ('Bon de '+( bon.type || 'Commande')).toUpperCase(),
        dateBon:bon.dateBon,
        typeBon:bon.type,
        statut:bon.statutBon,
        commentaire:bon.description
      };

      this.pdfGenerator.generateBonFournisseur(bonData);
    } 
    catch (error) {
      console.error('Erreur génération bon:', error);
      this.toastr.error('Erreur lors de la génération du bon');
    }
    finally {
      this.isLoadingBon = false;
    }
  }

  onImprimerReleve(): void {
    /* if (!this.selectedFournisseur) return;

    const operationsFormatees = this.filteredOperations.map(op => ({
      date: op.dateOperation,
      type: op.type,
      reference: op.numeroVersement || op.Bon?.numero,
      montant: op.montantPaye || op.Bon?.montantTotal
    }));

    const releveData = {
      fournisseur: {
        nomComplet: this.selectedFournisseur.nomComplet,
        adresse: this.selectedFournisseur.adresse,
        telephone: this.selectedFournisseur.telephone,
        email: this.selectedFournisseur.email
      },
      periode: `${this.startDate || 'Début'} au ${this.endDate || 'Aujourd\'hui'}`,
      operations: operationsFormatees,
      synthese: {
        totalCommandes: this.calculerTotalCommandes(),
        totalVersements: this.calculerTotalVersements(),
        totalRetours: this.calculerTotalRetours(),
        totalLivraisons: this.calculerTotalLivraisons(),
        solde: this.selectedFournisseur.montantAPayer
      }
    };

    this.pdfGenerator.generateReleveFournisseur(releveData); */

    if(!confirm('Imprimer le relevé pour la période sélectionnée ?')) return;

    if (!this.selectedFournisseur) {
      this.toastr.error('Aucun fournisseur sélectionné');
      return;
    }

    try {
      this.isLoadingFournisseur = true;
      // Debug: vérifier les données

      // Valider et formater les opérations
      const operationsFormatees = this.filteredOperations.map(op => {
        if (!op) return null;
        
        return {
          date: op.dateOperation,
          type: op.type || 'NON SPECIFIE',
          reference: op.numeroVersement || op.bon?.numero || 'N/A',
          montant: op.montantPaye || op.bon?.montantTotal ||0,
          // Inclure toutes les propriétés nécessaires
          ...op
        };
      }).filter(op => op != null); // Supprimer les null

      const releveData = {
        fournisseur: {
          nomComplet: this.selectedFournisseur.nomComplet || 'N/A',
          adresse: this.selectedFournisseur.adresse || '',
          telephone: this.selectedFournisseur.telephone || '',
          email: this.selectedFournisseur.email || ''
        },
        periode: `${this.startDate} à ${this.endDate}`,
        operations: operationsFormatees, // Utiliser les données formatées
        synthese: {
          totalCommandes: this.calculerTotalCommandes(),
          totalVersements: this.calculerTotalVersements(),
          totalRetours : this.calculerTotalRetours(),
          totalLivraison : this.calculerTotalLivraison(),
          solde: this.selectedFournisseur.montantAPayer || 0
        },
        solde: this.selectedFournisseur.montantAPayer || 0
      };

      this.pdfGenerator.generateReleveFournisseur(releveData);
    } 
    catch (error) {
      console.error('Erreur génération relevé:', error);
      this.toastr.error('Erreur lors de la génération du relevé');
    }
    finally {
      this.isLoadingFournisseur = false;
    }
  }

  onGenererTicketVersement(operation: Operation): void {
    if (!operation || operation.type !== 'VERSEMENT') return;

    const montantVerse = this.safeNumber(operation.montantPaye);
    const soldePrecedent = this.safeNumber(this.selectedFournisseur?.montantAPayer) + montantVerse;
    const nouveauSolde = this.safeNumber(this.selectedFournisseur?.montantAPayer);

    const versementData = {
      fournisseur: this.selectedFournisseur ? {
        nomComplet: this.selectedFournisseur.nomComplet
      } : null,
      date: operation.dateOperation,
      numeroReference: operation.numeroVersement,
      moyenPaiement: operation.moyenPaiement,
      montantVerse: montantVerse,
      soldePrecedent: soldePrecedent,
      nouveauSolde: nouveauSolde,
      description: operation.commentaire,
      type: 'Versement',
      agent: operation.user?.['nom']
    };

    this.pdfGenerator.generateTicketVersement(versementData);
  }

  onGenererTicketPaiementBon(bon: Bon): void {
    if (!bon) return;

    const paiementData = {
      fournisseur: this.selectedFournisseur ? {
        nomComplet: this.selectedFournisseur.nomComplet
      } : null,
      date: bon.dateBon,
      numeroReference: bon.numero,
      moyenPaiement: bon.methodePaiement || 'Caisse',
      montantVerse: this.safeNumber(bon.avance),
      soldePrecedent: this.safeNumber(bon.montantTotal),
      nouveauSolde: this.safeNumber(bon.resteAPayer),
      description: `Acompte sur bon ${bon.numero}`,
      type: 'ACOMPTE'
    };

    this.pdfGenerator.generateTicketVersement(paiementData);
  }

  // Utilitaires
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private safeNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private calculerTotalCommandes(): number {
    return this.filteredOperations
      .filter(op => op.type === 'COMMANDE')
      .reduce((total, op) => total + (this.safeNumber(op.bon?.Panier?.totalTTC) || 0), 0);
  }

  private calculerTotalVersements(): number {
    return this.filteredOperations
      .filter(op => op.type === 'VERSEMENT')
      .reduce((total, op) => total + (this.safeNumber(op.montantPaye) || 0), 0);
  }

  private calculerTotalRetours(): number {
    return this.filteredOperations
      .filter(op => op.type === 'RETOUR' || op.bon?.statutBon === 'retourné' || op.bon?.statutBon === 'retourné partiellement')
      .reduce((total, op) => total + (this.safeNumber(op.bon?.Panier?.totalTTC) || 0), 0);
  }

  private calculerTotalLivraison(): number {
    return this.filteredOperations
      .filter(op => op.type === 'LIVRAISON')
      .reduce((total, op) => total + (this.safeNumber(op.bon?.Panier?.totalTTC) || 0), 0);
  }

  /**
   * Créer une facture d'achat
   */
  private creerFactureAchat(bon: Bon): void {
    // Pour l'achat, on a besoin du fournisseur et du magasin
    const fournisseurId = bon.fournisseurId || this.selectedFournisseur?.id;
    const magasinId = this.magasinId || bon.magasinId;
    
    if (!fournisseurId) {
      this.toastr.error('Fournisseur non identifié pour ce bon');
      this.isLoadingBon = false;
      return;
    }
    
    this.factureService.createFactureAchat(
      bon.id!,
      fournisseurId,
      magasinId ?? undefined,
      0,
      `Facture d'achat pour bon ${bon.numero}`
    ).subscribe({
      next: (response) => {
        this.toastr.success(`Facture d'achat ${response.facture.numero_facture} créée avec succès`);
        
        // Mettre à jour le statut du bon
        this.changerStatutBon(bon, 'facturé', { 
          numeroFacture: response.facture.numero_facture,
          typeFacture: 'achat'
        });
        
        // Ouvrir le PDF
        //this.openFacturePDF(response.facture.id, response.pdf);
        
        // Rafraîchir les données
        this.rafraichirDonneesApresFacturation();
      },
      error: (err) => {
        console.error('Erreur création facture achat:', err);
        this.toastr.error(err.error?.message || 'Erreur lors de la création de la facture d\'achat');
        this.isLoadingBon = false;
      }
    });
  } 

  /**
   * Ouvrir le PDF d'une facture
   */
  private openFacturePDF(factureId: number, pdfBase64?: string): void {
    if (pdfBase64) {
      // Si le PDF est renvoyé en base64
      const blob = this.base64ToBlob(pdfBase64, 'application/pdf');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } else {
      // Sinon télécharger via le service
      this.factureService.openPDF(factureId);
    }
  }

  /**
   * Convertir du base64 en Blob
   */
  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
   * Rafraîchir les données après facturation
   */
  private rafraichirDonneesApresFacturation(): void {
    // Recharger les bons pour mettre à jour le statut
    this.loadBonsAvecPagination();
    
    // Recharger les opérations
    this.loadOperations();
    
    // Recharger les clients pour mettre à jour les dettes
    this.loadData();
    
    // Réinitialiser l'état de chargement après un délai
    setTimeout(() => {
      this.isLoadingBon = false;
      this.cdr.detectChanges();
    }, 500);
  }

}
