import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Produits } from '../../../modeles/produit.modele';
import { ApplicationService } from '../../../services/application.service';
import { Operation } from '../../../modeles/operation.model';
import { Bon } from '../../../modeles/bon.model';
import { Paiement } from '../../../modeles/paiement.model';
import { MaagasinsService } from '../../../services/maagasins.service';
import { Magasin } from '../../../modeles/magasin.model';
import { FournisseursService } from '../../../services/fournisseurs.service';
import { ToastrService } from 'ngx-toastr';
import { finalize, forkJoin } from 'rxjs';
import { normalize } from '../../../utils/string-utils';
import { BonComponent } from '../../../sharedComposants/bon/bon.component';
import { Panier } from '../../../modeles/panier.model';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { Stock } from '../../../modeles/entrees-sorties.model';
import { PaiementComponent } from '../../../sharedComposants/paiement/paiement.component';
import { BonsService } from '../../../services/bons.service';

@Component({
  selector: 'app-fournisseurs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BonComponent, PaiementComponent],
  templateUrl: './fournisseurs.component.html',
  styleUrl: './fournisseurs.component.css',
})
export class FournisseursComponent implements OnInit {
  fournisseurs: Fournisseur[] = []; // Liste des fournisseurs
  isLoading = false;
  code_structure = 'MASTRUCTURET-NZNC';
  filteredOperations: Operation[] = []; // Opérations filtrées
  filteredFournisseurs: Fournisseur[] = []; // Liste filtrée pour la recherche
  searchQuery = ''; // Chaîne de recherche
  showDetails = false; // Affichage des détails
  showBonDetailsSection = false; // Affichage des détails des bons
  showPaiementDetailsSection = false; // Affichage des détails des paiements
  showForm = false; // Affichage du formulaire d'ajout
  showModal = false; // Affichage du modal d'ajout/édition
  isEditMode = false; // Mode édition ou ajout
  isRowSelected = false; // Indique si une ligne est sélectionnée
  //selectedBon: Bon[] = []; // Détails du bon sélectionné
  //selectedPaiement: Paiement[] = []; // Détails du paiement sélectionné
  fournisseurForm!: FormGroup; // Formulaire de fournisseur
  selectedFournisseur: Fournisseur | null = null; // Fournisseur sélectionné pour modification
  bonForm!: FormGroup; // Formulaire pour ajouter un bon
  showBonForm = false; // Variable pour afficher ou masquer le formulaire de bon
  // Autres variables existantes...
  paiementForm!: FormGroup; // Formulaire pour ajouter un paiement
  showPaiementForm = false; // Pour afficher ou masquer le formulaire de paiement
  actionType = 'ajouter';
  magasins: Magasin[] = [];
  magasinId = 1;
  agentId = 1;

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
  showBonComponent = false;
  typeEntite: 'client' | 'fournisseur' = 'fournisseur';
  showPaiementComponent = false;
  private fb = inject(FormBuilder);
  private paginationService = inject(ApplicationService);
  private cdr = inject(ChangeDetectorRef);
  private magasinService = inject(MaagasinsService);
  private fournisseurService = inject(FournisseursService);
  private toastr = inject(ToastrService);
  private produitsServices = inject(ProduitsService);
  private stockService = inject(StockInventaireService);
  private bonService = inject(BonsService);

