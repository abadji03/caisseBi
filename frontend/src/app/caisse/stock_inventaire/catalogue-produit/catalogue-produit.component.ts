import { Component } from '@angular/core';
import { CategorieProduits, Produits } from '../../../modeles/produit.modele';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import JsBarcode from 'jsbarcode';
import { ProduitsService } from '../../../services/produits.service';
import { ToastrService } from 'ngx-toastr';
import { FournisseursService } from '../../../services/fournisseurs.service';
import { finalize, forkJoin } from 'rxjs';
import { Fournisseur } from '../../../modeles/fournisseur.model';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { image } from 'html2canvas/dist/types/css/types/image';
import { UserService } from '../../../services/user.service';
import { User } from '../../../modeles/user.model';
import { Stock } from '../../../modeles/entrees-sorties.model';

@Component({
  selector: 'app-catalogue-produit',
  standalone:true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule,FormsModule],
  templateUrl: './catalogue-produit.component.html',
  styleUrl: './catalogue-produit.component.css'
})
export class CatalogueProduitComponent {

    prods: Produits[] = [];  // Liste de prods
    users:User[] = [];
    stock:Stock[]=[]
    code_structure:string = 'MASTRUCTURET-NZNC';
    isLoading:boolean = false;
    agentId:number = 15;
    magasinId:number = 1;
    codeBarre:string = '';
    selectedImageFile: File | null = null;
    logoPreview: string | null = null;
    selectedProduits: Produits | null = null;  // Produits sélectionné
    searchForm!: FormGroup;  // Formulaire de recherche
    categorieForm!: FormGroup;  // Formulaire d'ajout de catégorie
    isActionsEnabled: boolean = false;  // Indicateur pour activer les actions
    currentPage: number = 1;  // Page courante pour la pagination
    itemsPerPage: number = 6;  // Nombre d'items par page
    isRowSelected: boolean = false; // Indique si une ligne est sélectionnée
    ajoutCategorie:boolean = false;
    searchTerm: string = '';

    errorMessage = '';
    categories: CategorieProduits[] = [];
    editingCategorieId: number | null = null;
    editedCategorie: any = {};

    actionType: string = 'ajouter';
    searchText: string = '';  // Texte de recherche
    searchBy: string = 'designation';  // Critère de recherche
    fournisseur:Fournisseur[] = [];

    produitForm!: FormGroup;
    stockForm!: FormGroup;
    // 1. Ajout d'une propriété pour les produits filtrés
    filteredProducts: Produits[] = [];

    isNewUniteVisible: boolean = false;

    // Liste des unités possibles (à adapter selon vos besoins)
    uniteOptions = ['kg', 'litre', 'mètre', 'pièce'];
    // Variable pour gérer la sélection globale
    selectAll: boolean = false;
    // Liste des produits paginés
    checkedProducts = [];

    productsToRemove : Produits[] = [];
    isCheckedCase : boolean = false;
   showStockSection = false;



    // Listes des familles, fournisseurs et magasins
    familles: string[] = ['Electroménager', 'Électronique', 'Vêtements', 'Jouets', 'Alimentation'];
    fournisseurs: string[] = ['Fournisseur A', 'Fournisseur B', 'Fournisseur C', 'Fournisseur D', 'Fournisseur E'];
    magasins: string[] = ['Magasin 1', 'Magasin 2', 'Magasin 3', 'Magasin 4'];  // Liste des magasins
    selectedImage:File | null = null;

    constructor(
      private fb: FormBuilder,
      private produitsServices:ProduitsService,
      private toastr: ToastrService,
      private fournisseurService:FournisseursService,
      private userService:UserService,
      private stockService: StockInventaireService
    ) {

    }

    ngOnInit(): void {
      this.loadData();
      this.iniFormulaire();
      this.loadCategories();
      this.loadFournisseurs();
      // Charger les prods fictifs
      //this.prods = this.loadMockData();
      // Initialiser filteredProducts avec tous les produits
      
    }

    iniFormulaire(): void{

      // Initialisation du formulaire réactif pour la recherche
      this.searchForm = this.fb.group({
        searchText: [''],
        searchBy: ['designation'],  // Valeur par défaut de la recherche (par exemple par designation)
      });

      // Initialisation du formulaire réactif pour l'ajout d'une catégorie
      this.categorieForm = this.fb.group({
        nom: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
        description: ['', Validators.required],
        code_structure:[this.code_structure],
        statut:[true]
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
        //prixTotalVente: [0],
        description: [''],
        perissable:[false, Validators.required]
        //image:[null]
       
      });
    }

