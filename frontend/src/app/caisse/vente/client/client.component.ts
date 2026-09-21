import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { User } from '@sentry/angular';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { Bon } from '../../../modeles/bon.model';
import { Client } from '../../../modeles/clients.model';
import { Magasin } from '../../../modeles/magasin.model';
import { Operation } from '../../../modeles/operation.model';
import { Paiement } from '../../../modeles/paiement.model';
import { Panier } from '../../../modeles/panier.model';
import { Produits } from '../../../modeles/produit.modele';
import { ApplicationService } from '../../../services/application.service';
import { AuthService } from '../../../services/auth.service';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { BonsFilter, BonsService } from '../../../services/bons.service';
import { ClientsFilter, ClientsService } from '../../../services/clients.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { OperationsService } from '../../../services/operations.service';
import { PaiementsFilter, PaiementsResponse, PaiementsService } from '../../../services/paiements.service';
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
import { FactureComponent } from '../facture/facture.component';
import { TableSearchComponent } from '../../../shared/table/table-search.component';
import { TablePaginationComponent } from '../../../shared/table/table-pagination.component';
import { TableStateComponent } from '../../../shared/table/table-state.component';
import { ListState, toListState } from '../../../shared/table/list-state';

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
    FactureComponent,
    TableSearchComponent,
    TablePaginationComponent,
    TableStateComponent
  ],
  templateUrl: './client.component.html',
  styleUrl: './client.component.css'
})
export class ClientComponent implements OnInit, OnDestroy {

  // État général
  isLoadingClient = false;
  /** État d'affichage de la liste clients (loading/success/empty/error) — voir shared/table */
  clientsListState: ListState = 'idle';
  clientsLoadError = false;
  /** États des onglets bons et versements */
  bonsListState: ListState = 'idle';
  paiementsListState: ListState = 'idle';
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

  isAdmin = false;

  // Formulaire
  clientForm!: FormGroup;

  // Modal
  showModal = false;
  isEditMode = false;

  // Pagination bons
  bonsCurrentPage = 1;
  bonsItemsPerPage = 10;
  bonsTotalItems = 0;
  bonsTotalPages = 0;
  bonsHasNext = false;
  bonsHasPrev = false;
  bonsFilters: BonsFilter = { page: 1, limit: 10, search: '', type: 'tous', statut: 'tous' };
  bonTypeOptions = ['tous', 'vente', 'retour', 'avoir'];
  bonStatutOptions = ['tous', 'brouillon', 'validé', 'livré', 'facturé', 'annulé', 'retourné'];
  private bonsSearchSubject = new Subject<string>();

  // Pagination versements
  paiementsCurrentPage = 1;
  paiementsItemsPerPage = 10;
  paiementsTotalItems = 0;
  paiementsTotalPages = 0;
  paiementsHasNext = false;
  paiementsHasPrev = false;
  paiementsFilters: PaiementsFilter = { page: 1, limit: 10, search: '', methodePaiement: 'tous' };
  methodePaiementOptions = ['tous', 'Espèce', 'Carte', 'Virement', 'Wave', 'Orange Money', 'Chèque', 'Autre'];
  private paiementsSearchSubject = new Subject<string>();

  // Pagination clients
  clientsCurrentPage = 1;
  clientsItemsPerPage = 10;
  clientsTotalItems = 0;
  clientsTotalPages = 0;
  clientsHasNext = false;
  clientsHasPrev = false;
  clientsFilters: ClientsFilter = { page: 1, limit: 10, search: '', statut: 'tous' };
  clientStatutOptions = ['tous', 'actif', 'inactif'];
  private clientsSearchSubject = new Subject<string>();

  // Formulaire bon/paiement
  showBonForm = false;
  showPaiementForm = false;
  textBoutonNewBon = 'Nouveau bon';
  generatedNumero!: string;
  bonBrouillon: Bon | null = null;
  panierBrouillon: Panier | null = null;
  resetPanierFlag = false;
  bonSubmissionError = 0;