  ngOnInit(): void {
    // Chargement des données des fournisseurs (par exemple via un service)
    this.loadData();
    this.loadDataProduits();
    this.initForm();
    this.onTypeBonChange(); // Met à jour les champs au chargement
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

    // Initialisation du formulaire réactif pour un paiement
    this.paiementForm = this.fb.group({
      description: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(0)]],
      date: ['', Validators.required],
      methodePaiement: ['Virement', Validators.required],
      fichier: [null], // Stockera le fichier sélectionné
    });
    // Initialisation du formulaire réactif pour un bon
    this.bonForm = this.fb.group({
      numero: ['', Validators.required],
      date: ['', Validators.required],
      montant: [0, Validators.required],
      statut: ['Impayé', Validators.required],
      type: ['', Validators.required],
      description: ['', Validators.required],
      remise: [],
      avance: [],
      typePaiement: ['', Validators.required],
      panier: this.fb.array([]),

      // Champs spécifiques aux avoirs
      refBonOrigine: [''],
      motifAvoir: [''],
      montantAvoir: [''],
      dateBonOrigine: [''],
      clientAvoir: [''],
      fichier: [null], // Stockera le fichier sélectionné
      // Champs spécifiques aux livraisons
      adresseLivraison: [''],
      livreur: [''],
      telephoneLivreur: [''],
      dateLivraison: [''],
      instructionsLivraison: [''],
    });
  }

  // Méthodes pour gérer l'affichage des composants
  /* togglePanierComponent(): void {
    this.showPanierComponent = !this.showPanierComponent;
    this.showBonComponent = false;
    this.showPaiementForm = !this.showPaiementForm;
  } */
 /*  toggleBonComponent(): void {
    this.showBonComponent = !this.showBonComponent;
    this.showPanierComponent = false;
    this.showPaiementForm = false;
  } */
  onBonEnregistre(bon: Bon): void {
    console.log('Bon enregistré:', bon);
    // Associer le bon au fournisseur sélectionné
    if (this.selectedFournisseur && bon) {
      bon.fournisseurId = this.selectedFournisseur.id;
      // Enregistrer le bon
      this.enregistrerBon(bon);
    }
    this.showBonComponent = false;
  }
  
  // Méthodes pour gérer les événements des composants
  onPanierEnregistre(panier: Panier): void {
    console.log('Panier enregistré:', panier);
    // Logique pour enregistrer le panier
    this.showPanierComponent = false;
  }
  
  onPanierAnnule(): void {
    this.showPanierComponent = false;
  }
  onBonAnnule(): void {
    this.showBonComponent = false;
  }

   // Autres méthodes existantes...
  private enregistrerBon(bon: Bon): void {
    // Logique pour enregistrer le bon
    const bonToSave = { 
      ...bon,
      code_structure: this.code_structure,
      magasinId: this.magasinId,
      agentId: this.agentId,
     };
     console.log('Bon enregistré avec succès:', bonToSave.avance, bonToSave.remise, bonToSave.code_structure, bonToSave.magasinId, bonToSave.agentId);
    /* this.isLoading = true;
    this.bonService.createBon(bon).pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: (newBon) => {
        console.log('Bon enregistré avec succès:', newBon);
      },
      error: (err) => {
        console.error('Erreur lors de l\'enregistrement du bon', err);
        this.toastr.error('Erreur lors de l\'enregistrement du bon', 'Erreur');
      },
    }); */
    //console.log('Enregistrement du bon:', bon);
  }
  
  private loadProduitsDisponibles(): void {
    // Charger les produits disponibles
    // this.produitService.getProduits().subscribe(produits => {
    //   this.produitsDisponibles = produits;
    // });
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
    /* if (action === 'ajouter') {
      this.actionType = 'ajouter';
      this.selectedFournisseur = null;  // S'assurer qu'aucun produit n'est sélectionné
    } else {
      this.actionType = action;  // On garde l'action sélectionnée
    } */
    this.actionType = action;
    //console.log(`${this.actionType} fournisseur:`, this.selectedFournisseur);
    if (this.selectedFournisseur) {
      console.log(`${action} fournisseur:`, this.selectedFournisseur);
      if (this.actionType === 'operation') {
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
  loadFournisseurs(): void {
    // Liste des noms des fournisseurs
    const nomsFournisseurs = [
      'Dakar Distribution',
      'Sénégal Agro',
      'Global Marché',
      'Thiès Commerce',
      'Kaolack Import',
      'Touba Marchandises',
      'Saint-Louis Trade',
      'Casamance Export',
      'Saly Distribution',
      'Matam Commerce',
    ];

    const operationTypes = [
      'COMMANDE',
      'VERSEMENT',
      'LIVRAISON',
      'TICKET_CAISSE',
      'RETOUR',
      'AVOIR',
      'FACTURE',
    ] as const;
    const methodePaiement = [
      'ESPECES',
      'MOBILE_MONEY',
      'CARTE_BANCAIRE',
      'VIREMENT',
      'CHEQUE',
    ] as const;
    const produitsDisponibles = [
      'Lait',
      'Sucre',
      'Riz',
      'Farine',
      'Huile',
      'Pain',
      'Fromage',
      'Tomates',
      'Jus',
      'Café',
    ];
    const bonstuatut = [
      'brouillon',
      'commandé',
      'expédié',
      'livré',
      'validé',
      'retourné',
      'facturé',
      'payé',
      'annulé',
    ] as const;
    // Génération des Fournisseurs
    for (let i = 1; i <= 10; i++) {
      const fournisseur = new Fournisseur({
        id: i,
        nomComplet: nomsFournisseurs[i - 1],
        email: `fournisseur${i}@example.com`,
        telephone: `77654${i}210`,
        banque: `Banque ${i}`,
        numeroCompte: `SN00BANK${i}45678`,
        adresse: `Zone ${i}, Ville`,
        dateCreation: new Date(),
        montantAPayer: Math.floor(Math.random() * 30000) + 10000,
        statut: Math.random() < 0.5, // Génère aléatoirement true ou false,
        bons: [],
        paiements: [],
        operations: [],
      });

      // Génération de 5 bons et paiements par fournisseur
      for (let j = 1; j <= 5; j++) {
        // Création du panier avec 3 à 4 produits
        const nombreProduits = Math.floor(Math.random() * 2) + 3;
        const panier: {
          produits: Produits[]; // 👈 Déclare le type explicitement ici !
          totalHT: number;
          tva: number;
          totalTTC: number;
        } = {
          produits: [], // ✅ Plus d'erreur
          totalHT: 0,
          tva: 0,
          totalTTC: 0,
        };

        for (let k = 0; k < nombreProduits; k++) {
          const prixUnitaire = Math.floor(Math.random() * 1000) + 500;
          const quantite = Math.floor(Math.random() * 5) + 1;

          const produit = {
            id: k + 1,
            designation:
              produitsDisponibles[Math.floor(Math.random() * produitsDisponibles.length)],
            quantite: quantite,
            prixAchatUnitaire: prixUnitaire,
            prixVenteUnitaire: prixUnitaire,
            categorieId: 0,
            fournisseur: '',
            magasin: '',
            unite: 'Unité',
          };

          panier.produits.push(produit);
          panier.totalHT += prixUnitaire * quantite;
        }

        panier.tva = panier.totalHT * 0.18;
        panier.totalTTC = panier.totalHT + panier.tva;

        const bon = new Bon({
          id: j,
          numero: `FB${i}${j}`,
          dateBon: new Date(),
          description: `Bon fournisseur ${j} du fournisseur ${i}`,
          montantTotal: Math.floor(Math.random() * 20000) + 2000,
          remise: Math.floor(Math.random() * 500) + 500,
          netAPayer:
            Math.floor(Math.random() * 20000) + 2000 - Math.floor(Math.random() * 500) + 500,
          resteAPayer: Math.floor(Math.random() * 10000) + 1000,
          statutBon: bonstuatut[Math.floor(Math.random() * bonstuatut.length)],
          type: ['Livraison', 'Commande', 'Retour', 'Avoir'][Math.floor(Math.random() * 4)] as
            | 'Livraison'
            | 'Commande'
            | 'Retour'
            | 'Avoir',
          numeroFacture: `F-FCT${i}${j}`,
          fournisseurId: fournisseur.id,
          //produits:panier.produits
          panier: panier,
        });

        const paiement = new Paiement({
          id: j,
          numero: `PF${i}${j}`,
          date: new Date(),
          description: `Paiement ${j} au fournisseur ${i}`,
          montant: Math.floor(Math.random() * 10000) + 500,
          //methodePaiement: Math.floor(Math.random() * 10) + 10, // methodePaiement[Math.floor(Math.random() * methodePaiement.length)],
          fournisseurId: fournisseur.id,
          bonId: bon.id,
        });

        // Création d'une opération associée
        const operation = new Operation({
          id: j,
          clientId: fournisseur.id,
          bonId: bon.id,
          paiementId: paiement.id,
          type: operationTypes[Math.floor(Math.random() * operationTypes.length)],
          montantPaye: paiement.montant,
          statut: panier.totalTTC - paiement.montant === 0 ? 'PAYE' : 'PARTIELLEMENT_PAYE',
          dateOperation: new Date(),
          moyenPaiement: methodePaiement[Math.floor(Math.random() * methodePaiement.length)],
        });

        fournisseur.bons.push(bon);
        fournisseur.paiements.push(paiement);
        fournisseur.operations.push(operation);
      }

      this.fournisseurs.push(fournisseur);
    }

    this.filteredFournisseurs = [...this.fournisseurs];
    this.updateFilteredFournisseurs();

    // Mise à jour des bons et paiements globaux
    this.fournisseurs.forEach((fournisseur) => {
      this.allBons.push(...fournisseur.bons);
      this.allPaiements.push(...fournisseur.paiements);
    });

    this.filteredBons = [...this.allBons];
    this.filteredPaiements = [...this.allPaiements];
    this.updateFilteredBons();
    this.updateFilteredPaiements();
  }

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
  /* onSearchChange(): void {
    this.filteredFournisseurs = this.fournisseurs.filter(fournisseur =>
      fournisseur.nomComplet.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      fournisseur.adresse?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      fournisseur.telephone?.toString().toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      fournisseur.banque!.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      fournisseur.montantAPayer?.toString().toLowerCase().includes(this.searchQuery.toLowerCase())
    );
      this.currentPageFournisseur = 1;

  } */
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
    /* const index = this.fournisseurs.indexOf(fournisseur);
    if (index > -1) {
      this.fournisseurs.splice(index, 1);
      this.filteredFournisseurs = [...this.fournisseurs]; // Mettre à jour la liste filtrée
    } */

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
    //this.selectedFournisseur = fournisseur;
    //this.filteredBonsBis = [...fournisseur.bons];
    //this.filteredPaiementsBis = [...fournisseur.paiements];
    //this.currentPageBonBis =1;
    //this.currentPagePaiement =1;
    //console.log('Fournisseur sélectionné :', fournisseur.nomComplet);
    //console.log('Total bons :', this.filteredBons.length, 'Total paiements :', this.filteredPaiements.length);
    //this.cdr.detectChanges(); // Forcer la mise à jour de l'affichage
    /* if (type === 'bon') {
      this.toggleBonComponent();
    } else if (type === 'panier') {
      this.togglePanierComponent();
    } */
    if (!this.selectedFournisseur) return;
    const today = new Date();
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]; // 1er jour du mois
    this.endDate = today.toISOString().split('T')[0]; // Aujourd'hui
    this.filtrerOperations();

    /* if(typeDetails === 'bon') {
    //this.updateFilteredBons();
    //this.selectedBon = this.selectedFournisseur.bons;
    this.showBonDetailsSection = true;  // Afficher les détails des bons
    this.showPaiementDetailsSection = false;  // Masquer les détails des paiements
    //this.updateFilteredBons();
    //console.log('Bon',this.filteredBons.length);
    //console.log('Paiement',this.filteredPaiements.length);
  }
  else if (typeDetails === 'paiement') {
    //this.updateFilteredPaiements();
    //this.selectedPaiement = this.selectedFournisseur.paiements;
    this.showPaiementDetailsSection = true;  // Afficher les détails des paiements
    this.showBonDetailsSection = false;  // Masquer les détails des bons
    //this.updateFilteredPaiements
  }
  else{
    console.log("Pas de détails à affichier")
  } */
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

  // Fonction pour afficher ou masquer le formulaire
  toggleBonForm(): void {
    this.showBonForm = !this.showBonForm;
    this.showPaiementForm = false;
  }

  resetFormPaiement() {
    this.paiementForm.reset();
  }
  toggleDetails(index: number, typeInstance: unknown) {
    if (typeInstance instanceof Fournisseur) {
      this.selectedBonIndexF = this.selectedBonIndexF === index ? null : index;
    } else if (typeInstance instanceof Bon) {
      this.selectedBonIndexB = this.selectedBonIndexB === index ? null : index;
    } else if (typeInstance instanceof Paiement) {
      this.selectedBonIndexP = this.selectedBonIndexP === index ? null : index;
    } else if (typeInstance instanceof Operation) {
      this.selectedBonIndexO = this.selectedBonIndexO === index ? null : index;
    }
  }

  getBonByOperation(operation: Operation): Bon | null {
    return this.filteredBons.find((bon) => bon.id === operation.bonId) || null;
  }
  getBonBypaiement(operation: Paiement): Bon | null {
    return this.filteredBons.find((bon) => bon.id === operation.bonId) || null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFournisseurByOperation(operation: any): Fournisseur | null {
    // Vérifier si l'opération est de type Paiement
    if (operation instanceof Paiement) {
      return this.filteredFournisseurs.find((four) => four.id === operation.fournisseurId) || null;
    } else if (operation instanceof Bon) {
      return this.filteredFournisseurs.find((four) => four.id === operation.fournisseurId) || null;
    }

    // Autres cas
    return this.filteredFournisseurs.find((four) => four.id === operation.fournisseurId) || null;
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
        .pipe(finalize(() => (this.isLoading = false)))
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
  submitBon(): void {
    console.log('Bon enregistré', this.bonForm.value);
  }

  removeProduct(produit: Produits): void {
    const index = this.produitsAjoutes.indexOf(produit);
    if (index > -1) {
      this.produitsAjoutes.splice(index, 1);
    }
  }

  // Fonction pour valider et soumettre le bon
  /* onSubmitBonForm(): void {
   // Traiter l'envoi du formulaire
   console.log('Form Submitted', {
    numero: this.numero,
    typeBon: this.typeBon,
    description: this.description,
    montant: this.montant,
    dateBon: this.dateBon,
    dateReceptionPrevu: this.dateReceptionPrevu,
    dateLivraison: this.dateLivraison,
    motifsRetour: this.motifsRetour,
    fichier: this.fichier
  });
  this.showProductsSection = true;
} */

  // Fonction pour afficher ou masquer le formulaire de paiement
  /* togglePaiementForm(): void {
    this.showPaiementForm = !this.showPaiementForm;
  } */

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

  /* get getPaginatedBonsBis() {
  return this.paginationService.paginate(this.filteredBonsBis, this.currentPageBonBis, 2);
}

get getPaginatedPaiementsBis() {
  return this.paginationService.paginate(this.filteredPaiementsBis, this.currentPagePaiementBis, 2);
} */

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

  /*  onTypeBonChange(): void {
    // Mettre à jour les champs visibles et désactiver les champs non visibles
    this.bonForm.get('dateBon')?.updateValueAndValidity();
    this.bonForm.get('dateReceptionPrevu')?.updateValueAndValidity();
    this.bonForm.get('dateLivraison')?.updateValueAndValidity();
    this.bonForm.get('motifsRetour')?.updateValueAndValidity();
  } */

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

    this.filteredOperations = this.selectedFournisseur.operations.filter((op) => {
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
  selectProduit(prod: Produits) {
    // Ajouter directement le produit au panier
    console.log('Produit sélectionné :', prod); // Vérifier que le bon produit est sélectionné
    this.panier.push(
      this.fb.group({
        produit: [prod.designation, Validators.required],
        uniteStock: [prod.unite, Validators.required],
        quantite: [1, [Validators.required, Validators.min(1)]],
        prixUnitaire: [prod.prixVenteUnitaire, Validators.required],
      }),
    );

    // Effacer la recherche et la liste des suggestions
    this.searchInput = '';
    this.filteredProduits = [];
    this.updateTotal();
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

  removeArticle(index: number): void {
    this.panier.removeAt(index);
    this.filteredProduits.splice(index, 1);
    this.updateTotal();
  }

  // Méthode pour afficher le formulaire de paiement
  togglePaiementForm(): void {
    this.showBonForm = false;
    this.showPaiementForm = !this.showPaiementForm;

  }
  
  // Gérer l'événement d'enregistrement du paiement
  onPaiementEnregistre(paiement: Paiement): void {
    // Associer le fournisseur au paiement
    if (this.selectedFournisseur) {
      paiement.fournisseurId = this.selectedFournisseur.id;
    }
    
    // Enregistrer le paiement
    this.enregistrerPaiement(paiement);
    this.showPaiementComponent = false;
  }
  
  onPaiementAnnule(): void {
    this.showPaiementComponent = false;
  }
  
  private enregistrerPaiement(paiement: Paiement): void {
    // Logique d'enregistrement du paiement
    console.log('Paiement enregistré:', paiement);
    // this.paiementService.create(paiement).subscribe(...);
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
  get panier(): FormArray {
    return this.bonForm.get('panier') as FormArray;
  }

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
    if (this.typeBon === 'retour') {
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

  onFileSelected(event: Event, formType: 'bon' | 'paiement'): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const fichier = input.files[0]; // Récupérer le premier fichier sélectionné

      if (formType === 'bon') {
        this.bonForm.patchValue({ fichier });
        this.bonForm.get('fichier')?.updateValueAndValidity();
      } else if (formType === 'paiement') {
        this.paiementForm.patchValue({ fichier });
        this.paiementForm.get('fichier')?.updateValueAndValidity();
      }
    }
  }

  // Assurez-vous d'avoir une liste de tous les bons
  bons: unknown[] = []; // Remplir avec les bons correspondants

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
    if (bon.statutBon === 'brouillon' || bon.statutBon === 'commandé') {
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

  // Fonction pour imprimer le bon
  imprimerBon(bon: Bon): void {
    console.log(bon);
    // Logique d'impression du bon (ici, on simule l'impression)
    window.print(); // Pour l'impression
    alert("Bon envoyé à l'impression.");
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
      .pipe(finalize(() => (this.isLoading = false)))
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
      .pipe(finalize(() => (this.isLoading = false)))
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
      .pipe(finalize(() => (this.isLoading = false)))
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
      .pipe(finalize(() => (this.isLoading = false)))
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
        .pipe(finalize(() => (this.isLoading = false)))
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
}