    initStockForm() {
      this.stockForm = this.fb.group({
        magasinId: [this.magasinId],
          quantiteTotale: ['', [Validators.required, Validators.min(0)]],
          seuilAlerte: [5],
          seuilReapprovisionnement: [10],
          stockSecurite: [5],
          datePeremption: [null]
      });
    }

    // Getter pour accéder facilement aux contrôles
    get f() { return this.produitForm.controls; }

    verifyCheckedCase() {
      const checkboxs = document.getElementsByName('checkCase');
      for(let i = 0; i < checkboxs.length; i++){
        const cb = checkboxs[i] as HTMLInputElement;
        if(cb.checked == true) {
         //this.isCheckedCase = true;
         const prod = this.filteredProducts[i];
         this.productsToRemove.push(prod);
        }
        else {
          this.productsToRemove.splice(i,1);
        }
      }
      this.productsToRemove.length > 1 ? this.isCheckedCase = true: this.isCheckedCase = false;

    }

    deleteAllSelectedProd(){
      const checkboxs = document.getElementsByName('checkCase');
      for(let i = 0; i < checkboxs.length; i++){
        const cb = checkboxs[i] as HTMLInputElement;
        if(cb.checked == true) {
          this.filteredProducts.splice(i,1);
          localStorage.setItem("list_produits", JSON.stringify(this.filteredProducts));
        }
      }
    }
    VerificationCheckedCase(){
      const selected = document.getElementById('checkAll') as HTMLInputElement;
      const checkboxs = document.getElementsByName('checkCase');

      if(selected.checked == true || this.productsToRemove.length > 1){
        this.deleteAllSelectedProd();
        window.location.reload();
      }
      else{
        alert("Veuillez sélectionner les produits à supprimer");
      }
    }
    selectAllProd(){
      const selected = document.getElementById('checkAll') as HTMLInputElement;
      const checkboxs = document.getElementsByName('checkCase');

      if(selected.checked == true){
        for(let i = 0; i < checkboxs.length; i++){
          const cb = checkboxs[i] as HTMLInputElement;
          cb.checked = true;
        }
        this.isCheckedCase = true;
      }
      else {
        for(let i = 0; i < checkboxs.length; i++){
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
        this.produitForm.get('unite')?.setValue(newUnite);  // Sélectionner la nouvelle unité dans le formulaire
        this.isNewUniteVisible = false;  // Cacher le champ après ajout
      }
    }

    /* loadMockData(): Produits[] {
      return [
        new Produits({
          id: 1, famille: 'Electroménager', designation: 'Réfrigérateur', fournisseurId: 1,  unite: 'Unités', prixAchatUnitaire: 100, prixTotalAchat: 1000, prixVenteUnitaire: 150,
          prixTotalVente: 1500, dateCreation: new Date(), description: 'Réfrigérateur LG', codeBarre: '1234567890', image: ''
        }),
        new Produits({
          id: 2, famille: 'Électronique', designation: 'Télévision', fournisseurId: 2,  unite: 'Unités', prixAchatUnitaire: 200, prixTotalAchat: 1000, prixVenteUnitaire: 300,
          prixTotalVente: 1500, dateCreation: new Date(), description: 'Télévision Samsung', codeBarre: '2345678901', image: ''
        }),
        new Produits({
          id: 3, famille: 'Vêtements', designation: 'T-shirt', fournisseurId: 3,  unite: 'Unités', prixAchatUnitaire: 10, prixTotalAchat: 150, prixVenteUnitaire: 20,
          prixTotalVente: 300, dateCreation: new Date(), agent: 'Agent 3', description: 'T-shirt coton', codeBarre: '3456789012', image: ''
        }),
        new Produits({
          id: 4, famille: 'Jouets', designation: 'Peluche', fournisseurId: 4,  unite: 'Unités', prixAchatUnitaire: 50, prixTotalAchat: 400, prixVenteUnitaire: 70,
          prixTotalVente: 560, dateCreation: new Date(), agent: 'Agent 4', description: 'Peluche panda', codeBarre: '4567890123', image: ''
        }),
        new Produits({
          id: 5, famille: 'Alimentation', designation: 'Céréales', fournisseurId:5,  unite: 'Unités', prixAchatUnitaire: 5, prixTotalAchat: 125, prixVenteUnitaire: 8,
          prixTotalVente: 200, dateCreation: new Date(), agent: 'Agent 5', description: 'Céréales nature', codeBarre: '5678901234', image: ''
        }),
        new Produits({
          id: 6, famille: 'Électronique', designation: 'Smartphone', fournisseurId: 6,  unite: 'Unités', prixAchatUnitaire: 500, prixTotalAchat: 3000, prixVenteUnitaire: 700,
          prixTotalVente: 3500, dateCreation: new Date(), agent: 'Agent 6', description: 'iPhone 14', codeBarre: '6789012345', image: ''
        }),
        new Produits({
          id: 7, famille: 'Alimentation', designation: 'Pâtes', fournisseurId: 7,  unite: 'Paquets', prixAchatUnitaire: 2, prixTotalAchat: 80, prixVenteUnitaire: 5,
          prixTotalVente: 200, dateCreation: new Date(), agent: 'Agent 7', description: 'Pâtes Barilla', codeBarre: '7890123456', image: ''
        }),
        new Produits({
          id: 8, famille: 'Vêtements', designation: 'Jeans', fournisseurId: 8,  unite: 'Paires', prixAchatUnitaire: 30, prixTotalAchat: 600, prixVenteUnitaire: 50,
          prixTotalVente: 1000, dateCreation: new Date(), agent: 'Agent 8', description: 'Jeans Levi\'s', codeBarre: '8901234567', image: ''
        }),
        new Produits({
          id: 9, famille: 'Électronique', designation: 'Casque audio', fournisseurId: 9, unite: 'Unités', prixAchatUnitaire: 80, prixTotalAchat: 1200, prixVenteUnitaire: 100,
          prixTotalVente: 1500, dateCreation: new Date(), agent: 'Agent 9', description: 'Casque Sony', codeBarre: '9012345678', image: ''
        }),
        new Produits({
          id: 10, famille: 'Jouets', designation: 'Lego', fournisseurId: 10, unite: 'Boîtes', prixAchatUnitaire: 60, prixTotalAchat: 2100, prixVenteUnitaire: 100,
          prixTotalVente: 3500, dateCreation: new Date(), agent: 'Agent 10', description: 'Lego Star Wars', codeBarre: '0123456789', image: ''
        }),
        new Produits({
          id: 11, famille: 'Électronique', designation: 'Ordinateur portable', fournisseurId: 11, unite: 'Unités', prixAchatUnitaire: 700, prixTotalAchat: 17500, prixVenteUnitaire: 850,
          prixTotalVente: 21250, dateCreation: new Date(), agent: 'Agent 11', description: 'MacBook Pro', codeBarre: '1234567891', image: ''
        }),
        new Produits({
          id: 12, famille: 'Alimentation', designation: 'Café', fournisseurId: 12, unite: 'Paquets', prixAchatUnitaire: 4, prixTotalAchat: 240, prixVenteUnitaire: 6,
          prixTotalVente: 360, dateCreation: new Date(), agent: 'Agent 12', description: 'Café Nespresso', codeBarre: '2345678902', image: ''
        }),
        new Produits({
          id: 13, famille: 'Vêtements', designation: 'Chaussures', fournisseurId: 13,  unite: 'Paires', prixAchatUnitaire: 50, prixTotalAchat: 600, prixVenteUnitaire: 70,
          prixTotalVente: 840, dateCreation: new Date(), agent: 'Agent 13', description: 'Nike Air Max', codeBarre: '3456789013', image: ''
        }),
        new Produits({
          id: 14, famille: 'Jouets', designation: 'Puzzle', fournisseurId: 14,  unite: 'Boîtes', prixAchatUnitaire: 15, prixTotalAchat: 270, prixVenteUnitaire: 25,
          prixTotalVente: 450, dateCreation: new Date(), agent: 'Agent 14', description: 'Puzzle Ravensburger', codeBarre: '4567890124', image: ''
        }),
        new Produits({
          id: 15, famille: 'Électronique', designation: 'Tablette', fournisseurId: 15, unite: 'Unités', prixAchatUnitaire: 300, prixTotalAchat: 12000, prixVenteUnitaire: 400,
          prixTotalVente: 16000, dateCreation: new Date(), agent: 'Agent 15', description: 'Samsung Galaxy Tab', codeBarre: '5678901235', image: ''
        }),
        new Produits({
          id: 16, famille: 'Alimentation', designation: 'Jus de fruits', fournisseurId: 16,  unite: 'Bouteilles', prixAchatUnitaire: 3, prixTotalAchat: 150, prixVenteUnitaire: 4,
          prixTotalVente: 200, dateCreation: new Date(), agent: 'Agent 16', description: 'Jus d\'orange Tropicana', codeBarre: '6789012346', image: ''
        }),
        ]
      } */
    onRowSelect(Produits: Produits): void {
      this.selectedProduits = Produits;
      this.isActionsEnabled = true;  // Activer les actions quand une ligne est sélectionnée
      this.isRowSelected = true;  // Lorsque la ligne est sélectionnée, la colonne droite s'affiche
    }

    // Fonction pour fermer la partie des actions (colonne droite)
    closeActions(): void {
      this.selectedProduits = null;
      this.isRowSelected = false;  // Fermer la colonne droite en réinitialisant la sélection
    }


    // Fonction pour appliquer la recherche
  // Fonction de recherche appelée en temps réel à chaque saisie
  onSearch() {
    const searchValue = this.searchTerm.toLowerCase();

    // Si une valeur de recherche est présente, on applique le filtre
    if (searchValue) {
      this.filteredProducts = this.prods.filter((produit) => {
        // Vérification si le champ `name` ou `city` contient la valeur recherchée
        return produit.designation?.toLowerCase().includes(searchValue) ||
               //produit.famille?.toLowerCase().includes(searchValue) ||
               produit.fournisseurId?.toString().toLowerCase().includes(searchValue)
              //  produit.magasinId?.toString().toLowerCase().includes(searchValue);
      });
    } else {
      // Si aucune recherche, on réinitialise la liste filtrée avec tous les produits
      this.filteredProducts = [...this.prods];
    }
  }

  afficherFormCategorie() {
    this.ajoutCategorie = !this.ajoutCategorie;  // Inverse l'état de la variable
  }

  saveFormCategorie() {
    this.ajoutCategorie = !this.ajoutCategorie;  // Inverse l'état de la variable
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
      const paginated = this.filteredProducts.slice(start, start + this.itemsPerPage);
      /*console.log('Paginated Products:', paginated); // Log pour vérifier la pagination
      console.log('Search Value:', this.searchForm.get('searchText')?.value.toLowerCase());
      console.log('Search By:', this.searchForm.get('searchBy')?.value); */
      return this.filteredProducts.slice(start, start + this.itemsPerPage);

    }

    // Gérer le changement de page
    onPageChange(page: number): void {
      this.currentPage = page;
    }

    // Actions sur le Produits sélectionné (par exemple: ajouter, modifier, etc.)
    onAction(action: string): void {
      // Si l'action est "ajouter", on réinitialise actionType à "ajouter"
      if (action === 'ajouter') {
        this.actionType = 'ajouter';
        this.selectedProduits = null;  // S'assurer qu'aucun produit n'est sélectionné
      } else {
        this.actionType = action;  // On garde l'action sélectionnée
      }
      if (this.selectedProduits) {
        console.log(`${action} Produits:`, this.selectedProduits);
        if (this.actionType === "modifier") {
          // On charge les informations du produit sélectionné dans le formulaire
          this.produitForm.patchValue({
            id: this.selectedProduits.id,  // Remplir l'ID du produit
            categorieId: this.selectedProduits.categorieId,  // Remplir la famille
            designation: this.selectedProduits.designation,  // Remplir la désignation
            fournisseurId: this.selectedProduits.fournisseurId,  // Remplir le fournisseur
            // magasin: this.selectedProduits.magasinId,  // Remplir le magasin
            // quantite: this.selectedProduits.quantite,  // Remplir la quantité
            //type_entree: '',  // Réinitialiser si nécessaire (selon votre logique)
            //type_sortie: '',  // Réinitialiser si nécessaire (selon votre logique)
            prixAchatUnitaire: this.selectedProduits.prixAchatUnitaire,  // Remplir prix d'achat unitaire
            prixVenteUnitaire: this.selectedProduits.prixVenteUnitaire,  // Remplir prix de vente unitaire
            description: this.selectedProduits.description,  // Remplir la description
            perissable:String(this.selectedProduits.perissable)
          });
          
          this.logoPreview = this.selectedProduits.image || './assets/images/default-structure.png';
          // Ouvrir la modal après avoir pré-rempli les champs avec les données du produit
          this.openModal(this.actionType,this.selectedProduits);
        }
        // Si l'action est "entree" ou "sortie", réinitialiser certains champs pour ces actions
        else if (this.actionType === "entree" || this.actionType === "sortie") {
          // Réinitialiser uniquement les champs spécifiques pour l'entrée ou la sortie
          this.produitForm.patchValue({
            fournisseur: '',        // Réinitialiser le champ fournisseur
            magasin: '',           // Réinitialiser le champ magasin
            quantite: 0,           // Réinitialiser la quantité
            type_entree: action === 'entree' ? '' : null,  // Réinitialiser type_entree si action est 'entree'
            type_sortie: action === 'sortie' ? '' : null,  // Réinitialiser type_sortie si action est 'sortie'
            prixAchatUnitaire: 0,  // Réinitialiser le prix d'achat unitaire
            prixVenteUnitaire: 0,  // Réinitialiser le prix de vente unitaire
            description: ''        // Réinitialiser la description
          });

          // Ouvrir la modal pour l'action entrée ou sortie
          this.openModal(this.actionType,this.selectedProduits);
        }
        else {
          //console.log(`${action} Produit:`, this.selectedProduits);
          /* if(this.actionType === "code-barre"){
              this.generateBarcode();
          } */
          this.openModal(this.actionType,this.selectedProduits);
        }

      }
      else {
        this.selectedProduits = null;
        this.actionType = 'ajouter';  // On s'assure que l'actionType est bien 'ajouter' pour "Nouveau produit"
        this.openModal(this.actionType);  // Ouvrir la modal pour un nouveau produit sans produit sélectionné
      }
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
      default:
        return '';
    }
  }

