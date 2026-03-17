/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../modeles/clients.model';
import { Produits } from '../../../modeles/produit.modele';
import { ArticlePanier, Panier } from '../../../modeles/panier.model';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { ProduitsService } from '../../../services/produits.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { PaniersService, TransactionsFilter } from '../../../services/paniers.service';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { PanierComponent } from '../../../sharedComposants/panier/panier.component';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { MouvementsStock, Stock } from '../../../modeles/entrees-sorties.model';
import { RecettesService } from '../../../services/recettes.service';
import { ModePaiement, Paiement } from '../../../modeles/paiement.model';
import { MouvementsStockService } from '../../../services/mouvements-stock.service';
import { ClientsService } from '../../../services/clients.service';
import { StructureService } from '../../../services/structure.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-caisse',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PanierComponent],
  templateUrl: './caisse.component.html',
  styleUrl: './caisse.component.css',
})
export class CaisseComponent implements OnInit, OnDestroy {

  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerPanier = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onReinitialiserPanier = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerBon = new EventEmitter<void>();

  modesPaiement: ModePaiement[] = [
          new ModePaiement({ libelle: 'Espèce' }),
          new ModePaiement({ libelle: 'Carte' }),
          new ModePaiement({ libelle: 'Virement' }),
           new ModePaiement({ libelle: 'Wave' }),
          new ModePaiement({ libelle: 'Orange Money' }),
          new ModePaiement({ libelle: 'Chèque' }),
          new ModePaiement({ libelle: 'Autre' }),
          
        ];

  modePaiementSelectionne: ModePaiement | null = null;
  modePaiementSelectionneProduit: ModePaiement | null = null;

  // Variables pour les onglets
  activeTab: 'produits' | 'services' = 'produits';
  showVenteSection = false;

  showBonButtons = false ;

  // Variables pour les services
  serviceMontant = 0;
  

  
  dateJournal: Date = new Date();
  totalCaisse = 0;
  totalPanier = 0;
  totalAPayer = 0;
  totalServices = 0;
  totalTransactions = 0;


  isLoading = false;
  panierValide = false; // Indique si le panier est validé
  resetPanierTrigger = false;

  filteredProducts: Produits[] = []; // Liste des produits filtrés pour autocomplétion
  stocks: Stock[] = [];

   // Variables pour la génération des numéros
  generatedNumeroPaiement: string = this.generateNumero();

  private destroy$ = new Subject<void>(); //Pour se désabonner des lorsqu'on change de composants
  
  // Gestion des clients
  showClientSection = false;
  clients: Client[] = [];
  clientForm!: FormGroup;
  selectedClient: Client | null = null;

  code_structure :string|null = null;
  magasinId :number|null = null;
  agentId : number|null = null;

  private userSubscription!: Subscription;

  panierData: Panier | null = null;
  

  typeEntite: 'client' | 'fournisseur'|'autre' = 'autre';

  currentDate = '';
  currentTime = '';

  // Gestion du panier
  showPanierSection = false;
  panier: Panier = new Panier();
  produits: Produits[] = [];
  panierDisabled = false;
  paniers: Panier[] = [];
  selectedTransaction: Panier | null = null;

  isAdmin = false;

  // Ajout des variables pour le modal
  private clientModal: any;
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;

  Math = Math;

  // Filtres
  filters: TransactionsFilter = {
    page: 1,
    limit: 10,
    search: '',
    statut: ''
  };

  // Options pour le filtre de statut
  statutOptions = ['tous', 'validé', 'annulé', 'retourné'];

  private searchSubject = new Subject<string>();


  private fb = inject(FormBuilder);
    //private paginationService = inject(ApplicationService);
    private toastr = inject(ToastrService);
    private bonBrouillonService = inject(BonBrouillonService);
    private produitsServices = inject(ProduitsService);
    private panierService = inject(PaniersService);
    private stockService = inject(StockInventaireService);
    private pdfGenerator = inject(PdfMakerServiceService);
    private recetteService = inject(RecettesService);
    private mouvementsStockService = inject(MouvementsStockService);
    private clientsService = inject(ClientsService);
    private structureService = inject(StructureService)
    private authService = inject(AuthService);

