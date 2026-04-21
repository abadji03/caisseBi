import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CategorieProduits, Produits } from '../../../modeles/produit.modele';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import JsBarcode from 'jsbarcode';
import { ProduitsService } from '../../../services/produits.service';
import { ToastrService } from 'ngx-toastr';
import { FournisseursService } from '../../../services/fournisseurs.service';
import { finalize, forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
//import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { Magasin } from '../../../modeles/magasin.model';
import { MaagasinsService } from '../../../services/maagasins.service';

@Component({
  selector: 'app-catalogue-produit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, FormsModule],
  templateUrl: './catalogue-produit.component.html',
  styleUrl: './catalogue-produit.component.css',
})
export class CatalogueProduitComponent implements OnInit, OnDestroy {
  prods: Produits[] = []; // Liste de prods
  //users: User[] = [];
  //stock: Stock[] = [];
  code_structure : string | null = null;
  agentId : number | null = null;
  magasinId : number | null = null;
  isLoading = false;
  codeBarre = '';
  selectedImageFile: File | null = null;
  logoPreview: string | null = null;
  selectedProduits: Produits | null = null; // Produits sélectionné
  searchForm!: FormGroup; // Formulaire de recherche
  categorieForm!: FormGroup; // Formulaire d'ajout de catégorie
  isActionsEnabled = false; // Indicateur pour activer les actions
  isRowSelected = false; // Indique si une ligne est sélectionnée
  ajoutCategorie = false;
  searchTerm = '';

  showStockModal = false;

  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;
  
  // Filtres
  selectedCategorieId = '';
  selectedStatut = '';
  
  // Options de filtre
  statutOptions = [
    { valeur: '', label: 'Tous les statut' },
    { valeur: 'true', label: 'Actifs' },
    { valeur: 'false', label: 'Inactifs' }
  ];

  isStockFormReady = false;

  errorMessage = '';
  categories: CategorieProduits[] = [];
  editingCategorieId: number | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editedCategorie: any = {};

  barcodeGenerated = false;
  impressionBarcode = false;

  isAdmin = false;

  actionType = 'ajouter';
  searchText = ''; // Texte de recherche
  searchBy = 'designation'; // Critère de recherche
  fournisseur: Fournisseur[] = [];
  

  produitForm!: FormGroup;
  stockForm!: FormGroup;
  // 1. Ajout d'une propriété pour les produits filtrés
  filteredProducts: Produits[] = [];

  isNewUniteVisible = false;
  imageFilename: string | null = null;

  // Liste des unités possibles (à adapter selon vos besoins)
  uniteOptions = ['kg', 'litre', 'mètre', 'pièce'];
  // Variable pour gérer la sélection globale
  selectAll = false;
  // Liste des produits paginés
  checkedProducts = [];

  taxe = 0;

  productsToRemove: Produits[] = [];
  isCheckedCase = false;
  showStockSection = false;

  imageChanged = false; // <- À ajouter tout en haut de ton composant

  magasins: Magasin[] = [];

  selectedImage: File | null = null;

  private destroy$ = new Subject<void>();
  private userSubscription!: Subscription;

  private fb = inject(FormBuilder);
  private produitsServices = inject(ProduitsService);
  private toastr = inject(ToastrService);
  private fournisseurService = inject(FournisseursService);
  //private userService = inject(UserService);
  private stockService = inject(StockInventaireService);
  //private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private magasinService = inject(MaagasinsService);

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      //this.currentUser = user;
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      this.magasinId = user?.magasinId || null;
      this.agentId = user?.id || null;
      this.isAdmin = this.authService.hasRole('Administrateur') || this.authService.hasRole('Administrateur secondaire');
      console.log('Code structure initialisé :', this.code_structure);
      // Déterminer si on doit montrer le champ structure
      //this.isStructureAdmin = this.authService.hasRole('Administrateur'); // Ou vérifiez par ID

      // Récupérer l'ID de la structure de l'utilisateur connecté
      if (this.code_structure) {
        this.loadData();
        this.loadMagasinsData();
      }
      
    });
    //this.loadData();
    this.iniFormulaire();
    //this.loadCategories();
    //this.loadFournisseurs();
    // Charger les prods fictifs
    //this.prods = this.loadMockData();
    // Initialiser filteredProducts avec tous les produits
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if(this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // Ajoutez cette méthode pour initialiser le formulaire de stock
  initStockForm(): void {
    this.stockForm = this.fb.group({
      magasinId: [this.getDefaultMagasinId(), Validators.required],
      quantiteTotale: ['', [Validators.required, Validators.min(0.01)]],
      seuilAlerte: [5, [Validators.min(0)]],
      seuilReapprovisionnement: [10, [Validators.min(0)]],
      stockSecurite: [5, [Validators.min(0)]],
      datePeremption: [null],
      prixAchatUnitaire: [{ value: '', disabled: true }],
      prixVenteUnitaire: [{ value: '', disabled: true }]
    });
    this.isStockFormReady = true;
  }

  iniFormulaire(): void {
    // Initialisation du formulaire réactif pour la recherche
    this.searchForm = this.fb.group({
      searchText: [''],
      searchBy: ['designation'], // Valeur par défaut de la recherche (par exemple par designation)
    });

    // Initialisation du formulaire réactif pour l'ajout d'une catégorie
    this.categorieForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', Validators.required],
      code_structure: [this.code_structure],
      statut: [true],
    });
    // Formulaire réactif pour ajouter/éditer un produit
    this.produitForm = this.fb.group({
      //code_structure: [this.code_structure],
      categorieId: ['', Validators.required],
      designation: ['', Validators.required],
      fournisseurId: ['', Validators.required],
      //agentId: [this.agentId],
      //quantite: [0, Validators.required],
      // type_entree: ['', Validators.required],
      // type_sortie: ['', Validators.required],
      unite: ['', Validators.required],
      prixAchatUnitaire: [0, [Validators.required, Validators.min(0)]],
      prixVenteUnitaire: [0, [Validators.required, Validators.min(0)]],
      codeBarre: [''],
      //prixTotalVente: [0],
      description: [''],
      perissable: [false, Validators.required],
      //image:[null]
    });
  }

  /* initStockForm() {
    this.stockForm = this.fb.group({
      magasinId: [this.magasinId],
      quantiteTotale: ['', [Validators.required, Validators.min(0)]],
      seuilAlerte: [5],
      seuilReapprovisionnement: [10],
      stockSecurite: [5],
      datePeremption: [null],
    });
  } */

  // Getter pour accéder facilement aux contrôles
  get f() {
    return this.produitForm.controls;
  }

  // Méthode pour obtenir l'ID du magasin par défaut
  getDefaultMagasinId(): number | null {
    if (this.isAdmin) {
      return null; // L'admin doit choisir
    }
    return this.magasinId; // Le gérant a son magasin associé
  }

  // Méthode pour ouvrir le modal de stock initial
  openStockModal(produit: Produits): void {
  this.selectedProduits = produit;
  this.initStockForm(); // Initialiser le formulaire
  
  // Pré-remplir les prix si disponibles
  if (produit.prixAchatUnitaire) {
    this.stockForm.patchValue({
      prixAchatUnitaire: produit.prixAchatUnitaire,
      prixVenteUnitaire: produit.prixVenteUnitaire
    });
  }
  
  this.showStockModal = true;
  // Attendre un tick pour que le formulaire soit bien initialisé avant d'ouvrir le modal
  setTimeout(() => {
    const modalElement = document.getElementById('stockInitialModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }, 0);
}

// Modifiez la méthode closeStockModal
closeStockModal(): void {
  this.showStockModal = false;
  this.selectedProduits = null;
  if (this.stockForm) {
    this.stockForm.reset();
  }
  this.isStockFormReady = true;
  const modalElement = document.getElementById('stockInitialModal');
  if (modalElement) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    } else {
      // Si pas d'instance, on ferme manuellement
      modalElement.classList.remove('show');
      modalElement.style.display = 'none';
      document.body.classList.remove('modal-open');
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) backdrop.remove();
    }
  }
  
}
  // Méthode pour enregistrer le stock initial
  saveStockInitial(): void {
    if (this.stockForm.invalid) {
      this.toastr.warning('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const stockData = {
      ...this.stockForm.value,
      code_structure: this.code_structure,
      produitId: this.selectedProduits?.id,
      dernierPrixAchat: this.selectedProduits?.prixAchatUnitaire,
      prixVenteUnitaire: this.selectedProduits?.prixVenteUnitaire,
      agentId: this.agentId
    };

    // Supprimer les champs désactivés du formulaire
    delete stockData.prixAchatUnitaire;
    delete stockData.prixVenteUnitaire;

    this.isLoading = true;
    this.stockService.createStock(stockData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          this.toastr.success('Stock initial enregistré avec succès');
          this.closeStockModal();
          this.loadData(); // Recharger les données
          this.closeActions(); // Fermer le panneau d'actions
        },
        error: (err) => {
          const message = err.error?.message || 'Erreur lors de l\'enregistrement du stock';
          this.toastr.error(message);
          console.error('Erreur stock:', err);
        }
      });
  }

  verifyCheckedCase() {
    const checkboxs = document.getElementsByName('checkCase');
    for (let i = 0; i < checkboxs.length; i++) {
      const cb = checkboxs[i] as HTMLInputElement;
      if (cb.checked == true) {
        //this.isCheckedCase = true;
        const prod = this.filteredProducts[i];
        this.productsToRemove.push(prod);
      } else {
        this.productsToRemove.splice(i, 1);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.productsToRemove.length > 1 ? (this.isCheckedCase = true) : (this.isCheckedCase = false);
  }

  deleteAllSelectedProd() {
    const checkboxs = document.getElementsByName('checkCase');
    for (let i = 0; i < checkboxs.length; i++) {
      const cb = checkboxs[i] as HTMLInputElement;
      if (cb.checked == true) {
        this.filteredProducts.splice(i, 1);
        localStorage.setItem('list_produits', JSON.stringify(this.filteredProducts));
      }
    }
  }
  VerificationCheckedCase() {
    const selected = document.getElementById('checkAll') as HTMLInputElement;
    //const checkboxs = document.getElementsByName('checkCase');

    if (selected.checked == true || this.productsToRemove.length > 1) {
      this.deleteAllSelectedProd();
      window.location.reload();
    } else {
      alert('Veuillez sélectionner les produits à supprimer');
    }
  }
  selectAllProd() {
    const selected = document.getElementById('checkAll') as HTMLInputElement;
    const checkboxs = document.getElementsByName('checkCase');

    if (selected.checked == true) {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < checkboxs.length; i++) {
        const cb = checkboxs[i] as HTMLInputElement;
        cb.checked = true;
      }
      this.isCheckedCase = true;
    } else {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < checkboxs.length; i++) {
        const cb = checkboxs[i] as HTMLInputElement;
        cb.checked = false;
      }
      this.isCheckedCase = false;
    }
  }

  // Afficher ou cacher le champ de saisie de nouvelle unité
  toggleNewUniteField() {
    this.isNewUniteVisible = !this.isNewUniteVisible;
  }

  // Ajouter la nouvelle unité à la liste des unités disponibles
  addNewUnite() {
    const newUnite = this.produitForm.get('newUnite')?.value;
    if (newUnite && !this.uniteOptions.includes(newUnite)) {
      this.uniteOptions.push(newUnite);
      this.produitForm.get('unite')?.setValue(newUnite); // Sélectionner la nouvelle unité dans le formulaire
      this.isNewUniteVisible = false; // Cacher le champ après ajout
    }
  }

  onRowSelect(Produits: Produits): void {
    this.selectedProduits = Produits;
    this.isActionsEnabled = true; // Activer les actions quand une ligne est sélectionnée
    this.isRowSelected = true; // Lorsque la ligne est sélectionnée, la colonne droite s'affiche
  }

  // Fonction pour fermer la partie des actions (colonne droite)
  closeActions(): void {
    this.selectedProduits = null;
    this.isRowSelected = false; // Fermer la colonne droite en réinitialisant la sélection
  }

  // Fonction pour appliquer la recherche
  // Fonction de recherche appelée en temps réel à chaque saisie
  onSearch() {
    const searchValue = this.searchTerm.toLowerCase();

    // Si une valeur de recherche est présente, on applique le filtre
    if (searchValue) {
      this.filteredProducts = this.prods.filter((produit) => {
        // Vérification si le champ `name` ou `city` contient la valeur recherchée
        return (
          produit.designation?.toLowerCase().includes(searchValue) ||
          //produit.famille?.toLowerCase().includes(searchValue) ||
          produit.fournisseurId?.toString().toLowerCase().includes(searchValue)
        );
        //  produit.magasinId?.toString().toLowerCase().includes(searchValue);
      });
    } else {
      // Si aucune recherche, on réinitialise la liste filtrée avec tous les produits
      this.filteredProducts = [...this.prods];
    }
  }

  
  /* onSearchChange(): void {
    const search = normalize(this.searchTerm);

    this.filteredProducts = this.prods.filter(
      (prod) =>
        normalize(prod.designation).includes(search) ||
        normalize(this.getNomCategorieById(prod.categorieId)).includes(search) ||
        normalize(this.getNomUserById(prod.agentId!)).includes(search) ||
        normalize(prod.unite).includes(search),
    );

    this.currentPage = 1;
  } */

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.itemsPerPage);
  }
  afficherFormCategorie() {
    this.ajoutCategorie = !this.ajoutCategorie; // Inverse l'état de la variable
  }

  saveFormCategorie() {
    this.ajoutCategorie = !this.ajoutCategorie; // Inverse l'état de la variable
  }

  // Méthode pour rafraîchir ou réinitialiser le tableau
  rafraichirTableau(): void {
    //this.tableau = [...this.tableau];  // Utilisation d'un nouveau tableau pour forcer Angular à détecter le changement
  }

  // Méthode pour rafraîchir les données depuis une source externe
  rafraichirDonnees(): void {
    //this.chargerDonnees();  // Recharger les données depuis l'API
  }

  // Pagination sur les produits filtrés
  get paginatedProducts(): Produits[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    //const paginated = this.filteredProducts.slice(start, start + this.itemsPerPage);
    /*console.log('Paginated Products:', paginated); // Log pour vérifier la pagination
      console.log('Search Value:', this.searchForm.get('searchText')?.value.toLowerCase());
      console.log('Search By:', this.searchForm.get('searchBy')?.value); */
    return this.filteredProducts.slice(start, start + this.itemsPerPage);
  }

 
  // Actions sur le Produits sélectionné (par exemple: ajouter, modifier, etc.)
  onAction(action: string): void {
    // Si l'action est "ajouter", on réinitialise actionType à "ajouter"
    if (action === 'ajouter') {
      this.actionType = 'ajouter';
      this.selectedProduits = null; // S'assurer qu'aucun produit n'est sélectionné
    }
    else if (action === 'stock-initial' && this.selectedProduits) {
      // Ouvrir le modal de stock initial
      this.openStockModal(this.selectedProduits);
      return;
    }
    else {
      this.actionType = action; // On garde l'action sélectionnée
    }
    if (this.selectedProduits) {
      //console.log(`${action} Produits:`, this.selectedProduits);
      if (this.actionType === 'modifier') {
        // On charge les informations du produit sélectionné dans le formulaire
        this.produitForm.patchValue({
          id: this.selectedProduits.id, // Remplir l'ID du produit
          categorieId: this.selectedProduits.categorieId, // Remplir la famille
          designation: this.selectedProduits.designation, // Remplir la désignation
          fournisseurId: this.selectedProduits.fournisseurId, // Remplir le fournisseur
          codeBarre: this.selectedProduits.codeBarre,
          // magasin: this.selectedProduits.magasinId,  // Remplir le magasin
          // quantite: this.selectedProduits.quantite,  // Remplir la quantité
          //type_entree: '',  // Réinitialiser si nécessaire (selon votre logique)
          //type_sortie: '',  // Réinitialiser si nécessaire (selon votre logique)
          prixAchatUnitaire: this.selectedProduits.prixAchatUnitaire, // Remplir prix d'achat unitaire
          prixVenteUnitaire: this.selectedProduits.prixVenteUnitaire, // Remplir prix de vente unitaire
          description: this.selectedProduits.description, // Remplir la description
          perissable: String(this.selectedProduits.perissable),
        });

        // Récupération du fichier image distant et conversion en File
        if (this.selectedProduits.image) {
          this.logoPreview = this.selectedProduits.image || './assets/images/default-structure.png';
          this.imageFilename = this.extractFilenameFromUrl(this.selectedProduits.image);

          this.urlToFile(this.selectedProduits.image, 'produit-image.png', 'image/png').then(
            (file) => {
              this.selectedImageFile = file;
            },
          );
        }

        // Ouvrir la modal après avoir pré-rempli les champs avec les données du produit
        this.openModal(this.actionType, this.selectedProduits);
      }
      // Si l'action est "entree" ou "sortie", réinitialiser certains champs pour ces actions
      else if (this.actionType === 'entree' || this.actionType === 'sortie') {
        // Réinitialiser uniquement les champs spécifiques pour l'entrée ou la sortie
        this.produitForm.patchValue({
          fournisseur: '', // Réinitialiser le champ fournisseur
          magasin: '', // Réinitialiser le champ magasin
          quantite: 0, // Réinitialiser la quantité
          type_entree: action === 'entree' ? '' : null, // Réinitialiser type_entree si action est 'entree'
          type_sortie: action === 'sortie' ? '' : null, // Réinitialiser type_sortie si action est 'sortie'
          prixAchatUnitaire: 0, // Réinitialiser le prix d'achat unitaire
          prixVenteUnitaire: 0, // Réinitialiser le prix de vente unitaire
          description: '', // Réinitialiser la description
        });

        // Ouvrir la modal pour l'action entrée ou sortie
        this.openModal(this.actionType, this.selectedProduits);
      } 
      else if (this.actionType === 'statut') {
        console.log(this.actionType);
        this.selectedProduits.statut = !this.selectedProduits.statut;
        this.toggleProduitStatus(this.selectedProduits, this.selectedProduits.statut);
      } 
      else {
        //console.log(`${action} Produit:`, this.selectedProduits);
        /* if(this.actionType === "code-barre"){
              this.generateBarcode();
          } */
        this.openModal(this.actionType, this.selectedProduits);
      }
    } else {
      this.selectedProduits = null;
      this.actionType = 'ajouter'; // On s'assure que l'actionType est bien 'ajouter' pour "Nouveau produit"
      this.openModal(this.actionType); // Ouvrir la modal pour un nouveau produit sans produit sélectionné
    }
  }

  async urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
    return fetch(url)
      .then((res) => res.blob())
      .then((blob) => new File([blob], filename, { type: mimeType }));
  }

  // Fonction pour obtenir l'ID du modal en fonction de l'action
  getModalId(action: string): string {
    switch (action) {
      case 'ajouter':
      case 'modifier':
      case 'entree':
      case 'sortie':
        return 'produitModal';
      case 'archiver':
        return 'confirmArchiveModal';
      case 'code-barre':
        return 'codeBarreModal';
      case 'image':
        return 'imageModal';
      case 'taxe':
        return 'numberModal';
      default:
        return '';
    }
  }

  openModal(act: string, produit?: Produits): void {
    //this.actionType ="ajouter"
    /* if (produit) {
        this.produitForm.patchValue(produit);
      } else {
        this.produitForm.reset();
      } */
     this.taxe = produit ? produit.tauxTVA || 0 : 0;
    // Mettre à jour le texte du bouton avant d'ouvrir la modal
    console.log('Texte du bouton:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
    if (produit) {
      if (this.actionType === 'ajouter') {
        this.produitForm.reset();
        console.log('Texte du bouton bis:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
      } else {
        this.produitForm.patchValue({
          // On charge les valeurs de certains champs comme la famille, designation, etc.
          categorieId: produit.categorieId,
          designation: produit.designation,
          unite: produit.unite,
          // On peut laisser d'autres champs comme fournisseur, magasin, etc. réinitialisés
        });
      }
    } else {
      this.actionType = 'ajouter';
      console.log('Texte du bouton bis:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
      this.produitForm.reset();
    }

    const modalIdentifiant = this.getModalId(act);
    // Manipulation du DOM pour afficher la modal
    const modalElement = document.getElementById(modalIdentifiant);
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  onSubmit(): void {
    if (this.produitForm.valid) {
      const produit = this.produitForm.value;
      console.log('Produit soumis:', produit);
      this.closeModal(this.actionType);
    }
  }

  onSubmitCategorie(): void {
    if (this.categorieForm.invalid) {
      this.toastr.warning('Veuillez remplir le nom de la catégorie');
      return;
    }

    const formValue = this.categorieForm.value;
    const categorieData: CategorieProduits = {
      nom: formValue.nom,
      description: formValue.description,
      code_structure: this.code_structure!, //this.authService.getUserStructure()
      statut: formValue.statut,
    };

    console.log(this.categorieForm.get('code_structure')?.value);
    console.log(categorieData);

    this.produitsServices.createCategorie(categorieData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.toastr.success('Catégorie créée avec succès');
        //this.loadCategories();
        this.categorieForm.reset();
        this.ajoutCategorie = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la création de la catégorie';
        this.toastr.error(this.errorMessage);
        console.error(err);
      },
    });
  }
  loadCategories(): void {
    //onst code_structure = this.authService.getUserStructure();
    this.produitsServices.getAllCategoriesProduits(this.code_structure!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.categories = data;
        // Mettre à jour les options de famille avec les catégories réelles
        //this.familles = data.map(c => c.nom_categorie);
      },
      error: (err) => {
        //this.toastr.error('Erreur lors du chargement des catégories');
        console.error(err);
      },
    });
  }

  /* loadFournisseurs(): void {
    //onst code_structure = this.authService.getUserStructure();
    this.fournisseurService.getFournisseursByStructure(this.code_structure!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.fournisseur = data;
        // Mettre à jour les options de famille avec les catégories réelles
        //this.familles = data.map(c => c.nom_categorie);
      },
      error: (err) => {
        //this.toastr.error('Erreur lors du chargement des catégories');
        console.error(err);
      },
    });
  } */

  /* loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.userService.getByStructure(this.code_structure!),
      this.produitsServices.getAllProduits(this.code_structure!),
      //this.isGeneralAdmin ? this.structureService.getAll() : of([])
      this.stockService.getStocksByStructure(
        this.code_structure!
      ),
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([users, produits, stocks]) => {
          this.users = users;
          this.stock = stocks;
          this.prods = produits.items;
          this.filteredProducts = [...this.prods];
        },
        error: (err) => console.error('Erreur chargement données', err),
      });
  } */


  loadMagasinsData(): void {
    
    // Charger les magasins séparément car ils n'ont pas besoin de pagination
    this.magasinService.getMagasinsByStructure(this.code_structure!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mgs) => {
          this.magasins = mgs;
          
        },
        error: err => console.error('Erreur chargement magasins', err)
      });
  }

  loadData(): void {
    if (!this.code_structure) return;
    
    this.isLoading = true;
    
    // D'abord charger les fournisseurs et catégories
    forkJoin({
      fournisseurs: this.fournisseurService.getFournisseursByStructure(this.code_structure!),
      categories: this.produitsServices.getAllCategoriesProduits(this.code_structure!)
    })
    .pipe(
      takeUntil(this.destroy$)
    )
    .subscribe({
      next: (results) => {
        this.fournisseur = results.fournisseurs;
        this.categories = results.categories;
        
        // Ensuite charger les produits paginés
        this.loadProduits();
      },
      error: (err) => {
        console.error('Erreur chargement données de base', err);
        this.toastr.error('Erreur lors du chargement des données');
        this.isLoading = false;
      }
    });
  }

  private loadProduits(): void {
    this.produitsServices.getAllProduits(
      this.code_structure!,
      this.currentPage,
      this.itemsPerPage,
      this.searchTerm,
      this.selectedCategorieId,
      this.selectedStatut
    )
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading = false)
    )
    .subscribe({
      next: (response) => {
        console.log('Liste des produits chargés',response);
        this.prods = response.items;
    
        // Mettre à jour la pagination
        this.totalItems = response.pagination.total;
        this.totalPages = response.pagination.totalPages;
        this.hasNext = response.pagination.hasNext;
        this.hasPrev = response.pagination.hasPrev;
        
        // Charger les données auxiliaires (users et stock)
        //this.loadAuxiliaryData();
      },
      error: (err) => {
        console.error('Erreur chargement produits', err);
        this.toastr.error('Erreur lors du chargement des produits');
      }
    });
  }

  // Nouvelle méthode pour charger les données auxiliaires
  /* private loadAuxiliaryData(): void {
      this.userService.getByStructure(this.code_structure!)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => console.error('Erreur chargement données auxiliaires', err)
    });
  } */

  // Getter pour les pages à afficher