    openModal(act: string, produit?: any): void {
      //this.actionType ="ajouter"
      /* if (produit) {
        this.produitForm.patchValue(produit);
      } else {
        this.produitForm.reset();
      } */
     // Mettre à jour le texte du bouton avant d'ouvrir la modal
        console.log('Texte du bouton:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
        if (produit) {
          if (this.actionType === 'ajouter') {
            this.produitForm.reset();
            console.log('Texte du bouton bis:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
          }
          else {
            this.produitForm.patchValue({
              // On charge les valeurs de certains champs comme la famille, designation, etc.
              categorieId: produit.categorieId,
              designation: produit.designation,
              unite: produit.unite
              // On peut laisser d'autres champs comme fournisseur, magasin, etc. réinitialisés
            });
          }
        }
        else {
          this.actionType = 'ajouter'
          console.log('Texte du bouton bis:', this.getButtonLabel()); // Vérifiez ici si la valeur est correcte
          this.produitForm.reset();
        }

        const modalIdentifiant = this.getModalId(act);
      // Manipulation du DOM pour afficher la modal
      const modalElement = document.getElementById(modalIdentifiant);
      if (modalElement) {
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
      code_structure:this.code_structure, //this.authService.getUserStructure()
      statut:formValue.statut
    };

    console.log(this.categorieForm.get('code_structure')?.value)
    console.log(categorieData)

    this.produitsServices.createCategorie(categorieData).subscribe({
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
      }
    });
  }
loadCategories(): void {
    //onst code_structure = this.authService.getUserStructure();
    this.isLoading = true; 
    this.produitsServices.getAllCategoriesProduits(this.code_structure).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.categories = data;
        // Mettre à jour les options de famille avec les catégories réelles
        //this.familles = data.map(c => c.nom_categorie);
      },
      error: (err) => {
        this.isLoading = false;
        //this.toastr.error('Erreur lors du chargement des catégories');
        console.error(err);
      }
    });
  }

  loadFournisseurs(): void {
    //onst code_structure = this.authService.getUserStructure();
    this.isLoading = true; 
    this.fournisseurService.getFournisseursByStructure(this.code_structure).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.fournisseur = data;
        // Mettre à jour les options de famille avec les catégories réelles
        //this.familles = data.map(c => c.nom_categorie);
      },
      error: (err) => {
        this.isLoading = false;
        //this.toastr.error('Erreur lors du chargement des catégories');
        console.error(err);
      }
    });
  }

  /* loadProduits(): void {
    //onst code_structure = this.authService.getUserStructure();
    this.isLoading = true; 
    this.produitsServices.getAllProduits(this.code_structure).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.prods = data;
        this.filteredProducts = [...this.prods];
        // Mettre à jour les options de famille avec les catégories réelles
        //this.familles = data.map(c => c.nom_categorie);
      },
      error: (err) => {
        this.isLoading = false;
        //this.toastr.error('Erreur lors du chargement des catégories');
        console.error(err);
      }
    });
  } */

  loadData(): void {
    this.isLoading = true;
    forkJoin([
      this.userService.getByStructure(this.code_structure),
      this.produitsServices.getAllProduits(this.code_structure),
      //this.isGeneralAdmin ? this.structureService.getAll() : of([])
      this.stockService.getStocksByStructure(this.code_structure)
    ]).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: ([users, produits, stocks]) => {
        this.users = users;
        this.stock = stocks;
        this.prods = produits;
        this.filteredProducts = [...this.prods];
      },
      error: (err) => console.error('Erreur chargement données', err)
    });
  }
  

    // Fermer la modal en manipulant le DOM
    closeModal(act: string): void {
      const modalIdentifiant = this.getModalId(act);
      console.log('Identifiant généré pour la modal:', modalIdentifiant);

      const modalElement = document.getElementById(modalIdentifiant);
      console.log('Recherche de la modal dans le DOM:', modalElement);

      if (modalElement) {
        console.log('Modal trouvée, fermeture en cours');
        const ariaHiddenValue = modalElement.getAttribute('aria-hidden');
        if (ariaHiddenValue) {
          console.log('L\'attribut aria-hidden est utilisé avec la valeur:', ariaHiddenValue);
          // Enlever l'attribut aria-hidden
          modalElement.removeAttribute('aria-hidden');

          // Ajouter l'attribut inert si nécessaire
          modalElement.setAttribute('inert', '');
        } else {
          console.log('L\'attribut aria-hidden n\'est pas utilisé sur cet élément');
        }

        // Cacher la modal via la classe et le style
        modalElement.classList.remove('show');
        //modalElement.style.display = 'none';

        // Fermer la modal avec Bootstrap
       /*  const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.hide(); */

        // Rediriger le focus vers un élément (par exemple un bouton)
        /* const focusElement = document.getElementById('confirmArchiveModal')?.querySelector('button') as HTMLElement;
        if (focusElement) {
          focusElement.focus();
        } */

      } else {
        console.error('Modal non trouvée pour l\'action:', act);
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
        return 'Enregistrer l\'entrée';
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
        return 'Ajout d\'un nouveau produit';
      case 'modifier':
        return 'Modification d\'un produit';
      case 'entree':
        return 'Enregistrement d\'une nouvelle entrée';
      case 'sortie':
        return 'Enregistrement d\'une nouvelle sortie';
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
        const formData = new FormData();
        formData.append('image', this.selectedImage);

        // Remplacer l'URL par celle de ton serveur backend pour gérer l'image
        /* this.httpClient.post('http://ton-serveur.com/upload', formData).subscribe(
          response => {
            console.log('Image sauvegardée avec succès', response);
            // Mise à jour de l'image dans l'interface
            this.selectedProduits.imageUrl = response.imageUrl; // Exemple de mise à jour
          },
          error => {
            console.error('Erreur lors de la sauvegarde de l\'image', error);
          }
        ); */

        // Fermer la modal après avoir associé l'image
        const modal = document.getElementById('imageModal') as HTMLElement;
        const modalInstance =  new (window as any).bootstrap.Modal.getInstance(modal);
        modalInstance.hide();
      }
    }
    onImageSelected($event: Event) {
      const input = $event.target as HTMLInputElement;
      if (input?.files?.length) {
        this.selectedImage = input.files[0];
        console.log('Image sélectionnée', this.selectedImage);
      }
    }
    generateBarcode() {
      if (this.selectedProduits) {
        // Utiliser l'ID du produit (ou tout autre attribut unique) pour générer le code-barres
        //const barcodeValue = this.selectedProduits.famille + this.selectedProduits.id + this.selectedProduits.prixAchatUnitaire; // ou produit.id, etc.
        // Générer une chaîne aléatoire pour le code-barres
        const barcodeValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // Génère une chaîne aléatoire
        // Sélectionner l'élément HTML où le code-barres sera affiché
        const barcodeElement = document.getElementById('barcode') as HTMLCanvasElement;  // Assurez-vous que l'élément est bien un canvas
        // Vérifier si l'élément existe
        if (barcodeElement) {
          // Générer le code-barres avec JsBarcode
          JsBarcode(barcodeElement, barcodeValue, {
            format: "CODE128",  // Format de code-barres, tu peux changer en fonction de tes besoins
            width: 2,           // Largeur du code-barres
            height: 100,        // Hauteur du code-barres
            displayValue: true, // Afficher la valeur sous le code-barres
            fontSize: 18        // Taille de la police du texte affiché sous le code-barres
          });
        }

        // Ouvrir le modal pour afficher le code-barres généré
       /*  const modal = document.getElementById('codeBarreModal') as HTMLElement;
        const modalInstance = new (window as any).bootstrap.Modal.getInstance(modal);
        modalInstance.show(); */
      }
    }

  //...............................................................................................

    // Méthode pour ouvrir le modal
  openCategoriesModal() {
      // Charger les catégories avant d'ouvrir le modal
      this.loadCategories();
      
      // Ouvrir le modal avec Bootstrap
      const modal = new (window as any).bootstrap.Modal(document.getElementById('categoriesModal'));
      modal.show();
  }

  // Méthodes pour les actions
  editCategorie(categorie: any) {
      // Pré-remplir le formulaire avec les données de la catégorie
      this.categorieForm.patchValue({
          nom: categorie.nom,
          description: categorie.description,
          statut:categorie.statut,
          code_structure:categorie.code_structure
      });
      // Fermer le modal
      //const modal = new (window as any).bootstrap.Modal.getInstance(document.getElementById('categoriesModal'));
      //modal.hide();
  }

  toggleCategorieStatus(categorie: any) {
      // Implémentez la logique pour activer/désactiver
      this.isLoading = true;
      const newStatus = !categorie.statut;
      this.produitsServices.updateStatutCategorie(categorie.id,newStatus).pipe(
            finalize(() => this.isLoading = false)
          )
      .subscribe({
        next:() =>{
              this.toastr.success('Statut catégorie mis à jour avec succès');
              this.loadCategories();
        },
        error:(err) => {
           this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour du statut de la catégorie';
          this.toastr.error(this.errorMessage);
          //console.error(err);
        }
      });
  }

  deleteCategorie(id: number) {
    this.isLoading = true;
      // Confirmation avant suppression
      if(confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
        this.produitsServices.deleteCategorie(id).pipe(
      finalize(() => this.isLoading = false)
    )
        .subscribe({

           next:() =>{
              this.toastr.success('Catégore supprimée avec succès');
              this.loadCategories();
        },
        error:(err) => {
           this.errorMessage = err.error?.message || 'Erreur lors de la suppression de la catégorie';
            this.toastr.error(this.errorMessage);
          //console.error(err);
        }
        });
      }
  }

  editCategorieBis(categorie: any) {
  this.editingCategorieId = categorie.id;
  this.editedCategorie = { ...categorie }; // On fait une copie pour ne pas modifier directement l'objet original
}