  ngOnInit() {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      //this.currentUser = user;
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
      this.isAdmin = this.authService.hasRole('Administrateur');
      console.log('Données user connecté :',user, this.code_structure, this.magasinId, this.agentId );
      // Déterminer si on doit montrer le champ structure
      //this.isStructureAdmin = this.authService.hasRole('Administrateur'); // Ou vérifiez par ID

      // Récupérer l'ID de la structure de l'utilisateur connecté
      
    });
    this.iniForms();
    this.loadDataProduits();
    this.loadTransactions();
    //this.loadFakeData();
    this.loadStructureInfo();
    // Date et heure actuelles
    const currentDateObj = new Date();
    this.currentDate = currentDateObj.toLocaleDateString();
    this.currentTime = currentDateObj.toLocaleTimeString();

    // Écouter les changements de panier depuis le service
    this.bonBrouillonService.panierBrouillon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(panier => {
        if (panier) {
          this.panierData = panier;
          console.log('Panier mis à jour depuis service:', panier.id);
        }
      });

    // Initialiser le modal Bootstrap
    const modalElement = document.getElementById('clientModal');
    if (modalElement) {
      this.clientModal = new (window as any).bootstrap.Modal(modalElement);
    }

    // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      this.loadTransactions();
    });
  }

  iniForms(): void {
    // Initialisation des formulaires si nécessaire
    this.clientForm = this.fb.group({
      nomComplet: ['', Validators.required],
      telephone: [''],
      email: [''],
      adresse: [''],
    });

  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if(this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

   /** AJOUTER UN CLIENT */
  ajouterClient(clientData: any) {
    const nouveauClient: Client = {
      ...clientData,
      id: this.clients.length + 1,
      paniers: [],
      bons: [],
      paiements: [],
      operations: [],
    };
    this.clients.push(nouveauClient);
    this.selectedClient = nouveauClient;
    this.toastr.success('Client ajouté avec succès');
  }

  /** ASSOCIER CLIENT À TRANSACTION */
  associerClientATransaction(clientData: any) {
    if (this.selectedTransaction) {
      // Ici, vous devriez appeler un service pour mettre à jour la transaction
      console.log('Association client à transaction:', this.selectedTransaction.id, clientData);
      this.toastr.success('Client associé à la transaction');
      
      // Mettre à jour l'affichage
      if (!this.clients.find(c => c.nomComplet === clientData.nomComplet)) {
        this.ajouterClient(clientData);
      }
    }
  }

  /** SÉLECTIONNER UN CLIENT EXISTANT */
  onSelectionClient(event: any) {
    const nom = event.target.value;
    const client = this.clients.find((c) => c.nomComplet === nom);
    if (client) {
      this.selectedClient = client;
      this.clientForm.patchValue(client);
    }
  }

  /** ENREGISTRER UN SERVICE */
  enregistrerService() {
    if (!this.serviceMontant || this.serviceMontant <= 0) {
      this.toastr.warning('Veuillez remplir la description et le montant du service');
      return;
    }
    //Vérifier que les brouillons sont bien chargés
    if (!this.panierData?.id ) {
      console.error('Brouillons non chargés:', {
        panierBrouillon: this.panierData
      });
      this.toastr.error('Erreur: Les données du brouillon ne sont pas chargées', 'Erreur');
      return;
    }
    const panierCompletData = {
   
      panier: {
        ...this.panierData,
         id: this.panierData.id, 
        totalTTC: this.serviceMontant,
        typeEntite: this.typeEntite,
        typePanier:'service',
        statut: 'validé' 
      },
      articles: [],
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      clientId: this.panierData.clientId || null,
      typeEntite:this.typeEntite,
      paiement: this.serviceMontant ?? 0 > 0 ? new Paiement ({
        numero: this.generatedNumeroPaiement,
        methodePaiement: this.modePaiementSelectionne?.libelle || 'Espèce',
        description: `Montant total vente service ou produit non enregistré ${this.panierData.id}`,
        typePaiement: 'autre',
      }) : undefined
    };
    console.log('Données de MISE À JOUR envoyées:', {
      panierId: this.panierData?.id, //ID du panier existant
    });
    this.isLoading = true;
  
    this.panierService.createPanierComplet(panierCompletData).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        console.log('Panier enregistré avec succès:', {
            panierId: result.panier?.id,
            panierStatut: result.panier?.statut
          });
          if(result.paiement && result.paiement.id){
            const recette = {
                  montant: result.paiement.montant!,
                  date:result.paiement.date,
                  paiementId: result.paiement.id,
                  description: `Paiement vente panier: ${this.panierData?.id} - Paiement ID: ${result.paiement.numero}`,
                  code_structure: this.code_structure,
                  magasinId: this.magasinId,
                  agentId: this.agentId,
                  categoryId:17, // ID de la catégorie "Vente de produit" 
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
        this.toastr.success('Vente enregistrée avec succès', 'Succès');
        this.loadTransactions()
        // Réinitialiser le panier brouillon
        this.bonBrouillonService.clearBrouillons();
        this.panierData = null;
        this.resetVente();
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

  /** ENREGISTRER LA VENTE (Produits + Services) */
  enregistrerVente() {
    if(!this.panierValide){
      this.toastr.warning('Veuillez valider le panier avant d\'enregistrer la vente');
      return;
    }
    if(this.panierData === null || this.panierData.articles.length === 0){
      this.toastr.warning('Le panier est vide. Veuillez ajouter des produits avant d\'enregistrer la vente');
      return;
    }

     if(this.modePaiementSelectionneProduit === null){
      this.toastr.warning('Veuillez sélectionner un mode de paiement');
      return;
    }
    console.log('Enregistrement de la vente avec le panier:', this.panierData);
    // Enregistrer le panier
    this.onEnregistrerPanier(this.panierData);

  }

  /** ANNULER LA VENTE */
  annulerVente() {
    if (confirm('Voulez-vous vraiment annuler cette vente ?')) {
      this.resetVente();
      this.toastr.info('Vente annulée');
    }
  }

  /** RÉINITIALISER LA VENTE */
  resetVente() {
    this.showVenteSection = false;
    this.showPanierSection = false;
    this.selectedClient = null;
    this.showBonButtons = false ;
    this.panierData = null;
    this.totalServices = 0;
    this.clientForm.reset();
    this.serviceMontant = 0;
    this.modePaiementSelectionne = null;
    this.modePaiementSelectionneProduit = null;
    this.generatedNumeroPaiement = this.generateNumero();
    this.bonBrouillonService.clearBrouillons();
  }
  /** Activer la section du panier */
  
nouvelleVente() {
  // Si on a déjà un panier en cours, ne pas en créer un nouveau
  if (this.panierData && this.panierData.statut === 'en_cours') {
    console.log('Une vente est déjà en cours');
    this.showVenteSection = true;
    return;
  }

  console.log('Démarrage nouvelle vente');

  this.showVenteSection = true;
  this.activeTab = 'produits';
  this.showPanierSection = false;

  // Charger ou créer un brouillon
  this.chargerBrouillonsExistants();
}

/** AFFICHER/MASQUER LE PANIER */
togglePanier() {
  this.showPanierSection = !this.showPanierSection;
}

  /** OUVRIR LE MODAL CLIENT */
  ouvrirModalClient(transaction?: Panier) {
    if (transaction) {
      this.selectedTransaction = transaction;
    }
    this.clientModal.show();
  }

  /** VALIDER LE CLIENT */
  validerClient() {
    if (this.clientForm.valid) {
      const clientData = this.clientForm.value;
      
      if (this.selectedTransaction) {
        // Associer le client à la transaction existante
        this.associerClientATransaction(clientData);
      } else {
        // Nouveau client pour nouvelle transaction
        this.ajouterClient(clientData);
      }
      
      this.clientModal.hide();
      this.clientForm.reset();
    } else {
      this.toastr.warning('Veuillez remplir au moins le nom du client');
    }
  }

  private onEnregistrerPanier(panierAEnregistrer: Panier): void {
  
    console.log('Enregistrement du panier dans onEnregistrerPanier:', panierAEnregistrer);
    //Vérifier que les brouillons sont bien chargés
    if (!this.panierData?.id || !this.panierData?.articles) {
      console.error('Brouillons non chargés:', {
        articles: this.panierData?.articles,
        panierBrouillon: this.panierData
      });
      this.toastr.error('Erreur: Les données du brouillon ne sont pas chargées', 'Erreur');
      return;
    }
  
    // Préparer les données pour l'API unifiée
    const panierCompletData = {
   
      panier: {
        //...panier,
         id: this.panierData.id, 
        totalHT: panierAEnregistrer.totalHT,        
        tva: panierAEnregistrer.tva,
        totalTTC: panierAEnregistrer.totalTTC,
        remise: panierAEnregistrer.remise,
        tauxTVA: panierAEnregistrer.tauxTVA,
        remiseGlobale: panierAEnregistrer.remiseGlobale,
        typeEntite: this.typeEntite,
        typePanier:'produit',
        clientId: this.panierData.clientId || null,
        statut: 'validé' 
      },
      articles: panierAEnregistrer.articles.map(article => ({
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
      /* code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId, */
      clientId: panierAEnregistrer.clientId || null,
      typeEntite:this.typeEntite,
      paiement: panierAEnregistrer.totalTTC ?? 0 > 0 ? new Paiement ({
        numero: this.generatedNumeroPaiement,
        methodePaiement: this.modePaiementSelectionneProduit?.libelle || 'Espèce',
        description: `Montant total vente panier ${panierAEnregistrer.id}`,
        typePaiement: 'autre',
      }) : undefined
    };
    console.log('Données de MISE À JOUR envoyées:', {
      DonnéesPanier: panierCompletData
    });
    this.isLoading = true;
  
    this.panierService.createPanierComplet(panierCompletData).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        console.log('Panier enregistré avec succès:', {
            panierId: result.panier?.id,
            panierStatut: result.panier?.statut
          });
          if(result.paiement && result.paiement.id){
            console.log('Paiement associé au panier enregistré:', result.paiement.id);
            const recette = {
                  montant: result.paiement.montant!,
                  paiementId: result.paiement.id,
                  date:result.paiement.date,
                  description: `Paiement vente panier ID: ${this.panierData?.id} - Paiement ID: ${result.paiement.numero}`,
                  code_structure: this.code_structure,
                  magasinId: this.magasinId,
                  agentId: this.agentId,
                  categoryId:15, // ID de la catégorie "Vente de produit" 
                  paymentMode: result.paiement.methodePaiement

                }
               console.log('Création de la recette avec les données:', recette);

            const formData = new FormData();

            // Remplir formData avec ton objet depense
            Object.entries(recette).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                formData.append(key, value.toString());
                console.log(`Ajout au FormData: ${key} = ${value}`);
              }
            });
            //console.log('FormData pour la recette:', formData);
            this.createRecette(formData);
          }
        this.toastr.success('Vente enregistrée avec succès', 'Succès');
        this.loadTransactions()
        // Réinitialiser le panier brouillon
        this.bonBrouillonService.clearBrouillons();
        this.panierData = null;
        this.resetVente();
        //this.imprimerTicket(result.panier!);
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
  /** AFFICHER DÉTAILS TRANSACTION */
  afficherDetails(panier: Panier) {
    /* if (this.selectedTransaction?.id === panier.id) {
      this.selectedTransaction = null;
    } else {
      this.selectedTransaction = panier;
    } */
   this.selectedTransaction = panier;

   const modalElement = document.getElementById('transactionDetailsModal');
   if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  annulerPanier(panierRetourner: Panier) {
    if (confirm('Voulez-vous vraiment annuler ce panier ?')) {
      /* this.onAnnulerPanier.emit();
      console.log('Annulation du panier:', panier.id);
      this.toastr.info('Panier annulé'); */
      if(!panierRetourner.id){
        this.toastr.error('Impossible d\'annuler un panier sans identifiant');
      }
      const paiementPanierRetourner: Paiement | undefined = panierRetourner?.Paiements?.[0];

      const panierCompletData = {
   
        panier: {
          //...panier,
          id: panierRetourner.id, 
          totalHT: panierRetourner.totalHT,        
          tva: panierRetourner.tva,
          totalTTC: panierRetourner.totalTTC,
          remise: panierRetourner.remise,
          tauxTVA: panierRetourner.tauxTVA,
          typeEntite: panierRetourner.typeEntite,
          typePanier:panierRetourner.typePanier,
          clientId: panierRetourner.clientId || null,
          statut: 'retourné' 
        },
        articles: panierRetourner.articles||panierRetourner.ArticlePaniers,
        code_structure: this.code_structure,
        magasinId: this.magasinId,
        agentId: this.agentId,
        clientId: panierRetourner.clientId || null,
        typeEntite:this.typeEntite,
        paiement: new Paiement ({
          ... paiementPanierRetourner,
          statutPaiement:'annulé',
          typePaiement: 'autre',
        })
      };
      console.log('Données panier à retourner :', {
        DonnéesPanier: panierCompletData
      });
     this.isLoading = true;
    
      this.panierService.createPanierComplet(panierCompletData).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Panier retourné avec succès:', {
              panierId: result.panier?.id,
              panierStatut: result.panier?.statut
            });
            if(result.paiement && result.paiement.id){
              this.recetteService.getByPaiementId(result.paiement.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (recetteExistante) => {
                  if(recetteExistante && recetteExistante.id){
                    const recette = {
                      ...recetteExistante,
                      statutRecette: 'annulé'
                    }
                    const formData = new FormData();

                    // Remplir formData avec ton objet depense
                    Object.entries(recette).forEach(([key, value]) => {
                      if (value !== undefined && value !== null) {
                        formData.append(key, value.toString());
                      }
                    });
                    // Mettre à jour la recette
                    this.recetteService.updateRecette(recetteExistante.id,formData)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        this.toastr.success('Panier retourné avec succès'); 
                        this.loadTransactions();
                        console.log('Recette associée mise à jour avec succès:', recetteExistante.id);
                      },
                      error: (err) => {
                        console.error('Erreur mise à jour recette associée:', err);
                      }
                    });
                  }
                },
                error: (err) => {
                  console.error('Erreur récupération recette par paiementId:', err);
                }
              });
            }
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.toastr.error(error.error?.error || 'Erreur lors de l\'annulation du panier', 'Erreur');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    } 
  }

  /** RETOURNER UN ARTICLE DANS LA TRANSACTION */
retournerArticle(article: ArticlePanier) {
  if (!this.selectedTransaction || !this.selectedTransaction.id) {
    this.toastr.error('Impossible de retourner un article sans transaction sélectionnée');
    return;
  }

  if (confirm('Voulez-vous vraiment retourner cet article ?')) {

    // 1️⃣ Filtrer les articles
    const nouveauxArticles = (this.selectedTransaction.ArticlePaniers || [])
      .filter(a => a.id !== article.id)
      .map(a => new ArticlePanier(a));
    

    // 2️⃣ DÉDUIRE les paramètres dynamiquement (puisqu'ils ne sont pas sauvegardés)
    // Remise par article = vrai si AU MOINS un article a une remise > 0
    const remiseParArticle = nouveauxArticles.some(a => (a.remise ?? 0) > 0);
    
    // TVA par article = vrai si AU MOINS un article a un tauxTVA > 0
    const tvaParArticle = nouveauxArticles.some(a => (a.tauxTVA ?? 0) > 0);
    
    // Remise globale : conserver la valeur originale, mais...
    // Si on a des remises par article, la remise globale ne devrait pas s'appliquer
    // Logique métier : soit remise par article, soit remise globale
    let remiseGlobale = this.selectedTransaction.remiseGlobale ?? 0;
    
    // Convertir en number si c'est une string
    if (typeof remiseGlobale === 'string') {
      remiseGlobale = parseFloat(remiseGlobale);
    }
    
    // Si on a des remises par article, désactiver la remise globale
    if (remiseParArticle && remiseGlobale > 0) {
      console.warn('⚠️ Remise par article détectée, remise globale désactivée');
      remiseGlobale = 0;
    }
    
    // Taux TVA global : utiliser l'original, mais si TVA par article, le désactiver
    let tauxTVA = this.selectedTransaction.tauxTVA ?? 0;
    if (typeof tauxTVA === 'string') {
      tauxTVA = parseFloat(tauxTVA);
    }
    
    if (tvaParArticle && tauxTVA > 0) {
      console.warn('⚠️ TVA par article détectée, taux TVA global désactivé');
      tauxTVA = 0;
    }


    // 4️⃣ Créer la nouvelle instance de panier
    const panier = new Panier({
      ...this.selectedTransaction,
      ArticlePaniers: nouveauxArticles,
      articles: nouveauxArticles,
      remiseParArticle,
      tvaParArticle,
      remiseGlobale,
      tauxTVA,
      dateMiseAJour: new Date() // Mettre à jour la date
    });

    // 5️⃣ Recalculer totaux
    panier.calculerTotals();


    // 7️⃣ Remplacer l'ancien panier
    this.selectedTransaction = panier;
    const paiementPanierRetourner: Paiement | undefined = this.selectedTransaction?.Paiements?.[0];

      const panierCompletData = {
   
        panier: {
          //...panier,
          id: this.selectedTransaction.id, 
          totalHT: panier.totalHT,        
          tva: panier.tva,
          totalTTC: panier.totalTTC,
          remiseGlobale:panier.remiseGlobale,
          remise: panier.remise,
          tauxTVA: panier.tauxTVA,
          typeEntite: this.selectedTransaction.typeEntite,
          typePanier:this.selectedTransaction.typePanier,
          clientId: this.selectedTransaction.clientId || null,
          statut: this.selectedTransaction.statut 
        },
        articles: panier.articles||panier.ArticlePaniers,
        code_structure: this.code_structure,
        magasinId: this.magasinId,
        agentId: this.agentId,
        clientId: this.selectedTransaction.clientId || null,
        typeEntite:this.typeEntite,
        paiement: new Paiement ({
          ... paiementPanierRetourner,
          statutPaiement:paiementPanierRetourner?.statutPaiement,
          typePaiement: 'autre',
        })
      };
      console.log('Données panier avec article retourné :', {
        DonnéesPanier: panierCompletData
      });
     this.isLoading = true;
    
      this.panierService.createPanierComplet(panierCompletData).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Panier mis à jour avec succès:', {
              panierId: result.panier?.id,
              panierStatut: result.panier?.statut,
              paiements: result.paiement
            });
            if(result.paiement && result.paiement.id){
              this.recetteService.getByPaiementId(result.paiement.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (recetteExistante) => {
                  console.log('Recette existante pour le paiement retourné:', recetteExistante);
                  if(recetteExistante && recetteExistante.id){
                    const recette = {
                      ...recetteExistante,
                      montant:recetteExistante.montant,
                      statutRecette: recetteExistante.statutRecette
                    }
                    const formData = new FormData();

                    // Remplir formData avec ton objet depense
                    Object.entries(recette).forEach(([key, value]) => {
                      if (value !== undefined && value !== null) {
                        formData.append(key, value.toString());
                      }
                    });
                    console.log('Mise à jour de la recette avec les données:', formData);
                    // Mettre à jour la recette
                    this.recetteService.updateRecette(recetteExistante.id,formData)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        this.updateStockApresSuppressionArticle(article);
                        this.toastr.success('Article retourné avec succès');
                        this.loadTransactions();
                        //this.imprimerTicket(result.panier!);
                        console.log('Recette associée mise à jour avec succès:', recetteExistante.id);
                         
                      },
                      error: (err) => {
                        console.error('Erreur mise à jour recette associée:', err);
                      }
                    });
                  }
                },
                error: (err) => {
                  console.error('Erreur récupération recette par paiementId:', err);
                }
              });
            }
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.toastr.error(error.error?.error || 'Erreur lors de la suppression de l\'article du panier', 'Erreur');
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }
}

