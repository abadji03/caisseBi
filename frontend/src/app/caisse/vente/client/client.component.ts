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
export class ClientComponent implements OnInit, OnDestroy {

  // État général
  isLoadingClient = false;
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
          this.loadMagasins();
        },
        error: err => { console.error('Erreur chargement clients', err); this.toastr.error('Erreur lors du chargement des clients'); }
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
        },
        error: err => { console.error('Erreur chargement bons:', err); this.toastr.error('Erreur lors du chargement des bons'); }
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
        },
        error: (err: unknown) => { console.error('Erreur chargement paiements:', err); this.toastr.error('Erreur lors du chargement des paiements'); }
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
    if (!this.selectedClient || !this.bonBrouillon || !this.panierBrouillon) {
      this.toastr.error('Données manquantes pour l\'enregistrement');
      return;
    }

    event.bon.clientId  = this.selectedClient.id;
    event.bon.statutBon = 'validé';
    event.bon.id        = this.bonBrouillon.id;

    this.enregistrerBon(event.bon, event.bon.panier!, event.fichier);
    this.showBonForm = false;
    this.bonBrouillonService.clearBrouillons();
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
  onLivrerBon(bon: Bon): void { console.log('Livrer bon:', bon); }
  onAnnulerBon(bon: Bon): void { console.log('Annuler bon:', bon); }
  onRetournerBon(bon: Bon): void { console.log('Retourner bon:', bon); }
  onFacturerBon(bon: Bon): void { console.log('Facturer bon:', bon); }
  onImprimerBon(bon: Bon): void { console.log('Imprimer bon:', bon); }
  onGenererTicketPaiementBon(bon: Bon): void { console.log('Générer ticket paiement bon:', bon); }
  onGenererTicketVersement(operation: Operation): void { console.log('Générer ticket versement:', operation); }
  onImprimerReleve(): void { console.log('Imprimer relevé client'); }

  get displayedMagasins(): Magasin[] { return this.magasins; }
}
