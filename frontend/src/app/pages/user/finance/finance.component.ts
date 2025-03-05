import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Categorie, Depense, Recette } from '../../../modeles/finance.model';
import { Paiement } from '../../../modeles/paiement.model';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.css'
})
export class FinanceComponent implements OnInit{
 // Onglet actif
 activeTab: string = 'depenses';
 categoryForm: FormGroup;
selectedCategory: Categorie | null = null;
formVisible = false; // Contrôle l'affichage du formulaire

paiementFormVisible = false;
paiements: Paiement[] = [];

newCategorie: boolean = false;
showForm: boolean = false;

 // Données
 depenses: Depense[] = [];
 recettes: Recette[] = [];

 categories: Categorie[] = [
 ];

 filteredDepenses: Depense[] = [];
 filteredRecettes: Recette[] = [];
 filteredCategories: Categorie[] = [];
 filteredPaiements: Paiement[] = [];

 // Nouveaux objets pour les formulaires
 newDepense = new Depense();
 newRecette = new Recette();
 newPaiement = new Paiement();
 // Formulaires réactifs
 depenseForm!: FormGroup;
 recetteForm!: FormGroup;
 paiementForm!: FormGroup;

  // Variables pour la gestion des tables
  searchTerm = ''; // Recherche
  itemsPerPage = 5; // Nombre d'éléments par page
  currentPage = 1; // Page actuelle

 clients: any[] = [];  // Liste des clients
 fournisseurs: any[] = [];  // Liste des fournisseurs
 bons: any[] = [];  // Liste des bons
currentPageDepense: number = 1;
currentPageRecette: number = 1;
currentPagePaiement: number = 1;
currentPageCategorie: number = 1;



 constructor(private fb: FormBuilder,private cdr: ChangeDetectorRef) {

  this.categoryForm = this.fb.group({
    name: ['', Validators.required],
    description:[''],
    type: ['DEPENSE', Validators.required],
    isActive: [true]
  });
 }

 ngOnInit(): void {
   this.initForms();
   // Initialisation des données, par exemple chargement des catégories et des recettes
   this.categories = this.loadCategories();
   this.recettes = this.loadRecettes();
   this.depenses = this.loadDepenses();
   this.paiements = this.loadPaiement();
   this.loadClients();
   this.loadFournisseurs();
   this.loadBons();
   this.filteredCategories = [...this.categories];
   this.filteredDepenses = [...this.depenses];
   this.filteredPaiements = [...this.paiements];
   this.filteredRecettes = [...this.recettes];
   this.updatefilteredTable('depense');
   this.updatefilteredTable('recette');
   this.updatefilteredTable('paiement');
   this.updatefilteredTable('categorie');
 }

  // Méthode pour mettre à jour les recettes, les dépenses, les paiement et les catégories
  updatefilteredTable(objet:string): void {
    if(objet ==='depense' ){
      this.filteredDepenses = this.depenses.slice((this.currentPage - 1) * 10, this.currentPage * 10);
    }
    else if(objet ==='recette' ){
      this.filteredRecettes = this.recettes.slice((this.currentPage - 1) * 10, this.currentPage * 10);
    }
    else if(objet ==='paiement'){
      this.filteredPaiements = this.paiements.slice((this.currentPage - 1) * 10, this.currentPage * 10);
    }
    else if (objet ==='categorie' ){
      this.filteredCategories = this.categories.slice((this.currentPage - 1) * 10, this.currentPage * 10);
    }
  }


