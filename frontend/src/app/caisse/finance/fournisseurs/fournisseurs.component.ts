import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { CommonModule } from '@angular/common';
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
import { finalize, forkJoin,Subject, takeUntil } from 'rxjs';
import { normalize } from '../../../utils/string-utils';
import { BonComponent } from '../../../sharedComposants/bon/bon.component';
import {  Panier } from '../../../modeles/panier.model';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { Stock } from '../../../modeles/entrees-sorties.model';
import { PaiementComponent } from '../../../sharedComposants/paiement/paiement.component';
import { BonsService } from '../../../services/bons.service';
import { PaniersService } from '../../../services/paniers.service';
import { PaiementsService } from '../../../services/paiements.service';
import { MouvementsStockService } from '../../../services/mouvements-stock.service';
import { ArticlesPanierService } from '../../../services/articles-panier.service';
import { OperationsService } from '../../../services/operations.service';
import { NGXLogger } from 'ngx-logger';
import { BonBrouillonService } from '../../../services/bon-brouillon.service';
import { PdfMakerServiceService } from '../../../services/pdf-maker-service.service';
import { StructureService } from '../../../services/structure.service';

@Component({
  selector: 'app-fournisseurs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BonComponent, PaiementComponent],
  templateUrl: './fournisseurs.component.html',
  styleUrl: './fournisseurs.component.css',
})
export class FournisseursComponent implements OnInit, OnDestroy {
  fournisseurs: Fournisseur[] = []; // Liste des fournisseurs
  isLoading = false;
  code_structure = 'MASTRUCTURET-NZNC';
  filteredOperations: Operation[] = []; // Opérations filtrées
  operations : Operation[] = [];
  filteredFournisseurs: Fournisseur[] = []; // Liste filtrée pour la recherche
  searchQuery = ''; // Chaîne de recherche
  showDetails = false; // Affichage des détails
  showBonDetailsSection = false; // Affichage des détails des bons
  showPaiementDetailsSection = false; // Affichage des détails des paiements
  showForm = false; // Affichage du formulaire d'ajout
  showModal = false; // Affichage du modal d'ajout/édition
  isEditMode = false; // Mode édition ou ajout
  isRowSelected = false; // Indique si une ligne est sélectionnée
  fournisseurForm!: FormGroup; // Formulaire de fournisseur
  selectedFournisseur: Fournisseur | null = null; // Fournisseur sélectionné pour modification
  showBonForm = false; // Variable pour afficher ou masquer le formulaire de bon
  // Autres variables existantes...
  showPaiementForm = false; // Pour afficher ou masquer le formulaire de paiement
  actionType = 'ajouter';
  magasins: Magasin[] = [];
  magasinId = 1;
  agentId = 1;
  // Ajouter une variable pour contrôler la réinitialisation du panier
  resetPanierFlag = false;

  generatedNumeroPaiement: string = this.generateNumero();


  textBoutonNewBon = 'Nouveau bon';

    // Ajouter une référence au composant Bon
  @ViewChild(BonComponent) bonComponent!: BonComponent;

  private destroy$ = new Subject<void>(); //Pour se désabonner des lorsqu'on change de composants
  showProductsSection = false; // Affichage de la section des produits à ajouter
  searchProduct = ''; // Champ de recherche pour les produits
  produitsAjoutes: Produits[] = []; // Liste des produits ajoutés au bon
  filteredProducts: Produits[] = []; // Liste des produits filtrés pour autocomplétion

  paysList: string[] = ['Sénégal', 'Mali', "Côte d'Ivoire", 'Guinée', 'Burkina Faso']; // Exemple
  magasinsList: string[] = [
    'Magasin Central',
    'Agence Dakar',
    'Agence Thiès',
    'Agence Saint-Louis',
  ]; // Exemple

  totalPages = 1;

  startDate?: string;
  endDate?: string;
  currentTime = '';
  currentDate = ' ';
  generatedNumero = 'BON-' + Math.floor(Math.random() * 1000000); // Numéro généré
  totalBon = 0; // Calculé dynamiquement
  totalPanier = 0;
  panierDisabled = false;
  searchInput = '';
  filteredProduits: Produits[] = [];
  selectedBonIndexF: number | null = null;
  selectedBonIndexB: number | null = null;
  selectedBonIndexP: number | null = null;
  selectedBonIndexO: number | null = null;
  //panier!: FormArray;

