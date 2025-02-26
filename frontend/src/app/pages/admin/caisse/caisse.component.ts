import { Component } from '@angular/core';
import { EnregistrementProduitsComponent } from '../enregistrement-produits/enregistrement-produits.component';
import { VenteComponent } from '../vente/vente.component';
import { VenteBComponent } from '../vente-b/vente-b.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-caisse',
  standalone: true,
  imports: [CommonModule, VenteComponent, VenteBComponent],
  templateUrl: './caisse.component.html',
  styleUrl: './caisse.component.css'
})
export class CaisseComponent {

  commandes = [
    {
      id: 'C001',
      heure: new Date(),
      prixTotal: 120.50,
      produits: ['Produit 1', 'Produit 2', 'Produit 3'],
      numFacture: 'F001',
      showDetails: false
    },
    {
      id: 'C002',
      heure: new Date(),
      prixTotal: 250.00,
      produits: ['Produit 4', 'Produit 5'],
      numFacture: 'F002',
      showDetails: false
    }
  ];

  toggleDetails(commande: any): void {
    commande.showDetails = !commande.showDetails;
  }

  imprimer(commande: any): void {
    console.log(`Imprimer la commande ${commande.id}`);
    // Ajouter la logique d'impression
  }

  modifier(commande: any): void {
    console.log(`Modifier la commande ${commande.id}`);
    // Ajouter la logique pour la modification
  }

  supprimer(commande: any): void {
    console.log(`Supprimer la commande ${commande.id}`);
    // Ajouter la logique de suppression
  }

}
