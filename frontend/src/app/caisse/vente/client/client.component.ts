import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaiementComponent } from '../../../sharedComposants/paiement/paiement.component';
import { BonsComponent } from '../../../sharedComposants/bons/bons.component';
import { ListeBonsComponent } from '../../../sharedComposants/liste-bons/liste-bons.component';
import { ListeVersementsComponent } from '../../../sharedComposants/liste-versements/liste-versements.component';
import { ListeOperationsComponent } from '../../../sharedComposants/liste-operations/liste-operations.component';
import { User } from '@sentry/angular';
import { Client } from '../../../modeles/clients.model';
import { Produits } from '../../../modeles/produit.modele';
import { Magasin } from '../../../modeles/magasin.model';
import { Bon, BonAvecFichier } from '../../../modeles/bon.model';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription, takeUntil, forkJoin, finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { Operation } from '../../../modeles/operation.model';
import { Paiement, PaiementAvecFichier } from '../../../modeles/paiement.model';
import { ArticlePanier, Panier } from '../../../modeles/panier.model';
import { AuthService } from '../../../services/auth.service';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { BonsFilter, BonsService } from '../../../services/bons.service';
import { ClientsFilter, ClientsService } from '../../../services/clients.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { OperationsService } from '../../../services/operations.service';
import { PaiementsFilter, PaiementsService } from '../../../services/paiements.service';
import { PaniersService } from '../../../services/paniers.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { ProduitsService } from '../../../services/produits.service';
import { RecettesService } from '../../../services/recettes.service';
import { StructureService } from '../../../services/structure.service';
import { v4 as uuidv4 } from 'uuid';
import { BonComponent } from '../../../sharedComposants/bon/bon.component';
import { CategoriesDepencesRecettesService } from '../../../services/categories-depences-recettes.service';
import { FactureComponent } from '../facture/facture.component';
import { FactureService } from '../../../services/facture.service';


@Component({
  selector: 'app-client',
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
    FactureComponent
  ],
  templateUrl: './client.component.html',
  styleUrl: './client.component.css'
})
export class ClientComponent implements OnInit,OnDestroy {
   // Référence au composant Bon
  @ViewChild(BonsComponent) bonComponent!: BonsComponent;

  // État général
  isLoadingClient = false;
  isLoadingStructure = false;
  isLoadingBon = false;
  isLoadingPaiement = false;
  isLoadingOperation = false;
  
  errorMessage = '';
  code_structure: string | null = null;
  magasinId: number | null = null;
  agentId: number | null = null;
  currentUser: User | null = null;
  typeEntite: 'client' | 'fournisseur' | 'autre' = 'client';

  // Données
  clients: Client[] = [];
  filteredClients: Client[] = [];
  produits: Produits[] = [];
  filteredProducts: Produits[] = [];
  magasins: Magasin[] = [];
  
  // Sélection
  selectedClient: Client | null = null;
  isRowSelected = false;
  showDetails = false;
  showBonDetailsSection = false;

  selectedMagasinId: number | null = null;
  magasinSoldes = new Map<number, number>();

  displayedMagasins: Magasin[] = [];

