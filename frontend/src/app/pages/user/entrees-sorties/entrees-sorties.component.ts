import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Entree, Sortie } from '../../../modeles/entrees-sorties.model';
@Component({
  selector: 'app-entrees-sorties',
  standalone:true,
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './entrees-sorties.component.html',
  styleUrl: './entrees-sorties.component.css'
})
export class EntreesSortiesComponent implements OnInit {


  searchTextEntree: string = '';
  currentPageEntree: number = 1;
  searchTextSortie: string = '';
  currentPageSortie: number = 1;
  pageSize: number = 2;

  entreeForm: FormGroup;
  sortieForm: FormGroup;

  entree : Entree = {
    id: 0,
    ref: '',
    produit: 0,
    quantite: 0,
    prix_achatUnite: 0,
    prix_achat_total: 0,
    fournisseur: 0,
    type_entree: '',
    uniteStock: '',
    nombre_articles: 0,
    description: '',
    dateEntree: new Date(),
    datereation: new Date(),
    heureCreation: new Date()
  };

  sortie : Sortie = {
    id: 0,
    ref: '',
    produit: 0,
    quantite: 0,
    prix_venteUnite: 0,
    prix_vente_total: 0,
    fournisseur: 0,
    type_sortie: '',
    uniteStock: '',
    nombre_articles: 0,
    description: '',
    dateSortie: new Date(),
    dateCreationSortie: new Date(),
    heureCreationSortie: new Date()
  };


  // Définir les tableaux avec les types appropriés
  entrees: Entree[] = [];
  sorties: Sortie[] = [];


  // Modèle pour la réconciliation des flux de trésorerie
  reconciliation = {
    date: '',
    montant: 0,
    type: 'entrée' // 'entrée' ou 'sortie'
  };

   // Modèle pour l'analyse des écarts
   analyse = {
    date: '',
    montant: 0,
    type: 'positif' // 'positif' ou 'négatif'
  };
  constructor() {
    // Initialisation des formulaires réactifs
    this.entreeForm = new FormGroup({
      produit: new FormControl('', Validators.required),
      quantite: new FormControl(0, [Validators.required, Validators.min(1)]),
      uniteStock: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
    });

    this.sortieForm = new FormGroup({
      produit: new FormControl('', Validators.required),
      quantite: new FormControl(0, [Validators.required, Validators.min(1)]),
      uniteStock: new FormControl('', Validators.required),
      description: new FormControl('', Validators.required),
    });
  }
  ngOnInit() {
    this.entrees =  [
      new Entree(1, "REF123", 101, 50, 100, 5000, 200, "achat", "pièce", 100, "Commande d'approvisionnement", new Date('2025-01-20'), new Date('2025-01-20'), new Date('2025-01-20T10:30:00')),
      new Entree(2, "REF124", 102, 20, 150, 3000, 150, "retour fournisseur", "carton", 50, "Retour de marchandises défectueuses", new Date('2025-01-21'), new Date('2025-01-21'), new Date('2025-01-21T11:00:00')),
      new Entree(3, "REF125", 103, 100, 80, 8000, 180, "achat", "pièce", 200, "Réapprovisionnement des pièces détachées", new Date('2025-01-22'), new Date('2025-01-22'), new Date('2025-01-22T14:45:00')),
      new Entree(4, "REF126", 104, 150, 75, 11250, 160, "achat", "pièce", 300, "Achat en gros pour stock", new Date('2025-01-23'), new Date('2025-01-23'), new Date('2025-01-23T16:00:00')),
      new Entree(5, "REF127", 105, 75, 120, 9000, 170, "retour fournisseur", "boîte", 50, "Retour de produits non conformes", new Date('2025-01-24'), new Date('2025-01-24'), new Date('2025-01-24T08:30:00')),
    ];

    this.sorties = [
      new Sortie(1, "REF201", 201, 30, 200, 6000, 250, "vente", "pièce", 60, "Vente de produits électroniques", new Date('2025-01-20'), new Date('2025-01-20'), new Date('2025-01-20T11:00:00')),
      new Sortie(2, "REF202", 202, 15, 300, 4500, 260, "vente", "pièce", 30, "Vente au client ABC", new Date('2025-01-21'), new Date('2025-01-21'), new Date('2025-01-21T13:00:00')),
      new Sortie(3, "REF203", 203, 50, 100, 5000, 270, "vente", "carton", 100, "Vente en gros à un distributeur", new Date('2025-01-22'), new Date('2025-01-22'), new Date('2025-01-22T15:00:00')),
      new Sortie(4, "REF204", 204, 70, 120, 8400, 280, "retour client", "boîte", 40, "Retour de produits défectueux par le client XYZ", new Date('2025-01-23'), new Date('2025-01-23'), new Date('2025-01-23T09:30:00')),
      new Sortie(5, "REF205", 205, 40, 250, 10000, 290, "vente", "pièce", 80, "Vente de matériel informatique à une entreprise", new Date('2025-01-24'), new Date('2025-01-24'), new Date('2025-01-24T17:00:00')),
    ];
  }