cancelEdit() {
  this.editingCategorieId = null;
  this.editedCategorie = {};
}

saveCategorieEdit() {
  // Appel à ton service pour faire la mise à jour :
  this.produitsServices.updateCategorie(this.editedCategorie.id, this.editedCategorie).subscribe({
    next: (updated) => {
      this.toastr.success('Catégore mis à jour avec succès');
      this.loadCategories();
      this.cancelEdit();
    },
    error: (err) => {
      this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour de la catégorie';
      this.toastr.error(this.errorMessage);
      console.error("Erreur de mise à jour :", err);
      this.cancelEdit();
    }
  });
}

/* onSubmitWithStock() {
  if (this.produitForm.invalid || this.stockForm.invalid) {
    return;
  }

  const produitData = this.produitForm.value;
  const stockData = this.stockForm.value;

   const formData = new FormData();

  // On parcourt le form pour ajouter tous les champs
  Object.entries(this.produitForm.value).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  // Ajouter les données supplémentaires non présentes dans le formulaire
  formData.append('code_structure', this.code_structure);
  formData.append('agentId', String(this.agentId));

  // Ajout du fichier image si présent
  if (this.selectedImageFile) {
    formData.append('image', this.selectedImageFile);
  }

  //  const completepPoduitData = {
  //       ...produitData,
  //       code_structure: this.code_structure,
  //       agentId:this.agentId
  //     }; 

  // Créer d'abord le produit
  this.produitsServices.createProduit(formData).subscribe({
    next: (newProduit) => {
      // Puis créer le stock avec l'ID du nouveau produit
      console.log('Produit ajouté avec succés')
      const completeStockData = {
        ...stockData,
        code_structure: this.code_structure,
        produitId: newProduit.id,
        dernierPrixAchat: produitData.prixAchatUnitaire,
        prixVenteUnitaire: produitData.prixVenteUnitaire
      };

      this.stockService.createStock(completeStockData).subscribe({
        next: () => {
          console.log('Stock ajouté avec succés')
          this.toastr.success('Produit ajouté créé avec succès');
          this.resetForms();
          // this.closeModal();
          // this.loadProduits();
        },
        error: (err) => {
          //this.errorMessage = "Erreur lors de la création du stock";
          this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistreme du produit';
          this.toastr.error(this.errorMessage);
        }
      });
    },
    error: (err) => {
      console.log(err);
      this.errorMessage = "Erreur lors de la création du produit";
       console.log(this.errorMessage);
    }
  });
}
 */

