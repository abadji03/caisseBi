import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-magazin',
  standalone:true,
  imports: [CommonModule, FormsModule],
  templateUrl: './magazin.component.html',
  styleUrl: './magazin.component.css'
})
export class MagazinComponent {
supprimerProduit(arg0: number) {
throw new Error('Method not implemented.');
}
modifierProduit(_t63: { id: number; nom: string; quantite: number; magasin: string; }) {
throw new Error('Method not implemented.');
}
setModeVente(arg0: string) {
throw new Error('Method not implemented.');
}
// Liste des magasins (à remplacer par un appel à un service API)
magasins = [
  { id: 1, nom: 'Magasin 1', localisation: 'Paris' },
  { id: 2, nom: 'Magasin 2', localisation: 'Lyon' },
  { id: 3, nom: 'Magasin 3', localisation: 'Marseille' }
];
// Exemple de décaissements
decaissements = [
  { id: 1, reference: 'Salaire Janvier', montant: 1500, date: new Date('2025-01-10'), categorie: 'Salaires', commentaire: 'Paiement des salaires pour janvier' },
  { id: 2, reference: 'Achat fournitures', montant: 200, date: new Date('2025-01-12'), categorie: 'Achats', commentaire: 'Achat de fournitures de bureau' },
  { id: 3, reference: 'Loyer', montant: 1200, date: new Date('2025-01-15'), categorie: 'Loyer', commentaire: 'Paiement du loyer du mois' }
];

// Modèle pour un nouveau décaissement
nouveauDecaissement = {
  reference: '',
  montant: 0,
  date: new Date(),
  categorie: '',
  commentaire: ''
};

// Liste des produits (à remplacer par un appel API dans un vrai projet)
produits = [
  { id: 1, ref: 'P001', nom: 'Produit A', prixUnitaire: 20, quantite: 50, magasin: 'Magasin 1', dateEnregistrement: new Date(), dateModification: new Date(), categorie: 'Catégorie 1', disponibilite: 50, codeBarre: '123456789' },
  { id: 2, ref: 'P002', nom: 'Produit B', prixUnitaire: 15, quantite: 30, magasin: 'Magasin 2', dateEnregistrement: new Date(),dateModification: new Date(), categorie: 'Catégorie 2', disponibilite: 30, codeBarre: '987654321' },
  { id: 3, ref: 'P003', nom: 'Produit C', prixUnitaire: 25, quantite: 100, magasin: 'Magasin 3', dateEnregistrement: new Date(),dateModification: new Date(), categorie: 'Catégorie 3', disponibilite: 100, codeBarre: '456789123' }
];

// Exemple de dettes
dettes = [
  {
    id: 1,
    createur: 'Fournisseur A',
    montantTotal: 1000,
    montantPaye: 300,
    montantRestant: 700,
    dateEcheance: new Date('2025-02-01'),
    datePaiement: new Date('2025-01-10'),
    commentaire: 'Paiement partiel effectué le 10 janvier'
  },
  {
    id: 2,
    createur: 'Fournisseur B',
    montantTotal: 500,
    montantPaye: 500,
    montantRestant: 0,
    dateEcheance: new Date('2025-01-25'),
    datePaiement: new Date('2025-01-15'),
    commentaire: 'Dette entièrement remboursée'
  }
];

// Modèle pour une nouvelle dette
nouvelleDette = {
  id:0,
  createur: '',
  montantTotal: 0,
  montantPaye: 0,
  montantRestant: 0,
  dateEcheance: new Date(),
  datePaiement: new Date(),
  commentaire: ''
};

nouveauProduit = {
  ref: '',
  nom: '',
  prixUnitaire: 0,
  quantite: 0,
  dateEnregistrement: new Date(),
  dateModification: new Date(),
  categorie: '',
  disponibilite: 0,
  codeBarre: ''
};

// Modèle pour l'ajout et la modification de magasins
magasin = {
  id: 0,
  nom: '',
  localisation: ''
};
modeVente: any;

magasinSelectionne: any = this.magasins[0];