  // Formulaires
  clientForm!: FormGroup;
  
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
    /* dateDebut: '',
    dateFin: '' */
  };

  // Options pour les filtres
  methodePaiementOptions = ['tous', 'Espèce', 'Carte', 'Virement', 'Wave', 'Orange Money', 'Chèque', 'Autre'];

  private paiementsSearchSubject = new Subject<string>();

   // Propriétés pour la pagination des clients
  clientsCurrentPage = 1;
  clientsItemsPerPage = 10;
  clientsTotalItems = 0;
  clientsTotalPages = 0;
  clientsHasNext = false;
  clientsHasPrev = false;
  
  // Filtres pour les clients
  clientsFilters: ClientsFilter = {
    page: 1,
    limit: 10,
    search: '',
    statut: 'tous'
  };

  // Options pour les filtres
  clientStatutOptions = ['tous', 'actif', 'inactif'];

  private clientsSearchSubject = new Subject<string>();

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

  isAdmin = false;

  // Gestion des désabonnements
  private destroy$ = new Subject<void>();
  private userSubscription!: Subscription;

  private categorieCache = new Map<string, number>();

  // Services injectés
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private magasinService = inject(MaagasinsService);
  private clientService = inject(ClientsService);
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
  private recetteService = inject(RecettesService);
  private categoriesService = inject(CategoriesDepencesRecettesService);
  private factureService = inject(FactureService);

  Math = Math;

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
      this.isAdmin = this.authService.hasRole('Administrateur') || this.authService.hasRole('Administrateur secondaire');
      
      if (!this.isAdmin && this.magasinId) {
        this.selectedMagasinId = this.magasinId;
      }
      if (this.code_structure) {
        this.loadClientsWithPagination();
        this.loadDataProduits();
        this.loadPaiementsAvecPagination();
        this.loadBonsAvecPagination();
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

    // Debounce pour la recherche des clients
    this.clientsSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.clientsFilters.search = searchTerm;
      this.clientsFilters.page = 1;
      this.loadClientsWithPagination();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
  // Initialisation du formulaire
  initForm(): void {
    const initialMagasinIds : number[] = this.magasinId? [this.magasinId]:[];
  
    this.clientForm = this.fb.group({
      code_structure: [this.code_structure],
      //magasinId: [this.magasinId],
      nomComplet: ['', Validators.required],
      email: ['', [Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
      adresse: ['', Validators.required],
      //solde: [0],
      plafond: [0, Validators.required],
      estEmploye: ['non', Validators.required],
      statut: [true],
      magasinIds: [initialMagasinIds, Validators.required] // Changé: sélection multiple au lieu de magasinId simple
    });
  }

  // Nouvelle méthode pour charger les clients avec pagination
  loadClientsWithPagination(): void {
    if (!this.code_structure) return;

    const filters: ClientsFilter = {
      page: this.clientsFilters.page,
      limit: this.clientsItemsPerPage,
      search: this.clientsFilters.search || undefined,
      statut: this.clientsFilters.statut
    };

    this.isLoadingClient = true;
    this.clientService.getClientsByStructureBis(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: (response) => {
          this.clients = response.items; //.filter(c => c.statut === true); 

          console.log('Client chargés : ',this.clients);
          
           // Initialiser les soldes par magasin pour chaque client
            this.clients.forEach(client => {
              if (client.Magasins && client.Magasins.length > 0) {
                client.Magasins.forEach(magasin => {
                  if (magasin.MagasinClient) {
                    this.magasinSoldes.set(
                      magasin.id!, 
                      magasin.MagasinClient.solde
                    );
                  }
                });
              }
            });
          // Mise à jour de la pagination
          this.clientsTotalItems = response.pagination.total;
          this.clientsCurrentPage = response.pagination.page;
          this.clientsTotalPages = response.pagination.totalPages;
          this.clientsHasNext = response.pagination.hasNext;
          this.clientsHasPrev = response.pagination.hasPrev;

          this.loadData();
        },
        error: err => {
          console.error('Erreur chargement clients', err);
          this.toastr.error('Erreur lors du chargement des clients');
        }
      });
  }

  // Gestionnaires pour les clients
  onClientsPageChange(page: number): void {
    if (page >= 1 && page <= this.clientsTotalPages) {
      this.clientsFilters.page = page;
      this.loadClientsWithPagination();
    }
  }

  onClientsSearchChange(searchTerm: string): void {
    this.clientsSearchSubject.next(searchTerm);
  }

  onClientsRowsPerPageChange(limit: number): void {
    this.clientsItemsPerPage = limit;
    this.clientsFilters.limit = limit;
    this.clientsFilters.page = 1;
    this.loadClientsWithPagination();
  }

  onClientsStatutChange(statut: string): void {
    this.clientsFilters.statut = statut;
    this.clientsFilters.page = 1;
    this.loadClientsWithPagination();
  }

  resetClientsFilters(): void {
    this.clientsFilters = {
      page: 1,
      limit: this.clientsItemsPerPage,
      search: '',
      statut: 'tous'
    };
    this.loadClientsWithPagination();
  }


  private mettreAJourSoldeClientDansMap(client: Client): void {
  if (client.Magasins && client.Magasins.length > 0) {
    client.Magasins.forEach(magasin => {
      if (magasin.MagasinClient) {
        console.log(`Mise à jour du solde pour magasin ${magasin.id}: ${magasin.MagasinClient.solde}`);
        this.magasinSoldes.set(magasin.id!, magasin.MagasinClient.solde);
      }
    });
  }
}

  // Modifiez la méthode loadData() pour utiliser la nouvelle méthode
  loadData(): void {
    
    // Charger les magasins séparément car ils n'ont pas besoin de pagination
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mgs) => {
          this.magasins = mgs;
          // Filtrer les magasins à afficher
          if (!this.isAdmin && this.magasinId) {
            // Non-admin: afficher uniquement son magasin
            this.displayedMagasins = mgs.filter(m => m.id === this.magasinId);
          } else {
            // Admin: afficher tous les magasins
            this.displayedMagasins = mgs;
          }
        },
        error: err => console.error('Erreur chargement magasins', err)
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

    console.log('Chargement paiements avec filtres:', filters);

    this.isLoadingPaiement = true;
    this.paiementService.getByClientsStructureBis(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingPaiement = false))
      .subscribe({
        next: (response) => {
          console.log('✅ Réponse paiements:', response);
          this.paiements = response.items || [];

          this.paiementsTotalItems = response.pagination?.total || 0;
          this.paiementsCurrentPage = response.pagination?.page || 1;
          this.paiementsTotalPages = response.pagination?.totalPages || 0;
          this.paiementsHasNext = response.pagination?.hasNext || false;
          this.paiementsHasPrev = response.pagination?.hasPrev || false;
        },
        error: (err) => {
          console.error('Erreur chargement paiements:', err);
          this.toastr.error('Erreur lors du chargement des paiements');
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

  /* onPaiementsDateChange(dates: {dateDebut?: string, dateFin?: string}): void {
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
      /* dateDebut: '',
      dateFin: '' */
    };
    this.loadPaiementsAvecPagination();
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
    this.bonService.getBonsClientByStructureBis(this.code_structure, filters)
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
          this.toastr.error('Erreur lors du chargement des bons');
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
    console.log('Changement lignes par page:', limit); // Pour déboguer
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

  // Chargement des données
  loadDataProduits(): void {
    forkJoin([
      this.produitsServices.getProduitsDisponibles(this.code_structure!),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([produit]) => {
          this.produits = produit;
          this.filteredProducts = this.produits;
        },
        error: err => console.error('Erreur chargement produits', err)
      });
  }

  
  loadOperations(): void {
    if (!this.selectedClient) return;
    this.isLoadingOperation = true;
    
    this.operationService.getOperationsByClient(
      this.code_structure!, 
      this.selectedClient.id!, 
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

  // Nouvelle méthode pour obtenir le solde total du client
  getSoldeTotal(client: Client): number {
    if (!client.Magasins) return 0;
    return client.Magasins.reduce((total, magasin) => {
      return total + (this.safeNumber(magasin.MagasinClient?.solde) || 0);
    }, 0);
  }

  // Obtenir le solde actuel en fonction du magasin sélectionné
  /* getSoldeActuel(): number {
    if (!this.selectedClient) return 0;
    
    if (this.selectedMagasinId) {
      console.log('Client slectionné : ',this.selectedClient)
      const magasin = this.selectedClient.Magasins?.find(m => m.id === this.selectedMagasinId);
      return magasin?.MagasinClient?.solde || 0;
    }
    return this.getSoldeTotal(this.selectedClient);
  } */

  getSoldeActuel(): number {
    if (!this.selectedClient) return 0;
    
    // Pour les non-admins, utiliser automatiquement leur magasin
    const magasinIdAAfficher = this.selectedMagasinId ?? this.magasinId;
    
    if (magasinIdAAfficher) {
      console.log('Recherche solde pour magasin:', magasinIdAAfficher);
      console.log('Magasins du client:', this.selectedClient.Magasins);
      
      const magasin = this.selectedClient.Magasins?.find(m => m.id === magasinIdAAfficher);
      const solde = magasin?.MagasinClient?.solde || 0;
      console.log('Solde trouvé:', solde);
      return solde;
    }
    
    // Admin: retourner le solde total
    return this.getSoldeTotal(this.selectedClient);
  }

  // Obtenir le nom du magasin sélectionné
  /* getNomMagasinSelectionne(): string {
    if (!this.selectedMagasinId || !this.selectedClient?.Magasins) return 'tous les magasins';
    const magasin = this.selectedClient.Magasins.find(m => m.id === this.selectedMagasinId);
    return magasin?.nom || 'ce magasin';
  } */

  // Obtenir le nom du magasin sélectionné
getNomMagasinSelectionne(): string {
  // Pour les non-admins, utiliser automatiquement leur magasin
  const magasinIdAAfficher = this.selectedMagasinId ?? this.magasinId;
  
  if (!magasinIdAAfficher || !this.selectedClient?.Magasins) return 'tous les magasins';
  
  const magasin = this.selectedClient.Magasins.find(m => m.id === magasinIdAAfficher);
  return magasin?.nom || 'ce magasin';
}

  // Gérer le changement de magasin
  /* onMagasinChange(magasinId: number | null): void {
    this.selectedMagasinId = magasinId;
    this.loadOperations(); // Recharger les opérations filtrées par magasin
  } */

  // Gérer le changement de magasin
  onMagasinChange(magasinId: number | null): void {
    // Si l'utilisateur n'est pas admin, ne pas permettre le changement
    if (!this.isAdmin) {
      console.log('Non-admin: changement de magasin non autorisé');
      return;
    }
    this.selectedMagasinId = magasinId;
    this.loadOperations();
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
  onRowSelect(client: Client): void {
    this.selectedClient = client;
    this.isRowSelected = true;
  }

  closeActions(): void {
    this.selectedClient = null;
    this.isRowSelected = false;
  }

  // Gestion des actions
  onAction(action: string): void {
    if (this.selectedClient) {
      if (action === 'operation') {
        this.checkBrouillonExists((exists) => {
          this.textBoutonNewBon = exists ? 'Modifier le bon brouillon' : 'Nouveau bon';
        });
        this.showBonDetails();
      } else if (action === 'modifier') {
        this.openModal(this.selectedClient);
      } 
      // else if (action === 'supprimer') {
      //   this.deleteClient(this.selectedClient.id!);
      // } 
      else if (action === 'statut') {
        this.toggleStatut(this.selectedClient);
      }
    } else {
      this.openModal();
    }
  }

  // Affichage des détails
  showBonDetails(): void {
    this.showDetails = true;
    this.showBonDetailsSection = true;

    if (!this.selectedClient) return;

    if (!this.isAdmin && this.magasinId) {
      // Pour un gérant/caissier, sélectionner automatiquement son magasin
      this.selectedMagasinId = this.magasinId;
    } else {
      // Pour admin, on peut laisser null (tous les magasins)
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
  openModal(client?: Client): void {
    this.errorMessage = '';
    if (client) {
      this.isEditMode = true;
      //this.clientForm.patchValue(client);
      this.clientForm.patchValue({
      ...client,
      magasinIds: this.magasinId ? [this.magasinId] : (client.Magasins?.map(m => m.id) || [])
    });
    } else {
      this.isEditMode = false;
      this.clientForm.reset({
        code_structure: this.code_structure,
        statut: true,
        //solde: 0,
        //magasinId: this.magasinId
        magasinIds: this.magasinId ? [this.magasinId] : []
      });
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.errorMessage = '';
  }

  onModalSubmit(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
      return;
    }

    if (this.isEditMode && this.selectedClient) {
      this.updateClient(this.selectedClient.id!, this.clientForm.value);
    } else {
      this.createClient(this.clientForm.value);
    }
  }

  // CRUD Clients
  /* createClient(clientData: Partial<Client>): void {

    const magasinIds = this.clientForm.get('magasinIds')?.value;

    this.isLoadingClient = true;
    this.clientService.ajouterClient(clientData as Client,magasinIds)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => {
          this.toastr.success('Client créé avec succès');
          this.closeModal();
          this.loadClientsWithPagination();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création';
          this.toastr.error(this.errorMessage);
        }
      });
  } */

  createClient(clientData: Partial<Client>): void {
    const magasinIds = this.clientForm.get('magasinIds')?.value;

    this.isLoadingClient = true;
    
    // Choisir le service selon le rôle
    const serviceCall = this.isAdmin 
      ? this.clientService.ajouterClient(clientData as Client, magasinIds)
      : this.clientService.ajouterClientBis(clientData as Client, magasinIds);
    
    serviceCall.pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => {
          this.toastr.success('Client créé avec succès');
          this.closeModal();
          this.loadClientsWithPagination();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  updateClient(id: number, updateData: Partial<Client>): void {
    const magasinIds = this.clientForm.get('magasinIds')?.value;

    this.isLoadingClient = true;
    this.clientService.updateClient(id, updateData,magasinIds)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => {
          this.toastr.success('Client mis à jour avec succès');
          this.closeModal();
          this.loadClientsWithPagination();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  deleteClient(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    
    this.isLoadingClient = true;
    this.clientService.deleteClient(id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => {
          this.toastr.success('Client supprimé avec succès');
          this.loadClientsWithPagination();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la suppression';
          this.toastr.error(this.errorMessage);
        }
      });
  }

  toggleStatut(client: Client): void {
     
    const action = client.statut ? 'désactiver' : 'activer';
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ce client ?`)) {
      return;
    }
    client.statut = !client.statut;
    this.updateStatus(client.id!, client.statut);
  }

  updateStatus(id: number, newStatus: boolean): void {
    this.isLoadingClient = true;
    this.clientService.updateClientStatut(id, newStatus)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => {
          this.toastr.success('Statut mis à jour avec succès');
          this.loadClientsWithPagination();
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
          const exists = bonsBrouillons.some(bon => bon.clientId === this.selectedClient?.id);
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
    if (!this.selectedClient) return;

    this.bonService.getBonsBrouillons(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bonsBrouillons) => {
          const brouillon = bonsBrouillons.find(bon => bon.clientId === this.selectedClient?.id);
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
    if (!this.selectedClient) return;

    const bonBrouillonData = {
      bon: {
        type: 'Commande',
        numero: this.generatedNumero,
        description: '',
        montantTotal: 0,
        statutBon: 'brouillon',
        dateBon: new Date(),
        clientId: this.selectedClient.id,
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
      clientId: this.selectedClient.id,
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
    
    if (this.bonComponent) {
      this.bonComponent.reinitialiserFormulaire();
    }
    
    this.resetPanierFlag = true;
    setTimeout(() => this.resetPanierFlag = false, 100);
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

    if (!this.selectedClient || !this.bonBrouillon || !this.panierBrouillon) {
      this.toastr.error('Données manquantes pour l\'enregistrement');
      return;
    }

    // Vérification du plafond pour les clients
    if (this.selectedClient) {
      const nouveauSoldeApresBon = (this.safeNumber(this.getSoldeActuel) || 0) + (this.safeNumber(event.bon.montantTotal) || 0);
      const plafond = this.safeNumber(this.selectedClient.plafond )|| 0;

      console.log('Valeurs nouveauSoldeApresBon et plafond :', nouveauSoldeApresBon,plafond)
      
      console.log('Vérification plafond:', {
        soldeActuel: this.getSoldeActuel,
        montantBon: event.bon.montantTotal,
        nouveauSolde: nouveauSoldeApresBon,
        plafond: plafond
      });

      if (nouveauSoldeApresBon > plafond) {
        this.toastr.error(
          `Ce bon dépasse le plafond autorisé. Solde actuel: ${this.formatMontant(this.getSoldeActuel() || 0)}, ` +
          `Montant du bon: ${this.formatMontant(event.bon.montantTotal || 0)}, ` +
          `Plafond: ${this.formatMontant(plafond)}`
        );
        return;
      }
    }

    console.log('Données bon à enregistrer',event.bon)
    event.bon.clientId = this.selectedClient.id;
    event.bon.statutBon = 'validé';
    // Si c'était un brouillon, utiliser l'ID existant
    if (this.bonBrouillon) {
      event.bon.id = this.bonBrouillon.id;
    } 

    if (event.bon.type === 'avoir') {
        this.enregistrerAvoir(event.bon);
    } 
    else {
        this.enregistrerBon(event.bon, event.bon.panier!, event.fichier);
      }

    //console.log('Donnée envoyées :',event)
    //this.enregistrerBon(event.bon, event.bon.panier!, event.fichier);
    this.showBonForm = false;
    this.bonBrouillonService.clearBrouillons(); 
  }

  // Méthode utilitaire pour formater les montants
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(montant) + ' F CFA';
  }

  onBonAnnule(): void {
    this.reinitialiserEtMasquerFormulaires();
  }

  onPaiementEnregistre(event: PaiementAvecFichier): void {
    if (!this.selectedClient) {
      this.toastr.error('Aucun client sélectionné');
      return;
    }

    if (event.paiement.montant <= 0 || this.getSoldeActuel() - event.paiement.montant < 0) {
      this.toastr.error('Montant invalide ou dépasse la dette');
      return;
    }

    event.paiement.clientId = this.selectedClient.id;
    event.paiement.typePaiement = this.typeEntite;
    this.enregistrerPaiement(event.paiement, event.fichier);
    this.showPaiementForm = false;
  }

  onPaiementAnnule(): void {
    this.showPaiementForm = false;
  }

  private enregistrerAvoir(bon: Bon): void {
  if (!this.selectedClient) {
    this.toastr.error('Aucun client sélectionné', 'Erreur');
    return;
  }

  //Vérifier que les brouillons sont bien chargés
  if (!this.bonBrouillon?.id || !this.panierBrouillon?.id) {
    console.error('Brouillons non chargés:', {
      bonBrouillon: this.bonBrouillon,
      panierBrouillon: this.panierBrouillon
    });
    this.toastr.error('Erreur: Les données du brouillon ne sont pas chargées', 'Erreur');
    return;
  }

  // Préparer les données pour l'API unifiée
  const bonCompletData = {
    bon: {
      ...bon,
      id: this.bonBrouillon?.id,
      clienId: this.selectedClient.id,
      statutBon: 'validé'
    },
    panier: {
      ...this.panierBrouillon,
      id: this.panierBrouillon.id, 
      clientId: this.selectedClient.id,
      statut: 'validé'
    },
    articles: [],
    code_structure: this.code_structure,
    magasinId: this.magasinId,
    agentId: this.agentId,
    clientId: this.selectedClient.id,
    typeEntite:this.typeEntite,
    paiement: undefined
  };
  console.log('Données de MISE À JOUR envoyées:', {
    bonId: bonCompletData.bon.id,
    panierId: this.panierBrouillon?.id, //ID du panier existant
  });
  this.isLoadingBon = true;

  this.bonService.createBonComplet(bonCompletData).pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (result) => {
      console.log('Bon enregistré avec succès:', {
          bonId: result.bon?.id,
          panierId:result.panier.id
        });
        console.log('Id panier à supprimer', result.panier.id)
        this.panierService.deleteOnlyPanier(result.panier.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            console.log('Panier brouillon supprimé avec succès après création d\'avoir');
            this.finaliserEnregistrement(result, false);
          },
          error: (err) => {
            console.error('Erreur suppression panier brouillon après création d\'avoir:', err);
          }
        });
        

    },
    error: (error) => {
      console.error('Erreur:', error);
      this.toastr.error(error.error?.error || 'Erreur lors de l\'enregistrement', 'Erreur');
    },
    complete: () => {
      this.isLoadingBon = false;
    }
  });
}
  // Enregistrement d'un bon
  private enregistrerBon(bon: Bon, panier: Panier, fichier: File | null): void {
    if (!this.selectedClient) return;

    const bonCompletData = {
      bon: { ...bon, id: this.bonBrouillon?.id, clientId: this.selectedClient.id },
      panier: { id: this.panierBrouillon?.id, ...panier, clientId: this.selectedClient.id, statut: 'validé' },
      articles: panier.articles.map(article => ({
        id: article.id,
        produitId: article.produitId ?? article.produit?.id ?? article.Produit?.id,
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
      clientId: this.selectedClient.id,
      typeEntite: this.typeEntite,
      paiement: bon.avance && bon.avance > 0 ? {
        numero: this.generatedNumeroPaiement,
        methodePaiement: bon.methodePaiement,
        description: `Avance pour bon ${bon.numero}`,
        typePaiement: 'client'
      } : undefined
    };

    console.log('Données bon complet :',bonCompletData, fichier);

    this.isLoadingBon = true;
    this.bonService.createBonComplet(bonCompletData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.paiement) {
            this.createRecette(result.paiement);
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
    // Recharger également la liste des bons
    this.loadBonsAvecPagination();
  
    // Recharger les paiements si nécessaire
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
  /* private createRecette(paiement: any): void {
    const recette = {
      montant: paiement.montant,
      date: paiement.date,
      paiementId: paiement.id,
      statutRecette: 'valide',
      description: `Paiement client ID: ${this.selectedClient?.id} - Paiement ID: ${paiement.numero}`,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      categoryId: 15,
      paymentMode: paiement.methodePaiement
    };

    const formData = new FormData();
    Object.entries(recette).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    this.recetteService.createRecette(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Erreur création recette:', err)
      });
  } */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createRecette(paiement: any): void {
  this.getCategoryId('PAIEMENT_CLIENT').then(categoryId => {
    if (!categoryId) {
      console.error('Catégorie non trouvée');
      return;
    }

    const recette = {
      montant: paiement.montant,
      date: paiement.date,
      paiementId: paiement.id,
      statutRecette: 'valide',
      description: `Paiement client ID: ${this.selectedClient?.id} - Paiement ID: ${paiement.numero}`,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      categoryId: categoryId,
      paymentMode: paiement.methodePaiement
    };

    const formData = new FormData();
    Object.entries(recette).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    this.recetteService.createRecette(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Erreur création recette:', err)
      });
  });
}

  // Enregistrement d'un paiement
  private enregistrerPaiement(paiement: Paiement, fichier: File | null): void {
    if (!this.selectedClient) return;

    const paiementComplet = {
      ...paiement,
      agentId: this.agentId,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      clientId: this.selectedClient.id
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
          this.createRecette(result);
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
    if (!this.selectedClient) return;

    console.log('=== RAFRAÎCHISSEMENT IMMÉDIAT ===');

    this.loadOperations();

    //this.rafraichirDonneesClient();

    // Attendre un peu pour que le serveur ait fini de traiter
    this.rafraichirDonneesClient();
    this.loadBonsAvecPagination();
    this.loadPaiementsAvecPagination();
  }

  // Ajoutez cette méthode
  getCurrentSolde(): number {
    if (!this.selectedClient) return 0;
    
    if (this.selectedMagasinId) {
      // Priorité au Map mis à jour
      const soldeDuMap = this.magasinSoldes.get(this.selectedMagasinId);
      if (soldeDuMap !== undefined) {
        return soldeDuMap;
      }
      
      // Fallback sur le client
      const magasin = this.selectedClient.Magasins?.find(m => m.id === this.selectedMagasinId);
      return magasin?.MagasinClient?.solde || 0;
    }
    
    return this.getSoldeTotal(this.selectedClient);
  }

  private rafraichirDonneesClient(): void {
    if (!this.selectedClient) return;

    console.log('=== RAFRAÎCHISSEMENT CLIENT ===');
    console.log('Client avant mise à jour:', this.selectedClient.nomComplet);
    console.log('Soldes avant:', Array.from(this.magasinSoldes.entries()));

    // Sauvegarder le magasin actuel
    const magasinActuel = this.selectedMagasinId;

    this.clientService.getClientWithMagasins(this.selectedClient.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientMisAJour) => {
          console.log('Client après mise à jour reçu:', clientMisAJour);
          console.log('Magasins du client:', clientMisAJour.Magasins?.map(m => ({
            id: m.id,
            nom: m.nom,
            solde: m.MagasinClient?.solde
          })));

          const index = this.clients.findIndex(c => c.id === clientMisAJour.id);
          if (index !== -1) this.clients[index] = clientMisAJour;

          this.mettreAJourSoldeClientDansMap(clientMisAJour);

          this.selectedClient = clientMisAJour;
          this.filteredClients = [...this.clients]; 

          // Restaurer le magasin sélectionné
          if (!this.isAdmin && this.magasinId) {
            this.selectedMagasinId = this.magasinId;
          } else if (magasinActuel) {
            this.selectedMagasinId = magasinActuel;
          }
          
          // Mettre à jour le Map des soldes
          if (clientMisAJour.Magasins) {
            clientMisAJour.Magasins.forEach(magasin => {
              if (magasin.MagasinClient) {
                this.magasinSoldes.set(magasin.id!, magasin.MagasinClient.solde);
              }
            });
          }
          console.log('Soldes après mise à jour:', Array.from(this.magasinSoldes.entries()));
          console.log('Nouveau solde actuel:', this.getSoldeActuel());

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Erreur rafraîchissement client:', err)
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

  /**
   * Facturer un bon (générer une facture)
   * @param bon - Le bon à facturer
   */
  /* onFacturerBon(bon: Bon): void {
    // Vérifier que le bon n'est pas déjà facturé
    if (bon.statutBon === 'facturé') {
      this.toastr.warning(`Le bon ${bon.numero} est déjà facturé`);
      return;
    }
    // Déterminer le type de facture en fonction du type de bon
    const typeFacture = this.determinerTypeFacture(bon);
    
    // Message de confirmation personnalisé
    const messageConfirmation = this.getConfirmationMessage(bon, typeFacture);
    if (!confirm(messageConfirmation)) return;
    
    // Afficher un indicateur de chargement
    this.isLoadingBon = true;
    
    // Appeler le service approprié selon le type
    this.appelerCreationFacture(bon, typeFacture);
  }
 */

  // client.component.ts

onFacturerBon(bon: Bon): void {
    // Éviter la double facturation
    if (bon.statutBon === 'facturé') {
      this.toastr.warning(`Le bon ${bon.numero} est déjà facturé`);
      return;
    }

    // Vérifier le type et le statut
    if (bon.type !== 'commande' && bon.type !== 'vente' && bon.type !== 'livraison') {
      this.toastr.warning(`Ce type de bon (${bon.type}) ne peut pas être facturé`);
      return;
    }

    if (bon.type === 'commande' && bon.statutBon !== 'livré') {
      this.toastr.warning(`La commande doit être livrée avant d'être facturée`);
      return;
    }

    if ((bon.type === 'vente' || bon.type === 'livraison') && bon.statutBon !== 'validé') {
      this.toastr.warning(`Le bon doit être validé avant d'être facturé`);
      return;
    }

    this.isLoadingBon = true;

    // Créer la facture
    let remise = 0;
    const demandeRemise = confirm('Voulez-vous appliquer une remise sur cette facture ?');
    if (demandeRemise) {
      const remiseValue = prompt('Montant de la remise (en F CFA) :', '0');
      if (remiseValue && !isNaN(parseFloat(remiseValue))) {
        remise = parseFloat(remiseValue);
      }
    }

    this.factureService.createFactureFromBon(
      bon.id!,
      remise,
      `Facture pour bon ${bon.numero}`
    ).subscribe({
      next: (response) => {
        this.toastr.success(`Facture ${response.facture.numero_facture} créée avec succès`);

        // Mettre à jour le statut avec l'API simplifiée
        this.bonService.updateStatutBonBis(bon.id!, 'facturé', response.facture.numero_facture)
          .subscribe({
            next: (result) => {
              console.log('Bon mis à jour:', result);
              
              // Mettre à jour localement
              const index = this.bons.findIndex(b => b.id === bon.id);
              if (index !== -1) {
                this.bons[index] = { ...this.bons[index], statutBon: 'facturé', numeroFacture: response.facture.numero_facture };
              }
              
              // Ouvrir le PDF
              this.openFacturePDF(response.facture.id, response.pdf);
              
              // Rafraîchir
              this.rafraichirDonneesApresFacturation();
            },
            error: (err) => {
              console.error('Erreur mise à jour statut bon:', err);
              this.toastr.warning('Facture créée mais erreur lors de la mise à jour du statut');
              this.openFacturePDF(response.facture.id, response.pdf);
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
  /**
   * Déterminer le type de facture en fonction du type de bon
   */
  private determinerTypeFacture(bon: Bon): 'commande' | 'vente' | 'achat' | null {
    switch (bon.type?.toLowerCase()) {
      case 'commande':
        return 'commande';
      case 'vente':
      case 'livraison':
        return 'vente';
      case 'achat':
        return 'achat';
      default:
        // Par défaut, si le bon est lié à un client, c'est une vente
        if (bon.clientId) return 'vente';
        // Si lié à un fournisseur, c'est un achat
        if (bon.fournisseurId) return 'achat';
        return null;
    }
  }

  /**
   * Obtenir le message de confirmation personnalisé
   */
  private getConfirmationMessage(bon: Bon, typeFacture: string | null): string {
    const titre = this.getTypeBonLabel(bon.type);
    
    switch (typeFacture) {
      case 'commande':
        return `Générer un bon de commande pour ${titre} ${bon.numero} ?\n\n` +
              `Cette opération va créer un document d'engagement sans impact sur la dette.`;
      case 'vente':
        return `Facturer le ${titre} ${bon.numero} ?\n\n` +
              `Cette opération va créer une facture de vente.`;
      case 'achat':
        return `Facturer le ${titre} ${bon.numero} ?\n\n` +
              `Cette opération va créer une facture d'achat.`;
      default:
        return `Facturer le ${titre} ${bon.numero} ?`;
    }
  }

  /**
   * Obtenir le libellé du type de bon
   */
  private getTypeBonLabel(type: string): string {
    const labels: Record<string, string> = {
      'commande': 'bon de commande',
      'vente': 'bon de vente',
      'livraison': 'bon de livraison',
      'achat': 'bon d\'achat',
      'retour': 'bon de retour'
    };
    return labels[type?.toLowerCase()] || 'bon';
  }

  /**
   * Appeler la création de facture selon le type
   */
  private appelerCreationFacture(bon: Bon, typeFacture: 'commande' | 'vente' | 'achat' | null): void {
    // Ajouter un petit délai pour permettre à l'utilisateur de voir le chargement
    setTimeout(() => {
      switch (typeFacture) {
        case 'commande':
          this.creerFactureCommande(bon);
          break;
        case 'vente':
          this.creerFactureVente(bon);
          break;
       /*  case 'achat':
          this.creerFactureAchat(bon);
          break; */
        default:
          this.toastr.error('Type de bon non reconnu pour la facturation');
          this.isLoadingBon = false;
      }
    }, 100);
  }

  /**
   * Créer une facture de commande (bon de commande)
   */
  private creerFactureCommande(bon: Bon): void {
    //if(!confirm(`Facturer le bon de commande avec la Réf: ${bon.numero}`)) return;
    this.factureService.createFactureCommande(
      bon.id!,
      `Bon de commande généré depuis le système - Réf: ${bon.numero}`
    ).subscribe({
      next: (response) => {

        console.log('Facture commande créer :', response);
        this.toastr.success(`Bon de commande ${response.facture.numero_facture} créé avec succès`);
        
        // Mettre à jour le statut du bon
        this.changerStatutBon(bon, 'facturé', { 
          numeroFacture: response.facture.numero_facture,
          //typeFacture: 'commande'
        });
        
        // Ouvrir le PDF
        this.openFacturePDF(response.facture.id, response.pdf);
        
        // Rafraîchir les données
        this.rafraichirDonneesApresFacturation();
      },
      error: (err) => {
        console.error('Erreur création bon de commande:', err);
        this.toastr.error(err.error?.message || 'Erreur lors de la création du bon de commande');
        this.isLoadingBon = false;
      }
    });
  }

  /**
   * Créer une facture de vente
   */
  
  private creerFactureVente(bon: Bon): void {
  // Optionnel : demander une remise
  let remise = 0;
  const demandeRemise = confirm('Voulez-vous appliquer une remise sur cette facture ?');
  
  if (demandeRemise) {
    const remiseValue = prompt('Montant de la remise (en F CFA) :', '0');
    if (remiseValue && !isNaN(parseFloat(remiseValue))) {
      remise = parseFloat(remiseValue);
    }
  }
  this.factureService.createFactureFromBon(
    bon.id!,
    remise,
    `Facture de vente pour bon ${bon.numero}`
  )
  .pipe(
    takeUntil(this.destroy$), 
    finalize(() => this.isLoadingBon = false)
  )
  .subscribe({
    next: (response) => {
      console.log('Facture vente créée :', response);

      this.toastr.success(`Facture ${response.facture.numero_facture} créée avec succès`);
      
      // Mettre à jour le statut du bon AVEC le numéro de facture
      // Utiliser la méthode changerStatutBon qui va correctement propager les données
      this.changerStatutBon(bon, 'facturé', { 
        numeroFacture: response.facture.numero_facture,
        dateFacture: new Date()
      });
      
      // Ouvrir le PDF
      this.openFacturePDF(response.facture.id, response.pdf);
      
      // Rafraîchir les données
      this.rafraichirDonneesApresFacturation();
    },
    error: (err) => {
      console.error('Erreur création facture vente:', err);
      this.toastr.error(err.error?.message || 'Erreur lors de la création de la facture');
      //this.isLoadingBon = false; // S'assurer de réinitialiser isLoadingBon
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
    this.loadClientsWithPagination();
    
    // Réinitialiser l'état de chargement après un délai
    setTimeout(() => {
      this.isLoadingBon = false;
      this.cdr.detectChanges();
    }, 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private changerStatutBon(bon: Bon, nouveauStatut: string, extraData: any = {}): void {
    this.isLoadingBon = true;
    const bonMiseAJour = { 
      ...bon, 
      ...extraData, 
      statutBon: nouveauStatut,
      numeroFacture: extraData.numeroFacture || bon.numeroFacture
     };
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
    const articles = panier?.ArticlePaniers?.map(article => ({
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
      clientId: bonMiseAJour.clientId,
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
    /* if (!bon) return;
    
    const articlesFormates = (bon.Panier?.ArticlePaniers || []).map(article => ({
      ...article,
      produit: article.produit || article.Produit,
      prixUnitaire: this.safeNumber(article.prixUnitaire || article.prixVenteUnitaire),
      quantite: this.safeNumber(article.quantite),
      total: this.safeNumber(article.quantite) * this.safeNumber(article.prixUnitaire || article.prixVenteUnitaire)
    }));

    const bonData = {
      numero: bon.numero,
      date: bon.dateBon,
      client: this.selectedClient ? {
        nomComplet: this.selectedClient.nomComplet,
        adresse: this.selectedClient.adresse,
        telephone: this.selectedClient.telephone,
        email: this.selectedClient.email
      } : { nomComplet: 'Client non spécifié', adresse: '', telephone: '', email: '' },
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

    this.pdfGenerator.generateBonClient(bonData); */
      if(!confirm('Imprimer l\'operation ?')) return;
    if (!bon) {
        this.toastr.error('Aucun bon sélectionné');
        return;
      }
    
      try {
        this.isLoadingBon = true;
        
        console.log('Bon à imprimer:', bon);
        
        // Valider et formater les articles
        const articlesFormates = (bon.Panier?.ArticlePaniers || []).map(article => {
          if (!article) return null;
          
          return new ArticlePanier({
            ...article,
            produit: article.produit || article.Produit,
            prixUnitaire: this.safeNumber(article.prixUnitaire || article.prixVenteUnitaire),
            quantite: this.safeNumber(article.quantite),
            montantRemise: this.safeNumber(article.montantRemise),
            montantTVA: this.safeNumber(article.montantTVA),
            totalHT: this.safeNumber(article.totalHT),
            totalTTC: this.safeNumber(article.totalTTC)
          });
        }).filter(article => article != null);
    
        // Préparer les totaux
        const totaux = {
          sousTotal: this.safeNumber(bon.Panier?.totalHT),
          tauxTVA: this.safeNumber(bon.Panier?.tauxTVA),
          montantTVA: this.safeNumber(bon.Panier?.tva),
          totalTTC: this.safeNumber(bon.Panier?.totalTTC),
          remise: this.safeNumber(bon.remise),
          avance: this.safeNumber(bon.avance),
          netAPayer: this.safeNumber(bon.resteAPayer),
          avoir:this.safeNumber(bon.montantAvoir)
        };
    
        // Déterminer le type de document
        let titre = 'BON';
        let typeDocument = 'bon';
        
        if (bon.type === 'commande') {
          titre = 'BON DE COMMANDE';
          typeDocument = 'commande';
        } else if (bon.type === 'vente') {
          titre = 'BON DE VENTE';
          typeDocument = 'vente';
        } else if (bon.type === 'avoir') {
          titre = 'AVOIR';
          typeDocument = 'avoir';
        }
    
        const bonData = {
          titre: titre,
          typeBon: typeDocument,
          numero: bon.numero || 'N/A',
          date: bon.dateBon || new Date(),
          dateLivraisonPrevue: bon.dateLivraisonPrevue,
          client: this.selectedClient ? {
            nomComplet: this.selectedClient.nomComplet || 'N/A',
            adresse: this.selectedClient.adresse || '',
            telephone: this.selectedClient.telephone || '',
            email: this.selectedClient.email || ''
          } : { 
            nomComplet: 'Client non spécifié', 
            adresse: '', 
            telephone: '', 
            email: '' 
          },
          articles: articlesFormates,
          totaux: totaux,
          statut: bon.statutBon,
          commentaire: bon.description
        };
    
        console.log('Données formatées pour le PDF du bon:', bonData);
        this.pdfGenerator.generateBonClient(bonData);
      } 
      catch (error) {
        console.error('Erreur génération bon client:', error);
        this.toastr.error('Erreur lors de la génération du bon');
      }
      finally {
        this.isLoadingBon = false;
      }
    
  }

  onImprimerReleve(): void {
    /* if (!this.selectedClient) return;

    const operationsFormatees = this.filteredOperations.map(op => ({
      date: op.dateOperation,
      type: op.type,
      reference: op.numeroVersement || op.Bon?.numero,
      montant: op.montantPaye || op.Bon?.montantTotal
    }));

    const releveData = {
      client: {
        nomComplet: this.selectedClient.nomComplet,
        adresse: this.selectedClient.adresse,
        telephone: this.selectedClient.telephone,
        email: this.selectedClient.email
      },
      periode: `${this.startDate || 'Début'} au ${this.endDate || 'Aujourd\'hui'}`,
      operations: operationsFormatees,
      synthese: {
        totalAchats: this.calculerTotalAchats(),
        totalVersements: this.calculerTotalVersements(),
        solde: this.selectedClient.solde
      }
    };

    this.pdfGenerator.generateReleveClient(releveData); */

    if(!confirm('Imprimer le relevé pour la période sélectionnée ?')) return;

    if (!this.selectedClient) {
      this.toastr.error('Aucun client sélectionné');
      return;
    }

    try {
      this.isLoadingClient = true;
      
      // Préparer les données du relevé
      const operationsFormatees = this.filteredOperations.map(op => {
        if (!op) return null;
        
        return {
          ...op,
          dateOperation: op.dateOperation,
          type: op.type || 'NON SPECIFIE',
          numeroVersement: op.numeroVersement,
          montantPaye: this.safeNumber(op.montantPaye),
          commentaire: op.commentaire,
          Bon: op.Bon
        };
      }).filter(op => op != null);

      const totaux = this.calculerTotauxOperations();
      const releveData = {
        client: {
          nomComplet: this.selectedClient.nomComplet || 'N/A',
          adresse: this.selectedClient.adresse || '',
          telephone: this.selectedClient.telephone || '',
          email: this.selectedClient.email || '',
          plafond: this.safeNumber(this.selectedClient.plafond)
        },
        periode: `${this.startDate || 'Début'} au ${this.endDate || 'Aujourd\'hui'}`,
        operations: operationsFormatees,
        synthese: {
          totalAchats: totaux.ventes,
          totalVersements: totaux.versements,
          totalCommandesLivrees:totaux.commandesLivrees,
          totalCommandesAnnulees:totaux.commandesAnnulees,
          totalCommandesNonLivrees:totaux.commandesNonLivrees,
          totalRetours:totaux.retours,
          totalAvoirs:totaux.avoirs,
          //soldeInitial: this.safeNumber(this.selectedClient.solde),
          nouveauSolde: this.safeNumber(this.getSoldeActuel())
        },
        //solde: this.safeNumber(this.selectedClient.solde)
      };

      console.log('Données pour relevé client:', releveData);
      this.pdfGenerator.generateReleveClient(releveData);
      
    } catch (error) {
      console.error('Erreur génération relevé client:', error);
      this.toastr.error('Erreur lors de la génération du relevé');
    } finally {
      this.isLoadingClient = false;
    }
  }

  onGenererTicketVersement(operation: Operation): void {
    if (!operation || (operation.type !== 'VERSEMENT' && operation.type !== 'REGLEMENT')) return;

    const versementData = {
      client: this.selectedClient ? {
        nomComplet: this.selectedClient.nomComplet
      } : null,
      date: operation.dateOperation,
      numeroReference: operation.numeroVersement,
      moyenPaiement: operation.moyenPaiement,
      montantVerse: this.safeNumber(operation.montantPaye),
      soldePrecedent: this.safeNumber(this.getSoldeTotal(this.selectedClient!)) + this.safeNumber(operation.montantPaye),
      nouveauSolde: this.safeNumber(this.getSoldeTotal(this.selectedClient!)),
      description: operation.commentaire,
      type: operation.type === 'VERSEMENT' ? 'Versement' : 'Règlement',
      agent: operation.user?.['nom']
    };

    this.pdfGenerator.generateTicketVersementClient(versementData);
  }

  onGenererTicketPaiementBon(bon: Bon): void {
    if (!bon) return;

    const paiementData = {
      client: this.selectedClient ? {
        nomComplet: this.selectedClient.nomComplet
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

    this.pdfGenerator.generateTicketVersementClient(paiementData);
  }

  // Utilitaires
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private safeNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private calculerTotauxOperations() {
  const result = {
    commandesLivrees: 0,
    commandesNonLivrees: 0,
    commandesAnnulees: 0,
    ventes: 0,
    retours: 0,
    avoirs: 0,
    versements: 0
  };

  for (const op of this.filteredOperations) {
    const montant = this.safeNumber(op.Bon?.Panier?.totalTTC) || 0;

    // COMMANDES
    if (op.type === 'COMMANDE') {
      if (op.Bon?.statutBon === 'livré') {
        result.commandesLivrees += montant;
      } else if (op.Bon?.statutBon === 'validé') {
        result.commandesNonLivrees += montant;
      } else if (op.Bon?.statutBon === 'annulé') {
        result.commandesAnnulees += montant;
      }
    }

    // VENTES
    else if (op.type === 'VENTE') {
      result.ventes += montant;
    }

    // RETOURS
    else if (
      op.type === 'RETOUR' ||
      op.Bon?.statutBon === 'retourné' ||
      op.Bon?.statutBon === 'retourné partiellement'
    ) {
      result.retours += montant;
    }

    // AVOIRS
    else if (op.type === 'AVOIR') {
      result.avoirs += this.safeNumber(op.Bon?.montantAvoir ?? 0);
    }

    // VERSEMENTS
    else if (op.type === 'REGLEMENT') {
      result.versements += this.safeNumber(op.montantPaye) || 0;
    }
  }

  return result;
}
}
