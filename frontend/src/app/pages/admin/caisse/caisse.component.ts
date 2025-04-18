import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../modeles/clients.model';
import { Produits } from '../../../modeles/produit.modele';
import { ArticlePanier, Panier } from '../../../modeles/panier.model';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-caisse',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './caisse.component.html',
  styleUrl: './caisse.component.css'
})
export class CaisseComponent implements OnInit {

  dateJournal: Date = new Date();
  totalCaisse: number = 0;
  totalPanier = 0;
  totalAPayer=0;

  // Liste des taux de TVA disponibles dans l'application
  tauxTVAList: number[] = [0, 5, 10, 18]; // Exemple : 0% (pas de TVA), 5%, 10%, 18%

  // Gestion des clients
  showClientSection = false;
  clients: Client[] = [];
  clientForm: FormGroup;
  tvaInclu:boolean = false;

  currentDate: string =' ';
  currentTime: string = '';

  // Gestion du panier
  showPanierSection = false;
  panierForm: FormGroup;
  panier: Panier = new Panier();
  filteredProduits: Produits[] = [];
  produits: Produits[] = [];
  searchInput: string = '';
  panierDisabled = false;

  // Transactions journalières
  paniers: Panier[] = [
    new Panier({
      id: 1,
      clientId: 101,
      bonId: 201,
      articles: [
        new ArticlePanier({id:this.produits[0].id, produit: this.produits[0], quantite: 10, prixVenteUnitaire: this.produits[0].prixVenteUnitaire, prixAchatUnitaire: this.produits[0].prixAchatUnitaire }),
        new ArticlePanier({id:this.produits[1].id, produit: this.produits[1], quantite: 10, prixVenteUnitaire: this.produits[1].prixVenteUnitaire, prixAchatUnitaire: this.produits[1].prixAchatUnitaire  })
      ]
    }),
    new Panier({
      id: 2,
      clientId: 102,
      bonId: 202,
      articles: [
        new ArticlePanier({id:this.produits[0].id, produit: this.produits[0], quantite: 20, prixVenteUnitaire: this.produits[0].prixVenteUnitaire, prixAchatUnitaire: this.produits[0].prixAchatUnitaire })
      ]
    })
  ];


  constructor(private fb: FormBuilder) {
    // Initialisation du formulaire client
    this.clientForm = this.fb.group({
      nomComplet: ['', Validators.required],
      telephone: [''],
      email: [''],
      adresse: ['']
    });

    // Initialisation du formulaire panier
    this.panierForm = this.fb.group({
      remise: [],
      //avance: [],
      inclureTVA: [false], // Par défaut, la TVA est incluse
      tauxTVA: [18], // TVA par défaut à 18%
      typePaiement: ['', Validators.required],
      panier: this.fb.array([])
    });
  }

  ngOnInit() {
    this.loadFakeData();
    // Date et heure actuelles
    const currentDateObj = new Date();
    this.currentDate = currentDateObj.toLocaleDateString();
    this.currentTime = currentDateObj.toLocaleTimeString();

    this.panierForm.valueChanges.subscribe(() => {
      this.updateTotal();
    });
  }

  updateTotal(): void {

    let total = 0;
    this.panierArray.controls.forEach((group: any) => {
      total += (group.value.quantite * group.value.prixUnitaire);
    });
    this.totalPanier = total;
     this.totalAPayer = total - this.panierForm.value.remise;
    /*this.panierForm.get('total')?.setValue(total); */
  }

  /** Charger des données fictives */
  loadFakeData() {
    this.clients = [
      { id: 1, nomComplet: 'Aliou Ndiaye', email: 'aliou@mail.com', telephone: '771234567', adresse: 'Dakar', solde: 0, estEmploye: false, paniers: [], bons: [], paiements: [], operations: [] },
      { id: 2, nomComplet: 'Fatou Diop', email: 'fatou@mail.com', telephone: '778765432', adresse: 'Thiès', solde: 5000, estEmploye: false, paniers: [], bons: [], paiements: [], operations: [] }
    ];

    this.produits = [
      { id: 1, designation: 'Lait Caillé', famille: 'Laitage', fournisseurId: 1, unite: 'L', prixVenteUnitaire: 500, prixTotalVente: 500, description: 'Boisson lactée', codeBarre: '123456' },
      { id: 2, designation: 'Thiakri', famille: 'Céréales', fournisseurId: 2, unite: 'Kg', prixVenteUnitaire: 800, prixTotalVente: 800, description: 'Couscous sucré', codeBarre: '7891011' }
    ];
  }

  /** Sélectionner un client */
  onSelectionClient(event: any) {
    const nom = event.target.value;
    const client = this.clients.find(c => c.nomComplet === nom);
    if (client) {
      this.clientForm.patchValue(client);
    }
  }