updateStockApresSuppressionArticle(article: ArticlePanier): void {
    if (!article.produitId) {
      console.error('Impossible de mettre à jour le stock sans produitId');
      return;
    }
    this.stockService.getStockByProduitId(article.produitId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stock) => {
          if (stock) {
            console.log(`Stock actuel pour le produit ${article.produitId}:`, stock);
            const nouvelleQuantite = Number(stock.quantiteTotale )+ Number(article.quantite);
            console.log(`Nouvelle quantité après retour de l'article: ${nouvelleQuantite}`);
            const updatedStock = new Stock({
              ...stock, 
              quantiteTotale: nouvelleQuantite,
               
            });
            console.log('Mise à jour du stock avec les données:', updatedStock);
            this.stockService.updateStock(stock.id, updatedStock)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (stockMisajour) => {
                  console.log('Stock mis à jour avec succès:', stockMisajour);
                  console.log(`Stock mis à jour pour le produit ${article.produitId}: nouvelle quantité = ${nouvelleQuantite}`);
                  const mvtStock : MouvementsStock = {
                    produitId: article.produitId!,
                    stockId: stock.id,
                    ref:`MVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    prixUnitaire:article.prixUnitaire,
                    quantite: article.quantite,
                    uniteStock:article.produit?.unite || article.Produit?.unite || 'unités',
                    typeMouvement: 'Entrée',
                    description: `Retour d'article du panier ID: ${this.selectedTransaction?.id}`,
                    code_structure: this.code_structure!,
                    magasinId: this.magasinId!,
                    acteurId: this.agentId!,
                    prixTotal: article.prixUnitaire * article.quantite,
                    dateMouvement: new Date()
                  };
                  this.mouvementsStockService.create(mvtStock)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        console.log('Mouvement de stock enregistré pour le retour d\'article');
                      },
                      error: (err) => {
                        console.error('Erreur enregistrement mouvement de stock:', err);
                      }
                    });         
                },
                error: (err) => {
                  console.error('Erreur mise à jour stock:', err);
                }
              });
          } else {
            console.warn(`Aucun stock trouvé pour le produitId ${article.produitId}`);
          }
        },
        error: (err) => {
          console.error('Erreur récupération stock:', err);
        }
      });
  }

  /** OBTENIR LE NOM DU CLIENT */   
 
  getClientName(clientId: number): string {
    const client = this.clients.find(c => c.id === clientId);
    return client ? client.nomComplet : 'Inconnu';
  }

  /** CHARGER LES TRANSACTIONS */
  /* private loadTransactions(): void {
    console.log('Chargement des transactions de la caisse...');
    this.panierService.getPaniersAujourdhui(this.code_structure!, this.magasinId!,null)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('Résultat des transactions:', result);
          this.paniers = result.paniers;
          this.totalCaisse = result.totalGlobal;
          this.totalTransactions = this.paniers.length;
          console.log('Transactions chargées:', this.paniers);
        },
        error: (err) => {
          console.error('Erreur chargement transactions:', err.error.message);
          this.toastr.error('Erreur lors du chargement des transactions');
        }
      });
  } */
 loadTransactions(): void {
    console.log('Chargement des transactions avec pagination...');
    
    const filter: TransactionsFilter = {
      page: this.filters.page,
      limit: this.itemsPerPage,
      search: this.filters.search || undefined,
      statut: this.filters.statut !== 'tous' ? this.filters.statut : undefined
    };

    this.panierService.getPaniersAujourdhuiBis(
      this.code_structure!, 
      this.magasinId!, 
      null,
      filter
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('Résultat des transactions:', response);
        this.paniers = response.items;
        this.totalCaisse = response.statistiques.totalGlobal;
        this.totalTransactions = response.statistiques.nombreTransactions;
        
        // Mise à jour de la pagination
        this.totalItems = response.pagination.total;
        this.currentPage = response.pagination.page;
        this.totalPages = response.pagination.totalPages;
        this.hasNext = response.pagination.hasNext;
        this.hasPrev = response.pagination.hasPrev;
        
        console.log('Transactions chargées:', this.paniers);
      },
      error: (err) => {
        console.error('Erreur chargement transactions:', err);
        this.toastr.error('Erreur lors du chargement des transactions');
      }
    });
  }