  // Variables de pagination et de filtre
  currentPageBon = 1;
  //currentPageBonBis: number = 1;
  totalPagesBon = 2;
  searchBonQuery = '';
  filteredBons: Bon[] = [];
  //filteredBonsBis: Bon[] = [];
  allBons: Bon[] = []; // Tous les bons

  errorMessage = '';

  currentPagePaiement = 1;
  //currentPagePaiementBis: number = 1;
  totalPagesPaiement = 2;
  searchPaiementQuery = '';
  filteredPaiements: Paiement[] = [];
  //filteredPaiementsBis: Paiement[] = [];
  allPaiements: Paiement[] = []; // Tous les paiements

  currentPageFournisseur = 1;
  totalPagesFournisseur = 2;
  typeBon = '';

  rowsPerPage = 5; // Nombre par défaut de lignes par page

  produits: Produits[] = [];
  stocks: Stock[] = [];
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

  // Variables pour les composants réutilisables
  showPanierComponent = false;
  typeEntite: 'client' | 'fournisseur' = 'fournisseur';
  showPaiementComponent = false;

  bonBrouillon: Bon | null = null;
  panierBrouillon: Panier | null = null;
  showConfirmationModal = false;
  actionEnCours: string | null = null;

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
  private MouvementsStockService = inject(MouvementsStockService);
  private artticlesPanierService = inject(ArticlesPanierService);
  

  ngOnInit(): void {
    // Chargement des données des fournisseurs (par exemple via un service)
    this.loadData();
    this.loadDataProduits();
    this.loadBonAndPaiement();
    this.initForm();
    this.loadStructureInfo();

    //this.onTypeBonChange(); // Met à jour les champs au chargement

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
    //console.log('Valeur de code_structure dans le formulaire:', this.fournisseurForm.value.code_structure); // Vérifiez la valeur dans le formulaire

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
      // Associer fournisseurId et s'assurer que le statut est "validé"
      event.bon.fournisseurId = this.selectedFournisseur.id;
      event.bon.statutBon = 'validé'; // Changer le statut à validé

      // Si c'était un brouillon, utiliser l'ID existant
      if (this.bonBrouillon) {
        event.bon.id = this.bonBrouillon.id;
      } 

      //this.toastr.success('bon et panier existent');
      //console.log(bon)
      //console.log('Bon avec fournisseurId:', event.bon);
      //console.log('Panier du bon:', event.bon.panier);
      //console.log('Articles du panierrId:', event.bon.panier.articles);

      // Appel API
      this.enregistrerBon(event.bon, event.bon.panier!,event.fichier);
       //this.enregistrerBonAvecFichiers(event.bon, event.bon.panier, event.fichier);
      this.showBonForm = false;
      // Nettoyer les brouillons après enregistrement
      this.bonBrouillonService.clearBrouillons();
  }

