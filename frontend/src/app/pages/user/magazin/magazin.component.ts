import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Magasin } from '../../../modeles/magasin.model';
import { Panier } from '../../../modeles/panier.model';
import { Produits } from '../../../modeles/produit.modele';
import { Transfert } from '../../../modeles/transfert.model';
import { Depense, Recette } from '../../../modeles/finance.model';
import { MouvementsStock, Stock } from '../../../modeles/entrees-sorties.model';

@Component({
  selector: 'app-magazin',
  standalone:true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './magazin.component.html',
  styleUrl: './magazin.component.css'
})
export class MagazinComponent implements OnInit{

currentDate: Date = new Date();
modeEdition = false;
magasinForm :FormGroup;
// Liste des magasins (à remplacer par un appel à un service API)
magasins: Magasin[] = [ ];

modeVente: any;
// Déclarez la variable produits globalement
produits: Produits[] = [];


magasinSelectionne: Magasin | null = null;
magazinSelectionne: any;

showFormIndex: number | null = null;
magasinDestinataire: string | null = null;
quantite!: number;
motif: string = '';

pageSize: number = 5;
currentPageMouvement:number =1;
currentPageCaisse: number = 1;
currentPageDepnse:number = 1;
currentPageTransferts:number = 1;
currentPageStock:number = 1;
searchTerm = ''; // Recherche

filteredStock:Produits[] =[];
filteredMouvement:MouvementsStock[] =[];
filteredDepnse:Depense[] =[];
filteredTransferts:Transfert[] =[];
filteredPanier:Panier[] =[];

selectedPanierId: number | null = null;


constructor(private fb: FormBuilder,private cdr:ChangeDetectorRef) {
   // Initialisation du formulaire réactif
   this.magasinForm = this.fb.group({
    nom: ['', Validators.required],
    adresse: ['', Validators.required],
    responsableId: [, Validators.required]
  });
}

ngOnInit(): void {
  this.magasins = this.loadMagasins();
  //this.magasinSelectionne =this.magasins[0];
  if (this.magasins.length > 0) {
    this.afficherDetailsMagasin(this.magasins[0]);
  }
  this.updatefilteredTable('stock');
  this.updatefilteredTable('caisse');
  this.updatefilteredTable('depense');
  this.updatefilteredTable('mouvement');
  this.updatefilteredTable('transfert');
}

toggleDetails(panierId: number) {
  this.selectedPanierId = this.selectedPanierId === panierId ? null : panierId;
}

getAllProduits(): Stock[] {
  return this.magasins.flatMap((magasin: Magasin) => magasin.stock ?? []);
}
  afficherDetailsMagasin(magasin: Magasin) {
    this.magasinSelectionne = magasin;
  }
  nouveauMagasin() {
    this.modeEdition = false;
    this.magasinForm.reset(); // Réinitialise complètement le formulaire
  }


// Méthode pour supprimer un magasin
supprimerMagasin(id: number) {
  this.magasins = this.magasins.filter(m => m.id !== id);
}

// Méthode pour réinitialiser le formulaire
resetForm() {
  //this.magasin = { id: 0, nom: '', localisation: '' };
}

/* // Méthode pour obtenir les produits d'un magasin donné
getProduitsParMagasin(magasinNom: Magasin) {

  if(!this.magasinSelectionne) return null;
  return this.magasinSelectionne.stock;
} */

