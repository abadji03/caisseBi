import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stock-inventaires',
  standalone:true,
  imports: [CommonModule],
  templateUrl: './stock-inventaires.component.html',
  styleUrl: './stock-inventaires.component.css'
})
export class StockInventairesComponent {

  // Données fictives pour les produits, à remplacer par des appels à des services backend
  produits = [
    { id: 1, nom: 'Produit A', quantite: 100, magasin: 'Magasin 1', perissable: false },
    { id: 2, nom: 'Produit B', quantite: 50, magasin: 'Magasin 2', perissable: true },
    { id: 3, nom: 'Produit C', quantite: 200, magasin: 'Magasin 1', perissable: false },
    { id: 4, nom: 'Produit D', quantite: 20, magasin: 'Magasin 2', perissable: true }
  ];

  // Alertes de réapprovisionnement
  alertes = this.produits.filter(p => p.quantite < 30);  // Produits avec faible stock

  // Historique des mouvements (fictif pour l'exemple)
  historique = [
    { date: '2025-01-01', action: 'Entrée', produit: 'Produit A', quantite: 100 },
    { date: '2025-01-02', action: 'Sortie', produit: 'Produit B', quantite: 30 }
  ];

  // Méthodes pour afficher les informations
  getProduitsParMagasin(magasin: string) {
    return this.produits.filter(p => p.magasin === magasin);
  }

  getProduitsPerissables() {
    return this.produits.filter(p => p.perissable);
  }

  getProduitsNonPerissables() {
    return this.produits.filter(p => !p.perissable);
  }

  // Méthodes pour gérer les alertes
  envoyerAlerteReapprovisionnement() {
    console.log('Alerte de réapprovisionnement envoyée');
    // Implémentation de l'envoi d'alertes
  }

  // Méthodes pour gérer l'historique
  ajouterMouvement(mouvement: any) {
    this.historique.push(mouvement);
    console.log('Mouvement ajouté:', mouvement);
  }
}