get pagesToShow(): number[] {
  const pages: number[] = [];
  const maxVisiblePages = 5;
  
  if (this.totalPages <= maxVisiblePages) {
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
  } else {
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, this.currentPage + 2);
    
    if (this.currentPage <= 3) {
      end = Math.min(this.totalPages, maxVisiblePages);
    }
    if (this.currentPage >= this.totalPages - 2) {
      start = Math.max(1, this.totalPages - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) pages.push(i);
  }
  return pages;
}
  // Modifier onSearchChange()
  onSearchChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  // Modifier onPageChange()
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadData();
  }

  // Modifier onRowsPerPageChange()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowsPerPageChange(event: any): void {
    this.itemsPerPage = Number(event.target.value);
    this.currentPage = 1;
    this.loadData();
  }

  // Nouvelle méthode pour filtrer par catégorie
  onCategorieChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  // Nouvelle méthode pour filtrer par statut
  onStatutChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  // Méthode pour réinitialiser les filtres
  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategorieId = '';
    this.selectedStatut = '';
    this.currentPage = 1;
    this.loadData();
  }

  closeModal(act: string): void {
    const modalIdentifiant = this.getModalId(act);
    console.log('[closeModal] ID généré pour la modal :', modalIdentifiant);

    const modalElement = document.getElementById(modalIdentifiant);
    console.log('[closeModal] Élément DOM récupéré :', modalElement);

    if (modalElement) {
      // Vérifier si une instance Bootstrap existe déjà
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modalElement);
      console.log('[closeModal] Instance Bootstrap récupérée :', bootstrapModal);

      if (bootstrapModal) {
        console.log('[closeModal] L’instance Bootstrap existe déjà, appel de hide()');
        bootstrapModal.hide();
      } else {
        console.warn(
          '[closeModal] Aucune instance Bootstrap trouvée, tentative de création manuelle',
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.hide();
        console.log('[closeModal] Modal créée et masquée via hide()');
      }

      // Facultatif : afficher les classes encore présentes
      console.log('[closeModal] Classes DOM restantes :', modalElement.className);
    } else {
      console.error('[closeModal] Modal introuvable dans le DOM pour l’action :', act);
    }
  }

  // Fonction pour obtenir le texte du bouton en fonction de l'action
  getButtonLabel(): string {
    switch (this.actionType) {
      case 'ajouter':
        return 'Ajouter un stock';
      case 'modifier':
        return 'Mettre à jour le produit';
      case 'entree':
        return "Enregistrer l'entrée";
      case 'sortie':
        return 'Enregistrer la sortie';
      default:
        return 'Ajouter un stock';
    }
  }

  // Fonction pour obtenir le texte du bouton en fonction de l'action
  getModalTitle(): string {
    switch (this.actionType) {
      case 'ajouter':
        return "Ajout d'un nouveau produit";
      case 'modifier':
        return "Modification d'un produit";
      case 'entree':
        return "Enregistrement d'une nouvelle entrée";
      case 'sortie':
        return "Enregistrement d'une nouvelle sortie";
      default:
        return 'Ajouter le produit';
    }
  }

  // Soumettre le formulaire selon l'action
  onSubmitBis(): void {
    if (this.produitForm.invalid) {
      return;
    }
    // Traitement de la soumission ici
    console.log('Form submitted:', this.produitForm.value);
    if (this.actionType === 'ajouter') {
      // Ajouter un produit
    } else if (this.actionType === 'mettre à jour') {
      // Mettre à jour un produit
    } else if (this.actionType === 'nouvelle entrée') {
      // Ajouter une entrée
    } else if (this.actionType === 'nouvelle sortie') {
      // Ajouter une sortie
    }
  }

  confirmArchiver() {
    if (this.selectedProduits) {
      // Logique pour archiver le produit
      //this.selectedProduits.archivé = true; // Exemple de mise à jour de l'état
      // Effectuer un appel au backend si nécessaire pour archiver le produit
      console.log('Produit archivé', this.selectedProduits);

      // Fermer la modal après confirmation
      this.closeModal(this.actionType);
      /* const modal = document.getElementById('confirmArchiveModal') as HTMLElement;
      const modalInstance = new (window as any).bootstrap.Modal.getInstance(modal);
      modalInstance.hide(); */
    }
  }
  saveImage() {
    if (this.selectedProduits && this.selectedImage) {
      // Logique pour envoyer l'image à un serveur ou la sauvegarder localement
      //const formData = new FormData();
      //formData.append('image', this.selectedImage);
      this.isLoading = true;
      // Remplacer l'URL par celle de ton serveur backend pour gérer l'image
      this.produitsServices
        .updateImageProduit(this.selectedProduits.id, this.selectedImage)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: () => {
            this.toastr.success('Image produit mis à jour avec succès');
            this.loadData();
            this.isRowSelected = false;
            this.closeModal(this.actionType);
          },
          error: (err) => {
            this.errorMessage =
              err.error?.message || "Erreur lors de la mise à jour de l'image du produit";
            this.toastr.error(this.errorMessage);
          },
        });

      // Fermer la modal après avoir associé l'image
      /* const modal = document.getElementById('imageModal') as HTMLElement;
        const modalInstance =  new (window as any).bootstrap.Modal.getInstance(modal);
        modalInstance.hide(); */
    }
  }
  onImageSelected($event: Event) {
    const input = $event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.selectedImage = input.files[0];
      console.log('Image sélectionnée', this.selectedImage);
    }
  }

  generateBarcode(): void {
    // Génère 12 chiffres aléatoires
    const base = this.generateNumericBarcode(12);

    // Calcule la clé de contrôle
    const checksum = this.calculateEAN13Checksum(base);

    // Concatène les 12 chiffres + la clé
    const barcodeValue = base + checksum;

    const barcodeElement = document.getElementById('barcode') as HTMLCanvasElement;
    if (barcodeElement) {
      JsBarcode(barcodeElement, barcodeValue, {
        format: 'EAN13',
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 18,
      });
    }

    if (this.selectedProduits) {
      this.codeBarre = barcodeValue;
      this.barcodeGenerated = true; //Active le bouton "Imprimer"
      console.log('Code barre généré (modification) :', this.codeBarre);
    } else {
      this.produitForm.patchValue({ codeBarre: barcodeValue });
      console.log('Code barre généré (ajout) :', barcodeValue);
    }
  }

  generateNumericBarcode(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  calculateEAN13Checksum(code: string): string {
    const digits = code.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const remainder = sum % 10;
    const checksum = remainder === 0 ? 0 : 10 - remainder;
    return String(checksum);
  }

  imprimer() {
    const canvas: HTMLCanvasElement = document.getElementById('barcode') as HTMLCanvasElement;

    if (!canvas) return;

    const dataUrl = canvas.toDataURL(); // convertit le canvas en image base64
    const windowContent = `
    <html>
      <head>
        <title>Impression du code-barres</title>
      </head>
      <body onload="window.print(); window.close();">
        <img src="${dataUrl}" style="width: 300px; height: auto;" />
      </body>
    </html>
  `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(windowContent);
      printWindow.document.close();
    }
  }

  //...............................................................................................

  // Méthode pour ouvrir le modal
  openCategoriesModal() {
    // Charger les catégories avant d'ouvrir le modal
    this.loadCategories();

    // Ouvrir le modal avec Bootstrap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modal = new (window as any).bootstrap.Modal(document.getElementById('categoriesModal'));
    modal.show();
  }

  openTaxeModal() {

    // Ouvrir le modal avec Bootstrap
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modal = new (window as any).bootstrap.Modal(document.getElementById('numberModal'));
    modal.show();
  }

  // Méthodes pour les actions
  editCategorie(categorie: CategorieProduits) {
    // Pré-remplir le formulaire avec les données de la catégorie
    this.categorieForm.patchValue({
      nom: categorie.description,
      description: categorie.description,
      statut: categorie.statut,
      code_structure: categorie.code_structure,
    });
    // Fermer le modal
    //const modal = new (window as any).bootstrap.Modal.getInstance(document.getElementById('categoriesModal'));
    //modal.hide();
  }

  toggleCategorieStatus(categorie: CategorieProduits) {
    // Implémentez la logique pour activer/désactiver
    if (confirm('Êtes-vous sûr de vouloir poursuivre cette action?')) {
        this.isLoading = true;
        const newStatus = !categorie.statut;
        this.produitsServices
          .updateStatutCategorie(categorie.id!, newStatus)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => (this.isLoading = false))
          )
          .subscribe({
            next: () => {
              this.toastr.success('Statut catégorie mis à jour avec succès');
              this.loadCategories();
            },
            error: (err) => {
              this.errorMessage =
                err.error?.message || 'Erreur lors de la mise à jour du statut de la catégorie';
              this.toastr.error(this.errorMessage);
              //console.error(err);
            },
          });
    }
  }

  toggleProduitStatus(prod: Produits, status: boolean) {
    // Implémentez la logique pour activer/désactiver
    if (confirm('Êtes-vous sûr de vouloir poursuivre cette action?')) {
      const statutCat = this.categories.find(cat => cat.id === prod.categorieId);
      if(!statutCat?.statut){
        this.toastr.error('Impossible d\'activer le produit. Veuillez activer la catégorie d\'abord');
        return;
      }
       this.isLoading = true;
        this.produitsServices
          .updateStatusProduit(prod.id, status)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => (this.isLoading = false))
          )
          .subscribe({
            next: () => {
              this.toastr.success('Statut produit mis à jour avec succès');
              this.loadData();
              //this.isRowSelected = false;
            },
            error: (err) => {
              this.errorMessage =
                err.error?.message || 'Erreur lors de la mise à jour du statut du produit';
              this.toastr.error(this.errorMessage, err);
              //console.error(err);
            },
          });
        }
   
  }

  toggleProduitCodeBarre(prod: Produits, status: boolean) {
    // Implémentez la logique pour activer/désactiver
    this.isLoading = true;
    this.produitsServices
      .updateStatusProduit(prod.id, status)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Statut produit mis à jour avec succès');
          this.loadData();
        },
        error: (err) => {
          this.errorMessage =
            err.error?.message || 'Erreur lors de la mise à jour du statut du produit';
          this.toastr.error(this.errorMessage, err);
          //console.error(err);
        },
      });
  }

  creerOuMettreAJourTaux() {
    if (!this.selectedProduits || !this.selectedProduits.id) return;

    const tauxTva = this.taxe;

    console.log('Taux TVA saisi :', tauxTva);

    if (tauxTva < 0) {
      this.toastr.error('Veuillez saisir un taux valide.');
      return;
    }
    this.isLoading = true;
    this.produitsServices
      .updateTauxTVAProduit(this.selectedProduits.id, tauxTva)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          console.log('Taux TVA mis à jour avec succès');
          this.toastr.success('Taux créé/mis à jour avec succès !');
          // Recharger les données ou mettre à jour localement si besoin
          this.closeModal(this.actionType);
          this.loadData();
          this.isRowSelected = false;
        },
        error: (err) => {
          console.error('Erreur lors de la création/mise à jour du taux TVA :', err); 
          this.toastr.error(err.error.message || 'Erreur lors de la création/mise à jour');
        },
      });
  }

  mettreAJourCodeBarre() {
    if (!this.selectedProduits || !this.selectedProduits.id) return;

    const nouveauCodeBarre = this.codeBarre;

    if (!nouveauCodeBarre || nouveauCodeBarre.trim() === '') {
      this.toastr.error('Veuillez saisir un code-barre.');
      return;
    }
    this.isLoading = true;
    this.produitsServices
      .updateCodeBarre(this.selectedProduits.id, nouveauCodeBarre)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: () => {
          this.toastr.success('Code-barre mis à jour !');
          // Recharger les données ou mettre à jour localement si besoin
          this.impressionBarcode = true;
          this.loadData();
          this.isRowSelected = false;
        },
        error: (err) => {
          this.toastr.error(err.error.message || 'Erreur lors de la mise à jour');
        },
      });
  }

  deleteCategorie(id: number) {
    this.isLoading = true;
    // Confirmation avant suppression
    if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      this.produitsServices
        .deleteCategorie(id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: () => {
            this.toastr.success('Catégore supprimée avec succès');
            this.loadCategories();
          },
          error: (err) => {
            this.errorMessage =
              err.error?.message || 'Erreur lors de la suppression de la catégorie';
            this.toastr.error(this.errorMessage);
            //console.error(err);
          },
        });
    }
  }

  editCategorieBis(categorie: CategorieProduits) {
    this.editingCategorieId = categorie.id!;
    this.editedCategorie = { ...categorie }; // On fait une copie pour ne pas modifier directement l'objet original
  }

  cancelEdit() {
    this.editingCategorieId = null;
    this.editedCategorie = {};
  }

  saveCategorieEdit() {
    // Appel à ton service pour faire la mise à jour :
    this.produitsServices.updateCategorie(this.editedCategorie.id, this.editedCategorie)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.toastr.success('Catégore mis à jour avec succès');
        this.loadCategories();
        this.cancelEdit();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour de la catégorie';
        this.toastr.error(this.errorMessage);
        console.error('Erreur de mise à jour :', err);
        this.cancelEdit();
      },
    });
  }

  /* onSubmitWithStock() {
    if (this.produitForm.invalid || (this.stockForm && this.stockForm.invalid)) {
      this.toastr.error('Veuillez remplir tous les champs requis.');
      return;
    }

    const produitData = this.produitForm.value;

    const formData = new FormData();

    // Ajouter les champs du formulaire produit
    Object.keys(produitData).forEach((key) => {
      const value = produitData[key];
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    // Champs additionnels nécessaires
    formData.append('code_structure', this.code_structure!);
    formData.append('agentId', String(this.agentId));
    //formData.append('codeBarre', this.codeBarre);

    // Ajouter l'image sélectionnée (si présente)
    if (this.imageChanged && this.selectedImageFile) {
      formData.append('image', this.selectedImageFile);
    }

    if (this.actionType === 'ajouter') {
      const stockData = this.stockForm.value;
      // Appel au service pour créer le produit
      this.produitsServices.createProduit(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newProduit) => {
          console.log('Produit ajouté avec succès');

          // Construire les données du stock
          const completeStockData = {
            ...stockData,
            code_structure: this.code_structure,
            produitId: newProduit.id,
            dernierPrixAchat: parseFloat(produitData.prixAchatUnitaire),
            prixVenteUnitaire: parseFloat(produitData.prixVenteUnitaire),
          };

          // Créer le stock
          this.stockService.createStock(completeStockData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Produit et stock ajoutés avec succès');
              this.loadData();
              this.resetForms();
              this.closeModal(this.actionType);
            },
            error: (err) => {
              const message = err.error?.message || "Erreur lors de l'enregistrement du stock.";
              this.toastr.error(message);
            },
          });
        },
        error: (err) => {
          const message = err.error?.message || 'Erreur lors de la création du produit.';
          console.error('Erreur création produit :', err);
          this.toastr.error(message);
        },
      });
    } else if (this.actionType === 'modifier' && this.selectedProduits) {
      this.produitsServices.updateProduit(this.selectedProduits?.id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Produit mis à jour avec succès');
          this.loadData();
          this.resetForms();
          this.isRowSelected = false;
          this.closeModal(this.actionType);
        },
        error: (err) => {
          const message = err.error?.message || 'Erreur lors de la mise à jour du produit.';
          this.toastr.error(message);
        },
      });
    }
  }
 */