  // Gestion de la recherche
  onSearchChange(objet: string): void {
    if (objet === 'depense') {
      this.filteredDepenses = this.depenses.filter(depense =>
        this.getCategoryName(depense.categoryId).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        depense.type.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        depense.amount.toString().includes(this.searchTerm) || // Filtrer par montant
        new Date(depense.date).toLocaleDateString().includes(this.searchTerm) // Filtrer par date
      );
      this.currentPageDepense = 1; // Réinitialiser à la première page après recherche
    }
    else if (objet === 'recette') {
      this.filteredRecettes = this.recettes.filter(recette =>
        this.getCategoryName(recette.categoryId).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        recette.amount.toString().includes(this.searchTerm) ||
        new Date(recette.date).toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPageRecette = 1;
    }
    else if (objet === 'paiement') {
      this.filteredPaiements = this.paiements.filter(paie =>
        paie.typePaiement.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        paie.montant.toString().includes(this.searchTerm) ||
        new Date(paie.date).toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPagePaiement = 1;
    }
    else if (objet === 'categorie') {
      this.filteredCategories = this.categories.filter(categorie =>
        categorie.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        categorie.type.toString().includes(this.searchTerm.toLowerCase())
      );
      this.currentPageCategorie = 1;
    }
  }


 showFormCategorie(){
  this.newCategorie = true;
 }
 closeFormCategorie (){
  this.newCategorie = false;
 }


 loadCategories(): Categorie[] {
  return [
    new Categorie({ id: 1, name: "Loyer", description: "Paiement du loyer", type: "DEPENSE", isActive: true }),
    new Categorie({ id: 2, name: "Salaire", description: "Paiement des employés", type: "DEPENSE", isActive: true }),
    new Categorie({ id: 3, name: "Fournitures", description: "Achat de fournitures", type: "DEPENSE", isActive: true }),
    new Categorie({ id: 4, name: "Électricité", description: "Facture d’électricité", type: "DEPENSE", isActive: true }),
    new Categorie({ id: 5, name: "Vente de produits", description: "Revenus des ventes", type: "RECETTE", isActive: true }),
    new Categorie({ id: 6, name: "Investissements", description: "Revenus des investissements", type: "RECETTE", isActive: true }),
    new Categorie({ id: 7, name: "Services", description: "Revenus des prestations de services", type: "RECETTE", isActive: true }),
    new Categorie({ id: 8, name: "Publicité", description: "Dépenses en marketing", type: "DEPENSE", isActive: true }),
    new Categorie({ id: 9, name: "Transport", description: "Frais de déplacement", type: "DEPENSE", isActive: true }),
    new Categorie({ id: 10, name: "Alimentation", description: "Frais de restauration", type: "DEPENSE", isActive: true }),
  ];
}

loadDepenses(): Depense[] {
  return [
    new Depense({ id: 1, date: new Date(), categoryId: 1, amount: 150000, type: "STANDARD", description: "Paiement du loyer de bureau", paymentMode: "Virement" }),
    new Depense({ id: 2, date: new Date(), categoryId: 2, amount: 200000, type: "STANDARD", description: "Salaire du personnel", paymentMode: "Virement" }),
    new Depense({ id: 3, date: new Date(), categoryId: 3, amount: 50000, type: "STOCK", description: "Achat de fournitures de bureau", paymentMode: "Espèce" }),
    new Depense({ id: 4, date: new Date(), categoryId: 4, amount: 30000, type: "STANDARD", description: "Facture d’électricité", paymentMode: "Mobile Money" }),
    new Depense({ id: 5, date: new Date(), categoryId: 8, amount: 80000, type: "STANDARD", description: "Publicité Facebook", paymentMode: "Carte" }),
    new Depense({ id: 6, date: new Date(), categoryId: 9, amount: 40000, type: "STANDARD", description: "Transport des marchandises", paymentMode: "Espèce" }),
    new Depense({ id: 7, date: new Date(), categoryId: 10, amount: 25000, type: "STANDARD", description: "Repas d’équipe", paymentMode: "Espèce" }),
    new Depense({ id: 8, date: new Date(), categoryId: 3, amount: 70000, type: "STOCK", description: "Achat de fournitures de production", paymentMode: "Carte" }),
    new Depense({ id: 9, date: new Date(), categoryId: 4, amount: 35000, type: "STANDARD", description: "Facture d’eau", paymentMode: "Virement" }),
    new Depense({ id: 10, date: new Date(), categoryId: 1, amount: 160000, type: "STANDARD", description: "Renouvellement de bail", paymentMode: "Mobile Money" }),
  ];
}

loadRecettes(): Recette[] {
  return [
    new Recette({ id: 1, date: new Date(), categoryId: 5, amount: 300000, description: "Vente de produits alimentaires", paymentMode: "Espèce" }),
    new Recette({ id: 2, date: new Date(), categoryId: 6, amount: 150000, description: "Dividendes sur investissement", paymentMode: "Virement" }),
    new Recette({ id: 3, date: new Date(), categoryId: 7, amount: 80000, description: "Consultation informatique", paymentMode: "Mobile Money" }),
    new Recette({ id: 4, date: new Date(), categoryId: 5, amount: 250000, description: "Vente de marchandises", paymentMode: "Carte" }),
    new Recette({ id: 5, date: new Date(), categoryId: 6, amount: 50000, description: "Retour sur investissement", paymentMode: "Virement" }),
    new Recette({ id: 6, date: new Date(), categoryId: 7, amount: 120000, description: "Formation en ligne", paymentMode: "Mobile Money" }),
    new Recette({ id: 7, date: new Date(), categoryId: 5, amount: 180000, description: "Vente de produits électroniques", paymentMode: "Espèce" }),
    new Recette({ id: 8, date: new Date(), categoryId: 6, amount: 220000, description: "Location d’équipements", paymentMode: "Virement" }),
    new Recette({ id: 9, date: new Date(), categoryId: 7, amount: 95000, description: "Maintenance de site web", paymentMode: "Carte" }),
    new Recette({ id: 10, date: new Date(), categoryId: 5, amount: 130000, description: "Vente de meubles", paymentMode: "Mobile Money" }),
  ];
}

loadPaiement(): Paiement[] {
  return [
    new Paiement({ id: 1, numero: "PAY-001", description: "Paiement fournisseur A", montant: 150000, compte: "Banque", typePaiement: "fournisseur", methodePaiement: "Virement" }),
    new Paiement({ id: 2, numero: "PAY-002", description: "Acompte client B", montant: 50000, compte: "Mobile Money", typePaiement: "client", methodePaiement: "Mobile Money" }),
    new Paiement({ id: 3, numero: "PAY-003", description: "Paiement fournisseur C", montant: 200000, compte: "Caisse", typePaiement: "fournisseur", methodePaiement: "Espèce" }),
    new Paiement({ id: 4, numero: "PAY-004", description: "Paiement client D", montant: 75000, compte: "Banque", typePaiement: "client", methodePaiement: "Virement" }),
    new Paiement({ id: 5, numero: "PAY-005", description: "Paiement fournisseur E", montant: 125000, compte: "Mobile Money", typePaiement: "fournisseur", methodePaiement: "Mobile Money" }),
    new Paiement({ id: 6, numero: "PAY-006", description: "Remboursement client F", montant: 60000, compte: "Banque", typePaiement: "client", methodePaiement: "Carte" }),
    new Paiement({ id: 7, numero: "PAY-007", description: "Paiement fournisseur G", montant: 95000, compte: "Caisse", typePaiement: "fournisseur", methodePaiement: "Espèce" }),
    new Paiement({ id: 8, numero: "PAY-008", description: "Paiement client H", montant: 110000, compte: "Banque", typePaiement: "client", methodePaiement: "Virement" }),
    new Paiement({ id: 9, numero: "PAY-009", description: "Paiement fournisseur I", montant: 300000, compte: "Mobile Money", typePaiement: "fournisseur", methodePaiement: "Mobile Money" }),
    new Paiement({ id: 10, numero: "PAY-010", description: "Paiement client J", montant: 85000, compte: "Banque", typePaiement: "client", methodePaiement: "Carte" }),
  ];
}

toggleRecetteForm() {
  this.formVisible = !this.formVisible; // Toggle l'affichage du formulaire
}

cancelForm() {
  this.recetteForm.reset(); // Réinitialise le formulaire
  this.formVisible = false; // Cache le formulaire
}

ajouterRecette() {
  if (this.recetteForm.valid) {
    const recetteData = this.recetteForm.value;
    // Logique pour ajouter la recette (enregistrement dans la base de données ou API)
    this.recettes.push({ ...recetteData, date: new Date() });
    this.cancelForm(); // Cache le formulaire après ajout
  }
}

editRecette(recette: Recette) {
  // Logique pour éditer la recette
  console.log('Editing recette', recette);
}

deleteRecette(recette: Recette) {
  // Logique pour supprimer la recette
  const index = this.recettes.indexOf(recette);
  if (index !== -1) {
    this.recettes.splice(index, 1);
  }
}

 // Initialisation des formulaires
 private initForms() {
  this.depenseForm = this.fb.group({
    categoryId: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(1)]],
    paymentMode: ['', Validators.required],
    description: [''],
    type: ['STANDARD', Validators.required],
    receipt: ['']
  });

  this.recetteForm = this.fb.group({
    categoryId: [null, Validators.required],
    amount: [null, [Validators.required, Validators.min(0)]],
    paymentMode: ['', Validators.required],
    description: [''],
    receipt: ['']
  });

  this.paiementForm = this.fb.group({
    typePaiement: ['', Validators.required],  // Nouveau champ ajouté
    numero: ['', Validators.required],
    montant: [0, [Validators.required, Validators.min(1)]],
    methodePaiement: ['', Validators.required],
    clientId: [null],
    fournisseurId: [null],
    bonId: [null],
    notes: ['']
  });

 }