onSubmitWithStock() {
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
  formData.append('code_structure', this.code_structure);
  formData.append('agentId', String(this.agentId));
  formData.append('codeBarre', this.codeBarre);

  // Ajouter l'image sélectionnée (si présente)
  if (this.selectedImageFile) {
    formData.append('image', this.selectedImageFile);
  }

   if (this.actionType === 'ajouter') {
      const stockData = this.stockForm.value;
      // Appel au service pour créer le produit
      this.produitsServices.createProduit(formData).subscribe({
        next: (newProduit) => {
          console.log('Produit ajouté avec succès');

          // Construire les données du stock
          const completeStockData = {
            ...stockData,
            code_structure: this.code_structure,
            produitId: newProduit.id,
            dernierPrixAchat: parseFloat(produitData.prixAchatUnitaire),
            prixVenteUnitaire: parseFloat(produitData.prixVenteUnitaire)
          };

          // Créer le stock
          this.stockService.createStock(completeStockData).subscribe({
            next: () => {
              this.toastr.success('Produit et stock ajoutés avec succès');
              this.loadData();
              this.resetForms();
              this.closeModal(this.actionType)
            },
            error: (err) => {
              const message = err.error?.message || "Erreur lors de l'enregistrement du stock.";
              this.toastr.error(message);
            }
          });
        },
        error: (err) => {
          const message = err.error?.message || "Erreur lors de la création du produit.";
          console.error('Erreur création produit :', err);
          this.toastr.error(message);
        }
      });
   }
  else if (this.actionType === 'modifier') {

    this.produitsServices.updateProduit(this.selectedProduits?.id!, formData).subscribe({
      next: () => {
        this.toastr.success('Produit mis à jour avec succès');
        this.loadData();
         this.resetForms();
         this.closeModal(this.actionType)

      },
      error: (err) => {
        const message = err.error?.message || "Erreur lors de la mise à jour du produit.";
        this.toastr.error(message);
      }
    });
  }
  
}