  get filteredEntrees() {
    return this.entrees.filter(item =>
      item.ref.toLowerCase().includes(this.searchTextEntree.toLowerCase())
    );
  }
  get filteredSorties() {
    return this.sorties.filter(item =>
      item.ref.toLowerCase().includes(this.searchTextSortie.toLowerCase())
    );
  }

  get paginatedEntrees() {
    const startIndex = (this.currentPageEntree - 1) * this.pageSize;
    return this.filteredEntrees.slice(startIndex, startIndex + this.pageSize);
  }

  get paginatedSorties() {
    const startIndex = (this.currentPageSortie - 1) * this.pageSize;
    return this.filteredSorties.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChangeEntree(page: number) {
    this.currentPageEntree = page;
  }

  onPageChangeSortie(page: number) {
    this.currentPageSortie = page;
  }

   // Méthode pour enregistrer une entrée
   enregistrerEntree() {
    if (this.entreeForm.valid) {
      const newEntree: Entree = { ...this.entreeForm.value, dateEntree: new Date(), heureCreation: new Date() };
      this.entrees.push(newEntree);
      console.log("Entrée enregistrée:", newEntree);
      this.entreeForm.reset();
    }
  }

  // Méthode pour enregistrer une sortie
  enregistrerSortie() {
    if (this.sortieForm.valid) {
      const newSortie: Sortie = { ...this.sortieForm.value, dateSortie: new Date(), heureCreationSortie: new Date() };
      this.sorties.push(newSortie);
      console.log("Sortie enregistrée:", newSortie);
      this.sortieForm.reset();
    }
  }

  modifierEntree(entree:any) {
    console.log("Modifier l'entrée", entree);
    // Implémenter la logique de modification
  }

  modifierSortie(sortie:any) {
    console.log("Modifier la sortie", sortie);
    // Implémenter la logique de modification
  }

  supprimerEntree(entree:any) {
    const index = this.entrees.indexOf(entree);
    if (index > -1) {
      this.entrees.splice(index, 1);
    }
    console.log("Entrée supprimée", entree);
  }

  supprimerSortie(sortie:any) {
    const index = this.sorties.indexOf(sortie);
    if (index > -1) {
      this.sorties.splice(index, 1);
    }
    console.log("Sortie supprimée", sortie);
  }

  resetEntree() {
    this.entree = {
      id: 0,
    ref: '',
    produit: 0,
    quantite: 0,
    prix_achatUnite: 0,
    prix_achat_total: 0,
    fournisseur: 0,
    type_entree: '',
    uniteStock: '',
    nombre_articles: 0,
    description: '',
    dateEntree: new Date(),
    datereation: new Date(),
    heureCreation: new Date()
    };
  }

  resetSortie() {
    this.sortie = {
      id: 0,
      ref: '',
      produit: 0,
      quantite: 0,
      prix_venteUnite: 0,
      prix_vente_total: 0,
      fournisseur: 0,
      type_sortie: '',
      uniteStock: '',
      nombre_articles: 0,
      description: '',
      dateSortie: new Date(),
      dateCreationSortie: new Date(),
      heureCreationSortie: new Date()
    };
  }

  // Méthode pour gérer la réconciliation des flux
  reconsilierFlux() {
    console.log("Réconciliation des flux...");
    // Implémentation de la logique de réconciliation
  }

  // Méthode pour analyser les écarts
  analyserEcarts() {
    console.log("Analyse des écarts...");
    // Implémentation de la logique d'analyse des écarts
  }

}