    // Méthodes pour gérer les événements des composants
  onPanierEnregistre(panier: Panier): void {
    console.log('Panier enregistré:', panier);
    // Logique pour enregistrer le panier
    this.showPanierComponent = false;
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
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `NP-${timestamp}-${random}`;
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
      produitId: article.produit?.id,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      prixVenteUnitaire: article.prixVenteUnitaire,
      prixAchatUnitaire: article.prixAchatUnitaire
    })),
    code_structure: this.code_structure,
    magasinId: this.magasinId,
    agentId: this.agentId,
    fournisseurId: this.selectedFournisseur.id,
    typeEntite:this.typeEntite,
    paiement: bon.avance?? 0 > 0 ? {
      numero: this.generatedNumeroPaiement,
      methodePaiement: 'Caisse',
      compte:'Bon',
      description: `Avance pour bon ${bon.numero}`,
      typePaiement: 'fournisseur'
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
      //this.toastr.success('Bon enregistré avec succès!', 'Succès');
      //console.log('Enregistrement complet:', result);
      //this.reinitialiserFormulaires();
      //this.actualiserDonnees(); 
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
        this.openModal(this.selectedFournisseur);
      } else if (this.actionType === 'supprimer') {
        this.deleteFournisseur(this.selectedFournisseur.id!);
      } else if (this.actionType === 'statut') {
        //this.updateStatus(this.selectedFournisseur.id!, this.selectedFournisseur.statut);
        // const nouveauStatut = !this.selectedFournisseur.statut;
        // this.updateStatus(this.selectedFournisseur.id!, nouveauStatut);
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
  updateFilteredFournisseurs(): void {
    this.filteredFournisseurs = this.fournisseurs.slice(
      (this.currentPageFournisseur - 1) * 10,
      this.currentPageFournisseur * 10,
    );
  }
  // Fonction pour générer le numéro du bon
  generateBonNumber(date: Date): string {
    const year = date.getFullYear(); // Année (ex: 2025)
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mois (ex: 02 pour février)
    const day = String(date.getDate()).padStart(2, '0'); // Jour (ex: 12)
    const hour = String(date.getHours()).padStart(2, '0'); // Heure (ex: 09)
    const minute = String(date.getMinutes()).padStart(2, '0'); // Minute (ex: 05)
    const second = String(date.getSeconds()).padStart(2, '0'); // Seconde (ex: 08)

    // Format: BON-YYYYMMDD-HHMMSS
    return `BON-${year}${month}${day}-${hour}${minute}${second}`;
  }
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

  // Supprimer un fournisseur
  deletFournisseur(): void {

    const confirmation = confirm('Supprimer le fournisseur ?');
    if (confirmation) {
      //this.listeProduitsSelectionnes.splice(indexP,1);
      //this.prodSrv.removeProduit(prod);
      //this.showInfo(prod);
      //alert(this.listeProduitsSelectionnes.length)
    } else {
      console.log('Action annulée');
    }
  }

  // Afficher les détails du bon
  showBonDetails(): void {
    this.showDetails = true;
    this.showBonDetailsSection = true;
    if (!this.selectedFournisseur) return;
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // 1er jour du mois
    this.endDate = today.toISOString().split('T')[0]; // Aujourd'hui
    this.loadOperations();
    this.filtrerOperations();

  }

  // Fermer les détails (bons ou paiements)
  closeDetails(): void {
    this.showDetails = false;
    this.showBonDetailsSection = false;
    this.showPaiementDetailsSection = false;
    if(this.showBonForm ) this.showBonForm = false;
    if(this.showPaiementForm ) this.showPaiementForm = false;
    //this.filteredBons = [];
    //this.filteredPaiements = [];
    //this.filteredBonsBis = [];
    //this.filteredPaiementsBis = [];
  }

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
    if (!this.selectedFournisseur) return;

    this.bonService.getBonsBrouillons(this.code_structure)
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

  this.bonService.getBonsBrouillons(this.code_structure)
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


    /* const bonBrouillon = new Bon({
      type: 'Commande',
      numero: this.generatedNumero,
      description: 'Nouveau bon',
      montantTotal: 0,
      statutBon: 'brouillon',
      dateBon: new Date(),
      fournisseurId: this.selectedFournisseur.id,
      code_structure: this.code_structure,
      agentId:this.agentId,
      magasinId:this.magasinId,
    });

    const panierBrouillon = new Panier({
      articles: [],
      totalHT: 0,
      tva: 0,
      totalTTC: 0,
      statut: 'en_cours',
      typeEntite: this.typeEntite
    }); */
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

  /* resetFormPaiement() {
    this.paiementForm.reset();
  } */
  toggleDetails(index: number, operation: Operation):void {
    /* if (typeInstance instanceof Fournisseur) {
      this.selectedBonIndexF = this.selectedBonIndexF === index ? null : index;
    } else if (typeInstance instanceof Bon) {
      this.selectedBonIndexB = this.selectedBonIndexB === index ? null : index;
    } else if (typeInstance instanceof Paiement) {
      this.selectedBonIndexP = this.selectedBonIndexP === index ? null : index;
    } else if (typeInstance instanceof Operation) {
      this.selectedBonIndexO = this.selectedBonIndexO === index ? null : index;
    } */

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

  getBonByOperation(operation: Operation): Bon | null {

    // Si l'opération a déjà les données du bon incluses
    if (operation.Bon) {
      return operation.Bon;
    }

    // Fallback: chercher dans la liste des bons
    if (operation.bonId) {
      const bon = this.allBons.find(b => b.id === operation.bonId);
      return bon || null;
    }
    //return this.filteredBons.find((bon) => bon.id === operation.bonId) || null;
    // if (!operation?.bonId) {
    //   console.log('Operation sans bonId:', operation);
    //   return null;
    // }
    
    /* const bon = this.filteredBons.find((bon) => bon.id === operation.bonId);
    
    if (!bon) {
      console.log('Bon non trouvé pour operation:', operation.bonId, 'Bons disponibles:', this.filteredBons.map(b => b.id));
    } */
    
    return null;

  }
  getBonBypaiement(operation: Paiement): Bon | null {
    return this.filteredBons.find((bon) => bon.id === operation.bonId) || null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFournisseurByOperation(operation: any): Fournisseur | null {
    // Vérifier si l'opération est de type Paiement
    /* if (operation instanceof Paiement) {
      return this.filteredFournisseurs.find((four) => four.id === operation.fournisseurId) || null;
    } else if (operation instanceof Bon) {
      return this.filteredFournisseurs.find((four) => four.id === operation.fournisseurId) || null;
    }

    // Autres cas
    return this.filteredFournisseurs.find((four) => four.id === operation.fournisseurId) || null; */
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

  // Méthode pour filtrer les produits selon la recherche
  onSearchChangeProduct(): void {
    if (this.searchProduct) {
      this.filteredProducts = this.produits.filter((p) =>
        p.designation.toLowerCase().includes(this.searchProduct.toLowerCase()),
      );
    } else {
      this.filteredProducts = [];
    }
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
  /* submitBon(): void {
    console.log('Bon enregistré', this.bonForm.value);
  } */

  removeProduct(produit: Produits): void {
    const index = this.produitsAjoutes.indexOf(produit);
    if (index > -1) {
      this.produitsAjoutes.splice(index, 1);
    }
  }

  // Soumettre le formulaire de la section de droite (ajout d'un fournisseur)
  onFormSubmit(): void {
    if (this.fournisseurForm.valid) {
      const fournisseurData = this.fournisseurForm.value;
      const newFournisseur = new Fournisseur(fournisseurData);
      this.fournisseurs.push(newFournisseur);
      this.filteredFournisseurs = [...this.fournisseurs]; // Mettre à jour la liste filtrée
      this.fournisseurForm.reset(); // Réinitialiser le formulaire
    }
  }

  // Ouvrir le formulaire d'édition d'un fournisseur
  editFournisseur(): void {
    //this.selectedFournisseur = fournisseur;
    if (this.selectedFournisseur) {
      this.fournisseurForm.patchValue(this.selectedFournisseur); // Remplir le formulaire avec les données du fournisseur
      this.showForm = true; // Afficher le formulaire d'édition
      this.openModal();
    } else {
      alert('Veuillez sélectionné un fournisseur');
    }
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
    this.rowsPerPage = Number(event.target.value);

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
    //this.updateFilteredBons();
  }

  // Fonction de mise à jour pour filtrer les bons d'un fournisseur et appliquer la pagination
  updateFilteredBons(): void {
    //if (this.selectedFournisseur) {
    //this.filteredBons = this.selectedFournisseur.bons.filter(bon => bon.numero.includes(this.searchBonQuery) || bon.description.includes(this.searchBonQuery));
    //this.totalPagesBon = Math.ceil(this.filteredBons.length / 10); // 10 bons par page
    this.filteredBons = this.allBons.slice(
      (this.currentPageBon - 1) * 10,
      this.currentPageBon * 10,
    );
    //}
  }

  // Fonction de mise à jour pour filtrer les paiements d'un fournisseur et appliquer la pagination
  updateFilteredPaiements(): void {
    //if (this.selectedFournisseur) {
    //this.filteredPaiements = this.selectedFournisseur.paiements.filter(paiement => paiement.description.includes(this.searchPaiementQuery));
    //this.totalPagesPaiement = Math.ceil(this.filteredPaiements.length / 10); // 10 paiements par page
    this.filteredPaiements = this.allPaiements.slice(
      (this.currentPagePaiement - 1) * 10,
      this.currentPagePaiement * 10,
    );
    //}
  }
  // Filtrer les paiements
  onSearchChangePaiement() {
    //this.updateFilteredPaiements();
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

  // 🔍 Filtrer les opérations du client selon la période
  filtrerOperations() {
    if (!this.selectedFournisseur || !this.startDate || !this.endDate) {
      console.log('Aucun client sélectionné ou période invalide');
      return;
    }

    // Convertir startDate et endDate en objets Date
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999); // Pour inclure toute la journée complète

    console.log('🔍 Période de filtrage :', start.toISOString(), '->', end.toISOString());

    this.filteredOperations = this.operations.filter((op) => {
      if (!op.dateOperation) {
        console.log('⚠ Opération ignorée (pas de date) :', op);
        return false;
      }

      // Vérification du type de dateOperation
      console.log('🔹 Opération ID:', op.id);
      console.log('   ➡ Type de dateOperation:', typeof op.dateOperation);
      console.log('   ➡ Valeur brute:', op.dateOperation);

      // Convertir en Date si ce n'est pas déjà le cas
      const opDate =
        op.dateOperation instanceof Date ? op.dateOperation : new Date(op.dateOperation);

      console.log('   📅 Date convertie :', opDate.toISOString());

      const isInRange = opDate >= start && opDate <= end;
      console.log('   ✅ Passe le filtre :', isInRange);

      return isInRange;
    });

    console.log('📌 Opérations filtrées :', this.filteredOperations);
  }

  filterProduits() {
    console.log('Recherche :', this.searchInput); // Vérifier si la saisie est bien détectée
    const search = this.searchInput.trim().toLowerCase();
    console.log('Recherche :', search); // Vérifier si la saisie est bien détectée
    if (search.length > 0) {
      this.filteredProduits = this.produits.filter((prod) =>
        prod.designation.toLowerCase().includes(search),
      );
    } else {
      this.filteredProduits = [];
    }
  }
  // Méthode pour afficher le formulaire de paiement
  togglePaiementForm(): void {
    this.showBonForm = false;
    this.showPaiementForm = !this.showPaiementForm;

  }
  
  // Gérer l'événement d'enregistrement du paiement
  onPaiementEnregistre(event: PaiementAvecFichier): void {
    // Associer le fournisseur au paiement
    if (this.selectedFournisseur) {
      event.paiement.fournisseurId = this.selectedFournisseur.id;
    }
    
    console.log('Paiement à enregistrer reçu dans fournisseur:', event.paiement, 'Fichier:', event.fichier);
    // Enregistrer le paiement
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
    const paiementCompletData: Paiement = {
      ...paiement,
      agentId: this.agentId,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      fournisseurId: this.selectedFournisseur.id
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
            fournisseurId: result.fournisseurId
          });
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
  // Méthode pour retourner un bon
  retournerBon(bon: Bon) {
    const confirmation = confirm(`Voulez-vous vraiment retourner le bon Nº ${bon.numero} ?`);
    if (confirmation) {
      // Ici, on peut envoyer une requête pour annuler ou rembourser le bon
      console.log(`Bon Nº ${bon.numero} retourné !`);

      // Exemple : Mise à jour du statut dans la base de données (remplace par ton service API)
      bon.statutBon = 'retourné';

      // Affichage d'un message (si tu as un système de notifications)
      alert(`Le bon Nº ${bon.numero} a été retourné avec succès !`);
    }
  }
  /* get panier(): FormArray {
    return this.bonForm.get('panier') as FormArray;
  } */

  prepareFormData(formsGroup: FormGroup, prop:string): FormData {
    const formData = new FormData();
    const formValue = formsGroup.value;

    Object.keys(formValue).forEach((key) => {
      if (key !== prop && formValue[key] !== null && formValue[key] !== undefined) {
        formData.append(key, formValue[key]);
      }
    });

    if (formsGroup.get(prop)?.value instanceof File) {
      formData.append(prop, formsGroup.get(prop)?.value);
    }

    return formData;
  }

  // Fonction pour valider un bon
  validerBon(bon: Bon): void {
    // Vérification si le bon peut être validé (par exemple, statut = 'livré')
    if (bon.statutBon === 'livré') {
      bon.statutBon = 'validé'; // Mise à jour du statut
      // Sauvegarder dans la base de données ou API
      this.updateBon(bon);
      alert('Bon validé avec succès.');
    } else {
      alert('Le bon ne peut pas être validé dans cet état.');
    }
  }

  // Fonction pour modifier un bon
  modifierBon(bon: Bon): void {
    // Vérification si le bon peut être modifié (par exemple, statut = 'brouillon')
    if (bon.statutBon === 'brouillon') {
      // Logic to modify the bon data
      this.openEditModal(bon); // Ouvrir un modal pour modifier le bon
    } else {
      alert('Le bon ne peut pas être modifié dans cet état.');
    }
  }

  // Fonction pour supprimer un bon
  supprimerBon(bon: Bon): void {
    // Vérification du statut avant de supprimer
    if (bon.statutBon === 'brouillon') {
      // Supprimer le bon
      this.deleteBon(bon.id!); // Appel à une fonction pour supprimer le bon
      alert('Bon supprimé avec succès.');
    } else {
      alert('Le bon ne peut pas être supprimé dans cet état.');
    }
  }

  // Fonction pour annuler un bon (seulement si validé et non facturé)
  // Fonction pour annuler un bon (seulement si validé et non facturé)
  annulerBon(bon: Bon): void {
    if (bon.statutBon === 'validé') {
      // Vérification supplémentaire si nécessaire
      bon.statutBon = 'annulé'; // Mise à jour du statut
      this.updateBon(bon);
      alert('Bon annulé.');
    } else if (bon.statutBon === 'facturé') {
      alert("Impossible d'annuler un bon déjà facturé.");
    } else {
      alert('Seuls les bons validés peuvent être annulés.');
    }
  }

  // Fonction pour facturer un bon avec messages d'erreur détaillés
  facturerBon(bon: Bon): void {
    switch (bon.statutBon) {
      case 'validé':
        bon.statutBon = 'facturé';
        this.updateBon(bon);
        alert('Bon facturé.');
        break;
      case 'facturé':
        alert('Ce bon est déjà facturé.');
        break;
      case 'annulé':
        alert('Impossible de facturer un bon annulé.');
        break;
      default:
        alert('Statut du bon non reconnu ou bon non valide pour la facturation.');
        break;
    }
  }

  // Fonction pour suivre le paiement du bon
  suiviPaiement(bon: Bon): void {
    console.log(bon);
    /* if (bon.facturé && !bon.payé) {
      // Logique pour suivre le paiement
      this.openPaymentTrackingModal(bon); // Ouvrir un modal pour suivre le paiement
    } else {
      alert('Aucun paiement à suivre.');
    } */
  }

  // Fonction pour mettre à jour un bon
  updateBon(bon: Bon): void {
    // Implémenter la logique pour mettre à jour le bon dans la base de données ou via une API
    // Par exemple : this.apiService.updateBon(bon).subscribe(response => { console.log(response); });
    console.log('Bon mis à jour:', bon);
  }

  // Fonction pour supprimer un bon
  deleteBon(bonId: number): void {
    // Implémenter la logique pour supprimer le bon via l'API ou dans la base de données
    // Par exemple : this.apiService.deleteBon(bonId).subscribe(response => { console.log(response); });
    console.log('Bon supprimé:', bonId);
  }

  // Fonction pour ouvrir un modal d'édition de bon
  openEditModal(bon: Bon): void {
    // Implémenter l'ouverture du modal pour modifier le bon
    // Par exemple : this.modalService.open(bon);
    console.log('Ouvrir modal pour modifier le bon:', bon);
  }

  // Fonction pour ouvrir le suivi de paiement
  openPaymentTrackingModal(bon: Bon): void {
    // Implémenter l'ouverture du modal pour suivre le paiement
    // Par exemple : this.modalService.open(bon);
    console.log('Ouvrir modal pour suivi de paiement du bon:', bon);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.rowsPerPage);
  }

  //.........................................................................
  loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.magasinService.getMagasinsByStructure(this.code_structure),
      this.fournisseurService.getFournisseursByStructure(this.code_structure),
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([mgs, frs]) => {
          this.magasins = mgs;
          this.fournisseurs = frs;
          this.filteredFournisseurs = [...this.fournisseurs];
          this.updateFilteredFournisseurs();
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
    
    this.operationService.getOperationsByFournisseur(this.code_structure, this.selectedFournisseur.id!, { dateDebut: this.startDate, dateFin: this.endDate })
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



// Récupération des statistiques
loadStats(): void {
  const filters = {
    code_structure: this.code_structure,
    dateDebut: this.startDate,
    dateFin: this.endDate
  };

  this.operationService.getOperationsStats(filters)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (stats) => {
        console.log('📈 Statistiques:', stats);
        // Utiliser les stats pour afficher des graphiques ou résumés
      },
      error: (err) => {
        console.error('Erreur stats:', err);
      }
    });
}

// Récupération du solde d'un fournisseur
getSoldeFournisseur(): void {
  if (!this.selectedFournisseur) return;

  this.operationService.getSoldeFournisseur(this.code_structure, this.selectedFournisseur.id!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (solde) => {
        console.log(`💰 Solde fournisseur: ${solde}`);
        // Afficher le solde dans l'interface
      },
      error: (err) => {
        console.error('Erreur solde:', err);
      }
    });
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

  /* ......................Gestion des modification bon */

   // Nouvelle méthode pour initialiser un bon brouillon
  private initialiserBonBrouillon(): void {
    if (!this.selectedFournisseur) return;

    // Vérifier s'il y a un bon brouillon existant
    this.bonService.getBonsBrouillons(this.code_structure)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bonsBrouillons) => {
          const brouillonExistant = bonsBrouillons.find(bon => 
            bon.fournisseurId === this.selectedFournisseur?.id && 
            bon.statutBon === 'brouillon'
          );

          if (brouillonExistant) {
            // Charger le brouillon existant
            this.bonBrouillon = brouillonExistant;
            this.toastr.info('Un bon brouillon existant a été chargé');
            this.chargerPanierBrouillon(brouillonExistant.id!);
          } else {
            // Créer un nouveau bon brouillon
            this.creerNouveauBonBrouillon();
          }
        },
        error: (err) => {
          console.error('Erreur chargement brouillons:', err);
          this.creerNouveauBonBrouillon();
        }
      });
  }

  private creerNouveauBonBrouillon(): void {
    if (!this.selectedFournisseur) return;

    const bonBrouillonData = {
      bon: {
        type: 'Commande',
        numero:'',
        description: 'Brouillon de bon',
        montantTotal: 0,
        statutBon: 'brouillon',
        dateBon: new Date()
      },
      panier: {
        articles: [],
        totalHT: 0,
        tva: 0,
        totalTTC: 0,
        statut: 'en_cours',
        typeEntite: this.typeEntite
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
          this.toastr.info('Nouveau bon brouillon créé');
        },
        error: (err) => {
          console.error('Erreur création brouillon:', err);
          this.toastr.error('Erreur lors de la création du brouillon');
        }
      });
  }

  private chargerPanierBrouillon(bonId: number): void {
    this.panierService.getPanierByBonId(bonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (panier) => {
          this.panierBrouillon = panier;
        },
        error: (err) => {
          console.error('Erreur chargement panier:', err);
        }
      });
  }

  // Nouvelle méthode pour gérer l'annulation du panier
  onPanierAnnuleAvecConfirmation(): void {
    this.actionEnCours = 'annuler_panier';
    this.showConfirmationModal = true;
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
  }
  
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
        montant: op.montantPaye || 0,
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
      }
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
    // Debug: vérifier les données du bon
    console.log('Bon à imprimer:', bon);
    console.log('Articles du bon:', bon.panier?.articles);

    // Valider et formater les articles
    const articlesFormates = (bon.panier?.articles || []).map(article => {
      if (!article) return null;
      
      return {
        // Inclure toutes les propriétés nécessaires
        ...article,
        designation: article.Produit?.designation || article.produit?.designation || 'Produit sans nom',
        prixUnitaire: article.prixUnitaire || article.prixAchatUnitaire || 0,
        quantite: article.quantite || 0,
        tva: bon.panier?.tauxTVA || 0,
        total: (article.quantite || 0) * (article.prixUnitaire || 0),
        
        
      };
    }).filter(article => article != null); // Supprimer les null

    const bonData = {
      numero: bon.numero || 'N/A',
      date: bon.dateBon || new Date(),
      fournisseur: this.selectedFournisseur ? {
        nomComplet: this.selectedFournisseur.nomComplet || 'N/A',
        adresse: this.selectedFournisseur.adresse || '',
        telephone: this.selectedFournisseur.telephone || '',
        email: this.selectedFournisseur.email || ''
      } : { nomComplet: 'N/A', adresse: '', telephone: '', email: '' },
      articles: articlesFormates, // Utiliser les articles formatés
      totaux: {
        sousTotal: bon.panier?.totalHT || 0,
        tauxTVA: bon.panier?.tauxTVA || 0,
        montantTVA: bon.panier?.tva || 0,
        totalTTC: bon.panier?.totalTTC || 0
      }
    };

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

  // Méthodes de calcul
  private calculerTotalCommandes(): number {
    return this.filteredOperations
      .filter(op => op.type === 'COMMANDE')
      .reduce((total, op) => total + (op.Bon?.Panier?.totalTTC || 0), 0);
  }

  private calculerTotalVersements(): number {
    return this.filteredOperations
      .filter(op => op.type === 'VERSEMENT')
      .reduce((total, op) => total + (op.montantPaye || 0), 0);
  }
}
