import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Client } from '../../../modeles/clients.model';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApplicationService } from '../../../services/application.service';
import { Bon, BonAvecFichier } from '../../../modeles/bon.model';
import { Paiement, PaiementAvecFichier } from '../../../modeles/paiement.model';
import { Operation } from '../../../modeles/operation.model';
import { Produits } from '../../../modeles/produit.modele';
import { Magasin } from '../../../modeles/magasin.model';
import { ToastrService } from 'ngx-toastr';
import { ClientsService } from '../../../services/clients.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import { normalize } from '../../../utils/string-utils';
import { PaiementComponent } from '../../../sharedComposants/paiement/paiement.component';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { NGXLogger } from 'ngx-logger';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { BonsService } from '../../../services/bons.service';
import { PaniersService } from '../../../services/paniers.service';
import { OperationsService } from '../../../services/operations.service';
import { PaiementsService } from '../../../services/paiements.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { StructureService } from '../../../services/structure.service';
import { Panier } from '../../../modeles/panier.model';
import { Stock } from '../../../modeles/entrees-sorties.model';
import { RecettesService } from '../../../services/recettes.service';
import { BonsComponent } from '../../../sharedComposants/bons/bons.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PaiementComponent, BonsComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.css',
})
export class ClientsComponent implements OnInit, OnDestroy {

  
  // Variables pour la gestion des actions
 // Variables pour la gestion des actions
  textBoutonNewBon = 'Nouveau bon';
  actionType = 'ajouter';
  typeBon = '';
  typeEntite: 'client' | 'fournisseur' = 'client';
  actionEnCours: string | null = null;

  agentId = 1;

   // Variables de brouillon
  bonBrouillon: Bon | null = null;
  panierBrouillon: Panier | null = null;

  // Variables de sélection
  selectedBonIndexF: number | null = null;
  selectedBonIndexB: number | null = null;
  selectedBonIndexP: number | null = null;
  selectedBonIndexO: number | null = null;

  // Ajouter une référence au composant Bon
  @ViewChild(BonsComponent) bonComponent!: BonsComponent;

  // Pour gérer les désabonnements
  private destroy$ = new Subject<void>(); //Pour se désabonner des lorsqu'on change de composants

  // Variables de pagination
  totalPages = 1;
  currentPageBon = 1;
  totalPagesBon = 2;
  currentPagePaiement = 1;
  totalPagesPaiement = 2;
  currentPageFournisseur = 1;
  totalPagesFournisseur = 2;
  rowsPerPage = 5; // Nombre par défaut de lignes par page

  // Variables de recherche
  searchInput = '';
  searchBonQuery = '';
  searchProduct = ''; // Champ de recherche pour les produits
  searchQuery = ''; // Chaîne de recherche
  searchPaiementQuery = '';

  //Variables des États d'affichage
  isLoading = false;
  showPaiementComponent = false;
  resetPanierFlag = false;
  showDetails = false; // Affichage des détails
  showBonDetailsSection = false; // Affichage des détails des bons
  showPaiementDetailsSection = false; // Affichage des détails des paiements
  showForm = false; // Affichage du formulaire d'ajout
  showModal = false; // Affichage du modal d'ajout/édition
  isEditMode = false; // Mode édition ou ajout
  isRowSelected = false; // Indique si une ligne est sélectionnée
  showBonForm = false; // Variable pour afficher ou masquer le formulaire de bon
  showPaiementForm = false; // Pour afficher ou masquer le formulaire de paiement
  showProductsSection = false; // Affichage de la section des produits à ajouter
  panierDisabled = false;
  showPanierComponent = false;
  showConfirmationModal = false;
  
  // Variables pour la génération des numéros
  generatedNumeroPaiement: string = this.generateNumero();
  generatedNumero = this.generateNumeroBon();// Numéro généré

  // Données
  filteredBons: Bon[] = [];
  allBons: Bon[] = []; // Tous les bons
  filteredPaiements: Paiement[] = [];
  allPaiements: Paiement[] = []; // Tous les paiements
  produits: Produits[] = [];
  stocks: Stock[] = [];
  filteredOperations: Operation[] = []; // Opérations filtrées
  operations : Operation[] = [];
  produitsAjoutes: Produits[] = []; // Liste des produits ajoutés au bon
  filteredProducts: Produits[] = []; // Liste des produits filtrés pour autocomplétion
  filteredProduits: Produits[] = [];
  magasins: Magasin[] = [];
  archivededClients: Client[] = []; 



  code_structure = 'MASTRUCTURET-NZNC';
  magasinId = 1;
  bonForm!: FormGroup;
  //panier!: FormArray;
  currentDate = ' ';
  currentTime = '';
  selectedBonIndex: number | null = null;
  totalBon = 0; // Calculé dynamiquement
  totalPanier = 0;

  errorMessage = '';

  // Assurez-vous d'avoir une liste de tous les bons
  bons: Bon[] = []; // Remplir avec les bons correspondants

  selectedClientId?: number; // Client sélectionné

  clients: Client[] = []; // Liste des Clients
  filteredClients: Client[] = []; // Liste filtrée pour la recherche
 
  clientForm!: FormGroup; // Formulaire de client
  selectedClient: Client | null = null; // Client sélectionné pour modification
  // Autres variables existantes...
  paiementForm!: FormGroup; // Formulaire pour ajouter un paiement



  startDate?: string;
  endDate?: string;
  

  currentPageClient = 1;
  totalPagesClient = 2;


  selectedBonIndexC: number | null = null;



  
  private fb = inject(FormBuilder);
  private paginationService = inject(ApplicationService);
  private cdr = inject(ChangeDetectorRef);
  private magasinService = inject(MaagasinsService);
  private clientService = inject(ClientsService);
  private toastr = inject(ToastrService);
  private bonBrouillonService = inject(BonBrouillonService);
  private logger = inject(NGXLogger);
  private produitsServices = inject(ProduitsService);
  private stockService = inject(StockInventaireService);
  private bonService = inject(BonsService);
  private panierService = inject(PaniersService);
  private operationService = inject(OperationsService);
  private paiementService = inject(PaiementsService);
  private pdfGenerator = inject(PdfMakerServiceService);
  private structureService = inject(StructureService);
  private recetteService = inject(RecettesService);