onSubmitWithStock() {
  if (this.produitForm.invalid) {
    this.toastr.error('Veuillez remplir tous les champs requis.');
    return;
  }

  const produitData = this.produitForm.value;
  const formData = new FormData();

  // Ajouter les champs du formulaire produit
  Object.keys(produitData).forEach((key) => {
    const value = produitData[key];
    if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });

  // Champs additionnels nécessaires
  formData.append('code_structure', this.code_structure!);
  formData.append('agentId', String(this.agentId));

  // Ajouter l'image sélectionnée (si présente)
  if (this.imageChanged && this.selectedImageFile) {
    formData.append('image', this.selectedImageFile);
  }

  if (this.actionType === 'ajouter') {
    // Appel au service pour créer le produit
    this.produitsServices.createProduit(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newProduit) => {
          this.toastr.success('Produit ajouté avec succès');
          this.loadData();
          this.resetForms();
          this.closeModal(this.actionType);
          
          // Proposer d'ajouter du stock immédiatement
          if (confirm('Souhaitez-vous ajouter du stock pour ce produit ?')) {
            this.openStockModal(newProduit);
          }
        },
        error: (err) => {
          const message = err.error?.message || 'Erreur lors de la création du produit.';
          console.error('Erreur création produit :', err);
          this.toastr.error(message);
        },
      });
  } else if (this.actionType === 'modifier' && this.selectedProduits) {
    this.produitsServices.updateProduit(this.selectedProduits?.id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success('Produit mis à jour avec succès');
          this.loadData();
          this.resetForms();
          this.isRowSelected = false;
          this.closeModal(this.actionType);
        },
        error: (err) => {
          const message = err.error?.message || 'Erreur lors de la mise à jour du produit.';
          this.toastr.error(message);
        },
      });
  }
}
  handleProduitAction() {
    if (this.actionType === 'ajouter') {
      // Affiche le formulaire de stock
      //this.showStockSection = true;
      //this.initStockForm();
      // Envoyer directement le produit sans stock
      this.onSubmitWithStock();
    } else if (this.actionType === 'modifier') {
      // Envoie directement la mise à jour du produit
      this.onSubmitWithStock(); // Elle gère déjà le cas modifier
    }
  }

  extractFilenameFromUrl(url: string): string {
    return url.split('/').pop() || 'image.png';
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedImageFile = file;
      this.imageChanged = true; // <- MARQUER que l'image a été modifiée

      const reader = new FileReader();
      reader.onload = () => {
        this.logoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  resetForms() {
    this.showStockSection = false;
    this.produitForm.reset();
    this.logoPreview = null;
    this.imageChanged = false;
    this.imageFilename = null;
    this.selectedImageFile = null;
    if (this.showStockSection) this.stockForm.reset();
  }

  resetStockSection() {
    this.showStockSection = false;
  }

  getNomCategorieById(id: number): string | null {
    const categorie = this.categories.find((p) => p.id === id);
    return categorie ? categorie.nom : null; // On retourne `null` si la catégorie n'est pas trouvée
  }

  /* getNomUserById(id: number): string | null {
    const user = this.users.find((p) => p.id === id);
    return user ? user.nom : null; // On retourne `null` si la catégorie n'est pas trouvée
  } */

  getQteById(prod: Produits): number {

    if (!prod.Stocks || prod.Stocks.length === 0) {
      return 0;
    }

    if (this.isAdmin) {
      return prod.Stocks.reduce(
        (sum, s) => sum + (Number(s.quantiteTotale) || 0),
        0
      );
    }

    return Number(prod.Stocks[0].quantiteTotale) || 0;
  }

  onTaxeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.taxe = parseFloat(input.value);
    console.log('Taxe modifiée :', this.taxe);
  }
  validerNombre() {
  console.log('Nombre récupéré :', this.taxe);
  this.creerOuMettreAJourTaux();
  }

downloadExcel(): void {
  if(confirm('Exporter vers Excel?')){
    if (!this.code_structure) return;
  
    this.isLoading = true;
    
    this.produitsServices.exportToExcel(
      this.code_structure,
      this.selectedCategorieId,
      this.selectedStatut,
      this.searchTerm
    ).subscribe({
      next: (blob: Blob) => {
        // Créer un lien de téléchargement
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Nom du fichier avec la date
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
        link.download = `produits_${this.code_structure}_${dateStr}.xlsx`;
        
        // Déclencher le téléchargement
        link.click();
        
        // Nettoyer
        window.URL.revokeObjectURL(url);
        this.isLoading = false;
        
        this.toastr.success('Export réussi');
      },
      error: (err) => {
        console.error('Erreur export:', err);
        this.toastr.error('Erreur lors de l\'export');
        this.isLoading = false;
      }
    });
  }
  }

  // Dans votre composant catalogue-produit.component.ts
downloadPDF(): void {
  if(confirm('Exporter vers PDF ?')){
    if (!this.code_structure) {
        this.toastr.warning('Structure non définie');
        return;
      }
      
      this.isLoading = true;
      //this.toastr.info('Génération du PDF en cours...');
      
      this.produitsServices.exportToPDF(
        this.code_structure,
        this.selectedCategorieId,
        this.selectedStatut,
        this.searchTerm
      ).subscribe({
        next: (blob: Blob) => {
          // Créer un lien de téléchargement
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          
          // Nom du fichier avec la date
          const date = new Date();
          const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`;
          link.download = `catalogue_${this.code_structure}_${dateStr}.pdf`;
          
          // Déclencher le téléchargement
          link.click();
          
          // Nettoyer
          window.URL.revokeObjectURL(url);
          this.isLoading = false;
          
          this.toastr.success('Export PDF réussi');
        },
        error: (err) => {
          console.error('Erreur export PDF:', err);
          this.toastr.error('Erreur lors de l\'export PDF');
          this.isLoading = false;
        }
      });
    }
  }
  
}