  getProduitsParMagasin(magasin: Magasin | null | undefined): Produits[] {
    if (!magasin?.stock || magasin.stock.length === 0) return [];

    // Récupération des IDs des produits présents dans le stock
    const produitIds = magasin.stock.map(stock => stock.produitId);

    // Vérification que `this.produits` est défini avant de l'utiliser
    return this.produits?.filter(produit => produitIds.includes(produit.id!)) ?? [];
  }




// Méthode pour obtenir le nom du produit à partir de l'id
getNomProduitById(id: number,stock: Produits[]): string | null {
  const produit = stock.find(p => p.id === id);
  return produit ? produit.designation : null;  // On retourne `null` si le produit n'est pas trouvé
}

getDatePeremtionProduitById(id: number,stock: Stock[]): Date | null {
  const produit = stock.find(p => p.produitId === id);
  return produit ? produit.datePeremption: null;  // On retourne `null` si le produit n'est pas trouvé
}

getPrixVenteProduitById(id: number,prod: Produits[]): number {
  const produit = prod.find(p => p.id === id);
  return produit ? produit.prixVenteUnitaire : 0;  // On retourne `null` si le produit n'est pas trouvé
}

getFamilleProduitById(id: number,prod: Produits[]): string | null {
  const produit = prod.find(p => p.id === id);
  return produit ? produit.famille : null;  // On retourne `null` si le produit n'est pas trouvé
}

getNomMagazin(id: number): string | null {
  const magazin = this.magasins.find(p => p.id === id);
  return magazin ? magazin.nom : null;  // On retourne `null` si le produit n'est pas trouvé
}

getPaniersParMagasin(magasin: Magasin) {
  // Retourne la liste des paniers du magasin
  if (!magasin?.stock || magasin.stock.length === 0) return [];
  //if(!this.magasinSelectionne) return null;
  return magasin.ventes;
}

getTransfertsParMagasin(magasin: Magasin) {
  // Retourne la liste des transferts du magasin
  if (!magasin?.stock || magasin.stock.length === 0) return [];
  return magasin.transferts;
}

getMouvementParMagasin(magasin: Magasin) {
  // Retourne la liste des transferts du magasin
  if (!magasin?.stock || magasin.mouvements?.length === 0) return [];
  return magasin.mouvements;
}

// Obtenir les dépenses du magasin sélectionné
getDepensesParMagasin(magasin: Magasin) {
  if (!magasin?.stock || magasin.stock.length === 0) return [];
  return magasin.depenses;
}
getUniteProduitById(produitId: number, produits: Produits[]): string {
  const produit = produits.find(p => p.id === produitId);
  return produit ? produit.unite : "Produit introuvable";
}
// Supprimer une dépense
supprimerDepense(id?: number) {
  if (!this.magasinSelectionne) return;
  //this.magasinSelectionne.depenses = this.magasinSelectionne.depenses.filter(dep => dep.id !== id);
}


/* afficherDetailsMagasin(magasin: any) {
  this.magasinSelectionne = magasin;
} */

/* ajouterMagasin() {
  const newMagasin = { ...this.magasinForm, id: Date.now() };
  this.magasins.push(newMagasin);
  this.resetForm();
} */

preparerEditionMagasin(magasin: Magasin) {
  this.modeEdition = true;
  //this.magasinForm = { ...magasin };
  this.magasinForm.patchValue(magasin);
}

ajouterMagasin(): void {
  if (this.magasinForm.valid) {
    console.log('Magasin ajouté :', this.magasinForm.value);
    // Ajoutez ici la logique pour soumettre le formulaire
  }
}

modifierMagasin(): void {
  if (this.magasinForm.valid) {
    console.log('Magasin modifié :', this.magasinForm.value);
    // Ajoutez ici la logique pour modifier le magasin
  }
}


loadMagasins(): Magasin[] {
  const magasins: Magasin[] = [];

  // Génération des produits une seule fois
  if (this.produits.length === 0) {
    for (let j = 1; j <= 10; j++) {
      this.produits.push(new Produits({
        id: j,
        famille: `Famille ${j}`,
        designation: `Produit ${j}`,
        fournisseurId: j,
        unite: "Pièce",
        prixAchatUnitaire: Math.floor(Math.random() * 1000) + 500,
        prixTotalAchat: 0,
        prixVenteUnitaire: Math.floor(Math.random() * 1500) + 1000,
        prixTotalVente: 0,
        dateCreation: new Date(),
        agent: `Agent ${j}`,
        description: `Description du produit ${j}`,
        codeBarre: `CODE${j}`,
        image: ""
      }));
    }
  }

  // Création des magasins
  for (let i = 1; i <= 5; i++) {
    const stocks: Stock[] = [];

    // Création des stocks pour ce magasin
    for (let j = 1; j <= 10; j++) {
      stocks.push(new Stock({
        id: (i - 1) * 10 + j,
        produitId: j,
        magasinId: i,
        quantiteTotale: Math.floor(Math.random() * 100) + 10,
        quantiteReservee: Math.floor(Math.random() * 10),
        seuilAlerte: 5,
        seuilReapprovisionnement: 10,
        stockSecurite: 5,
        statutStock: "En stock",
        dateDerniereMiseAJour: new Date(),
        dernierPrixAchat: Math.floor(Math.random() * 1000) + 500,
        datePeremption: Math.random() < 0.5 ? new Date(Date.now() + Math.floor(Math.random() * 1000000000)) : undefined
      }));
    }

    // Création des mouvements de stock
    const mouvementsStock: MouvementsStock[] = [];
    for (let m = 1; m <= 10; m++) {
      const produit = this.produits[Math.floor(Math.random() * this.produits.length)];
      const typeMouvement = ["Entree", "Sortie", "Transfert"][Math.floor(Math.random() * 3)];

      mouvementsStock.push(new MouvementsStock({
        id: m,
        ref: `MV-${m}${i}`,
        produitId: produit.id!,
        magasinId: i,
        typeMouvement: typeMouvement as "Entree" | "Sortie" | "Transfert",
        quantite: Math.floor(Math.random() * 50) + 5,
        prixUnitaire: produit.prixAchatUnitaire,
        acteurId: Math.floor(Math.random() * 100), // Aléatoire : fournisseur ou client
        description: `Mouvement de type ${typeMouvement}`,
        motif: typeMouvement === "Sortie" ? "Vente" : typeMouvement === "Entree" ? "Achat" : "Transfert interne",
        dateMouvement: new Date(),
      }));
    }

    // Création des paniers avec stocks associés
    const paniers: Panier[] = [];
    for (let k = 1; k <= 10; k++) {
      const articles = this.produits
        .sort(() => 0.5 - Math.random())
        .slice(0, 4); // Sélectionner 4 produits au hasard

      // Récupération des stocks correspondant aux produits choisis
      const stockList = stocks.filter(stock =>
        articles.some(article => article.id === stock.produitId)
      );

      paniers.push(new Panier({
        id: k,
        clientId: Math.floor(Math.random() * 1000),
        bonId: Math.floor(Math.random() * 500),
        articles: articles,
        statut: "VALIDE",
        dateCreation: new Date(),
        magasinId: i, // Associer le magasin
        stockList: stockList // Associer les stocks filtrés
      }));
    }

    // Création des transferts de produits
    const transferts: Transfert[] = [];
    for (let t = 1; t <= 10; t++) {
      transferts.push(new Transfert({
        id: t,
        reference: `TRANSFERT-${t}${i}`,
        produitId: this.produits[Math.floor(Math.random() * this.produits.length)].id!,
        quantite: Math.floor(Math.random() * 20) + 5,
        magasinSource: Math.floor(Math.random() * 5) + 1,
        magasinDestination: Math.floor(Math.random() * 5) + 1,
        dateTransfert: new Date(),
        statut: Math.random() > 0.5 ? 'Validé' : 'En attente',
        agentResponsable: Math.floor(Math.random() * 100),
        dateValidation: Math.random() > 0.5 ? new Date() : undefined,
        agentValidation: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : undefined
      }));
    }

    // Ajout des dépenses
    const depenses: Depense[] = [];
    for (let d = 1; d <= 5; d++) {
      depenses.push(new Depense({
        id: d,
        date: new Date(),
        amount: Math.floor(Math.random() * 10000) + 1000,
        type: d % 2 === 0 ? "STANDARD" : "STOCK",
        description: d % 2 === 0 ? "Achat de fournitures" : "Paiement des salaires",
        paymentMode: d % 2 === 0 ? "Virement bancaire" : "Espèces",
        magasinId: i
      }));
    }

    // Ajout des recettes
    const recettes: Recette[] = [];
    for (let r = 1; r <= 5; r++) {
      recettes.push(new Recette({
        id: r,
        date: new Date(),
        amount: Math.floor(Math.random() * 15000) + 5000,
        categoryId: i,
        description: `Recette de vente magasin ${i}`,
        paymentMode: r % 2 === 0 ? "Espèces" : "Carte bancaire",
        magasinId: i
      }));
    }

    // Création du magasin avec toutes les données
    magasins.push(new Magasin({
      id: i,
      nom: `Magasin ${i}`,
      adresse: `Adresse ${i}, Ville ${i}`,
      ville: `Ville ${i}`,
      telephone: `77${Math.floor(Math.random() * 10000000)}`,
      email: `magasin${i}@exemple.com`,
      responsableId: Math.floor(Math.random() * 100),
      capaciteStock: Math.floor(Math.random() * 5000) + 1000,
      stock: stocks,
      chiffreAffaires: Math.floor(Math.random() * 1000000) + 500000,
      ventes: paniers,
      depenses: depenses,
      recettes: recettes,
      statut: 'Actif',
      dateCreation: new Date(),
      derniereMiseAJour: new Date(),
      transferts: transferts,
      mouvements: mouvementsStock // Ajout des mouvements de stock
    }));
  }

  return magasins;
}