handleProduitAction() {
  if (this.actionType === 'ajouter') {
    // Affiche le formulaire de stock
    this.showStockSection = true;
    this.initStockForm();
  } 
  else if (this.actionType === 'modifier') {
    // Envoie directement la mise à jour du produit
    this.onSubmitWithStock(); // Elle gère déjà le cas modifier
  }
}


 onFileChange(event: any): void {
  const file = event.target.files[0];
  if (file) {
    this.selectedImageFile = file;

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
  this.selectedImageFile = null;
  this.stockForm.reset();

}

resetStockSection() {
  this.showStockSection = false;
}

getNomCategorieById(id: number): string | null {
  const categorie = this.categories.find(p => p.id === id);
  return categorie ? categorie.nom : null;  // On retourne `null` si la catégorie n'est pas trouvée
}

getNomFournisseurById(id: number): string | null {
  const fournisseur = this.fournisseur.find(p => p.id === id);
  return fournisseur ? fournisseur.nomComplet : null;  // On retourne `null` si la catégorie n'est pas trouvée
}
getNomUserById(id: number): string | null {
  const user = this.users.find(p => p.id === id);
  return user ? user.nom : null;  // On retourne `null` si la catégorie n'est pas trouvée
}
getQteById(id: number): number | 0 {
  const stock = this.stock.find(p => p.produitId === id);
  return stock ? stock.quantiteTotale : 0;  // On retourne `null` si la catégorie n'est pas trouvée
}
}