/**
 * Appliquer les filtres
 */
applyFilters(): void {
  this.filters.page = 1;
  this.loadTransactions();
}

/**
 * Réinitialiser les filtres
 */
resetFilters(): void {
  this.filters = {
    page: 1,
    limit: this.itemsPerPage,
    search: '',
    statut: ''
  };
  this.loadTransactions();
}

/**
 * Gestionnaire de recherche avec debounce
 */
onSearchChange(searchTerm: string): void {
  this.searchSubject.next(searchTerm);
}

/**
 * Changer de page
 */
onPageChange(page: number): void {
  if (page >= 1 && page <= this.totalPages) {
    this.filters.page = page;
    this.loadTransactions();
  }
}

/**
 * Changer le nombre d'éléments par page
 */
onItemsPerPageChange(limit: number): void {
  this.itemsPerPage = limit;
  this.filters.limit = limit;
  this.filters.page = 1;
  this.loadTransactions();
}

/**
 * Changer le filtre de statut
 */
onStatutChange(statut: string): void {
  this.filters.statut = statut;
  this.filters.page = 1;
  this.loadTransactions();
}

  //.............................................................................
private chargerBrouillonsExistants(): void {
  this.panierService.getPaniersBrouillon(this.code_structure!, this.magasinId!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (paniersBrouillons) => {
        const brouillonCaisse = paniersBrouillons.find(panier => 
          panier.agentId === this.agentId && 
          panier.statut === 'en_cours' &&
          panier.bonId === null
        );

        if (brouillonCaisse) {
          // Mettre à jour le service AVANT de l'utiliser
          this.bonBrouillonService.setPanierBrouillon(brouillonCaisse);
          this.panierData = brouillonCaisse;
          console.log('Brouillon existant chargé:', brouillonCaisse.id);
          this.toastr.info('Brouillon existant chargé');
        } else {
          // Créer un nouveau brouillon
          this.creerNouveauBrouillon();
        }
      },
      error: (err) => {
        console.error('Erreur chargement brouillons:', err.error?.message || err.message || err);
        this.creerNouveauBrouillon();
      }
    });
}
private creerNouveauBrouillon(): void {
  const panierBrouillonData = {
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
    typeEntite: this.typeEntite
  };
  
  this.panierService.createPanierComplet(panierBrouillonData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        console.log('Nouveau brouillon créé:', result);
        this.panierData = result.panier;
        // Mettre à jour le service GLOBALEMMENT
        this.bonBrouillonService.setPanierBrouillon(result.panier);
        this.toastr.info('Nouveau panier brouillon créé');
      },
      error: (err) => {
        console.error('Erreur création brouillon:', err);
        this.toastr.error('Erreur lors de la création du brouillon');
      }
    });
}

  loadDataProduits(): void {
        this.isLoading = true;
        forkJoin([
          this.produitsServices.getAllProduits(
            this.code_structure!,
            1,
            10000),
          this.stockService.getStocksByStructure(this.code_structure!),
          this.clientsService.getClientsByStructure(this.code_structure!)  
        ])
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => (this.isLoading = false))
          )
          .subscribe({
            next: ([produit, stock, clients]) => {
              //this.fournisseurs = four
              this.produits = produit.items;
              this.stocks = stock;
              this.clients = clients;
              this.filteredProducts = this.produits;
              console.log('Produits chargés', this.produits);
              console.log('Produits chargés', this.filteredProducts);
            },
            error: (err) => console.error('Erreur chargement données', err),
          });
    }

  // Gestion du panier
  onPanierStatutChange(panier: Panier): void {
    console.log('📦 Panier reçu dans bon', panier.statut);
    
    // Toujours mettre à jour panierData
    this.panierData = panier;
    this.totalPanier = panier.totalHT || 0;
    
    // Mettre à jour l'état de validation
    if (panier.statut === 'validé') {
      //this.onPanierValide(panier);
      this.panierValide = true;
      this.showBonButtons = true;
    } 
    else if (panier.statut === 'en_cours') {
      //this.onPanierModifie(panier);
      this.panierValide = false;
      this.showBonButtons = false;
    }
  }