  // Gestion des ajouts
  ajouterDepense() {
    if (this.depenseForm.valid) {
      this.depenses.push(new Depense({ ...this.depenseForm.value, date: new Date() }));
      this.depenseForm.reset();
    }
  }

  // ajouterRecette() {
  //   if (this.recetteForm.valid) {
  //     this.recettes.push(new Recette({ ...this.recetteForm.value, date: new Date() }));
  //     this.recetteForm.reset();
  //   }
  // }

/*   ajouterPaiement() {
    if (this.paiementForm.valid) {
      this.paiements.push(new Paiement({ ...this.paiementForm.value, date: new Date() }));
      this.paiementForm.reset();
    }
  } */

  /* setActiveTab(tab: string) {
    this.activeTab = tab;
  } */

  editDepense(depense: Depense) {
    // Logic for editing the expense
    console.log('Editing depense', depense);
  }

  deleteDepense(depense: Depense) {
    // Logic for deleting the expense
    console.log('Deleting depense', depense);
  }

  viewDepenseDetails(depense: Depense) {
    // Logic for viewing the details of the expense
    console.log('Viewing depense details', depense);
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Non défini';
  }

  onSubmitCategoryForm() {
    if (this.selectedCategory) {
      // Modification de la catégorie
      const index = this.categories.findIndex(cat => cat.id === this.selectedCategory?.id);
      if (index !== -1) {
        this.categories[index] = { ...this.selectedCategory, ...this.categoryForm.value };
      }
    } else {
      // Création d'une nouvelle catégorie
      const newCategory = new Categorie(this.categoryForm.value);
      newCategory.id = this.categories.length + 1; // id simulé
      this.categories.push(newCategory);
    }
    this.resetForm();
  }