  ngOnInit(): void {
    // Chargement des données des clients (par exemple via un service)
    //this.loadClients();
    this.loadData();
    this.loadDataProduits();
    this.loadBonAndPaiement();
    this.loadStructureInfo();
    this.iniForms();
    //S'abonner aux brouillons du service
    this.bonBrouillonService.bonBrouillon$.subscribe(bon => {
      this.bonBrouillon = bon;
      console.log('Bon brouillon chargé dans Fournisseur:', this.bonBrouillon?.id);
    });

    this.bonBrouillonService.panierBrouillon$.subscribe(panier => {
      this.panierBrouillon = panier;
      console.log('Panier brouillon chargé dans Fournisseur:', this.panierBrouillon?.id);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
  iniForms(): void {
    // Initialisation du formulaire réactif pour un client
    this.clientForm = this.fb.group({
      code_structure: [this.code_structure],
      montantANousPayer: [0],
      magasinId: [this.magasinId],
      nomComplet: ['', Validators.required],
      email: ['', [Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9,12}$')]],
      adresse: ['', Validators.required],
      solde: [0],
      plafond: [0, Validators.required],
      estEmploye: ['non', Validators.required],
      statut: ['true'], // valeur par défaut (visible uniquement si isEditMode == true)
    });

    // Initialisation du formulaire réactif pour un paiement
    this.paiementForm = this.fb.group({
      description: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(0)]],
      date: ['', Validators.required],
      methodePaiement: ['Virement', Validators.required],
    });
  }

  onRowSelect(client: Client): void {
    this.selectedClient = client;
    this.isRowSelected = true; // Lorsque la ligne est sélectionnée, la colonne droite s'affiche
  }

  // Fonction pour fermer la partie des actions (colonne droite)
  closeActions(): void {
    this.selectedClient = null;
    this.isRowSelected = false; // Fermer la colonne droite en réinitialisant la sélection
  }

  onAction(action: string): void {
    
    this.actionType = action;
    //console.log(`${this.actionType} Client:`, this.selectedClient);
    if (this.selectedClient) {
      console.log(`${action} client:`, this.selectedClient);
      if (this.actionType === 'operation') {
        // Dans votre méthode
        this.checkBrouillonExists((exists) => {
          if (exists) {
            this.textBoutonNewBon = 'Modifier le bon brouillon';
          } else {
            this.textBoutonNewBon = 'Nouveau bon';
          }
        });
        this.showBonDetails();
      } else if (this.actionType === 'modifier') {
        this.openModal(this.selectedClient);
      } else if (this.actionType === 'supprimer') {
        this.deleteClient(this.selectedClient);
      } else if (this.actionType === 'statut') {
        this.toggleStatut(this.selectedClient);
      } else {
        console.log('Aucune action correspondant');
      }
    } else {
      this.selectedClient = null;
      this.actionType = 'ajouter'; // On s'assure que l'actionType est bien 'ajouter' pour "Nouveau produit"
      this.selectedClient = null;
      this.openModal();
    }
  }

  // Méthode pour mettre à jour les clients affichés en fonction de la page courante
  updatefilteredClients(): void {
    this.filteredClients = this.clients.slice(
      (this.currentPageClient - 1) * 10,
      this.currentPageClient * 10,
    );
  }
  // Gestion de la recherche
  /* onSearchChange(): void {
      this.filteredClients = this.clients.filter(client =>
        client.nomComplet.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.adresse.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.telephone?.toString().toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        client.solde.toString().toLowerCase().includes(this.searchQuery.toLowerCase())
      );
      this.currentPageClient =1;
    } */

  onSearchChange(): void {
    const query = normalize(this.searchQuery);

    this.filteredClients = this.clients.filter(
      (client) =>
        normalize(client.nomComplet).includes(query) ||
        normalize(client.adresse).includes(query) ||
        normalize(client.telephone?.toString()).includes(query) ||
        normalize(client.solde?.toString()).includes(query),
    );

    this.currentPageClient = 1;
  }

  // Ouvrir le modal d'ajout ou modification
  openModal(client?: Client): void {
    console.log('Texte du bouton bis:', this.actionType);
    //this.actionType === 'ajouter'
    if (client) {
      console.log('Valeur actionType:', this.actionType);
      if (this.actionType === 'ajouter') {
        this.isEditMode = false;
        this.clientForm.reset();
        //console.log('Texte du bouton bis:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
      } else {
        this.isEditMode = true;
        //this.selectedClient = client;
        this.clientForm.patchValue(client); // Remplir le formulaire avec les données du client
      }
    } else {
      this.isEditMode = false;
      this.actionType = 'ajouter';
      this.clientForm.reset(); // Réinitialiser le formulaire
    }
    this.showModal = true;
  }

  // Soumettre le formulaire dans le modal
  onModalSubmit(): void {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
      return;
    }

    const formData = this.clientForm.value;

    if (this.isEditMode && this.selectedClient) {
      this.updateClient(this.selectedClient.id!, formData);
    } else {
      this.clientForm.patchValue({
        code_structure: this.code_structure,
        statut: true,
        montantANousPayer: 0,
        solde:0,
        magasinId: this.magasinId,
      });
      this.createClient(this.clientForm.value);
    }
  }
  // Fermer le modal
  closeModal(): void {
    this.showModal = false;
  }

  // Supprimer un client
  deleteClient(client: Client): void {
    console.log('Suppression du client :', client);
    /* const index = this.clients.indexOf(client);
      if (index > -1) {
        this.clients.splice(index, 1);
        this.filteredClients = [...this.clients]; // Mettre à jour la liste filtrée
      } */

    const confirmation = confirm('Supprimer le client ?');
    if (confirmation) {
      //this.listeProduitsSelectionnes.splice(indexP,1);
      //this.prodSrv.removeProduit(prod);
      //this.showInfo(prod);
      //alert(this.listeProduitsSelectionnes.length)
    } else {
      console.log('Action annulée');
    }
  }

  // Fermer les détails (bons ou paiements)
  closeDetails(): void {
    this.showDetails = false;
    this.showBonDetailsSection = false;
    this.showPaiementDetailsSection = false;
    //this.filteredBons = [];
    //this.filteredPaiements = [];
    //this.filteredBonsBis = [];
    //this.filteredPaiementsBis = [];
  }

  

  resetFormPaiement() {
    this.paiementForm.reset();
  }

  // Fonction pour afficher ou masquer le formulaire de paiement
  togglePaiementForm(): void {
    this.showPaiementForm = !this.showPaiementForm;
  }

  // Fonction pour soumettre le formulaire du paiement
  onPaiementFormSubmit(): void {
    if (this.paiementForm.valid) {
      // Traitement pour ajouter un paiement
      const newPaiement = this.paiementForm.value;
      console.log('Nouveau Paiement:', newPaiement);

      // Réinitialiser le formulaire après soumission
      this.paiementForm.reset();
      this.showPaiementForm = false; // Masquer le formulaire
    }
  }

  // Méthodes pour la pagination
  get getPaginatedClients() {
    return this.paginationService.paginate(
      this.filteredClients,
      this.currentPageClient,
      this.rowsPerPage,
    );
  }

  get getPaginatedBons() {
    return this.paginationService.paginate(
      this.filteredBons,
      this.currentPageBon,
      this.rowsPerPage,
    );
  }

  get getPaginatedPaiements() {
    return this.paginationService.paginate(
      this.filteredPaiements,
      this.currentPagePaiement,
      this.rowsPerPage,
    );
  }

  // Gérer le changement de page
  onPageChange(page: number, instanceObj: string): void {
    if (instanceObj === 'Client') {
      this.currentPageClient = page;
    } else if (instanceObj === 'Bon') {
      this.currentPageBon = page;
    } else if (instanceObj === 'Paiement') {
      this.currentPagePaiement = page;
    }
    console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);
  }

  /* onTypeBonChange(): void {
      // Mettre à jour les champs visibles et désactiver les champs non visibles
      this.bonForm.get('dateCommande')?.updateValueAndValidity();
      this.bonForm.get('dateReceptionPrevu')?.updateValueAndValidity();
      this.bonForm.get('dateLivraison')?.updateValueAndValidity();
      this.bonForm.get('motifsRetour')?.updateValueAndValidity();
    } */

  // Filtrer les bon
  onSearchChangeBon() {
    //if (this.selectedClient) {
    this.filteredBons = this.allBons.filter(
      (bon) =>
        bon.numero.toLowerCase().includes(this.searchBonQuery.toLowerCase()) ||
        bon.type.toLowerCase().includes(this.searchBonQuery.toLowerCase()) ||
        bon.montantTotal.toString().toLowerCase().includes(this.searchBonQuery.toLowerCase()), //||
      //this.getFournisseurByOperation(bon).toLowerCase().includes(this.searchBonQuery)
    );
    this.currentPageBon = 1;
    //}
  }

