/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../modeles/clients.model';
import { Produits } from '../../../modeles/produit.modele';
import { Panier } from '../../../modeles/panier.model';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { NGXLogger } from 'ngx-logger';
import { ProduitsService } from '../../../services/produits.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { PaniersService } from '../../../services/paniers.service';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import { PanierComponent } from '../../../sharedComposants/panier/panier.component';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { Stock } from '../../../modeles/entrees-sorties.model';
import { RecettesService } from '../../../services/recettes.service';
import { ModePaiement, Paiement } from '../../../modeles/paiement.model';

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

  code_structure = 'MASTRUCTURET-NZNC';
  magasinId = 1;
  agentId = 1;

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

  // Ajout des variables pour le modal
  private clientModal: any;

  private fb = inject(FormBuilder);
    //private paginationService = inject(ApplicationService);
    private cdr = inject(ChangeDetectorRef);
    private toastr = inject(ToastrService);
    private bonBrouillonService = inject(BonBrouillonService);
    private logger = inject(NGXLogger);
    private produitsServices = inject(ProduitsService);
    private panierService = inject(PaniersService);
    private stockService = inject(StockInventaireService);
    private pdfGenerator = inject(PdfMakerServiceService);
    private recetteService = inject(RecettesService);

  ngOnInit() {
    this.iniForms();
    this.loadDataProduits();
    this.loadTransactions();
    //this.loadFakeData();
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
    this.panierData = null;
    this.totalServices = 0;
    this.clientForm.reset();
    this.serviceMontant = 0;
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


  /** Enregistrer une vente */
  enregistrerBon() {
    this.panier.statut = 'validé';
    /* this.paniers.push(this.panier);
    this.totalCaisse += this.panier.totalTTC;
    alert('Vente enregistrée avec succès !'); */
  }

  private onEnregistrerPanier(panier: Panier): void {
  
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
        totalHT: panier.totalHT,
        tva: panier.tva,
        totalTTC: panier.totalTTC,
        tauxTVA: panier.tauxTVA,
        typeEntite: this.typeEntite,
        typePanier:'produit',
        clientId: this.panierData.clientId || null,
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
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      clientId: panier.clientId || null,
      typeEntite:this.typeEntite,
      paiement: panier.totalTTC ?? 0 > 0 ? new Paiement ({
        numero: this.generatedNumeroPaiement,
        methodePaiement: panier.methodePaiement || 'Espèce',
        description: `Montant total vente panier ${panier.id}`,
        typePaiement: 'autre',
      }) : undefined
    };
    console.log('Données de MISE À JOUR envoyées:', {
      panierId: this.panierData?.id, //ID du panier existant
      articles: panier.articles.map(a => ({ id: a.id, produitId: a.produitId }))
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
                  description: `Paiement vente panier ID: ${this.panierData?.id} - Paiement ID: ${result.paiement.numero}`,
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
    if (this.selectedTransaction?.id === panier.id) {
      this.selectedTransaction = null;
    } else {
      this.selectedTransaction = panier;
    }
  }

  annulerPanier(panier: Panier) {
    if (confirm('Voulez-vous vraiment annuler ce panier ?')) {
      this.onAnnulerPanier.emit();
      console.log('Annulation du panier:', panier.id);
      this.toastr.info('Panier annulé');
    }
  }

   /** IMPRIMER TICKET */
  imprimerTicket(panier: Panier) {
    console.log('Impression du ticket pour le panier:', panier.id); 
    //this.pdfGenerator.generateTicket(panier, this.selectedClient);
    this.toastr.info('Impression du ticket en cours...');
  }

  getClientName(clientId: number): string {
    const client = this.clients.find(c => c.id === clientId);
    return client ? client.nomComplet : 'Inconnu';
  }

  /** CHARGER LES TRANSACTIONS */
  private loadTransactions(): void {
    console.log('Chargement des transactions de la caisse...');
    this.panierService.getPaniersAujourdhui(this.code_structure, this.magasinId,null)
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
  }

  //.............................................................................
private chargerBrouillonsExistants(): void {
  this.panierService.getPaniersBrouillon(this.code_structure, this.magasinId)
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
        console.error('Erreur chargement brouillons:', err);
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
    } else if (panier.statut === 'en_cours') {
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
}