onPanierAnnule(): void {
    this.panierData = null;
    this.onAnnulerPanier.emit();
  }

onTotalPanierChange(total: number): void {
    this.totalPanier = total;
  }

// Méthode pour générer un numéro unique de paiement
  generateNumero(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `NP-${timestamp}-${random}`;
  }

  //=============================================================
  // Méthodes pour la génération de PDF (tickets, factures, etc.)
  //=============================================================
  // Dans CaisseComponent, modifiez ces méthodes :

/** IMPRIMER TICKET AUTOMATIQUE (sans client) */
imprimerTicket(panier: Panier) {
  console.log('Impression du ticket automatique pour le panier:', panier.id);
  
  // Appeler le service PDF pour générer le ticket de caisse
  this.pdfGenerator.generateTicketCaisse(panier, {
    nom: panier.user?.nom // Vous pouvez récupérer le nom réel de l'agent
  });
  
  this.toastr.info('Impression du ticket en cours...');
}

// Charger les informations de la structure pour le PDF
private loadStructureInfo(): void {
    this.structureService.getByCodeStructure(this.code_structure!)
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

/** GÉNÉRER TICKET AVEC CLIENT (quand on clique sur le bouton Ticket) */
genererTicketAvecClient(transaction: Panier) {
  // Ouvrir le modal pour récupérer les infos du client
  //this.selectedTransaction = transaction;
  
  // Vérifier si un client est déjà associé
  if (transaction.clientId) {
    // Récupérer les infos du client
    const client = this.clients.find(c => c.id === transaction.clientId);
    if (client) {
      this.genererTicketPourClient(transaction, client);
      return;
    }
  }
  
  // Sinon ouvrir le modal pour saisir les infos
  this.ouvrirModalClient(transaction);
}

/** GÉNÉRER LE TICKET APRÈS SAISIE DU CLIENT */
validerClientPourTicket() {
  if (this.clientForm.valid) {
    const clientData = this.clientForm.value;
    
    if (this.selectedTransaction) {
      // Générer le ticket avec les infos du client
      this.genererTicketPourClient(this.selectedTransaction, clientData);
      
      // Fermer le modal
      const modalElement = document.getElementById('clientModal');
      if (modalElement) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
      }
      
      this.clientForm.reset();
      this.selectedTransaction = null;
    }
  } else {
    this.toastr.warning('Veuillez remplir au moins le nom du client pour le ticket');
  }
}

/** MÉTHODE PRIVÉE POUR GÉNÉRER LE TICKET */
private genererTicketPourClient(panier: Panier, client: any): void {
  console.log('Génération du ticket avec client:', client);
  
  // Appeler le service PDF pour générer le ticket de vente
  this.pdfGenerator.generateTicketVente(panier, client, {
    nom: panier.user?.nom // Vous pouvez récupérer le nom réel de l'agent
  });
  
  this.toastr.success('Ticket généré avec les informations du client');
}
}