  // Filtrer les paiements
  onSearchChangePaiement() {
    //if (this.selectedClient) {
    this.filteredPaiements = this.allPaiements.filter(
      (paiement) =>
        paiement.description.toLocaleUpperCase().includes(this.searchPaiementQuery.toLowerCase()) ||
        // paiement.methodePaiement.toLowerCase().includes(this.searchPaiementQuery.toLowerCase()) ||
        paiement.montant
          .toString()
          .toLowerCase()
          .includes(this.searchPaiementQuery.toLowerCase()) ||
        new Date(paiement.date)
          .toLocaleDateString()
          .includes(this.searchPaiementQuery.toLowerCase()), //||
      //this.getFournisseurByOperation(paiement).includes(this.searchPaiementQuery.toLowerCase())
    );
    this.currentPagePaiement = 1;
    //}
  }

  get panier(): FormArray {
    return this.bonForm.get('panier') as FormArray;
  }

  addArticle(): void {
    this.panier.push(
      this.fb.group({
        produit: ['', Validators.required],
        uniteStock: [''],
        quantite: [1, Validators.required],
        prixUnitaire: [0, Validators.required],
      }),
    );
    //this.filteredProduits.push([]);
  }

 
  applyProduit(): void {
    setTimeout(() => (this.filteredProduits = []), 200); // Masquer les suggestions après sélection
  }

  updateTotal(): void {
    let total = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.panier.controls.forEach((group: any) => {
      total += group.value.quantite * group.value.prixUnitaire;
    });
    this.totalPanier = total;
    this.totalBon = total - this.bonForm.value.remise;
    this.bonForm.get('total')?.setValue(total);
  }

  submitBonBis(): void {
    console.log('Bon enregistré', this.bonForm.value);
  }


  // Désactiver tous les champs du panier et le bouton "Ajouter un article"
  disablePanier() {
    this.panier.disable(); // Désactive tous les champs du panier
    this.panierDisabled = true; // Désactive le bouton "Ajouter un article"
  }

  // Réinitialiser tous les champs du panier et réactiver le bouton "Ajouter un article"
  resetPanier() {
    this.panier.clear(); // Réinitialise tous les champs du panier
    this.panier.enable(); // Réactive les champs du panier
    this.panierDisabled = false; // Réactive le bouton "Ajouter un article"
  }

  enablePanier() {
    this.panier.enable(); // Réactive tous les champs du panier
    this.panierDisabled = false;
  }

  toggleStatut(user: Client) {
    user.statut = !user.statut;
    this.updateStatus(user.id!, user.statut);
  }

  onTypeBonChange(): void {
    this.typeBon = this.bonForm.get('type')?.value;

    // Réinitialiser les champs inutilisés pour éviter d'enregistrer des valeurs incorrectes
    if (this.typeBon !== 'avoir') {
      this.bonForm.patchValue({
        refBonOrigine: '',
        motifAvoir: '',
        montantAvoir: '',
        dateBonOrigine: '',
        clientAvoir: '',
      });
    }

    if (this.typeBon !== 'livraison') {
      this.bonForm.patchValue({
        adresseLivraison: '',
        livreur: '',
        telephoneLivreur: '',
        dateLivraison: '',
        instructionsLivraison: '',
      });
    }

    // Gestion des validations dynamiques
    this.updateValidations();
  }

  updateValidations(): void {
    // Reset des validations
    const fields = [
      'refBonOrigine',
      'motifAvoir',
      'montantAvoir',
      'dateBonOrigine',
      'clientAvoir',
      'adresseLivraison',
      'livreur',
      'telephoneLivreur',
      'dateLivraison',
      'instructionsLivraison',
    ];

    fields.forEach((field) => this.bonForm.get(field)?.clearValidators());

    // Appliquer les validations selon le type de bon
    if (this.typeBon === 'avoir') {
      this.bonForm.get('refBonOrigine')?.setValidators(Validators.required);
      this.bonForm.get('motifAvoir')?.setValidators(Validators.required);
      this.bonForm.get('montantAvoir')?.setValidators([Validators.required, Validators.min(1)]);
      this.bonForm.get('dateBonOrigine')?.setValidators(Validators.required);
      this.bonForm.get('clientAvoir')?.setValidators(Validators.required);
    }

    if (this.typeBon === 'livraison') {
      this.bonForm.get('adresseLivraison')?.setValidators(Validators.required);
      this.bonForm.get('livreur')?.setValidators(Validators.required);
      this.bonForm
        .get('telephoneLivreur')
        ?.setValidators([Validators.required, Validators.pattern(/^\d{9,15}$/)]);
      this.bonForm.get('dateLivraison')?.setValidators(Validators.required);
      this.bonForm.get('instructionsLivraison')?.setValidators(Validators.maxLength(500));
    }

    this.bonForm.updateValueAndValidity();
  }

  loadPanierBonOrigine(): void {
    /*  const refBon = this.bonForm.get('refBonOrigine')?.value;

  if (!refBon) return;

  // Simuler une requête API pour récupérer le bon d'origine
  this.bonService.getBonByReference(refBon).subscribe(bonOrigine => {
    if (bonOrigine) {
      this.bonForm.patchValue({
        clientAvoir: bonOrigine.clientId,
        montantAvoir: bonOrigine.total,  // Calculer en fonction des articles retournés
      });

      // Charger les produits du bon d'origine dans le panier
      this.panier.clear();
      bonOrigine.panier.forEach(article: => {
        this.panier.push(this.fb.group({
          produit: [article.produit],
          quantite: [article.quantite, Validators.required],
          prixUnitaire: [article.prixUnitaire]
        }));
      });
    } else {
      alert("Bon d'origine introuvable !");
    }
  }); */
  }

  // 🎯 Méthode appelée quand on clique sur un client
  selectClient() {
    if (!this.selectedClient) return;

    // Définir une période de départ par défaut (ex : début du mois en cours)
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // 1er jour du mois
    this.endDate = today.toISOString().split('T')[0]; // Aujourd'hui

    this.filtrerOperations();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.rowsPerPage);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowsPerPageChange(event: any) {
    this.rowsPerPage = Number(event.target.value);

    // Réinitialiser les pages à 1 pour éviter un problème d'affichage
    this.currentPageClient = 1;
    this.currentPageBon = 1;
    this.currentPagePaiement = 1;

    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }
  getClientByOperation(operation: Paiement | Bon): Client | null {
    return this.filteredClients.find((client) => client.id === operation?.clientId) || null;
  }

toggleDetails(index: number,operation: Operation) {
  
   // Fermer tous les autres détails
      if (this.selectedBonIndexO === index) {
        this.selectedBonIndexO = null;
      } else {
        this.selectedBonIndexO = index;
      }
      
      console.log('🔍 Affichage détails opération:', {
        index,
        operationId: operation.id,
        type: operation.type,
        hasBon: !!operation.Bon,
        hasUser: !!operation.user
      });
  }

