import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { CommonModule } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Produits } from '../../../modeles/produit.modele';
import { ApplicationService } from '../../../services/application.service';
import { Operation } from '../../../modeles/operation.model';
import { Bon, BonAvecFichier } from '../../../modeles/bon.model';
import { Paiement, PaiementAvecFichier } from '../../../modeles/paiement.model';
import { MaagasinsService } from '../../../services/maagasins.service';
import { Magasin } from '../../../modeles/magasin.model';
import { FournisseursService } from '../../../services/fournisseurs.service';
import { ToastrService } from 'ngx-toastr';
import { finalize, forkJoin,Subject, Subscription, takeUntil } from 'rxjs';
import { normalize } from '../../../utils/string-utils';
import {  Panier } from '../../../modeles/panier.model';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { Stock } from '../../../modeles/entrees-sorties.model';
import { PaiementComponent } from '../../../sharedComposants/paiement/paiement.component';
import { BonsService } from '../../../services/bons.service';
import { PaniersService } from '../../../services/paniers.service';
import { PaiementsService } from '../../../services/paiements.service';
import { OperationsService } from '../../../services/operations.service';
import { NGXLogger } from 'ngx-logger';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { StructureService } from '../../../services/structure.service';
import { DepencesService } from '../../../services/depences.service';
import { BonsComponent } from '../../../sharedComposants/bons/bons.component';
import { User } from '../../../modeles/user.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-fournisseurs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PaiementComponent, BonsComponent],
  templateUrl: './fournisseurs.component.html',
  styleUrl: './fournisseurs.component.css',
})
export class FournisseursComponent implements OnInit, OnDestroy {

  //Foemulaire réarif Fournisseur
  fournisseurForm!: FormGroup; // Formulaire de fournisseur

  // Variables de filtrage par date
  startDate?: string;
  endDate?: string;
  currentTime = '';
  currentDate = ' ';

  private static sequence = 0;

  // Informations sur la structure et autres entités
  code_structure:string|null = null;
  magasinId:number|null = null ;
  agentId : number|null = null;

  currentUser: User | null = null;
  private userSubscription!: Subscription;

  // Variables pour la génération des numéros
  generatedNumeroPaiement!: string ;
  generatedNumero !:string ; // Numéro généré

  // Variables pour la gestion des actions
  textBoutonNewBon = 'Nouveau bon';
  actionType = 'ajouter';
  typeBon = '';
  typeEntite: 'client' | 'fournisseur'|'autre' = 'fournisseur';
  actionEnCours: string | null = null;

  // Variables de totaux
  totalBon = 0; // Calculé dynamiquement
  totalPanier = 0;

  // Variable pour les messages d'erreur
  errorMessage = '';

  // Variables de pagination
  totalPages = 1;
  currentPageBon = 1;
  totalPagesBon = 2;
  currentPagePaiement = 1;
  totalPagesPaiement = 2;
  currentPageFournisseur = 1;
  totalPagesFournisseur = 2;
  rowsPerPage = 5; // Nombre par défaut de lignes par page
  
  //Variables des États d'affichage
  isLoading = false;
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
  showPaiementComponent = false;
  showConfirmationModal = false;


  // Ajouter une référence au composant Bon
  @ViewChild(BonsComponent) bonComponent!: BonsComponent;

  // Pour gérer les désabonnements
  private destroy$ = new Subject<void>(); //Pour se désabonner des lorsqu'on change de composants

  // Variables de recherche
  searchInput = '';
  searchBonQuery = '';
  searchProduct = ''; // Champ de recherche pour les produits
  searchQuery = ''; // Chaîne de recherche
  searchPaiementQuery = '';

  // Variables de sélection
  selectedFournisseur: Fournisseur | null = null; // Fournisseur sélectionné pour modification
  selectedBonIndexF: number | null = null;
  selectedBonIndexB: number | null = null;
  selectedBonIndexP: number | null = null;
  selectedBonIndexO: number | null = null;
  