  resetForm() {
    this.selectedCategory = null;
    this.categoryForm.reset({ type: 'DEPENSE', isActive: true });
  }

  editCategory(category: Categorie) {
    this.selectedCategory = category;
    this.categoryForm.patchValue(category);
  }

  toggleActiveStatus(category: Categorie) {
    category.isActive = !category.isActive;
  }

  deleteCategory(category: Categorie) {
    this.categories = this.categories.filter(cat => cat.id !== category.id);
  }

  togglePaiementForm() {
    this.paiementFormVisible = !this.paiementFormVisible;
}

// Détecter le changement du type de paiement
onTypePaiementChange() {
  const typePaiement = this.paiementForm.value.typePaiement;

  if (typePaiement === 'client') {
      this.paiementForm.patchValue({ fournisseurId: null }); // Réinitialise fournisseur
  } else if (typePaiement === 'fournisseur') {
      this.paiementForm.patchValue({ clientId: null }); // Réinitialise client
  }
}

ajouterPaiement() {
  if (this.paiementForm.valid) {
      const formValues = this.paiementForm.value;

      const newPaiement = {
          ...formValues,
          date: new Date(),
          clientNom: this.getClientNom(formValues.clientId),
          fournisseurNom: this.getFournisseurNom(formValues.fournisseurId),
          bonNumero: this.getBonNumero(formValues.bonId)
      };

      this.paiements.push(newPaiement);
      this.paiementForm.reset();
      this.paiementFormVisible = false;
  }
}

editPaiement(paiement:Paiement) {
  this.paiementForm.patchValue(paiement);
  this.paiementFormVisible = true;
}

deletePaiement(paiement:Paiement) {
  this.paiements = this.paiements.filter(p => p !== paiement);
}

cancelPaiementForm() {
  this.paiementForm.reset();
  this.paiementFormVisible = false;
}

// Fonctions pour récupérer les noms des clients, fournisseurs et numéros de bons
getClientNom(clientId: any) {
  const client = this.clients.find(c => c.id === clientId);
  return client ? client.nom : 'N/A';
}

getFournisseurNom(fournisseurId: any) {
  const fournisseur = this.fournisseurs.find(f => f.id === fournisseurId);
  return fournisseur ? fournisseur.nom : 'N/A';
}

getBonNumero(bonId: any) {
  const bon = this.bons.find(b => b.id === bonId);
  return bon ? bon.numero : 'N/A';
}

// Simuler le chargement des données
loadClients() {
  this.clients = [{ id: 1, nom: "Aliou Diop" }, { id: 2, nom: "Mamadou Sow" }];
}

loadFournisseurs() {
  this.fournisseurs = [{ id: 1, nom: "Société ABC" }, { id: 2, nom: "Dakar Import" }];
}

loadBons() {
  this.bons = [{ id: 1, numero: "BON-2024-001" }, { id: 2, numero: "BON-2024-002" }];
}

loadPaiements() {
  // Charger les paiements depuis un service ou localStorage
}

// Méthodes de pagination
get getPaginatedDepenses() {
  return this.paginate(this.filteredDepenses, this.currentPageDepense, this.itemsPerPage);
}

get getPaginatedRecettes() {
  return this.paginate(this.filteredRecettes, this.currentPageRecette, this.itemsPerPage);
}

get getPaginatedPaiements() {
  return this.paginate(this.filteredPaiements, this.currentPagePaiement, this.itemsPerPage);
}

get getPaginatedCategories() {
  return this.paginate(this.filteredCategories, this.currentPageCategorie, this.itemsPerPage);
}


paginate(data: any[], currentPage: number, itemsPerPage: number) {
  const start = (currentPage - 1) * itemsPerPage;
  return data.slice(start, start + itemsPerPage);
}

onPageChange(page: number, instanceObj: string): void {
  if(instanceObj === 'depense'){
    this.currentPageDepense = page;
  }
  else if (instanceObj === 'recette') {
    this.currentPageRecette = page;
  }

  else if (instanceObj === 'paiement') {
    this.currentPagePaiement = page;
  }
  else if (instanceObj === 'categorie') {
    this.currentPageCategorie = page;
  }
  console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);

}
getTotalPages(list: any[]): number {
  return Math.ceil(list.length / this.itemsPerPage);
}


setItemsPerPage(event: any) {
  this.itemsPerPage = +event.target.value;
  this.currentPageCategorie = 1;
  this.currentPageDepense = 1;
  this.currentPagePaiement = 1;
  this.currentPageRecette = 1;

  this.cdr.detectChanges(); // Forcer la mise à jour de la vue
}

nextPage() {
  this.currentPage++;
}

prevPage() {
  if (this.currentPage > 1) this.currentPage--;
}

setActiveTab(tab: string) {
  this.activeTab = tab;
  this.currentPage = 1;
}

}