  /** Ajouter un nouveau client */
  ajouterClient() {
    if (this.clientForm.valid) {
      const nouveauClient: Client = { ...this.clientForm.value, id: this.clients.length + 1, paniers: [], bons: [], paiements: [], operations: [] };
      this.clients.push(nouveauClient);
      alert('Client ajouté avec succès !');
      //this.clientForm.reset();
      this.showPanierSection = ! this.showPanierSection;
    }
  }

  /** Activer la section du panier */
  nouvelleVente() {
    this.showClientSection = !this.showClientSection ;
  }

  /** Filtrer les produits */
  filterProduits() {
    this.filteredProduits = this.produits.filter(prod => prod.designation?.toLowerCase().includes(this.searchInput.toLowerCase()));
  }

  /** Sélectionner un produit */
  selectProduit(produit: Produits) {
    const panierArray = this.panierForm.get('panier') as FormArray;

    const article = this.fb.group({
      produit: [produit.designation, Validators.required],
      uniteStock: [produit.unite, Validators.required],
      quantite: [1, Validators.required],
      prixUnitaire: [produit.prixVenteUnitaire, Validators.required]
    });

    panierArray.push(article);

    // ✅ Création d’un ArticlePanier valide
    const articlePanier = new ArticlePanier({
      id: produit.id,
      produit: produit,
      quantite: 1,
      prixVenteUnitaire: produit.prixVenteUnitaire ?? 0,
      prixAchatUnitaire: produit.prixAchatUnitaire ?? 0,
    });

    this.panier.articles.push(articlePanier);
    this.panier.calculerTotals();

    this.searchInput = '';
    this.filteredProduits = [];
    this.updateTotal(); // si cette méthode existe toujours pour mettre à jour le total
  }


  /** Désactiver le panier */
  disablePanier() {
    this.panierDisabled = true;
    this.panierForm.disable();
  }

  /** Activer la modification du panier */
  enablePanier() {
    this.panierDisabled = false;
    this.panierForm.enable();
  }
  get panierArray(): FormArray {
    return this.panierForm.get('panier') as FormArray;
  }
  /** Réinitialiser le panier */
  resetPanier() {
    this.panier = new Panier();
    this.panierForm.reset();
    (this.panierForm.get('panier') as FormArray).clear();
  }

  /** Enregistrer une vente */
  enregistrerBon() {
    this.panier.statut = 'VALIDE';
    this.paniers.push(this.panier);
    this.totalCaisse += this.panier.totalTTC;
    this.resetPanier();
    alert('Vente enregistrée avec succès !');
  }

  /** Supprimer un article du panier */
  removeArticle(index: number) {
    (this.panierForm.get('panier') as FormArray).removeAt(index);
    this.panier.articles.splice(index, 1);
    this.panier.calculerTotals();
  }

  get calculateTotal() {
    let totalHT = this.panierForm.value.panier.reduce((total: number, item: any) => {
      return total + (item.quantite * item.prixUnitaire);
    }, 0);

    let remise = this.panierForm.value.remise || 0;
    let totalApresRemise = totalHT - remise;
    let tva = totalApresRemise * 0.18; // 18% de TVA
    let totalTTC = totalApresRemise + tva;

    return { totalHT, remise, totalApresRemise, tva, totalTTC };
  }

  afficherDetails(panier: Panier) {
    panier.detailsVisible = !panier.detailsVisible;
  }

  annulerPanier(panier: Panier) {
    if (confirm("Voulez-vous vraiment annuler ce panier ?")) {
      panier.annuler();
    }
  }

  imprimerTicket(panier: Panier) {
    let ticket = `🔹 **Ticket de Caisse** 🔹\n`;
    ticket += `🛒 Vente #${panier.id}\n`;
    ticket += `📅 Date: ${panier.dateCreation.toLocaleDateString()}\n`;
    ticket += `------------------------------\n`;
    panier.articles.forEach(article => {
      ticket += `${article.produit.designation} x${0} - ${article.quantite * article.prixVenteUnitaire} F CFA\n`;
    });
    ticket += `------------------------------\n`;
    ticket += `💰 Total TTC: ${panier.totalTTC} F CFA\n`;

    console.log(ticket);
    alert("Impression du ticket en cours... (voir console)");
  }

  // Méthode pour gérer l'activation/désactivation de la TVA
toggleTVA(event: any): void {
  const checked = event.target.checked;
  this.tvaInclu = checked;
  /* if (checked) {
    this.panier.totalTTC = this.panier.totalHT * 1.18; // Application de la TVA (18%)
  } else {
    this.panier.totalTTC = this.panier.totalHT; // Pas de TVA
  } */
}

// Méthode pour mettre à jour le total en fonction de la TVA sélectionnée
updateTVA(): void {
  const tauxTVA = this.panierForm.get('tauxTVA')?.value;
  this.panier.totalTTC = this.panier.totalHT * (1 + tauxTVA / 100);
}
}