  // Variables de brouillon
  bonBrouillon: Bon | null = null;
  panierBrouillon: Panier | null = null;  

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
  magasins: Magasin[] = [];
  fournisseurs: Fournisseur[] = []; // Liste des fournisseurs
  filteredFournisseurs: Fournisseur[] = []; // Liste filtrée pour la recherche
  archivededFournisseurs: Fournisseur[] = []; 

  
  banques: string[] = [
    "Banque de l'Habitat du Sénégal (BHS)",
    'Banque Sénégalaise de Développement (BSD)',
    'Société Générale de Banques au Sénégal (SGBS)',
    "Caisse d'Epargne et de Prévoyance du Sénégal (CEPS)",
    'Banque Atlantique Sénégal',
    'Banque Internationale pour le Commerce et l’Industrie du Sénégal (BICIS)',
    'La Banque Agricole (BA)',
    'Banque Nationale pour le Développement Économique (BNDE)',
    'Ecobank Sénégal',
    'Standard Chartered Bank Sénégal',
    // Ajoutez d'autres banques ici selon vos besoins
  ];  

  //Injection de services
  private fb = inject(FormBuilder);
  private paginationService = inject(ApplicationService);
  private cdr = inject(ChangeDetectorRef);
  private magasinService = inject(MaagasinsService);
  private fournisseurService = inject(FournisseursService);
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
  private depensesService = inject(DepencesService);
  private authService = inject(AuthService);
  

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
      console.log('Code structure initialisé :', this.code_structure);
      // Déterminer si on doit montrer le champ structure
      //this.isStructureAdmin = this.authService.hasRole('Administrateur'); // Ou vérifiez par ID