  afficherDetailsMagasin(magasin: any) {
    this.magasinSelectionne = magasin;
  }
  // Méthode pour ajouter un produit
  ajouterProduit() {
    const nouveauId = this.produits.length + 1;
    const produit = { ...this.nouveauProduit, id: nouveauId, magasin: this.magasinSelectionne.nom };
    this.produits.push(produit);
    console.log('Produit ajouté:', produit);
    this.nouveauProduit = { ref: '', nom: '', prixUnitaire: 0, quantite: 0, dateEnregistrement: new Date(), dateModification: new Date(), categorie: '', disponibilite: 0, codeBarre: '' };
  }

  genererCodeBarre() {
    // Logic to generate or scan a barcode
    this.nouveauProduit.codeBarre = '123456789'; // Exemples de génération
  }

  // Méthode pour ajouter un décaissement
  ajouterDecaissement() {
    const nouveauId = this.decaissements.length + 1;
    const decaissement = { ...this.nouveauDecaissement, id: nouveauId };
    this.decaissements.push(decaissement);
    console.log('Décaissement ajouté:', decaissement);
    this.nouveauDecaissement = { reference: '', montant: 0, date: new Date(), categorie: '', commentaire: '' }; // Réinitialiser
  }

  // Méthode pour supprimer un décaissement
  supprimerDecaissement(id: number) {
    this.decaissements = this.decaissements.filter(d => d.id !== id);
  }

  // Méthode pour modifier un décaissement
  modifierDecaissement(decaissement: any) {
    this.nouveauDecaissement = { ...decaissement }; // Remplir les champs du formulaire pour modification
  }

   // Méthode pour calculer le montant restant
   calculerMontantRestant(dette: any) {
    dette.montantRestant = dette.montantTotal - dette.montantPaye;
  }

  // Méthode pour ajouter ou modifier une dette
  ajouterOuModifierDette() {
    // Si l'id est 0, c'est une nouvelle dette, sinon c'est une modification
    if (this.nouvelleDette.id) {
      // Modification d'une dette existante
      const index = this.dettes.findIndex(d => d.id === this.nouvelleDette.id);
      if (index !== -1) {
        this.dettes[index] = { ...this.nouvelleDette }; // Mise à jour de la dette
      }
    } else {
      // Ajout d'une nouvelle dette
      const newId = this.dettes.length + 1;
      this.dettes.push({ ...this.nouvelleDette, id: newId });
    }
    this.calculerMontantRestant(this.nouvelleDette);  // Calculer le montant restant
    console.log('Dette ajoutée/modifiée:', this.nouvelleDette);
    this.nouvelleDette = {id:0, createur: '', montantTotal: 0, montantPaye: 0, montantRestant: 0, dateEcheance: new Date(), datePaiement: new Date(), commentaire: '' }; // Réinitialiser
  }

  // Méthode pour supprimer une dette
  supprimerDette(id: number) {
    this.dettes = this.dettes.filter(d => d.id !== id);
  }

  // Méthode pour modifier une dette
  modifierDette(dette: any) {
    this.nouvelleDette = { ...dette }; // Remplir le formulaire avec les données de la dette
  }


// Méthode pour ajouter ou modifier un magasin
ajouterOuModifierMagasin() {
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
}

// Méthode pour modifier un magasin
modifierMagasin(magasin: any) {
  this.magasin = { ...magasin };
}

// Méthode pour supprimer un magasin
supprimerMagasin(id: number) {
  this.magasins = this.magasins.filter(m => m.id !== id);
}

// Méthode pour réinitialiser le formulaire
resetForm() {
  this.magasin = { id: 0, nom: '', localisation: '' };
}

// Méthode pour obtenir les produits d'un magasin donné
getProduitsParMagasin(magasinNom: string) {
  return this.produits.filter(p => p.magasin === magasinNom);
}

// Méthode pour obtenir le stock total pour un produit dans un magasin donné
getStockTotal(magasinNom: string, produitNom: string) {
  return this.produits
    .filter(p => p.magasin === magasinNom && p.nom === produitNom)
    .reduce((total, produit) => total + produit.quantite, 0);
}


}