  // Listes
  bons: Bon[] = [];
  paiements: Paiement[] = [];
  operations: Operation[] = [];
  filteredOperations: Operation[] = [];

  startDate?: string;
  endDate?: string;

  private destroy$ = new Subject<void>();

  Math = Math;

  // Services
  private fb = inject(FormBuilder);
  private paginationService = inject(ApplicationService);
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

  ngOnInit(): void {
    this.authService.currentUser.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
      this.isAdmin = this.authService.hasRole('Administrateur') || this.authService.hasRole('Administrateur secondaire');
      if (!this.isAdmin && this.magasinId) this.selectedMagasinId = this.magasinId;
      if (this.code_structure) {
        this.loadData();
        this.loadDataProduits();
        this.loadBonsAvecPagination();
        this.loadPaiementsAvecPagination();
        this.loadStructureInfo();
      }
    });

    this.initForm();

    this.bonBrouillonService.bonBrouillon$.pipe(takeUntil(this.destroy$))
      .subscribe(bon => this.bonBrouillon = bon);
    this.bonBrouillonService.panierBrouillon$.pipe(takeUntil(this.destroy$))
      .subscribe(panier => this.panierBrouillon = panier);

    this.bonsSearchSubject.pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => { this.bonsFilters.search = term; this.bonsFilters.page = 1; this.loadBonsAvecPagination(); });

    this.paiementsSearchSubject.pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => { this.paiementsFilters.search = term; this.paiementsFilters.page = 1; this.loadPaiementsAvecPagination(); });

    this.clientsSearchSubject.pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => { this.clientsFilters.search = term; this.clientsFilters.page = 1; this.loadData(); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.clientForm = this.fb.group({
      nomComplet: ['', Validators.required],
      code_structure: [this.code_structure],
      adresse: ['', Validators.required],
      telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
      email: ['', [Validators.required, Validators.email]],
      plafond: [0],
      statut: [true],
      estEmploye: [false],
      magasinIds: [[], Validators.required]
    });
  }

  get f() { return this.clientForm.controls; }

  loadData(): void {
    if (!this.code_structure) return;
    const filters: ClientsFilter = {
      page: this.clientsFilters.page,
      limit: this.clientsItemsPerPage,
      search: this.clientsFilters.search || undefined,
      statut: this.clientsFilters.statut
    };
    this.isLoadingClient = true;
    this.clientsListState = 'loading';
    this.clientsLoadError = false;
    this.clientService.getClientsByStructureBis(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: (response) => {
          this.clients = response.items;
          this.clients.forEach(client => {
            client.Magasins?.forEach(magasin => {
              if (magasin.MagasinClient) this.magasinSoldes.set(magasin.id!, magasin.MagasinClient.solde);
            });
          });
          this.clientsTotalItems = response.pagination.total;
          this.clientsCurrentPage = response.pagination.page;
          this.clientsTotalPages = response.pagination.totalPages;
          this.clientsHasNext = response.pagination.hasNext;
          this.clientsHasPrev = response.pagination.hasPrev;
          this.clientsListState = toListState(false, false, this.clients);
          this.loadMagasins();
        },
        error: err => {
          this.clientsLoadError = true;
          this.clientsListState = 'error';
        }
      });
  }

  loadMagasins(): void {
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (magasins) => { this.magasins = magasins; },
        error: err => console.error('Erreur chargement magasins', err)
      });
  }

  loadDataProduits(): void {
    this.produitsServices.getProduitsDisponibles(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (produits) => { this.produits = produits; this.filteredProducts = produits; },
        error: err => console.error('Erreur chargement produits', err)
      });
  }

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
    this.bonsListState = 'loading';
    this.bonService.getBonsClientByStructureBis(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingBon = false))
      .subscribe({
        next: (response) => {
          this.bons = response.items;
          this.bonsTotalItems = response.pagination.total;
          this.bonsCurrentPage = response.pagination.page;
          this.bonsTotalPages = response.pagination.totalPages;
          this.bonsHasNext = response.pagination.hasNext;
          this.bonsHasPrev = response.pagination.hasPrev;
          this.bonsListState = 'success';
        },
        error: err => {
          this.bonsListState = 'error';
        }
      });
  }

  loadPaiementsAvecPagination(): void {
    if (!this.code_structure) return;
    const filters: PaiementsFilter = {
      page: this.paiementsFilters.page,
      limit: this.paiementsItemsPerPage,
      search: this.paiementsFilters.search || undefined,
      methodePaiement: this.paiementsFilters.methodePaiement !== 'tous' ? this.paiementsFilters.methodePaiement : undefined
    };
    this.isLoadingPaiement = true;
    this.paiementsListState = 'loading';
    this.paiementService.getPaiementsClients(this.code_structure, filters)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingPaiement = false))
      .subscribe({
        next: (response: PaiementsResponse) => {
          this.paiements = response.items || [];
          this.paiementsTotalItems = response.pagination?.total || 0;
          this.paiementsCurrentPage = response.pagination?.page || 1;
          this.paiementsTotalPages = response.pagination?.totalPages || 0;
          this.paiementsHasNext = response.pagination?.hasNext || false;
          this.paiementsHasPrev = response.pagination?.hasPrev || false;
          this.paiementsListState = 'success';
        },
        error: (err: unknown) => {
          this.paiementsListState = 'error';
        }
      });
  }

  loadOperations(): void {
    if (!this.selectedClient) return;
    this.isLoadingOperation = true;
    this.operationService.getOperationsByClient(
      this.code_structure!, this.selectedClient.id!,
      { dateDebut: this.startDate, dateFin: this.endDate }
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ops) => { this.operations = ops; this.filteredOperations = [...ops]; this.isLoadingOperation = false; this.cdr.detectChanges(); },
        error: (err) => { this.errorMessage = 'Erreur lors du chargement des opérations.'; console.error(err); this.isLoadingOperation = false; this.cdr.detectChanges(); }
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

  // Pagination handlers – clients
  onClientsPageChange(page: number): void { if (page >= 1 && page <= this.clientsTotalPages) { this.clientsFilters.page = page; this.loadData(); } }
  onClientsSearchChange(term: string): void { this.clientsSearchSubject.next(term); }
  onClientsRowsPerPageChange(limit: number): void { this.clientsItemsPerPage = limit; this.clientsFilters.limit = limit; this.clientsFilters.page = 1; this.loadData(); }
  onClientsStatutChange(statut: string): void { this.clientsFilters.statut = statut; this.clientsFilters.page = 1; this.loadData(); }
  resetClientsFilters(): void { this.clientsFilters = { page: 1, limit: this.clientsItemsPerPage, search: '', statut: 'tous' }; this.loadData(); }

  // Pagination handlers – bons
  onBonsPageChange(page: number): void { if (page >= 1 && page <= this.bonsTotalPages) { this.bonsFilters.page = page; this.loadBonsAvecPagination(); } }
  onBonsSearchChange(term: string): void { this.bonsSearchSubject.next(term); }
  onBonsRowsPerPageChange(limit: number): void { this.bonsItemsPerPage = limit; this.bonsFilters.limit = limit; this.bonsFilters.page = 1; this.loadBonsAvecPagination(); }
  onBonsTypeChange(type: string): void { this.bonsFilters.type = type; this.bonsFilters.page = 1; this.loadBonsAvecPagination(); }
  onBonsStatutChange(statut: string): void { this.bonsFilters.statut = statut; this.bonsFilters.page = 1; this.loadBonsAvecPagination(); }
  resetBonsFilters(): void { this.bonsFilters = { page: 1, limit: this.bonsItemsPerPage, search: '', type: 'tous', statut: 'tous' }; this.loadBonsAvecPagination(); }

  // Pagination handlers – paiements
  onPaiementsPageChange(page: number): void { if (page >= 1 && page <= this.paiementsTotalPages) { this.paiementsFilters.page = page; this.loadPaiementsAvecPagination(); } }
  onPaiementsSearchChange(term: string): void { this.paiementsSearchSubject.next(term); }
  onPaiementsRowsPerPageChange(limit: number): void { this.paiementsItemsPerPage = limit; this.paiementsFilters.limit = limit; this.paiementsFilters.page = 1; this.loadPaiementsAvecPagination(); }
  onPaiementsMethodeChange(methode: string): void { this.paiementsFilters.methodePaiement = methode; this.paiementsFilters.page = 1; this.loadPaiementsAvecPagination(); }
  resetPaiementsFilters(): void { this.paiementsFilters = { page: 1, limit: this.paiementsItemsPerPage, search: '', methodePaiement: 'tous' }; this.loadPaiementsAvecPagination(); }

  // Sélection et actions
  onRowSelect(client: Client): void { this.selectedClient = client; this.isRowSelected = true; }
  closeActions(): void { this.selectedClient = null; this.isRowSelected = false; }

  onAction(action: string): void {
    if (this.selectedClient) {
      if (action === 'operation') {
        this.checkBrouillonExists((exists) => { this.textBoutonNewBon = exists ? 'Modifier le bon brouillon' : 'Nouveau bon'; });
        this.showBonDetails();
      } else if (action === 'modifier') {
        this.openModal(this.selectedClient);
      } else if (action === 'statut') {
        this.toggleStatut(this.selectedClient);
      }
    } else {
      this.openModal();
    }
  }

  /**
   * Formate une date en "YYYY-MM-DD" en utilisant l'heure locale
   * (pas toISOString qui convertit en UTC et peut décaler d'un jour)
   */
  private formatDateLocale(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  showBonDetails(): void {
    this.showDetails = true;
    this.showBonDetailsSection = true;
    if (!this.selectedClient) return;
    if (!this.isAdmin && this.magasinId) { this.selectedMagasinId = this.magasinId; } else { this.selectedMagasinId = null; }
    const today = new Date();
    // Utiliser formatDateLocale pour éviter le décalage UTC (toISOString donne la veille en UTC+N)
    this.startDate = this.formatDateLocale(new Date(today.getFullYear(), today.getMonth(), 1));
    this.endDate   = this.formatDateLocale(today);
    this.loadOperations();
  }

  closeDetails(): void {
    this.showDetails = false;
    this.showBonDetailsSection = false;
    if (this.showBonForm) this.showBonForm = false;
    if (this.showPaiementForm) this.showPaiementForm = false;
  }

  onDateChange(dates: { startDate?: string; endDate?: string }): void {
    this.startDate = dates.startDate;
    this.endDate = dates.endDate;
    this.loadOperations();
  }

  // Modal CRUD
  openModal(client?: Client): void {
    if (client) {
      this.isEditMode = true;
      this.clientForm.patchValue({ ...client, magasinIds: client.Magasins?.map(m => m.id) || [] });
    } else {
      this.isEditMode = false;
      this.clientForm.reset({ code_structure: this.code_structure, statut: true, plafond: 0, magasinIds: this.magasinId ? [this.magasinId] : [] });
    }
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

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

  createClient(clientData: Partial<Client>): void {
    const magasinIds = this.clientForm.get('magasinIds')?.value;
    this.isLoadingClient = true;
    this.clientService.ajouterClient(clientData as Client, magasinIds)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => { this.toastr.success('Client créé avec succès'); this.closeModal(); this.loadData(); },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur lors de la création'; this.toastr.error(this.errorMessage); }
      });
  }

  updateClient(id: number, clientData: Partial<Client>): void {
    const magasinIds = this.clientForm.get('magasinIds')?.value;
    this.isLoadingClient = true;
    this.clientService.updateClient(id, clientData, magasinIds)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => { this.toastr.success('Client mis à jour avec succès'); this.closeModal(); this.loadData(); },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour'; this.toastr.error(this.errorMessage); }
      });
  }

  toggleStatut(client: Client): void {
    const action = client.statut ? 'désactiver' : 'activer';
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ce client ?`)) return;
    client.statut = !client.statut;
    this.updateStatus(client.id!, client.statut);
  }

  updateStatus(id: number, newStatus: boolean): void {
    this.isLoadingClient = true;
    this.clientService.updateClientStatut(id, newStatus)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingClient = false))
      .subscribe({
        next: () => { this.toastr.success('Statut mis à jour avec succès'); this.loadData(); },
        error: (err) => { this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du statut'; this.toastr.error(this.errorMessage); }
      });
  }

  // Gestion soldes
  getSoldeTotal(client: Client): number {
    if (!client.Magasins) return 0;
    return client.Magasins.reduce((total, magasin) => total + (this.safeNumber(magasin.MagasinClient?.solde) || 0), 0);
  }

  getSoldeActuel(): number {
    if (!this.selectedClient) return 0;
    const magasinIdAAfficher = this.selectedMagasinId ?? this.magasinId;
    if (magasinIdAAfficher) {
      const magasin = this.selectedClient.Magasins?.find(m => m.id === magasinIdAAfficher);
      return magasin?.MagasinClient?.solde || 0;
    }
    return this.getSoldeTotal(this.selectedClient);
  }

  getNomMagasinSelectionne(): string {
    const magasinIdAAfficher = this.selectedMagasinId ?? this.magasinId;
    if (!magasinIdAAfficher || !this.selectedClient?.Magasins) return 'tous les magasins';
    const magasin = this.selectedClient.Magasins.find(m => m.id === magasinIdAAfficher);
    return magasin?.nom || 'ce magasin';
  }

  safeNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  // Bon forms
  checkBrouillonExists(callback: (exists: boolean) => void): void {
    this.bonService.getBonsBrouillons(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bonsBrouillons) => {
          const exists = bonsBrouillons.some(bon => bon.clientId === this.selectedClient?.id);
          callback(exists);
        },
        error: (err) => { console.error('Erreur chargement brouillons:', err); callback(false); }
      });
  }

  toggleBonForm(): void {
    this.generatedNumero = this.generateNumeroBon();
    this.showBonForm = !this.showBonForm;
    this.showPaiementForm = false;
    if (this.showBonForm) {
      this.chargerBrouillonClient();
    } else {
      this.onBonAnnule();
    }
  }

  togglePaiementForm(): void {
    this.showPaiementForm = !this.showPaiementForm;
    this.showBonForm = false;
  }

  private chargerBrouillonClient(): void {
    if (!this.selectedClient?.id) return;
    this.bonService.getBonsBrouillons(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (brouillons) => {
          const brouillonClient = brouillons.find(b => b.clientId === this.selectedClient?.id);
          if (brouillonClient) {
            this.bonBrouillonService.setBonBrouillon(brouillonClient);
            if (brouillonClient.panier) this.bonBrouillonService.setPanierBrouillon(brouillonClient.panier);
            this.textBoutonNewBon = 'Modifier le bon brouillon';
          } else {
            this.bonBrouillonService.clearBrouillons();
            this.textBoutonNewBon = 'Nouveau bon';
          }
        },
        error: err => console.error('Erreur chargement brouillon client:', err)
      });
  }

  generateNumeroBon(): string {
    const date = new Date();
    const jour = date.getDate().toString().padStart(2, '0');
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    const annee = date.getFullYear().toString();
    const prefixe = 'BON';
    const uuid = uuidv4().split('-')[0];
    return `${prefixe}-${annee}${mois}${jour}-${uuid}`;
  }

  onBonEnregistre(event: import('../../../modeles/bon.model').BonAvecFichier): void {
    if (!this.selectedClient) {
      this.toastr.error('Données manquantes pour l\'enregistrement');
      return;
    }

    event.bon.clientId  = this.selectedClient.id;
    event.bon.statutBon = 'validé';
    if (this.bonBrouillon?.id) {
      event.bon.id = this.bonBrouillon.id;
    }

    const panier = event.bon.panier || this.panierBrouillon;
    if (!panier) {
      this.toastr.error('Veuillez ajouter au moins un article au panier');
      return;
    }

    this.enregistrerBon(event.bon, panier, event.fichier);
  }

  private enregistrerBon(bon: import('../../../modeles/bon.model').Bon, panier: Panier, _fichier?: File | null): void {
    if (!this.selectedClient) return;

    const bonCompletData = {
      bon: {
        ...bon,
        id:             this.bonBrouillon?.id,
        clientId:       this.selectedClient.id,
        code_structure: this.code_structure,
        magasinId:      this.magasinId,
        agentId:        this.agentId
      },
      panier: {
        id:             this.panierBrouillon?.id,
        ...panier,
        clientId:       this.selectedClient.id,
        code_structure: this.code_structure,
        magasinId:      this.magasinId,
        agentId:        this.agentId,
        statut:         'validé'
      },
      articles: (panier?.articles || []).map(article => ({
        id:                  article.id,
        produitId:           article.produit?.id || article.produitId,
        quantite:            article.quantite,
        prixUnitaire:        article.prixUnitaire,
        prixVenteUnitaire:   article.prixVenteUnitaire,
        prixAchatUnitaire:   article.prixAchatUnitaire,
        code_structure:      this.code_structure,
        remise:              article.remise,
        tauxTVA:             article.tauxTVA,
        montantTVA:          article.montantTVA,
        montantRemise:       article.montantRemise,
        totalHT:             article.totalHT,
        totalTTC:            article.totalTTC
      })),
      clientId:   this.selectedClient.id,
      typeEntite: this.typeEntite,
      paiement: bon.avance && bon.avance > 0 ? {
        numero:          this.generatedNumero,
        methodePaiement: bon.methodePaiement || 'Espèce',
        description:     `Avance pour bon ${bon.numero}`,
        typePaiement:    'client'
      } : undefined
    };

    this.isLoadingBon = true;
    this.bonService.createBonComplet(bonCompletData)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingBon = false))
      .subscribe({
        next: () => {
          this.toastr.success('Bon enregistré avec succès');
          this.showBonForm = false;
          this.bonBrouillonService.clearBrouillons();
          this.loadBonsAvecPagination();
          this.loadOperations();
          // Rafraîchir le solde du client
          if (this.selectedClient?.id) {
            this.clientService.getClientWithMagasins(this.selectedClient.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (clientMaj) => { this.selectedClient = clientMaj; this.cdr.detectChanges(); },
                error: (err) => console.error('Erreur rafraîchissement client:', err)
              });
          }
        },
        error: (err) => {
          console.error('Erreur enregistrement bon:', err);
          this.bonSubmissionError++;
          this.toastr.error(err.error?.error || err.error?.message || 'Erreur lors de l\'enregistrement du bon');
        }
      });
  }

  onBonAnnule(): void {
    this.showBonForm = false;
    this.bonBrouillonService.clearBrouillons();
  }

  onPaiementEnregistre(paiementAvecFichier: import('../../../modeles/paiement.model').PaiementAvecFichier): void {
    const { paiement, fichier } = paiementAvecFichier;
    this.enregistrerPaiement(paiement, fichier);
  }

  private enregistrerPaiement(paiement: Paiement, fichier: File | null): void {
    if (!this.selectedClient) return;

    // Compléter le paiement avec les données contextuelles
    const paiementComplet = {
      ...paiement,
      agentId:        this.agentId,
      code_structure: this.code_structure,
      magasinId:      this.magasinId,
      clientId:       this.selectedClient.id,
      typePaiement:   'client'
    };

    // Construire le FormData (multipart attendu par le backend)
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
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingPaiement = false))
      .subscribe({
        next: () => {
          this.toastr.success('Paiement enregistré avec succès');
          this.showPaiementForm = false;
          this.loadPaiementsAvecPagination();
          this.loadOperations();
          // Rafraîchir le client avec ses Magasins (pour mettre à jour le solde affiché)
          if (this.selectedClient?.id) {
            this.clientService.getClientWithMagasins(this.selectedClient.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (clientMaj) => {
                  this.selectedClient = clientMaj;
                  this.cdr.detectChanges();
                },
                error: (err) => console.error('Erreur rafraîchissement client:', err)
              });
          }
        },
        error: (err) => {
          console.error('Erreur enregistrement paiement:', err);
          this.toastr.error(err.error?.error || err.error?.message || 'Erreur lors de l\'enregistrement du paiement');
        }
      });
  }

  onPaiementAnnule(): void {
    this.showPaiementForm = false;
  }

  // Actions operations
  onLivrerBon(bon: Bon): void {
    if (!confirm(`Livrer le bon ${bon.numero} ?`)) return;
    this.changerStatutBonClient(bon, 'livré');
  }
  onAnnulerBon(bon: Bon): void {
    if (!confirm(`Annuler le bon ${bon.numero} ? Cette action est irréversible.`)) return;
    this.changerStatutBonClient(bon, 'annulé');
  }
  onRetournerBon(bon: Bon): void {
    if (!confirm(`Retourner le bon ${bon.numero} ?`)) return;
    this.changerStatutBonClient(bon, 'retourné');
  }
  onFacturerBon(bon: Bon): void {
    this.toastr.warning(`La facturation d'un bon client n'est pas encore disponible dans cet écran`);
  }
  onImprimerBon(bon: Bon): void {
    if (!bon) {
      this.toastr.error('Aucun bon sélectionné');
      return;
    }
    try {
      const articlesFormates = (bon.Panier?.articles || []).map((article: any) => {
        if (!article) return null;
        const pu = parseFloat(article.prixUnitaire || 0);
        const qty = parseFloat(article.quantite || 0);
        return {
          ...article,
          produit: article.produit || article.Produit,
          prixUnitaire: pu,
          quantite: qty,
          totalTTC: parseFloat(article.totalTTC || 0) || pu * qty,
          montantRemise: parseFloat(article.montantRemise || 0),
          montantTVA: parseFloat(article.montantTVA || 0),
          totalHT: parseFloat(article.totalHT || 0)
        };
      }).filter((a: any) => a !== null);

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
          sousTotal: parseFloat(bon.Panier?.totalHT as any || 0),
          tauxTVA: parseFloat((bon.Panier as any)?.tauxTVA || 0),
          montantTVA: parseFloat(bon.Panier?.tva as any || 0),
          totalTTC: parseFloat(bon.Panier?.totalTTC as any || 0),
          remise: parseFloat(bon.remise as any || 0),
          avance: parseFloat(bon.avance as any || 0),
          netAPayer: parseFloat(bon.resteAPayer as any || 0)
        },
        titre: `Bon de ${bon.type || 'Vente'} — Client`,
        typeBon: bon.type,
        statut: bon.statutBon,
        commentaire: bon.description
      };

      this.pdfGenerator.generateBonFournisseur(bonData);
      this.toastr.success('Ticket généré avec succès');
    } catch (error) {
      console.error('Erreur impression bon client:', error);
      this.toastr.error('Erreur lors de la génération du bon');
    }
  }

  onGenererTicketPaiementBon(bon: Bon): void {
    if (!bon) {
      this.toastr.error('Aucun bon sélectionné');
      return;
    }
    const montantPaiement = parseFloat(bon.avance as any || bon.Panier?.totalTTC as any || 0);
    const soldeActuel = this.getSoldeActuel();
    const paiementData = {
      client: this.selectedClient ? { nomComplet: this.selectedClient.nomComplet } : null,
      date: bon.dateBon,
      numeroReference: bon.numero,
      moyenPaiement: (bon.Panier as any)?.Paiements?.[0]?.methodePaiement || 'Non spécifié',
      montantVerse: montantPaiement,
      soldePrecedent: soldeActuel + montantPaiement,
      nouveauSolde: soldeActuel,
      description: `Règlement bon ${bon.numero}`,
      type: 'Paiement bon'
    };
    this.pdfGenerator.generateTicketVersementClient(paiementData);
    this.toastr.success('Ticket de paiement généré');
  }

  onGenererTicketVersement(operation: Operation): void {
    if (!operation || operation.type !== 'VERSEMENT') {
      this.toastr.warning('Cette opération ne correspond pas à un versement');
      return;
    }
    const montantVerse = parseFloat((operation as any).montantPaye || 0);
    const soldeActuel = this.getSoldeActuel();
    const versementData = {
      client: this.selectedClient ? { nomComplet: this.selectedClient.nomComplet } : null,
      date: (operation as any).dateOperation,
      numeroReference: (operation as any).numeroVersement,
      moyenPaiement: (operation as any).moyenPaiement || 'Non spécifié',
      montantVerse: montantVerse,
      soldePrecedent: soldeActuel + montantVerse,
      nouveauSolde: soldeActuel,
      description: (operation as any).commentaire,
      type: 'Versement',
      agent: (operation as any).user?.nom
    };
    this.pdfGenerator.generateTicketVersementClient(versementData);
    this.toastr.success('Ticket de versement généré');
  }

  onImprimerReleve(): void {
    if (!this.selectedClient) {
      this.toastr.warning('Veuillez sélectionner un client');
      return;
    }
    try {
      const soldeActuel = this.getSoldeActuel();
      const magasinNom = this.getNomMagasinSelectionne();
      const releveData = {
        client: {
          nomComplet: this.selectedClient.nomComplet,
          adresse: this.selectedClient.adresse || '',
          telephone: this.selectedClient.telephone || '',
          email: this.selectedClient.email || '',
          plafond: (this.selectedClient as any).plafond || 0
        },
        periode: `Du ${this.startDate || '...'} au ${this.endDate || '...'}`,
        magasin: magasinNom,
        solde: soldeActuel,
        operations: this.operations || [],
        synthese: {
          totalAchats: this.operations
            .filter((o: any) => o.type === 'BON')
            .reduce((sum: number, o: any) => sum + parseFloat(o.bon?.Panier?.totalTTC || 0), 0),
          totalVersements: this.operations
            .filter((o: any) => o.type === 'VERSEMENT')
            .reduce((sum: number, o: any) => sum + parseFloat(o.montantPaye || 0), 0),
          solde: soldeActuel,
          avoir: 0
        }
      };
      (this.pdfGenerator as any).generateReleveClient(releveData);
      this.toastr.success('Relevé client généré');
    } catch (error) {
      console.error('Erreur impression relevé client:', error);
      this.toastr.error('Erreur lors de la génération du relevé');
    }
  }

  /** Change le statut d'un bon client via l'API et rafraîchit la liste. */
  private changerStatutBonClient(bon: Bon, nouveauStatut: Bon['statutBon']): void {
    this.isLoadingBon = true;
    this.bonService.updateStatutBon(bon.id!, nouveauStatut)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingBon = false))
      .subscribe({
        next: () => {
          this.toastr.success(`Bon ${bon.numero} marqué comme ${nouveauStatut}`);
          const index = this.bons.findIndex(b => b.id === bon.id);
          if (index !== -1) this.bons[index] = { ...this.bons[index], statutBon: nouveauStatut };
          this.loadBonsAvecPagination();
        },
        error: (err) => {
          console.error('Erreur changement de statut:', err);
          this.toastr.error(err.error?.message || 'Erreur lors du changement de statut');
        }
      });
  }

  get displayedMagasins(): Magasin[] { return this.magasins; }
}