  // Exemple de méthode pour récupérer les stocks d'un magasin
  private getStockForMagasin(magasin: Magasin): Stock[] {
    if (!magasin || !magasin.stock || magasin.stock.length === 0) {
      return [];
    }

    return magasin.stock;
  }


getQteById(produitId: number, stocks: Stock[]): number {
  const produit = stocks.find(p => p.produitId === produitId);
  return produit ? produit.quantiteTotale : 0;
}

onMagasinChange(event: Event) {
  const selectedMagasinId = Number((event.target as HTMLSelectElement).value); // Convertir en nombre
  const selectedMagasin = this.magasins.find(m => m.id === selectedMagasinId); // Comparaison stricte

  if (selectedMagasin) {
    this.afficherDetailsMagasin(selectedMagasin);
  }

 /* if(! this.magasinSelectionne) return;
    this.afficherDetailsMagasin(this.magasinSelectionne); */
}

getTotalProduits(stock: Stock[]): number {
  return stock.length;
}

getValeurTotaleStock(stock: Stock[]): number {
  return stock.reduce((total, s) => total + (s.dernierPrixAchat || 0) * s.quantiteTotale, 0);
}

getProduitsEnRupture(stock: Stock[]): number {
  return stock.filter(s => s.quantiteTotale === 0).length;
}

getProduitsSousSeuil(stock: Stock[]): number {
  return stock.filter(s => s.quantiteTotale > 0 && s.quantiteTotale <= s.seuilAlerte).length;
}

getProduitsPerissables(stock: Stock[]): number {
  return stock.filter(s => s.datePeremption).length;
}
getProduitsAReapprovisionner(stock: Stock[]): number {
  return stock.filter(s => s.quantiteTotale <= s.seuilReapprovisionnement).length;
}
getProduitsEnSurstock(stock: Stock[]): number {
  return stock.filter(s => s.quantiteTotale > s.seuilReapprovisionnement * 2).length;
}
getProduitsUniques(stock: Stock[]): number {
  return new Set(stock.map(s => s.produitId)).size;
}
getValeurTotaleStockVente(stock: Stock[]): number {
  //return stock.reduce((total, s) => total + (s.quantiteTotale * (s.produitId?.prixVenteUnitaire || 0)), 0);
  return 0;
}
getTotalVentesDuJour(): number {
  if (!this.magasinSelectionne) return 0;
  const paniers = this.getPaniersParMagasin(this.magasinSelectionne) || [];
  return paniers
    .filter(p => this.estAujourdHui(p.dateCreation) && p.statut === 'VALIDE')
    .reduce((total, panier) => total + panier.totalTTC, 0);
}


getNombreVentesDuJour(): number {
  if (!this.magasinSelectionne) return 0; // Vérifie si magasinSelectionne est null
  const paniers = this.getPaniersParMagasin(this.magasinSelectionne) || [];
  return paniers.filter(p => this.estAujourdHui(p.dateCreation) && p.statut === 'VALIDE').length;
}

getNombreVentesAnnulees(): number {
  if (!this.magasinSelectionne) return 0;
  const paniers = this.getPaniersParMagasin(this.magasinSelectionne) || [];
  return paniers.filter(p => this.estAujourdHui(p.dateCreation) && p.statut === 'ANNULE').length;
}

getTVACollectee(): number {
  if (!this.magasinSelectionne) return 0;
  const paniers = this.getPaniersParMagasin(this.magasinSelectionne) || [];
  return paniers
    .filter(p => this.estAujourdHui(p.dateCreation) && p.statut === 'VALIDE')
    .reduce((total, panier) => total + panier.tva, 0);
}


getMontantMoyenVente(): number {
  const nombreVentes = this.getNombreVentesDuJour();
  return nombreVentes > 0 ? Math.round(this.getTotalVentesDuJour() / nombreVentes) : 0;
}


getMontantNetEncaisse(): number {
  return this.getTotalVentesDuJour() - this.getTVACollectee();
}

// Fonction utilitaire pour vérifier si une date est aujourd'hui
estAujourdHui(date: Date): boolean {
  const aujourdHui = new Date();
  const datePanier = new Date(date);
  return (
    datePanier.getDate() === aujourdHui.getDate() &&
    datePanier.getMonth() === aujourdHui.getMonth() &&
    datePanier.getFullYear() === aujourdHui.getFullYear()
  );
}


// Calcul du total des dépenses du jour
getTotalDepensesDuJour(): number {
  if (!this.magasinSelectionne) return 0;
  const depenses = this.getDepensesParMagasin(this.magasinSelectionne) || [];
  return depenses
    .filter(d => this.estAujourdHui(d.date))
    .reduce((total, depense) => total + depense.amount, 0);
}

// Nombre de dépenses effectuées aujourd'hui
getNombreDepensesDuJour(): number {
  if (!this.magasinSelectionne) return 0;
  const depenses = this.getDepensesParMagasin(this.magasinSelectionne) || [];

  return depenses
    .filter(d => this.estAujourdHui(d.date)).length;
}

// Solde après dépenses (exemple avec un solde initial fictif)
getSoldeApresDepenses(): number {
  const soldeInitial = 1000000; // Exemple, à remplacer par la vraie valeur
  return soldeInitial - this.getTotalDepensesDuJour();
}


setItemsPerPage(event: any) {
  this.pageSize = Number(event.target.value);

  this.currentPageMouvement =1;
  this.currentPageCaisse = 1;
  this.currentPageDepnse = 1;
  this.currentPageTransferts = 1;
  this.currentPageStock = 1;


    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
}
// Gestion de la recherche
onSearchChange(objet: string): void {
  if (!this.magasinSelectionne) return;

  switch (objet) {
    case 'stock':
      this.filteredStock = (this.getProduitsParMagasin(this.magasinSelectionne) ?? []).filter(prod =>
        prod.famille?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prod.designation?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prod.unite?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prod.prixAchatUnitaire?.toString().includes(this.searchTerm) ||
        prod.prixVenteUnitaire?.toString().includes(this.searchTerm)
      );
      this.currentPageStock = 1;
      break;

    case 'caisse':
      this.filteredPanier = (this.getPaniersParMagasin(this.magasinSelectionne) ?? []).filter(panier =>
        panier.clientId?.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        panier.totalTTC.toString().includes(this.searchTerm) ||
        new Date(panier.dateCreation)?.toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPageCaisse = 1;
      break;

    case 'depense':
      this.filteredDepnse = (this.getDepensesParMagasin(this.magasinSelectionne) ?? []).filter(depense =>
        depense.type?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        depense.amount?.toString().includes(this.searchTerm) ||
        new Date(depense.date)?.toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPageDepnse = 1;
      break;

    case 'transfert':
      this.filteredTransferts = (this.getTransfertsParMagasin(this.magasinSelectionne) ?? []).filter(transfert =>
        this.getNomProduitById(transfert.produitId,this.produits )?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getNomMagazin(transfert.magasinDestination)?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getNomMagazin(transfert.magasinSource)?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        new Date(transfert.dateTransfert).toLocaleDateString().includes(this.searchTerm.toLowerCase())
      );
      this.currentPageTransferts = 1;
      break;
    case 'mouvement':
      this.filteredMouvement = (this.getMouvementParMagasin(this.magasinSelectionne) ?? []).filter(mvt =>
        this.getNomProduitById(mvt.produitId,this.produits )?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        mvt.typeMouvement?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        mvt.prixUnitaire.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        new Date(mvt.dateMouvement).toLocaleDateString().includes(this.searchTerm.toLowerCase())
      );
       this.currentPageMouvement = 1;
      break;
  }
}

// Méthode pour mettre à jour les recettes, les dépenses, les paiement et les catégories
updatefilteredTable(objet:string): void {

  if (!this.magasinSelectionne) return;

  switch (objet) {
    case 'stock':
      this.filteredStock = (this.getProduitsParMagasin(this.magasinSelectionne) ?? []).slice((this.currentPageStock - 1) * 10, this.currentPageStock * 10);
      break;

    case 'caisse':
      this.filteredPanier = (this.getPaniersParMagasin(this.magasinSelectionne) ?? []).slice((this.currentPageCaisse - 1) * 10, this.currentPageCaisse * 10);
      break;

    case 'depense':
      this.filteredDepnse = (this.getDepensesParMagasin(this.magasinSelectionne) ?? []).slice((this.currentPageDepnse - 1) * 10, this.currentPageDepnse * 10);
      break;

    case 'transfert':
      this.filteredTransferts = (this.getTransfertsParMagasin(this.magasinSelectionne) ?? []).slice((this.currentPageTransferts - 1) * 10, this.currentPageTransferts * 10);
      break;
    case 'mouvement':
      this.filteredMouvement = (this.getMouvementParMagasin(this.magasinSelectionne) ?? []).slice((this.currentPageMouvement - 1) * 10, this.currentPageMouvement * 10);
      break;
  }

}
// Méthodes de pagination
get getPaginatedStock() {
  return this.paginate(this.filteredStock, this.currentPageStock, this.pageSize);
}

get getPaginatedDepense() {
  return this.paginate(this.filteredDepnse, this.currentPageDepnse, this.pageSize);
}

get getPaginatedCaisse() {
  return this.paginate(this.filteredPanier, this.currentPageCaisse, this.pageSize);
}

get getPaginatedMouvements() {
  return this.paginate(this.filteredMouvement, this.currentPageMouvement, this.pageSize);
}

get getPaginatedTransfert() {
  return this.paginate(this.filteredTransferts, this.currentPageTransferts, this.pageSize);
}


paginate(data: any[], currentPage: number, itemsPerPage: number) {
  const start = (currentPage - 1) * itemsPerPage;
  return data.slice(start, start + itemsPerPage);
}

onPageChange(page: number, instanceObj: string): void {
  if(instanceObj === 'stock'){
    this.currentPageStock = page;
  }
  else if (instanceObj === 'caisse') {
    this.currentPageCaisse = page;
  }

  else if (instanceObj === 'depense') {
    this.currentPageDepnse = page;
  }
  else if (instanceObj === 'mouvement') {
    this.currentPageMouvement = page;
  }
  else if (instanceObj === 'transfert') {
    this.currentPageTransferts = page;
  }
  console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);

}
getTotalPages(list: any[]): number {
  return Math.ceil(list.length / this.pageSize);
}

toggleForm(index: number) {
  this.showFormIndex = this.showFormIndex === index ? null : index;
}

cancelForm() {
  this.showFormIndex = null;
}

transferer(stock: any) {
  if (!this.magasinDestinataire || this.quantite <= 0) {
    alert('Veuillez remplir tous les champs correctement.');
    return;
  }

  console.log('Transfert effectué :', {
    produit: stock.designation,
    source: this.magasinSelectionne?.nom,
    destination: this.magasinDestinataire,
    quantite: this.quantite,
    motif: this.motif
  });

  // Réinitialisation des champs après transfert
  this.showFormIndex = null;
  this.magasinDestinataire = null;
  this.quantite = 1;
  this.motif = '';
}
validerTransfert(transfert: Transfert) {
  //console.log('Transfert validé :', transfertId);
  if(transfert.statut === 'Validé') {
    //alert('Le transfert est déjà validé');
    console.log('Le transfert est déjà validé');
    return;
  }
  transfert.statut = 'Validé';
  console.log('Transfert validé :', transfert);
}

}



