import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Magasin } from '../../../modeles/magasin.model';
import { Panier } from '../../../modeles/panier.model';
import { Produits } from '../../../modeles/produit.modele';
import { Transfert } from '../../../modeles/transfert.model';
import { Depense, Recette } from '../../../modeles/finance.model';

@Component({
  selector: 'app-magazin',
  standalone:true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './magazin.component.html',
  styleUrl: './magazin.component.css'
})
export class MagazinComponent implements OnInit{


modeEdition = false;
magasinForm :FormGroup;
// Liste des magasins (à remplacer par un appel à un service API)
magasins: Magasin[] = [ ];

modeVente: any;

magasinSelectionne: Magasin | null = null;

constructor(private fb: FormBuilder) {
   // Initialisation du formulaire réactif
   this.magasinForm = this.fb.group({
    nom: ['', Validators.required],
    adresse: ['', Validators.required],
    responsableId: [, Validators.required]
  });
}

ngOnInit(): void {
  this.magasins = this.loadMagasins();
  this.magasinSelectionne =this.magasins[0];
}

getAllProduits(): Produits[] {
  return this.magasins.flatMap((magasin: Magasin) => magasin.produitsEnStock ?? []);
}
  afficherDetailsMagasin(magasin: Magasin) {
    this.magasinSelectionne = magasin;
  }
  // Méthode pour ajouter un produit
 /*  ajouterProduit() {
    const nouveauId = this.produits.length + 1;
    const produit = { ...this.nouveauProduit, id: nouveauId, magasin: this.magasinSelectionne.nom };
    this.produits.push(produit);
    console.log('Produit ajouté:', produit);
    this.nouveauProduit = { ref: '', nom: '', prixUnitaire: 0, quantite: 0, dateEnregistrement: new Date(), dateModification: new Date(), categorie: '', disponibilite: 0, codeBarre: '' };
  }
 */
// Méthode pour ajouter ou modifier un magasin
/* ajouterOuModifierMagasin() {
  if (this.magasin.id) {
    // Modification d'un magasin existant
    const index = this.magasins.findIndex(m => m.id === this.magasin.id);
    if (index !== -1) {
      this.magasins[index] = { ...this.magasin };  // Mise à jour du magasin
    }
  } else {
    // Ajout d'un nouveau magasin
    const newId = this.magasins.length + 1;
    this.magasins.push({ ...this.magasin, id: newId });
  }
  this.resetForm();  // Réinitialiser le formulaire après ajout/modification
} */

// Méthode pour supprimer un magasin
supprimerMagasin(id: number) {
  this.magasins = this.magasins.filter(m => m.id !== id);
}

// Méthode pour réinitialiser le formulaire
resetForm() {
  //this.magasin = { id: 0, nom: '', localisation: '' };
}

// Méthode pour obtenir les produits d'un magasin donné
getProduitsParMagasin(magasinNom: Magasin) {

  if(!this.magasinSelectionne) return null;
  return this.magasinSelectionne.produitsEnStock;
}

getPaniersParMagasin(magasin: Magasin) {
  // Retourne la liste des paniers du magasin
  if(!this.magasinSelectionne) return null;
  return this.magasinSelectionne.ventes;
}

getTransfertsParMagasin(magasin: Magasin) {
  // Retourne la liste des transferts du magasin
  if(!this.magasinSelectionne) return null;
  return this.magasinSelectionne.transferts;
}

// Obtenir les dépenses du magasin sélectionné
getDepensesParMagasin(magasin: Magasin) {
  if(!this.magasinSelectionne) return null;
  return this.magasinSelectionne.depenses;
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

  for (let i = 1; i <= 5; i++) {
    // Création des produits pour ce magasin
    const produits: Produits[] = [];
    for (let j = 1; j <= 10; j++) {
      produits.push(new Produits({
        id: j,
        famille: `Famille ${j}`,
        designation: `Produit ${j} Magasin ${i}`,
        fournisseur: `Fournisseur ${j}`,
        magasin: `Magasin ${i}`,
        quantite: Math.floor(Math.random() * 100) + 10,
        unite: "Pièce",
        prixAchatUnitaire: Math.floor(Math.random() * 1000) + 500,
        prixTotalAchat: 0,
        prixVenteUnitaire: Math.floor(Math.random() * 1500) + 1000,
        prixTotalVente: 0,
        dateCreation: new Date(),
        agent: `Agent ${j}`,
        description: `Description du produit ${j}`,
        codeBarre: `CODE${j}${i}`,
        image: ""
      }));
    }

    // Création des paniers de vente (ventes)
    const paniers: Panier[] = [];
    for (let k = 1; k <= 10; k++) {
      const articles = produits.sort(() => 0.5 - Math.random()).slice(0, 4); // Prend 4 produits au hasard
      paniers.push(new Panier({
        id: k,
        clientId: Math.floor(Math.random() * 1000),
        bonId: Math.floor(Math.random() * 500),
        articles: articles,
        statut: 'VALIDE',
        totalHT: Math.floor(Math.random() * 500) + 5000,
        totalTTC: Math.floor(Math.random() * 500) + 6000,
        dateCreation: new Date(),
        magasinId: i
      }));
    }

    // Création des transferts de produits
    const transferts: Transfert[] = [];
    for (let t = 1; t <= 10; t++) {
      transferts.push(new Transfert({
        id: t,
        reference: `TRANSFERT-${t}${i}`,
        produitId: produits[Math.floor(Math.random() * produits.length)].id!,
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

    // **Ajout des dépenses**
    const depenses: Depense[] = [];
    for (let d = 1; d <= 5; d++) {
      depenses.push(new Depense({
        id: d,
        date: new Date(),
        amount: Math.floor(Math.random() * 10000) + 1000, // Montant entre 1 000 et 10 000
        type: d % 2 === 0 ? "STANDARD" : "STOCK",
        description: d % 2 === 0 ? "Achat de fournitures" : "Paiement des salaires",
        paymentMode: d % 2 === 0 ? "Virement bancaire" : "Espèces",
        magasinId: i
      }));
    }

    // **Ajout des recettes**
    const recettes: Recette[] = [];
    for (let r = 1; r <= 5; r++) {
      recettes.push(new Recette({
        id: r,
        date: new Date(),
        amount: Math.floor(Math.random() * 15000) + 5000, // Montant entre 5 000 et 15 000
        categoryId: i,
        description: `Recette de vente magasin ${i}`,
        paymentMode: r % 2 === 0 ? "Espèces" : "Carte bancaire",
        magasinId: i
      }));
    }

    // **Création du magasin avec toutes les données**
    magasins.push(new Magasin({
      id: i,
      nom: `Magasin ${i}`,
      adresse: `Adresse ${i}, Ville ${i}`,
      ville: `Ville ${i}`,
      telephone: `77${Math.floor(Math.random() * 10000000)}`,
      email: `magasin${i}@exemple.com`,
      responsableId: Math.floor(Math.random() * 100),
      capaciteStock: Math.floor(Math.random() * 5000) + 1000,
      produitsEnStock: produits,
      chiffreAffaires: Math.floor(Math.random() * 1000000) + 500000,
      ventes: paniers,
      depenses: depenses, // Ajout des dépenses
      recettes: recettes, // Ajout des recettes
      statut: 'actif',
      dateCreation: new Date(),
      derniereMiseAJour: new Date(),
      transferts: transferts
    }));
  }

  return magasins;
}


}