      // Récupérer l'ID de la structure de l'utilisateur connecté
      
    });
    // Chargement des données des fournisseurs (par exemple via un service)
    this.loadData();
    this.loadDataProduits();
    this.loadBonAndPaiement();
    this.initForm();
    this.loadStructureInfo();

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
    if(this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
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
      magasinId: ['', Validators.required],
    });

  }

  onBonEnregistre(event: BonAvecFichier): void {
      console.log('Bon enregistré:', event.bon);
      console.log('Bon enregistré:', event.fichier);

      if (!this.selectedFournisseur) {
        this.toastr.error('Aucun fournisseur sélectionné');
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

      /* if( event.bon.avance && this.selectedFournisseur.montantAPayer! - event.bon.avance <0){
        this.toastr.error('Le montant de l\'avance dépasse le montant à payer au fournisseur', 'Erreur');   
        return;
      } */
      // Associer fournisseurId et s'assurer que le statut est "validé"
      event.bon.fournisseurId = this.selectedFournisseur.id;
      event.bon.statutBon = 'validé'; // Changer le statut à validé

      // Si c'était un brouillon, utiliser l'ID existant
      if (this.bonBrouillon) {
        event.bon.id = this.bonBrouillon.id;
      } 

      console.log('Bon reçu dans fournisseur',event.bon );
      console.log('panier reçu dans fournisseur',event.bon.panier);
      // Appel API
      this.enregistrerBon(event.bon, event.bon.panier!,event.fichier);
       //this.enregistrerBonAvecFichiers(event.bon, event.bon.panier, event.fichier);
      this.showBonForm = false;
      // Nettoyer les brouillons après enregistrement
      this.bonBrouillonService.clearBrouillons();
  }

    
  onPanierAnnule(): void {
    //this.showPanierComponent = false;
    this.reinitialiserEtMasquerFormulaires();
    
  }
  onBonAnnule(): void {
    //this.showBonComponent = false;
    console.log('Annulation du bon - Réinitialisation');
    this.reinitialiserEtMasquerFormulaires();

  }
// Méthode pour générer un numéro unique de paiement
  generateNumero(): string {
    
    return `NP-${uuidv4()}`;
  }

  generateNumeroBon(): string {
  return `BON-${uuidv4()}`;
}
// fournisseurs.component.ts
private enregistrerBon(bon: Bon, panier: Panier, fichier:File|null): void {
  if (!this.selectedFournisseur) {
    this.toastr.error('Aucun fournisseur sélectionné', 'Erreur');
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
      fournisseurId: this.selectedFournisseur.id,
      statutBon: 'validé'
    },
    panier: {
      //...panier,
       id: this.panierBrouillon.id, 
      totalHT: panier.totalHT,
      tva: panier.tva,
      totalTTC: panier.totalTTC,
      tauxTVA: panier.tauxTVA,
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
    code_structure: this.code_structure,
    magasinId: this.magasinId,
    agentId: this.agentId,
    fournisseurId: this.selectedFournisseur.id,
    typeEntite:this.typeEntite,
    paiement: bon.avance?? 0 > 0 ? new Paiement ({
      numero: this.generatedNumeroPaiement,
      methodePaiement: bon.methodePaiement || 'Espèce',
      description: `Avance pour bon ${bon.numero}`,
      typePaiement: 'fournisseur'
    }) : undefined
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
          const depense = {
          montant: result.paiement.montant!,
          type: 'STOCK',
          date:result.paiement.date,
          statutDepense:'validé',
          paiementId: result.paiement.id,
          description: `Paiement fournisseur ID: ${this.selectedFournisseur?.id} - Paiement ID: ${result.paiement.numero}`,
          code_structure: this.code_structure,
          magasinId: this.magasinId,
          agentId: this.agentId,
          categoryId:13, // ID de la catégorie "Fournisseurs" 
          paymentMode: result.paiement.methodePaiement

        }
        const formData = new FormData();

        // Remplir formData avec ton objet depense
        Object.entries(depense).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        this.createDepense(formData);
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

  // Getter pour accéder facilement aux contrôles du formulaire
  get f() {
    return this.fournisseurForm.controls;
  }

 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 canReturn(bon: any): boolean {
  if (!bon) return false;

  // Normaliser le statut et le type (trim + lowercase)
  const statut = String(bon.statutBon ?? '').trim().toLowerCase();
  const type = String(bon.type ?? '').trim().toLowerCase();

  // Convertir avance en nombre proprement (gère "0", "0,00", null, undefined)
  const avanceRaw = bon?.avance ?? 0;
  const avanceStr = String(avanceRaw).trim().replace(',', '.'); // remplace la virgule si besoin
  const avanceNum = isNaN(Number(avanceStr)) ? 0 : Number(avanceStr);

  // DEBUG temporaire -> ouvre la console pour voir ce qui arrive
  console.log('canReturn:', { avanceRaw, avanceStr, avanceNum, statut, type });

  // Condition : statut "validé" ET type "livraison" ET avance === 0
  return statut === 'validé' && type === 'livraison' && avanceNum === 0;
}

  onRowSelect(fournisseur: Fournisseur): void {
    this.selectedFournisseur = fournisseur;
    this.isRowSelected = true; // Lorsque la ligne est sélectionnée, la colonne droite s'affiche
  }

  // Fonction pour fermer la partie des actions (colonne droite)
  closeActions(): void {
    this.selectedFournisseur = null;
    this.isRowSelected = false; // Fermer la colonne droite en réinitialisant la sélection
  }

  onAction(action: string): void {
    //console.log(`${action} Produits:`, this.selectedFournisseur);
    this.actionType = action;
    //console.log(`${this.actionType} fournisseur:`, this.selectedFournisseur);
    if (this.selectedFournisseur) {
      console.log(`${action} fournisseur:`, this.selectedFournisseur);
      if (this.actionType === 'operation') {
        this.checkBrouillonExists((exists) => {
          if (exists) {
            this.textBoutonNewBon = 'Modifier le bon brouillon';
          } else {
            this.textBoutonNewBon = 'Nouveau bon';
          }
        });
        this.showBonDetails();
      } else if (this.actionType === 'modifier') {
        this.openModal(this.selectedFournisseur);
      } else if (this.actionType === 'supprimer') {
        this.deleteFournisseur(this.selectedFournisseur.id!);
      } else if (this.actionType === 'statut') {
        this.toggleStatut(this.selectedFournisseur);
      } else {
        console.log('Aucune action correspondant');
      }
    } else {
      this.selectedFournisseur = null;
      this.actionType = 'ajouter'; // On s'assure que l'actionType est bien 'ajouter' pour "Nouveau produit"
      this.selectedFournisseur = null;
      this.openModal();
    }
  }

  // Chargement des fournisseurs
  // Méthode pour mettre à jour les fournisseurs affichés en fonction de la page courante
  /* updateFilteredFournisseurs(): void {
    this.filteredFournisseurs = this.fournisseurs.slice(
      (this.currentPageFournisseur - 1) * 10,
      this.currentPageFournisseur * 10,
    );
  } */
 
  // Gestion de la recherche
  onSearchChange(): void {
    const query = normalize(this.searchQuery);

    this.filteredFournisseurs = this.fournisseurs.filter(
      (fournisseur) =>
        normalize(fournisseur.nomComplet).includes(query) ||
        normalize(fournisseur.adresse).includes(query) ||
        normalize(fournisseur.telephone?.toString()).includes(query) ||
        normalize(fournisseur.banque).includes(query) ||
        normalize(fournisseur.montantAPayer?.toString()).includes(query),
    );

    this.currentPageFournisseur = 1;
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Ouvrir le modal d'ajout ou modification
  openModal(fournisseur?: Fournisseur): void {
    //console.log('Texte du bouton bis:', this.actionType);
    //this.actionType === 'ajouter'
    if (fournisseur) {
      console.log('Valeur actionType:', this.actionType);
      if (this.actionType === 'ajouter') {
        this.isEditMode = false;
        this.fournisseurForm.reset();
        //console.log('Texte du bouton bis:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
      } else {
        this.isEditMode = true;
        //this.selectedFournisseur = fournisseur;
        this.fournisseurForm.patchValue(fournisseur); // Remplir le formulaire avec les données du fournisseur
      }
    } else {
      this.isEditMode = false;
      this.actionType = 'ajouter';
      this.fournisseurForm.reset(); // Réinitialiser le formulaire
    }
    this.showModal = true;
  }

  toggleStatut(user: Fournisseur) {
    user.statut = !user.statut;
    this.updateStatus(user.id!, user.statut);
  }

  // Soumettre le formulaire dans le modal

  onModalSubmit(): void {
    if (this.fournisseurForm.invalid) {
      this.fournisseurForm.markAllAsTouched();
      this.errorMessage = 'Veuillez corriger les erreurs dans le formulaire';
      return;
    }

    const formData = this.fournisseurForm.value;

    if (this.isEditMode && this.selectedFournisseur) {
      this.updateFournisseur(this.selectedFournisseur.id!, formData);
    } else {
      this.fournisseurForm.patchValue({
        code_structure: this.code_structure,
        statut: true,
        montantAPayer: 0,
      });
      this.createFournisseur(this.fournisseurForm.value);
    }
  }

  // Fermer le modal
  closeModal(): void {
    this.showModal = false;
  }

  // Afficher les détails du bon
  showBonDetails(): void {
    this.showDetails = true;
    this.showBonDetailsSection = true;

    if (!this.selectedFournisseur) return;

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

  // Méthode pour formater correctement les dates pour l'API
  private formatDateForAPI(date?: string | Date): string {
    if (!date) return '';
    
    const dateObj = new Date(date);
    // Format: YYYY-MM-DD pour l'API
    return dateObj.toISOString().split('T')[0];
  }

  // Fermer les détails (bons ou paiements)
  closeDetails(): void {
    this.showDetails = false;
    this.showBonDetailsSection = false;
    this.showPaiementDetailsSection = false;
    if(this.showBonForm ) this.showBonForm = false;
    if(this.showPaiementForm ) this.showPaiementForm = false;
    
  }

  // Fonction pour afficher ou masquer le formulaire
  toggleBonForm(): void {
    this.generatedNumero = this.generateNumeroBon();
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
    if (!this.selectedFournisseur) return;

    this.bonService.getBonsBrouillons(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bonsBrouillons) => {
          const brouillonFournisseur = bonsBrouillons.find(bon => 
            bon.fournisseurId === this.selectedFournisseur?.id
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

  checkBrouillonExists(callback: (exists: boolean) => void): void {

  this.bonService.getBonsBrouillons(this.code_structure!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (bonsBrouillons) => {
        const brouillonFournisseur = bonsBrouillons.find(bon => 
          bon.fournisseurId === this.selectedFournisseur?.id
        );
        callback(brouillonFournisseur !== undefined);
      },
      error: (err) => {
        console.error('Erreur chargement brouillons:', err);
        callback(false); // En cas d'erreur, on considère qu'il n'y a pas de brouillon
      }
    });
}

  private creerNouveauBrouillon(): void {
    if (!this.selectedFournisseur) return;

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
        agentId:this.agentId,
        magasinId:this.magasinId
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
        agentId:this.agentId,
        magasinId:this.magasinId
      },
      articles: [],
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
      fournisseurId: this.selectedFournisseur.id,
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

  toggleDetails(index: number, operation: Operation):void {

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


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFournisseurByOperation(operation: any): Fournisseur | null {
    
     if (!operation) return null;

    let fournisseurId: number | undefined;

    if (operation instanceof Paiement || (operation.paiementId && operation.fournisseurId)) {
      fournisseurId = operation.fournisseurId;
    } else if (operation instanceof Bon || (operation.bonId && operation.fournisseurId)) {
      fournisseurId = operation.fournisseurId;
    } else if (operation.fournisseurId) {
      fournisseurId = operation.fournisseurId;
    }

    if (!fournisseurId) {
      console.log('Operation sans fournisseurId:', operation);
      return null;
    }

    const fournisseur = this.filteredFournisseurs.find((four) => four.id === fournisseurId);
    
    if (!fournisseur) {
      console.log('Fournisseur non trouvé:', fournisseurId);
    }
    
    return fournisseur || null;
  }

 loadDataProduits(): void {
      this.isLoading = true;
      forkJoin([
        this.produitsServices.getAllProduits(this.code_structure!),
        this.stockService.getStocksByStructure(this.code_structure!),
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

  // Méthodes pour la pagination
  get getPaginatedFournisseurs() {
    return this.paginationService.paginate(
      this.filteredFournisseurs,
      this.currentPageFournisseur,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowsPerPageChange(event: any) {
    this.rowsPerPage = this.safeNumber(event.target.value);

    // Réinitialiser les pages à 1 pour éviter un problème d'affichage
    this.currentPageFournisseur = 1;
    this.currentPageBon = 1;
    this.currentPagePaiement = 1;

    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  // Gérer le changement de page
  onPageChange(page: number, instanceObj: string): void {
    if (instanceObj === 'Fournisseur') {
      this.currentPageFournisseur = page;
    } else if (instanceObj === 'Bon') {
      this.currentPageBon = page;
    } else if (instanceObj === 'Paiement') {
      /*  else if (instanceObj === 'BonBis') {
    this.currentPageBonBis = page;
  } */
      this.currentPagePaiement = page;
    }
    /* else if (instanceObj === 'PaiementBis') {
    this.currentPagePaiementBis = page;
  } */
    //console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);

    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  // Filtrer les bons
  onSearchChangeBon() {
    //if (this.selectedFournisseur) {
    this.filteredBons = this.allBons.filter(
      (bon) =>
        bon.numero.toLowerCase().includes(this.searchBonQuery.toLowerCase()) ||
        bon.type.toLowerCase().includes(this.searchBonQuery.toLowerCase()) ||
        bon.montantTotal.toString().toLowerCase().includes(this.searchBonQuery), //||
      //this.getFournisseurByOperation(bon).toLowerCase().includes(this.searchBonQuery)
    );
    this.currentPageBon = 1;
    //}
  }

  // Filtrer les paiements
  onSearchChangePaiement() {
    //if (this.selectedFournisseur) {
    this.filteredPaiements = this.allPaiements.filter(
      (paiement) =>
        paiement.description.toLocaleUpperCase().includes(this.searchPaiementQuery.toLowerCase()) ||
        // paiement.methodePaiement.valueOf().includes(this.searchPaiementQuery.toLowerCase()) ||
        paiement.montant.toString().includes(this.searchPaiementQuery.toLowerCase()) ||
        new Date(paiement.date)
          .toLocaleDateString()
          .includes(this.searchPaiementQuery.toLowerCase()), //||
      //this.getFournisseurByOperation(paiement).includes(this.searchPaiementQuery.toLowerCase())
    );
    this.currentPagePaiement = 1;
    //}
  }

  // Méthode pour filtrer les opérations (frontend)
  filtrerOperations(): void {
    if (!this.selectedFournisseur) {
      console.log('Aucun fournisseur sélectionné');
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

  // Méthode pour afficher le formulaire de paiement
  togglePaiementForm(): void {
    this.generatedNumeroPaiement = this.generateNumero();
    this.showBonForm = false;
    this.showPaiementForm = !this.showPaiementForm;

  }
  
  // Gérer l'événement d'enregistrement du paiement
  onPaiementEnregistre(event: PaiementAvecFichier): void {
    // Associer le fournisseur au paiement
    if(!this.selectedFournisseur){
      this.toastr.error('Aucun fournisseur sélectionné', 'Erreur');
      return;
    }
    if (this.selectedFournisseur) {
      event.paiement.fournisseurId = this.selectedFournisseur.id;
    }
    
    console.log('Paiement à enregistrer reçu dans fournisseur:', event.paiement, 'Fichier:', event.fichier);
    // Enregistrer le paiement
    if(event.paiement.montant <=0 
        || event.paiement.montant === null 
        || event.paiement.montant === undefined 
        || Number(this.selectedFournisseur?.montantAPayer) <0){
        this.toastr.error('Pas de dette au fournisseur ou le montant est mal renseigné (0 ou nombre négatif) ', 'Erreur');
        return;
    }
    if(Number(this.selectedFournisseur?.montantAPayer) - Number(event.paiement.montant) < 0){
        this.toastr.error('Le montant du paiement dépasse la dette du fournisseur', 'Erreur');
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
    if (!this.selectedFournisseur) {
      this.toastr.error('Aucun fournisseur sélectionné', 'Erreur');
      return;
    }

    // Étape 1 : compléter les données du paiement
    /* const paiementCompletData: Paiement = {
      ...paiement,
      agentId: this.agentId,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      fournisseurId: this.selectedFournisseur.id
    }; */
    const paiementCompletData = new Paiement({
      ...paiement,
      agentId: this.agentId || undefined,
      code_structure: this.code_structure || undefined,
      magasinId: this.magasinId || undefined,
      fournisseurId: this.selectedFournisseur.id
    });
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
        console.log('Paiement enregistré avec succès:', {
            paiementID: result?.id,
            montantPaye: result.montant,
            methodePaiement: result.methodePaiement,
            fournisseurId: result.fournisseurId
          });
        const depense = {
          montant: result.montant,
          type: 'STOCK',
          date:result.date,
          paiementId: result.id,
          statutDepense:'validé',
          description: `Paiement fournisseur ID: ${result.fournisseurId} - Paiement ID: ${result.numero}`,
          code_structure: this.code_structure,
          magasinId: this.magasinId,
          agentId: this.agentId,
          categoryId:13, // ID de la catégorie "Fournisseurs" 
          paymentMode: result.methodePaiement

        }
        const formData = new FormData();

        // Remplir formData avec ton objet depense
        Object.entries(depense).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        this.createDepense(formData);
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
private createDepense(formData: FormData): void {
  this.depensesService.createDepense(formData)
  .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        /* this.depenses.unshift(newDepense); // Ajouter au début
        this.filteredDepenses = [...this.depenses];*/
        //this.toastr.success('Dépense enregistrée avec succès'); 
        console.log('Dépense créée avec succès:', result);
      },
      error: (err) => {
        this.toastr.error('Erreur lors de l\'enregistrement de la dépense');
        console.error('Erreur création dépense:', err);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.rowsPerPage);
  }

  //.........................................................................
  loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.magasinService.getMagasinsByStructure(this.code_structure!),
      this.fournisseurService.getFournisseursByStructure(this.code_structure!),
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([mgs, frs]) => {
          this.magasins = mgs;
          this.fournisseurs =frs.filter(four => four.statut === true); 
          this.filteredFournisseurs = [...this.fournisseurs];
          this.archivededFournisseurs = this.fournisseurs.filter(four => four.statut === false);
          //this.updateFilteredFournisseurs();
        },
        error: (err) => console.error('Erreur chargement données', err),
      });
  }

  createFournisseur(fournisseurData: Partial<Fournisseur>): void {
    this.isLoading = true;

    this.fournisseurService
      .createFournisseur(fournisseurData as Fournisseur)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Fournisseur créé avec succès');
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création du fournisseur';
          this.toastr.error(this.errorMessage);
        },
      });
  }
  updateFournisseur(id: number, updateData: Partial<Fournisseur>): void {
    this.isLoading = true;

    this.fournisseurService
      .updateFournisseur(id, updateData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Fournisseur mis à jour avec succès');
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du fournisseur';
          console.error(err);
          this.toastr.error(this.errorMessage);
        },
      });
  }

  updateStatus(id: number, newStatus: boolean): void {
    this.isLoading = true;
    this.fournisseurService
      .updateFournisseurStatus(id, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          //this.isLoading = false;
          this.toastr.success('Statut mis à jour avec succès');
          this.loadData();
          //this.selectedFournisseur = null;
          //this.isRowSelected = !this.isRowSelected;
        },
        error: (err) => {
          //this.isLoading = false;
          this.errorMessage =
            err.error?.message || 'Erreur lors de la mise à jour du statut fournisseur';
          this.toastr.error(this.errorMessage);
          console.error(err);
        },
      });
  }

  deleteFournisseur(id: number): void {
    this.isLoading = true;
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      this.fournisseurService
        .deleteFournisseur(id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: () => {
            this.toastr.success('Fournisseur supprimé avec succès');
            this.loadData();
          },
          error: (err) => {
            //this.isLoading = false;
            //this.toastr.error('Erreur lors de la suppression du fournisseur');
            this.errorMessage =
              err.error?.message || 'Erreur lors de la mise à jour du statut fournisseur';
            this.toastr.error(this.errorMessage);
            console.error(err);
          },
        });
    }
  }

  loadOperations(): void {
    if(!this.selectedFournisseur) return;
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
    
    this.operationService.getOperationsByFournisseur(this.code_structure!, this.selectedFournisseur.id!, { dateDebut: this.startDate, dateFin: this.endDate })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ops) => {
          this.operations = ops;
          this.logger.debug('Opérations fournisseur chargées', ops);
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

  // Rafraîchissement après enregistrement
private rafraichirDonneesImmediatement(): void {
  if (!this.selectedFournisseur) return;

  console.log('Rafraîchissement immédiat des opérations');

  //Recharger les opérations
  this.loadOperations();
  //Rafraîchir les données du fournisseur
  this.rafraichirDonneesFournisseur();
}

  loadBonAndPaiement(): void {
      this.isLoading = true;
      forkJoin([
        this.bonService.getBonsFournisseursByStructure(this.code_structure!),
        this.paiementService.getByStructure(this.code_structure!),
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
  

 /*  // Méthode pour confirmer l'action
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
  
  // Dans fournisseurs.component.ts

/**
 * Rafraîchit les données du fournisseur sélectionné
 */
private rafraichirDonneesFournisseur(): void {
  if (!this.selectedFournisseur) return;

  console.log('Rafraîchissement des données du fournisseur:', this.selectedFournisseur.id);

  this.fournisseurService.getFournisseurById(this.selectedFournisseur.id!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (fournisseurMisAJour) => {
        // Mettre à jour le fournisseur dans la liste
        const index = this.fournisseurs.findIndex(f => f.id === fournisseurMisAJour.id);
        if (index !== -1) {
          this.fournisseurs[index] = fournisseurMisAJour;
        }

        // Mettre à jour le fournisseur sélectionné
        this.selectedFournisseur = fournisseurMisAJour;

        // Mettre à jour la liste filtrée
        this.filteredFournisseurs = [...this.fournisseurs];

        console.log('Fournisseur mis à jour:', {
          id: fournisseurMisAJour.id,
          nom: fournisseurMisAJour.nomComplet,
          montantAPayer: fournisseurMisAJour.montantAPayer
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur rafraîchissement fournisseur:', err);
      }
    });
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

  // Dans fournisseurs.component.ts

imprimerReleve(): void {
  if (!this.selectedFournisseur) {
    this.toastr.error('Aucun fournisseur sélectionné');
    return;
  }

  try {
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
    this.isLoading = false;
  }
  
}

imprimerBon(bon: Bon): void {
  if (!bon) {
    this.toastr.error('Aucun bon sélectionné');
    return;
  }

  try {
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
  }
}

// Dans fournisseurs.component.ts

  // Méthode pour générer le ticket de versement
  genererTicketVersement(operation: Operation): void {
    if (!operation || operation.type !== 'VERSEMENT') {
      this.toastr.error('Opération de versement non valide');
      return;
    }

    try {
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
    }
  }

  // Méthode pour le ticket de paiement d'un bon
  genererTicketPaiementBon(bon: Bon): void {
    if (!bon) {
      this.toastr.error('Aucun bon sélectionné');
      return;
    }

    try {
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
    }
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

    private calculerTotalRetours(): number {
      return this.filteredOperations
        .filter(op => op.type === 'RETOUR')
        .reduce((total, op) => total + (this.safeNumber(op.Bon?.Panier?.totalTTC) || 0), 0);
    }

    private calculerTotalLivraison(): number {
      return this.filteredOperations
        .filter(op => op.type === 'LIVRAISON')
        .reduce((total, op) => total + (this.safeNumber(op.Bon?.Panier?.totalTTC) || 0), 0);
    }
    private calculerTotalVersements(): number {
      return this.filteredOperations
        .filter(op => op.type === 'VERSEMENT')
        .reduce((total, op) => total + (this.safeNumber(op.montantPaye) || 0), 0);
    }

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
      prixVenteUnitaire: article.prixVenteUnitaire,
      code_structure: this.code_structure,
      remise: article.remise,
      tauxTVA: article.tauxTVA,
      montantTVA: article.montantTVA,
      montantRemise: article.montantRemise,
      totalHT: article.totalHT,
      totalTTC: article.totalTTC
    })) || [];

    // Si pas de panier dans le bon, essayer de le récupérer
    if (!panier && bonMiseAJour.id) {
      this.chargerPanierPourBon(bonMiseAJour.id);
    }

    let statutPanier;
    if(bonMiseAJour.statutBon ==='annulé' || bonMiseAJour.statutBon ==='retourné') {
      statutPanier ='annulé';
    }
    else if(bonMiseAJour.statutBon ==='livré' || bonMiseAJour.statutBon ==='facturé'){
      statutPanier = 'validé'
    }
    else{
      statutPanier = panier?.statut
    }
    // Construire l'objet pour createBonComplet
    return {
      bon: {
        id: bonMiseAJour.id,
        type: bonMiseAJour.type,
        numero: bonMiseAJour.numero,
        description: bonMiseAJour.description,
        statutBon: bonMiseAJour.statutBon,
        referenceExterne: bonMiseAJour.referenceExterne,
        montantTotal: bonMiseAJour.montantTotal,
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
        statut: statutPanier
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
  
  const bonMiseAJour :Bon= {
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
    client: this.selectedFournisseur ? {
      nomComplet: this.selectedFournisseur.nomComplet,
      adresse: this.selectedFournisseur.adresse,
      telephone: this.selectedFournisseur.telephone
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