  //.................................................................................................
  loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.magasinService.getMagasinsByStructure(this.code_structure),
      this.clientService.getClientsByStructure(this.code_structure),
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([mgs, frs]) => {
          this.magasins = mgs;
          this.clients = frs;
          this.filteredClients = [...this.clients];
          this.archivededClients = this.clients.filter(four => four.statut === false);
          //this.updatefilteredClients();
        },
        error: (err) => console.error('Erreur chargement données', err),
      });
  }

  createClient(clientData: Partial<Client>): void {
    this.isLoading = true;

    this.clientService
      .ajouterClient(clientData as Client)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Client créé avec succès');
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création du client';
          this.toastr.error(this.errorMessage);
        },
      });
  }
  updateClient(id: number, updateData: Partial<Client>): void {
    this.isLoading = true;

    this.clientService
      .updateClient(id, updateData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Client mis à jour avec succès');
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du client';
          console.error(err);
          this.toastr.error(this.errorMessage);
        },
      });
  }

  updateStatus(id: number, newStatus: boolean): void {
    this.isLoading = true;
    this.clientService
      .updateClientStatut(id, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          //this.isLoading = false;
          this.toastr.success('Statut mis à jour avec succès');
          this.loadData();
          //this.selectedClient = null;
          //this.isRowSelected = !this.isRowSelected;
        },
        error: (err) => {
          //this.isLoading = false;
          //this.toastr.error('Erreur lors de la mise à jour du statut ' +err.message);
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du statut';
          this.toastr.error(this.errorMessage);
          console.error(err);
        },
      });
  }

  deleteClients(id: number): void {
    this.isLoading = true;
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      this.clientService
        .deleteClient(id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: () => {
            this.toastr.success('Client supprimé avec succès');
            this.loadData();
          },
          error: (err) => {
            //this.isLoading = false;
            //this.toastr.error('Erreur lors de la suppression du client');
            this.errorMessage = err.error?.message || 'Erreur lors de lasuppression du client';
            this.toastr.error(this.errorMessage);
            console.error(err);
          },
        });
    }
  }

  updatePlafond(id: number, plafond: number): void {
    this.isLoading = true;

    this.clientService
      .updateClientPlafond(id, plafond)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Plafond mis à jour avec succès');
          this.loadData();
          this.selectedClient = null;
          this.isRowSelected = !this.isRowSelected;
        },
        error: (err) => {
          //this.toastr.error('Erreur lors de la mise à jour du plafond');
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du plafond';
          this.toastr.error(this.errorMessage);
          console.error(err);
        },
      });
  }
  updateSolde(id: number, nouveauSolde: number): void {
    this.isLoading = true;

    this.clientService
      .updateClientSolde(id, nouveauSolde)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Solde mis à jour avec succès');
          this.loadData();
          this.selectedClient = null;
          this.isRowSelected = !this.isRowSelected;
        },
        error: (err) => {
          //this.toastr.error('Erreur lors de la mise à jour du solde');
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du solde';
          this.toastr.error(this.errorMessage);
          console.error(err);
        },
      });
  }
  updateMontantAPayer(id: number, montant: number): void {
    this.isLoading = true;

    this.clientService
      .updateClientMontantAPayer(id, montant)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Montant à payer mis à jour avec succès');
          this.loadData();
          this.selectedClient = null;
          this.isRowSelected = !this.isRowSelected;
        },
        error: (err) => {
          //this.toastr.error('Erreur lors de la mise à jour du montant à payer');
          this.errorMessage =
            err.error?.message || 'Erreur lors de la mise à jour du montant à payer';
          this.toastr.error(this.errorMessage);
          console.error(err);
        },
      });
  }

  updateClientProperty(type: 'plafond' | 'solde' | 'montant', id: number, value: number): void {
    switch (type) {
      case 'plafond':
        this.updatePlafond(id, value);
        break;
      case 'solde':
        this.updateSolde(id, value);
        break;
      case 'montant':
        this.updateMontantAPayer(id, value);
        break;
      default:
        console.warn('Type de mise à jour non reconnu');
    }
  }
  /*.......................... Pour les nouvelles modifications.............................. */
   // Fonction pour afficher ou masquer le formulaire
  toggleBonForm(): void {
    this.showBonForm = !this.showBonForm;
    this.showPaiementForm = false;
    // S'assurer que showBonComponent est synchronisé
    //this.showBonComponent = this.showBonForm;
    
    if (this.showBonForm) {
      console.log('📝 Affichage du formulaire de bon');
      // Réinitialiser les flags de reset
      this.resetPanierFlag = false;
      console.log('Affichage du formulaire de bon');
      //this.initialiserBonBrouillon();
      this.chargerBrouillonsExistants();
    } else {
      console.log('Masquage du formulaire de bon');
      this.reinitialiserEtMasquerFormulaires();
    }
  }

  private chargerBrouillonsExistants(): void {
    if (!this.selectedClient) return;

    this.bonService.getBonsBrouillons(this.code_structure)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bonsBrouillons) => {
          const brouillonFournisseur = bonsBrouillons.find(bon => 
            bon.clientId === this.selectedClient?.id
          );

          if (brouillonFournisseur) {
            // Charger le bon brouillon
            this.bonBrouillonService.setBonBrouillon(brouillonFournisseur);
            this.bonBrouillon = brouillonFournisseur;
            
            // Charger le panier associé
            this.panierService.getPanierByBonId(brouillonFournisseur.id!)
              .pipe(takeUntil(this.destroy$))
              .subscribe(panier => {
                this.bonBrouillonService.setPanierBrouillon(panier);
                this.panierBrouillon = panier;
                this.toastr.info('Brouillon existant chargé');
              });
          } else {
            // Créer un nouveau brouillon
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
        agentId:this.agentId,
        magasinId:this.magasinId
      },
      panier: {
        articles: [],
        totalHT: 0,
        tva: 0,
        totalTTC: 0,
        tauxTVA: 0,
        clientId: this.selectedClient.id,
        statut: 'en_cours',
        typeEntite: this.typeEntite,
        code_structure: this.code_structure,
        agentId:this.agentId,
        magasinId:this.magasinId
      },
      articles: [],
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      clientId: this.selectedClient.id,
      typeEntite: this.typeEntite
    };
    this.bonService.creerBonBrouillon(bonBrouillonData)
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
  checkBrouillonExists(callback: (exists: boolean) => void): void {

  this.bonService.getBonsBrouillons(this.code_structure)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (bonsBrouillons) => {
        const brouillonClient = bonsBrouillons.find(bon => 
          bon.clientId === this.selectedClient?.id
        );
        callback(brouillonClient !== undefined);
      },
      error: (err) => {
        console.error('Erreur chargement brouillons:', err);
        callback(false); // En cas d'erreur, on considère qu'il n'y a pas de brouillon
      }
    });
  }
  // Gérer l'événement d'enregistrement du paiement
    onPaiementEnregistre(event: PaiementAvecFichier): void {
      // Associer le fournisseur au paiement
      if (this.selectedClient) {
        event.paiement.clientId = this.selectedClient.id;
      }
      event.paiement.typePaiement = this.typeEntite;
      console.log('Paiement à enregistrer reçu dans Client:', event.paiement, 'Fichier:', event.fichier);
      // Enregistrer le paiement
      if(event.paiement.montant <=0 
        || event.paiement.montant === null 
        || event.paiement.montant === undefined 
        || (Number(this.selectedClient?.solde || 0)-(Number(event.paiement.montant)))<0){
        this.toastr.error('Le montant a versé est supérieur à la dette ou est mal renseigné (0 ou nombre négatif) ', 'Erreur');
        return;
      }
      this.enregistrerPaiement(event.paiement,event.fichier);
      this.showPaiementComponent = false;
    }
    
    onPaiementAnnule(): void {
      this.showPaiementComponent = false;
    }
    onReinitialiserPaiementForm(): void {
      this.showPaiementComponent = false;
    }

  private enregistrerPaiement(paiement: Paiement,fichier:File|null): void {
    if (!this.selectedClient) {
      this.toastr.error('Aucun client sélectionné', 'Erreur');
      return;
    }

    
    // Étape 1 : compléter les données du paiement
    const paiementCompletData: Paiement = {
      ...paiement,
      agentId: this.agentId,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      clientId: this.selectedClient.id
    };

    console.log('Données à envoyer:', paiementCompletData);

    // Étape 2 : construire le FormData
    const formData = new FormData();

    // Parcourir les clés de l’objet et les ajouter au FormData
    Object.entries(paiementCompletData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    // Étape 3 : ajouter le fichier s’il existe
    if (fichier) {
      formData.append('fichier', fichier);
    }

    this.isLoading = true;

    this.paiementService.create(formData).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        console.log('Bon enregistré avec succès:', {
            paiementID: result?.id,
            montantPaye: result.montant,
            methodePaiement: result.methodePaiement,
            cliendId: result.clientId
          });
        const recette = {
          montant: result.montant,
          date:result.date,
          description: `Paiement client ID: ${result.clientId} - Paiement ID: ${result.numero}`,
          code_structure: this.code_structure,
          magasinId: this.magasinId,
          agentId: this.agentId,
          categoryId:15, // ID de la catégorie "Vente de produit" 
          paymentMode: result.methodePaiement

        }
        const formData = new FormData();

        // Remplir formData avec ton objet depense
        Object.entries(recette).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        this.createRecette(formData);
        this.toastr.success('Paiement enregistré avec succès', 'Succès');
        this.rafraichirDonneesImmediatement();
        this.showPaiementForm = false;

      },
      error: (error) => {
        console.error('Erreur enregistrement paiement:', error.message);
        this.toastr.error(error.error?.error || 'Erreur lors de l\'enregistrement', 'Erreur');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
   /**
 * Créer une nouvelle dépense
 */
private createRecette(formData: FormData): void {
  this.recetteService.createRecette(formData)
  .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        console.log('Recette créée avec succès:', result);
      },
      error: (err) => {
        this.toastr.error('Erreur lors de l\'enregistrement de la recette');
        console.error('Erreur création recette:', err);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
}
// Rafraîchissement après enregistrement
private rafraichirDonneesImmediatement(): void {
  if (!this.selectedClient) return;

  console.log('Rafraîchissement immédiat des opérations');

  //Recharger les opérations
  this.loadOperations();
  //Rafraîchir les données du fournisseur
  this.rafraichirDonneesClient();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
private finaliserEnregistrement(result: any, avecFichier: boolean): void {
  console.log('Enregistrement réussi:', {
    bonId: result.bon?.id,
    statut: result.bon?.statutBon,
    panierStatut: result.panier?.statut,
    articlesCount: result.articles?.length
  });
  // S'assurer que c'est le même panier
  if (this.panierBrouillon && result.panier) {
    if (this.panierBrouillon.id !== result.panier.id) {
      console.warn('ATTENTION: Un nouveau panier a été créé au lieu de mettre à jour l\'existant');
    } else {
      console.log('Panier existant mis à jour avec succès');
    }
  }
  const message = avecFichier 
    ? 'Bon et fichier enregistrés avec succès!' 
    : 'Bon enregistré avec succès!';
  
  if (!avecFichier) {
    this.toastr.success(message, 'Succès');
  }
  
  console.log('Enregistrement terminé:', result);

  this.rafraichirDonneesImmediatement();


  //Nettoyer les brouillons APRÈS enregistrement réussi
  this.bonBrouillonService.clearBrouillons();
  this.bonBrouillon = null;
  this.panierBrouillon = null;
  
  this.reinitialiserEtMasquerFormulaires();
  //this.actualiserDonnees();
  this.isLoading = false;
}
// Méthode pour générer un numéro unique de paiement
  generateNumero(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `NP-${timestamp}-${random}`;
  }

  generateNumeroBon(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  //const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  // identifiant aléatoire 4 chiffres
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `BON-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
canReturn(bon: any): boolean {
  if (!bon) return false;

  // Normaliser le statut et le type (trim + minuscule)
  const statut = String(bon.statutBon ?? '').trim().toLowerCase();
  const type = String(bon.type ?? '').trim().toLowerCase();

  // Convertir l'avance en nombre proprement
  const avanceRaw = bon?.avance ?? 0;
  const avanceStr = String(avanceRaw).trim().replace(',', '.');
  const avanceNum = isNaN(Number(avanceStr)) ? 0 : Number(avanceStr);

  // ------------- LOGIQUE METIER -------------
  // Cas 1 : Vente validée → bouton visible seulement si avance == 0
  if (type === 'vente' && statut === 'validé') {
    return avanceNum === 0;
  }

  // Cas 2 : Commande livrée → bouton visible seulement si avance == 0
  if (type === 'commande' && statut === 'livré') {
    return avanceNum === 0;
  }

  // Autres cas → bouton caché par défaut
  return false;
}



  /* onPanierAnnule(): void {
    //this.showPanierComponent = false;
    this.reinitialiserEtMasquerFormulaires();
    
  }

   // Méthode pour confirmer l'action
  confirmerAction(): void {
    if (this.actionEnCours === 'annuler_panier' && this.panierBrouillon) {
      this.annulerPanierDefinitif();
    }
    this.showConfirmationModal = false;
    this.actionEnCours = null;
  }

  // Annuler l'action
  annulerAction(): void {
    this.showConfirmationModal = false;
    this.actionEnCours = null;
  }

  private annulerPanierDefinitif(): void {
    if (!this.panierBrouillon || !this.bonBrouillon) return;

    this.bonService.changerStatutPanier(this.panierBrouillon.id!, 'annulé', true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Panier et bon annulés avec succès');
          this.bonBrouillon = null;
          this.panierBrouillon = null;
          this.showBonForm = false;
          this.showBonForm = false;
        },
        error: (err) => {
          console.error('Erreur annulation:', err);
          this.toastr.error('Erreur lors de l\'annulation');
        }
      });
  } */
 // Nouvelle méthode pour gérer l'annulation du panier
 /*  onPanierAnnuleAvecConfirmation(): void {
    this.actionEnCours = 'annuler_panier';
    this.showConfirmationModal = true;
  } */
  onBonAnnule(): void {
    //this.showBonComponent = false;
    console.log('Annulation du bon - Réinitialisation');
    this.reinitialiserEtMasquerFormulaires();

  }

   // Nouvelle méthode pour réinitialiser et masquer
  private reinitialiserEtMasquerFormulaires(): void {
    console.log('Début réinitialisation formulaires...');
    
    // 1. Masquer les composants
    this.showBonForm = false;
    this.showPanierComponent = false;
    this.textBoutonNewBon = 'Nouveau bon';

    
    // 2. Réinitialiser le composant Bon via ViewChild
    if (this.bonComponent) {
      console.log('Réinitialisation du composant Bon');
      this.bonComponent.reinitialiserFormulaire();
    } else {
      console.log('Composant Bon non trouvé');
    }
    
    // 3. Déclencher la réinitialisation du panier
    this.resetPanierFlag = true;
    
    // 4. Réinitialiser après un délai pour la détection Angular
    setTimeout(() => {
      this.resetPanierFlag = false;
      console.log('Réinitialisation terminée');
    }, 100);
    
    this.isLoading = false;
  }

  /**
 * Rafraîchit les données du fournisseur sélectionné
 */
private rafraichirDonneesClient(): void {
  if (!this.selectedClient) return;

  console.log('Rafraîchissement des données du client:', this.selectedClient.id);

  this.clientService.getClientById(this.selectedClient.id!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (clientMisAJour) => {
        // Mettre à jour le fournisseur dans la liste
        const index = this.clients.findIndex(f => f.id === clientMisAJour.id);
        if (index !== -1) {
          this.clients[index] = clientMisAJour;
        }

        // Mettre à jour le fournisseur sélectionné
        this.selectedClient = clientMisAJour;

        // Mettre à jour la liste filtrée
        this.filteredClients = [...this.clients];

        console.log('Client mis à jour:', {
          id: clientMisAJour.id,
          nom: clientMisAJour.nomComplet,
          montantANousPayer: clientMisAJour.montantANousPayer,
          solde: clientMisAJour.solde
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur rafraîchissement fournisseur:', err);
      }
    });
}

  // Afficher les détails du bon
  showBonDetails(): void {
    this.showDetails = true;
    this.showBonDetailsSection = true;

    if (!this.selectedClient) return;

    const today = new Date();

    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // 1er jour du mois
    this.endDate = today.toISOString().split('T')[0]; // Aujourd'hui
    
    console.log('Dates initialisées:', {
      start: this.startDate,
      end: this.endDate
    });
    this.loadOperations();
    //this.filtrerOperations();

  }
  // Méthode pour filtrer les opérations (frontend)
  filtrerOperations(): void {
    if (!this.selectedClient) {
      console.log('Aucun client sélectionné');
      return;
    }

    console.log('Filtrage avec dates:', {
      startDate: this.startDate,
      endDate: this.endDate
    });

    // Si les dates sont définies, on recharge depuis l'API
    if (this.startDate && this.endDate) {
      this.loadOperations();
    } else {
      // Sinon on montre toutes les opérations
      this.filteredOperations = [...this.operations];
    }
  }

  //Méthode pour charger les opérations
  loadOperations(): void {
    if(!this.selectedClient) return;
    this.isLoading = true;

    // Formater les dates pour l'API
    const startDateFormatted = this.formatDateForAPI(this.startDate);
    const endDateFormatted = this.formatDateForAPI(this.endDate);
    
    console.log('Dates envoyées à l\'API:', {
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      formattedStart: startDateFormatted,
      formattedEnd: endDateFormatted
    });
    
    this.operationService.getOperationsByClient(this.code_structure, this.selectedClient.id!, { dateDebut: this.startDate, dateFin: this.endDate })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ops) => {
          this.operations = ops;
          this.logger.debug('Opérations client chargées', ops);
          this.filteredOperations = [... this.operations];
          this.isLoading = false;
          console.log('operation sans filtre',ops);
          console.log('Opérations chargées avec relations:', ops.map(op => ({
            id: op.id,
            type: op.type,
            hasBon: !!op.Bon,
            hasUser: !!op.user,
            userName: op.user?.['nomComplet'] || 'N/A',
          })));
          //FORCER la détection de changement
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des opérations.';
          this.logger.error('Erreur API opérations fournisseur', err);
          this.isLoading = false;
          //FORCER la détection de changement même en cas d'erreur
          this.cdr.detectChanges();
        }
      });
  }
  // Méthode pour formater correctement les dates pour l'API
  private formatDateForAPI(date?: string | Date): string {
    if (!date) return '';
    
    const dateObj = new Date(date);
    // Format: YYYY-MM-DD pour l'API
    return dateObj.toISOString().split('T')[0];
  }

  onBonEnregistre(event: BonAvecFichier): void {
        console.log('Bon enregistré:', event.bon);
        console.log('Bon enregistré:', event.fichier);
  
        if (!this.selectedClient) {
          this.toastr.error('Aucun client sélectionné');
          return;
        }
        
        //Vérifier que les brouillons sont chargés
        if (!this.bonBrouillon || !this.panierBrouillon) {
          console.error('Brouillons non disponibles:', {
            bonBrouillon: this.bonBrouillon,
            panierBrouillon: this.panierBrouillon
          });
          this.toastr.error('Les données du brouillon ne sont pas chargées', 'Erreur');
          return;
        }
        // Associer fournisseurId et s'assurer que le statut est "validé"
        event.bon.clientId = this.selectedClient.id;
        event.bon.statutBon = 'validé'; // Changer le statut à validé
  
        // Si c'était un brouillon, utiliser l'ID existant
        if (this.bonBrouillon) {
          event.bon.id = this.bonBrouillon.id;
        } 
  
        // Appel API
        this.enregistrerBon(event.bon, event.bon.panier!,event.fichier);
         //this.enregistrerBonAvecFichiers(event.bon, event.bon.panier, event.fichier);
        this.showBonForm = false;
        // Nettoyer les brouillons après enregistrement
        this.bonBrouillonService.clearBrouillons();
    }

  // fournisseurs.component.ts
private enregistrerBon(bon: Bon, panier: Panier, fichier:File|null): void {
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
      //...panier,
       id: this.panierBrouillon.id, 
      totalHT: panier.totalHT,
      tva: panier.tva,
      totalTTC: panier.totalTTC,
      tauxTVA: panier.tauxTVA,
      clientId: this.selectedClient.id,
      statut: 'validé' 
    },
    articles: panier.articles.map(article => ({
      id: article.id,
      produitId: article.produit?.id,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      prixVenteUnitaire: article.prixVenteUnitaire,
      prixAchatUnitaire: article.prixAchatUnitaire
    })),
    code_structure: this.code_structure,
    magasinId: this.magasinId,
    agentId: this.agentId,
    clientId: this.selectedClient.id,
    typeEntite:this.typeEntite,
    paiement: bon.avance?? 0 > 0 ? {
      numero: this.generatedNumeroPaiement,
      methodePaiement: 'Caisse',
      compte:'Bon',
      description: `Avance pour bon ${bon.numero}`,
      typePaiement: 'client'
    } : undefined
  };
  console.log('Données de MISE À JOUR envoyées:', {
    bonId: bonCompletData.bon.id,
    panierId: this.panierBrouillon?.id, //ID du panier existant
    articles: bonCompletData.articles.map(a => ({ id: a.id, produitId: a.produitId }))
  });
  this.isLoading = true;

  this.bonService.createBonComplet(bonCompletData).pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (result) => {
      console.log('Bon enregistré avec succès:', {
          bonId: result.bon?.id,
          panierId: result.panier?.id,
          statut: result.bon?.statutBon,
          panierStatut: result.panier?.statut
        });
        if(result.paiement || bonCompletData.bon.avance! > 0){
          const recette = {
          montant: result.paiement.montant!,
          date:result.paiement.date,
          description: `Paiement client ID: ${this.selectedClient?.id} - Paiement ID: ${result.paiement.numero}`,
          code_structure: this.code_structure,
          magasinId: this.magasinId,
          agentId: this.agentId,
          categoryId:15, // ID de la catégorie "Vente de produit" 
          paymentMode: result.paiement.methodePaiement

        }
        const formData = new FormData();

        // Remplir formData avec ton objet depense
        Object.entries(recette).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        this.createRecette(formData);
        }
    
      if (fichier && result.bon && result.bon.id) {
          this.uploadFichierSepare(fichier, result.bon.id, result);
        } else {
          // Si pas de fichier, finaliser directement
          this.finaliserEnregistrement(result, false);
        }

    },
    error: (error) => {
      console.error('Erreur:', error);
      this.toastr.error(error.error?.error || 'Erreur lors de l\'enregistrement', 'Erreur');
    },
    complete: () => {
      this.isLoading = false;
    }
  });
} 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
private uploadFichierSepare(fichier: File, bonId: number, resultBon: any): void {
  const formDataFichier = new FormData();
  formDataFichier.append('fichier', fichier);
  formDataFichier.append('bonId', bonId.toString());

  this.bonService.uploadFichier(formDataFichier)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resultUpload) => {
        console.log('Fichier uploadé avec succès:', resultUpload);
        this.toastr.success('Bon et fichier enregistrés avec succès!', 'Succès');
        this.finaliserEnregistrement(resultBon, true);
      },
      error: (error) => {
        console.error('Erreur upload fichier:', error);
        // Le bon est déjà créé, on affiche juste un avertissement pour le fichier
        this.toastr.warning('Bon enregistré mais erreur lors de l\'upload du fichier', 'Attention');
        this.finaliserEnregistrement(resultBon, true); // On considère quand même que c'est un succès
      }
    });
  }

  toggleDetailBiss(index: number, bon: Bon):void {
      // Fermer tous les autres détails
      if (this.selectedBonIndexB === index) {
        this.selectedBonIndexB = null;
      } else {
        this.selectedBonIndexB = index;
      }
      
      console.log('🔍 Affichage détails opération:', {
        index,
        BonId: bon.id,
        type: bon.type,
        // hasBon: !!operation.Bon,
        // hasUser: !!operation.user
      });
  }

  imprimerReleve(): void {
  if (!this.selectedClient) {
    this.toastr.error('Aucun fournisseur sélectionné');
    return;
  }

  /* try {
    this.isLoading = true;
    // Debug: vérifier les données
    console.log('Operations à imprimer:', this.filteredOperations);
    console.log('Nombre d\'opérations:', this.filteredOperations?.length);

    // Valider et formater les opérations
    const operationsFormatees = this.filteredOperations.map(op => {
      if (!op) return null;
      
      return {
        date: op.dateOperation,
        type: op.type || 'NON SPECIFIE',
        reference: op.numeroVersement || op.Bon?.numero || 'N/A',
        montant: op.montantPaye || op.Bon?.montantTotal ||0,
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
    this.isLoading = false;
  }
   */
}
  imprimerBon(bon: Bon): void {
  if (!bon) {
    this.toastr.error('Aucun bon sélectionné');
    return;
  }

  /* try {
    this.isLoading = true;
    
    console.log('Bon à imprimer:', bon);
    console.log('Articles du bon:', bon.Panier?.ArticlePaniers);

    // Valider et formater les articles avec une meilleure gestion des nombres
    const articlesFormates = (bon.Panier?.ArticlePaniers || []).map(article => {
      if (!article) return null;
      
      // Calculer les valeurs avec sécurité
      const prixUnitaire = this.safeNumber(article.prixUnitaire || article.prixAchatUnitaire);
      const quantite = this.safeNumber(article.quantite);
      const total = prixUnitaire * quantite;

      console.log('Article formaté:', {
        designation: article.Produit?.designation,
        prixUnitaire,
        quantite,
        total
      });

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

    console.log('Totaux calculés:', { sousTotal, tauxTVA, montantTVA, totalTTC });

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

    console.log('Données formatées pour le PDF du bon:', bonData);
    this.pdfGenerator.generateBonFournisseur(bonData);
  } 
  catch (error) {
    console.error('Erreur génération bon:', error);
    this.toastr.error('Erreur lors de la génération du bon');
  }
  finally {
    this.isLoading = false;
  } */
}

// Dans fournisseurs.component.ts

// Méthode pour générer le ticket de versement
genererTicketVersement(operation: Operation): void {
  if (!operation || operation.type !== 'VERSEMENT') {
    this.toastr.error('Opération de versement non valide');
    return;
  }

  /* try {
    // Calculer le solde
    const montantVerse = this.safeNumber(operation.montantPaye);
    const soldePrecedent = this.safeNumber(this.selectedFournisseur?.montantAPayer) + montantVerse; // Avant le versement
    const nouveauSolde = this.safeNumber(this.selectedFournisseur?.montantAPayer); // Après le versement

    const versementData = {
      fournisseur: this.selectedFournisseur ? {
        nomComplet: this.selectedFournisseur.nomComplet || 'N/A',
        adresse: this.selectedFournisseur.adresse || '',
        telephone: this.selectedFournisseur.telephone || '',
        email: this.selectedFournisseur.email || ''
      } : null,
      date: operation.dateOperation,
      numeroReference: operation.numeroVersement || `VERS-${operation.id}`,
      moyenPaiement: operation.moyenPaiement || 'Non spécifié',
      montantVerse: montantVerse,
      soldePrecedent: soldePrecedent,
      nouveauSolde: nouveauSolde,
      description: operation.commentaire || 'Versement fournisseur',
      agent: operation.user?.['nom'] || 'Non spécifié'
    };

    console.log('Données pour ticket versement:', versementData);
    this.pdfGenerator.generateTicketVersement(versementData);

  } catch (error) {
    console.error('Erreur génération ticket versement:', error);
    this.toastr.error('Erreur lors de la génération du ticket');
  } */
}

// Méthode pour le ticket de paiement d'un bon
genererTicketPaiementBon(bon: Bon): void {
  if (!bon) {
    this.toastr.error('Aucun bon sélectionné');
    return;
  }

  /* try {
    const avance = this.safeNumber(bon.avance);
    const totalBon = this.safeNumber(bon.montantTotal);
    const resteAPayer = this.safeNumber(bon.resteAPayer);

    const paiementData = {
      fournisseur: this.selectedFournisseur ? {
        nomComplet: this.selectedFournisseur.nomComplet || 'N/A'
      } : null,
      date: bon.dateBon,
      numeroReference: bon.numero,
      moyenPaiement: 'Caisse',
      montantVerse: avance,
      soldePrecedent: totalBon,
      nouveauSolde: resteAPayer,
      description: `Acompte sur bon ${bon.numero}`,
      type: 'ACOMPTE'
    };

    console.log('Données pour ticket paiement bon:', paiementData);
    this.pdfGenerator.generateTicketVersement(paiementData);

  } catch (error) {
    console.error('Erreur génération ticket paiement:', error);
    this.toastr.error('Erreur lors de la génération du ticket de paiement');
  } */
}

// Méthode utilitaire pour sécuriser les nombres
// eslint-disable-next-line @typescript-eslint/no-explicit-any
private safeNumber(value: any): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}


  // Méthodes de calcul
  private calculerTotalCommandes(): number {
    return this.filteredOperations
      .filter(op => op.type === 'COMMANDE')
      .reduce((total, op) => total + (this.safeNumber(op.Bon?.Panier?.totalTTC) || 0), 0);
  }

  private calculerTotalVersements(): number {
    return this.filteredOperations
      .filter(op => op.type === 'VERSEMENT')
      .reduce((total, op) => total + (this.safeNumber(op.montantPaye) || 0), 0);
  }

   loadBonAndPaiement(): void {
      this.isLoading = true;
      forkJoin([
        this.bonService.getBonsByStructure(this.code_structure),
        this.paiementService.getByStructure(this.code_structure),
      ])
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: ([bon, paie]) => {
            //this.fournisseurs = four
            this.allBons = bon;
            this.allPaiements = paie;
            this.filteredBons = [...this.allBons];
            this.filteredPaiements = [...this.allPaiements];
          },
          error: (err) => console.error('Erreur chargement données', err),
        });
    }
  loadDataProduits(): void {
      this.isLoading = true;
      forkJoin([
        this.produitsServices.getAllProduits(this.code_structure),
        this.stockService.getStocksByStructure(this.code_structure),
      ])
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: ([produit, stock]) => {
            //this.fournisseurs = four
            this.produits = produit;
            this.stocks = stock;
            this.filteredProducts = this.produits;
            console.log('Produits chargés', this.produits);
            console.log('Produits chargés', this.filteredProducts);
          },
          error: (err) => console.error('Erreur chargement données', err),
        });
    }
 // Charger les informations de la structure pour le PDF
private loadStructureInfo(): void {
    this.structureService.getByCodeStructure(this.code_structure)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (structure) => {
          this.pdfGenerator.setStructureInfo(structure);
        },
        error: (err) => {
          console.error('Erreur chargement structure:', err);
        }
      });
  }

  //Méthodes pour gèrer les changements de statut des bons
  //Méthodes pour les changements de statut de bon
  livrerBon(bon: Bon): void {
    const confirmation = confirm(`Êtes-vous sûr de vouloir livrer le bon ${bon.numero} ?`);
    if (!confirmation) return;

    this.isLoading = true;

    // Préparer les données pour la mise à jour du statut
    const bonMiseAJour:Bon = {
      ...bon,
      statutBon: 'livré',
      dateLivraisonReelle: new Date()
    };

    // Préparer les données pour l'API createBonComplet
    const bonCompletData = this.preparerDonneesPourMiseAJour(bonMiseAJour);

    this.bonService.createBonComplet(bonCompletData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.toastr.success(`Bon ${bon.numero} marqué comme livré`, 'Succès');
          
          // Mettre à jour le bon dans la liste
          this.mettreAJourBonDansListe(result.bon);
          
          // Rafraîchir les opérations
          this.rafraichirDonneesImmediatement();
        },
        error: (error) => {
          console.error('Erreur livraison bon:', error);
          this.toastr.error(error.error?.message || 'Erreur lors de la livraison du bon', 'Erreur');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  annulerBon(bon: Bon): void {
    const confirmation = confirm(`Êtes-vous sûr de vouloir annuler le bon ${bon.numero} ? Cette action est irréversible.`);
    if (!confirmation) return;

    this.isLoading = true;

    // Préparer les données pour la mise à jour du statut
    const bonMiseAJour:Bon = {
      ...bon,
      statutBon: 'annulé'
    };

    // Préparer les données pour l'API createBonComplet
    const bonCompletData = this.preparerDonneesPourMiseAJour(bonMiseAJour);

    this.bonService.createBonComplet(bonCompletData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.toastr.success(`Bon ${bon.numero} annulé`, 'Succès');
          
          // Mettre à jour le bon dans la liste
          this.mettreAJourBonDansListe(result.bon);
          
          // Rafraîchir les opérations
          this.rafraichirDonneesImmediatement();
        },
        error: (error) => {
          console.error('Erreur annulation bon:', error);
          this.toastr.error(error.error?.message || 'Erreur lors de l\'annulation du bon', 'Erreur');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  retournerBon(bon: Bon): void {
    const confirmation = confirm(`Êtes-vous sûr de vouloir retourner le bon ${bon.numero} ?`);
    if (!confirmation) return;

    this.isLoading = true;

    // Préparer les données pour la mise à jour du statut
    const bonMiseAJour :Bon = {
      ...bon,
      statutBon: 'retourné',
      description: bon.description ? `${bon.description} (Retourné le ${new Date().toLocaleDateString()})` : `Retourné le ${new Date().toLocaleDateString()}`
    };

    // Préparer les données pour l'API createBonComplet
    const bonCompletData = this.preparerDonneesPourMiseAJour(bonMiseAJour);

    this.bonService.createBonComplet(bonCompletData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.toastr.success(`Bon ${bon.numero} marqué comme retourné`, 'Succès');
          
          // Mettre à jour le bon dans la liste
          this.mettreAJourBonDansListe(result.bon);
          
          // Rafraîchir les opérations
          this.rafraichirDonneesImmediatement();
        },
        error: (error) => {
          console.error('Erreur retour bon:', error);
          this.toastr.error(error.error?.message || 'Erreur lors du retour du bon', 'Erreur');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  // Méthode utilitaire pour préparer les données de mise à jour
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private preparerDonneesPourMiseAJour(bonMiseAJour: Bon): any {
    // Récupérer les données du panier existant
    const panier = bonMiseAJour.Panier || bonMiseAJour.panier;
    
    // Préparer les articles
    const articles = panier?.ArticlePaniers?.map(article => ({
      id: article.id,
      produitId: article.produitId || article.Produit?.id || article.produit?.id,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      prixAchatUnitaire: article.prixAchatUnitaire,
      prixVenteUnitaire: article.prixVenteUnitaire
    })) || [];

    // Si pas de panier dans le bon, essayer de le récupérer
    if (!panier && bonMiseAJour.id) {
      this.chargerPanierPourBon(bonMiseAJour.id);
    }

    // Construire l'objet pour createBonComplet
    return {
      bon: {
        id: bonMiseAJour.id,
        type: bonMiseAJour.type,
        numero: bonMiseAJour.numero,
        description: bonMiseAJour.description,
        statutBon: bonMiseAJour.statutBon,
        montantTotal: bonMiseAJour.montantTotal,
        referenceExterne: bonMiseAJour.referenceExterne,
        remise: bonMiseAJour.remise || 0,
        avance: bonMiseAJour.avance || 0,
        clientId: bonMiseAJour.clientId,
        fournisseurId: bonMiseAJour.fournisseurId,
        dateLivraisonReelle: bonMiseAJour.dateLivraisonReelle,
        // Inclure d'autres champs si nécessaire
        conditionsPaiement: bonMiseAJour.conditionsPaiement,
        delaiPaiement: bonMiseAJour.delaiPaiement,
        dateLivraisonPrevue: bonMiseAJour.dateLivraisonPrevue
      },
      panier: panier ? {
        id: panier.id,
        totalHT: panier.totalHT,
        tva: panier.tva,
        totalTTC: panier.totalTTC,
        tauxTVA: panier.tauxTVA,
        statut: 'validé'
      } : null,
      articles: articles,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      fournisseurId: bonMiseAJour.fournisseurId,
      clientId: bonMiseAJour.clientId,
      typeEntite: bonMiseAJour.typeEntite || this.typeEntite
    };
  }

  // Méthode pour charger un panier si nécessaire
  private chargerPanierPourBon(bonId: number): void {
    this.panierService.getPanierByBonId(bonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (panier) => {
          // Stocker le panier pour utilisation ultérieure
          console.log('Panier chargé pour le bon:', panier);
        },
        error: (err) => {
          console.error('Erreur chargement panier:', err);
        }
      });
  }

  // Méthode pour mettre à jour un bon dans la liste
  private mettreAJourBonDansListe(bonMisAJour: Bon): void {
    // Mettre à jour dans allBons
    const indexAll = this.allBons.findIndex(b => b.id === bonMisAJour.id);
    if (indexAll !== -1) {
      this.allBons[indexAll] = bonMisAJour;
    }

    // Mettre à jour dans filteredBons
    const indexFiltered = this.filteredBons.findIndex(b => b.id === bonMisAJour.id);
    if (indexFiltered !== -1) {
      this.filteredBons[indexFiltered] = bonMisAJour;
    }

    // Forcer la détection de changement
    this.cdr.detectChanges();
  }

  // Méthode optionnelle pour facturer un bon
facturerBon(bon: Bon): void {
  const confirmation = confirm(`Êtes-vous sûr de vouloir facturer le bon ${bon.numero} ?`);
  if (!confirmation) return;

  this.isLoading = true;

  // Générer un numéro de facture
  const numeroFacture = `FACT-${bon.numero}-${Date.now()}`;
  
  const bonMiseAJour:Bon = {
    ...bon,
    numeroFacture: numeroFacture,
    statutBon: 'facturé'
  };

  const bonCompletData = this.preparerDonneesPourMiseAJour(bonMiseAJour);

  this.bonService.createBonComplet(bonCompletData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        this.toastr.success(`Facture ${numeroFacture} créée pour le bon ${bon.numero}`, 'Succès');
        
        // Mettre à jour le bon dans la liste
        this.mettreAJourBonDansListe(result.bon);
        
        // Rafraîchir les opérations
        this.rafraichirDonneesImmediatement();
        
        // Option : Générer la facture PDF
        this.genererFacturePDF(result.bon);
      },
      error: (error) => {
        console.error('Erreur facturation bon:', error);
        this.toastr.error(error.error?.message || 'Erreur lors de la facturation du bon', 'Erreur');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
}

// Méthode pour générer une facture PDF (exemple)
private genererFacturePDF(bon: Bon): void {
  const factureData = {
    numero: bon.numeroFacture,
    date: new Date(),
    client: this.selectedClient ? {
      nomComplet: this.selectedClient.nomComplet,
      adresse: this.selectedClient.adresse,
      telephone: this.selectedClient.telephone
    } : null,
    articles: bon.Panier?.ArticlePaniers?.map(article => ({
      designation: article.Produit?.designation,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      total: article.quantite * article.prixUnitaire
    })) || [],
    totaux: {
      sousTotal: bon.Panier?.totalHT || 0,
      tva: bon.Panier?.tva || 0,
      totalTTC: bon.Panier?.totalTTC || 0,
      remise: bon.remise || 0,
      netAPayer: bon.netAPayer || 0
    }
  };

  this.pdfGenerator.generateFacture(factureData);
}
}
