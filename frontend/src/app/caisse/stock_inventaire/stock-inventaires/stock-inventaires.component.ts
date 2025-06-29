import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MouvementsStock, Stock } from '../../../modeles/entrees-sorties.model';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { Produits } from '../../../modeles/produit.modele';
import { FormsModule } from '@angular/forms';
import { Magasin } from '../../../modeles/magasin.model';

@Component({
  selector: 'app-stock-inventaires',
  standalone:true,
  imports: [CommonModule,FormsModule],
  templateUrl: './stock-inventaires.component.html',
  styleUrl: './stock-inventaires.component.css'
})
export class StockInventairesComponent implements OnInit {

  searchTerm = ''; // Recherche
  filteredInventaire:Produits[] = [];
  filteredQtesDisponibles:Produits[] = [];
  filteredNiveauStock:Produits[] = [];
  filteredAlertes:Stock[] = [];
  filteredMouvements:MouvementsStock[] = [];
  filteredPerissables:Stock[] = [];

  itemsPerPage = 5; // Nombre d'éléments par page
  currentPageAlertes: number = 1;
  currentPageInventaire: number = 1;
  currentPageQtesDisponibles: number = 1;
  currentPageNiveauStock: number = 1;
  currentPageMouvements: number = 1;
  currentPagePerissables: number = 1;


  magasins: Magasin[] = [
    new Magasin({
      id: 1,
      nom: "Magasin A",
      adresse: "Route de la Gare, Dakar",
      ville: "Dakar",
      telephone: "77 123 45 67",
      email: "magasinA@example.com",
      responsableId: 1, // Correspond au responsable dans votre système
      capaciteStock: 500,
      chiffreAffaires: 1500000,
      ventes: [ /* Liste de paniers correspondants à ce magasin */ ],
      depenses: [ /* Liste des dépenses pour ce magasin */ ],
      recettes: [ /* Liste des recettes pour ce magasin */ ],
      statut: "Actif",
      dateCreation: new Date("2023-01-01"),
      derniereMiseAJour: new Date("2025-03-01"),
      transferts: [ /* Liste des transferts pour ce magasin */ ],
      //stock: this.stocks
    }),
    new Magasin({
      id: 2,
      nom: "Magasin B",
      adresse: "Avenue Blaise Diagne, Saint-Louis",
      ville: "Saint-Louis",
      telephone: "77 234 56 78",
      email: "magasinB@example.com",
      responsableId: 2, // Autre responsable
      capaciteStock: 300,
      chiffreAffaires: 800000,
      ventes: [ /* Liste de paniers correspondants à ce magasin */ ],
      depenses: [ /* Liste des dépenses pour ce magasin */ ],
      recettes: [ /* Liste des recettes pour ce magasin */ ],
      statut: "Actif",
      dateCreation: new Date("2023-02-01"),
      derniereMiseAJour: new Date("2025-03-01"),
      transferts: [ /* Liste des transferts pour ce magasin */ ],
      //stock: this.stocks
    }),
    new Magasin({
      id: 3,
      nom: "Magasin C",
      adresse: "Centre-ville, Thiès",
      ville: "Thiès",
      telephone: "77 345 67 89",
      email: "magasinC@example.com",
      responsableId: 3, // Autre responsable
      capaciteStock: 400,
      chiffreAffaires: 1200000,
      ventes: [ /* Liste de paniers correspondants à ce magasin */ ],
      depenses: [ /* Liste des dépenses pour ce magasin */ ],
      recettes: [ /* Liste des recettes pour ce magasin */ ],
      statut: "Inactif",
      dateCreation: new Date("2023-03-01"),
      derniereMiseAJour: new Date("2025-03-01"),
      transferts: [ /* Liste des transferts pour ce magasin */ ],
      //stock: this.stocks
    })
  ];
 // Données fictives pour les stocks
  stocks: Stock[] = [
    new Stock({ id: 1, produitId: 101, magasinId: 1, quantiteTotale: 100, quantiteReservee: 20, seuilAlerte: 10, seuilReapprovisionnement: 30, stockSecurite: 5, dernierPrixAchat: 1500, dateDerniereMiseAJour: new Date("2025-03-01"), datePeremption: new Date("2025-12-01"), statutStock: "En stock" }),
    new Stock({ id: 2, produitId: 102, magasinId: 2, quantiteTotale: 50, quantiteReservee: 5, seuilAlerte: 5, seuilReapprovisionnement: 15, stockSecurite: 5, dernierPrixAchat: 2000, statutStock: "En stock",datePeremption: new Date("2025-06-15") }),
    new Stock({ id: 3, produitId: 103, magasinId: 3, quantiteTotale: 30, quantiteReservee: 10, seuilAlerte: 3, seuilReapprovisionnement: 10, stockSecurite: 3, dernierPrixAchat: 500,  statutStock: "Rupture" }),
    new Stock({ id: 4, produitId: 104, magasinId: 1, quantiteTotale: 75, quantiteReservee: 20, seuilAlerte: 10, seuilReapprovisionnement: 20, stockSecurite: 5, dernierPrixAchat: 1200,  statutStock: "En stock", datePeremption: new Date("2025-08-01") }),
    new Stock({ id: 5, produitId: 105, magasinId: 2, quantiteTotale: 40, quantiteReservee: 5, seuilAlerte: 5, seuilReapprovisionnement: 10, stockSecurite: 5, dernierPrixAchat: 3000, statutStock: "En stock" }),
    new Stock({ id: 6, produitId: 106, magasinId: 3, quantiteTotale: 90, quantiteReservee: 15, seuilAlerte: 8, seuilReapprovisionnement: 25, stockSecurite: 5, dernierPrixAchat: 1800,  statutStock: "En stock" }),
    new Stock({ id: 7, produitId: 107, magasinId: 1, quantiteTotale: 120, quantiteReservee: 30, seuilAlerte: 15, seuilReapprovisionnement: 40, stockSecurite: 10, dernierPrixAchat: 1400,  statutStock: "En stock" }),
    new Stock({ id: 8, produitId: 108, magasinId: 2, quantiteTotale: 55, quantiteReservee: 5, seuilAlerte: 5, seuilReapprovisionnement: 15, stockSecurite: 5, dernierPrixAchat: 2500,  statutStock: "En stock" }),
    new Stock({ id: 9, produitId: 109, magasinId: 3, quantiteTotale: 20, quantiteReservee: 3, seuilAlerte: 20, seuilReapprovisionnement: 5, stockSecurite: 2, dernierPrixAchat: 800,  statutStock: "Rupture", datePeremption: new Date("2025-04-20") }),
    new Stock({ id: 10, produitId: 110, magasinId: 1, quantiteTotale: 85, quantiteReservee: 10, seuilAlerte: 8, seuilReapprovisionnement: 20, stockSecurite: 5, dernierPrixAchat: 1600, statutStock: "En stock",datePeremption: new Date("2025-03-15") }),
  ];


// Données fictives pour les alertes (produits avec une quantité < 50)
alertes: Stock[] = this.stocks.filter(p => p.quantiteTotale <= p.seuilAlerte);

// Données fictives pour l'historique des mouvements de stock
mouvementsStock: MouvementsStock[] = [
  new MouvementsStock({ id: 1, ref: "MV-20250308-001", produitId: 101, magasinId: 1, typeMouvement: "Entree", quantite: 20, prixUnitaire: 1600, acteurId: 3,  description: "Réapprovisionnement", dateMouvement: new Date("2025-03-08") }),
  new MouvementsStock({ id: 2, ref: "MV-20250308-002", produitId: 102, magasinId: 2, typeMouvement: "Sortie", quantite: 10, prixUnitaire: 2000, acteurId: 5,  description: "Vente au client", dateMouvement: new Date("2025-03-08") }),
  new MouvementsStock({ id: 3, ref: "MV-20250308-003", produitId: 103, magasinId: 3, typeMouvement: "Entree", quantite: 50, prixUnitaire: 500, acteurId: 1,  description: "Stock initial", dateMouvement: new Date("2025-03-07") }),
  new MouvementsStock({ id: 4, ref: "MV-20250308-004", produitId: 104, magasinId: 1, typeMouvement: "Sortie", quantite: 5, prixUnitaire: 3000, acteurId: 4, description: "Commande client", dateMouvement: new Date("2025-03-06") }),
  new MouvementsStock({ id: 5, ref: "MV-20250308-005", produitId: 105, magasinId: 2, typeMouvement: "Entree", quantite: 100, prixUnitaire: 1200, acteurId: 2, description: "Nouvelle livraison fournisseur", dateMouvement: new Date("2025-03-05") }),

  new MouvementsStock({ id: 6, ref: "MV-20250308-006", produitId: 106, magasinId: 1, typeMouvement: "Sortie", quantite: 15, prixUnitaire: 2500, acteurId: 3,  description: "Vente comptoir", dateMouvement: new Date("2025-03-05") }),
  new MouvementsStock({ id: 7, ref: "MV-20250308-007", produitId: 107, magasinId: 3, typeMouvement: "Entree", quantite: 80, prixUnitaire: 2200, acteurId: 6,  description: "Commande fournisseur", dateMouvement: new Date("2025-03-04") }),
  new MouvementsStock({ id: 8, ref: "MV-20250308-008", produitId: 108, magasinId: 2, typeMouvement: "Sortie", quantite: 30, prixUnitaire: 3000, acteurId: 7,  description: "Livraison client gros", dateMouvement: new Date("2025-03-03") }),
  new MouvementsStock({ id: 9, ref: "MV-20250308-009", produitId: 109, magasinId: 1, typeMouvement: "Entree", quantite: 60, prixUnitaire: 900, acteurId: 8,  description: "Achat pour revente", dateMouvement: new Date("2025-03-02") }),
  new MouvementsStock({ id: 10, ref: "MV-20250308-010", produitId: 110, magasinId: 3, typeMouvement: "Sortie", quantite: 25, prixUnitaire: 1000, acteurId: 9, description: "Stock boulangerie", dateMouvement: new Date("2025-03-01") }),
];

  // Données fictives pour les produits, à remplacer par des appels à des services backend
  produits: Produits[] = [
    /* new Produits({ id: 101, famille: "Boissons", designation: "Lait en poudre", fournisseurId: 3, unite: "Carton", prixAchatUnitaire: 1500, prixVenteUnitaire: 2000, agent: "Admin", description: "Lait en poudre 500g", codeBarre: "1234567890123", image: "lait-poudre.jpg", perissable: true }),
    new Produits({ id: 102, famille: "Snacks", designation: "Chips", fournisseurId: 2,  unite: "Sachet", prixAchatUnitaire: 500, prixVenteUnitaire: 700, agent: "Admin", description: "Chips de pomme de terre", codeBarre: "1234567890456", image: "chips.jpg", perissable: true }),
    new Produits({ id: 103, famille: "Boissons", designation: "Eau minérale", fournisseurId: 1,  unite: "Bouteille", prixAchatUnitaire: 300, prixVenteUnitaire: 500, agent: "Admin", description: "Eau minérale naturelle", codeBarre: "1234567890789", image: "eau.jpg", perissable: false }),
    new Produits({ id: 104, famille: "Confiserie", designation: "Chocolat", fournisseurId: 4, unite: "Pièce", prixAchatUnitaire: 2500, prixVenteUnitaire: 3000, agent: "Admin", description: "Chocolat noir 70%", codeBarre: "1234567890890", image: "chocolat.jpg", perissable: true }),
    new Produits({ id: 105, famille: "Épicerie", designation: "Sucre", fournisseurId: 5,  unite: "Kg", prixAchatUnitaire: 1000, prixVenteUnitaire: 1200, agent: "Admin", description: "Sucre blanc raffiné", codeBarre: "1234567890991", image: "sucre.jpg", perissable: false }),

    new Produits({ id: 106, famille: "Boissons", designation: "Café soluble", fournisseurId: 6,  unite: "Bocal", prixAchatUnitaire: 2000, prixVenteUnitaire: 2500, agent: "Admin", description: "Café instantané 100g", codeBarre: "1234567891002", image: "cafe.jpg", perissable: false }),
    new Produits({ id: 107, famille: "Légumineuses", designation: "Lentilles", fournisseurId: 7, unite: "Kg", prixAchatUnitaire: 1800, prixVenteUnitaire: 2200, agent: "Admin", description: "Lentilles vertes bio", codeBarre: "1234567891113", image: "lentilles.jpg", perissable: false }),
    new Produits({ id: 108, famille: "Épicerie", designation: "Riz basmati", fournisseurId: 8, unite: "Kg", prixAchatUnitaire: 2500, prixVenteUnitaire: 3000, agent: "Admin", description: "Riz basmati parfumé", codeBarre: "1234567891224", image: "riz.jpg", perissable: false }),
    new Produits({ id: 109, famille: "Produits laitiers", designation: "Yaourt nature", fournisseurId: 9, unite: "Pot", prixAchatUnitaire: 600, prixVenteUnitaire: 900, agent: "Admin", description: "Yaourt nature 150g", codeBarre: "1234567891335", image: "yaourt.jpg", perissable: true }),
    new Produits({ id: 110, famille: "Boulangerie", designation: "Pain complet", fournisseurId: 10, unite: "Pièce", prixAchatUnitaire: 800, prixVenteUnitaire: 1000, agent: "Admin", description: "Pain complet aux céréales", codeBarre: "1234567891446", image: "pain.jpg", perissable: true})
   */];

  // Données fictives pour les Perissables
  produitsPerissables: Produits[] = this.produits.filter(p => p.perissable === true);

  // Alertes de réapprovisionnement
  // alertes = this.produits.filter(p => p.quantite < 30);  // Produits avec faible stock

  // Historique des mouvements (fictif pour l'exemple)
 /*  historique = [
    { date: '2025-01-01', action: 'Entrée', produit: 'Produit A', quantite: 100 },
    { date: '2025-01-02', action: 'Sortie', produit: 'Produit B', quantite: 30 }
  ]; */

  constructor(private stockService: StockInventaireService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    /* this.chargerInventaire();
    this.chargerAlertes();
    this.chargerHistorique(); */
    console.log('Taille alertse', this.alertes.length)
    console.log('Taille produitsPeriassables', this.getProduitsNonPerissables().length)
    this.filteredInventaire = [...this.produits];
    this.filteredQtesDisponibles = [...this.produits];
    this.filteredNiveauStock = [...this.produits];
    this.filteredMouvements = [...this.mouvementsStock];
    this.filteredAlertes = [...this.alertes];
    this.filteredPerissables = [...this.getProduitsPerissables()];
    this.updatefilteredTable('inventaire');
    this.updatefilteredTable('qteDisponible');
    this.updatefilteredTable('niveauStock');
    this.updatefilteredTable('alerte');
    this.updatefilteredTable('mouvement');
    this.updatefilteredTable('perissable');
  }
  // Méthodes pour afficher les informations
  getProduitsParMagasin(magasin: number) {
    return this.stocks.filter(p => p.magasinId === magasin);
  }

  /* getProduitsPerissables() {
    return this.produits.filter(p => p.perissable);
  } */

  getProduitsNonPerissables() {
    return this.produits.filter(p => !p.perissable);
  }

  /* chargerInventaire(): void {
    this.stockService.getStocks().subscribe((data) => {
      this.stocks = data;
    });
  }

  chargerAlertes(): void {
    this.stockService.checkReapprovisionnement().subscribe((data) => {
      this.alertes = data;
    });
  }

  chargerHistorique(): void {
    this.stockService.getMouvements().subscribe((data) => {
      this.mouvementsStock = data;
    });
  } */

  // Méthodes pour gérer les alertes
  envoyerAlerteReapprovisionnement() {
    console.log('Alerte de réapprovisionnement envoyée');
    // Implémentation de l'envoi d'alertes
  }

  // Méthodes pour gérer l'historique
  ajouterMouvement(mouvement: any) {
    this.mouvementsStock.push(mouvement);
    console.log('Mouvement ajouté:', mouvement);
  }

  getProduitsPerissables(): Stock[] {
    return this.stocks.filter(produit =>
      produit.datePeremption &&
      new Date(produit.datePeremption).getTime() < new Date().getTime() + (7 * 24 * 60 * 60 * 1000) // Moins de 7 jours
    );
  }

   // Méthode pour obtenir le nom du produit à partir de l'id
   getNomProduitById(id: number): string | null {
    const produit = this.produits.find(p => p.id === id);
    return produit ? produit.designation : null;  // On retourne `null` si le produit n'est pas trouvé
  }

  // Méthode pour mettre à jour les recettes, les dépenses, les paiement et les catégories
  updatefilteredTable(objet:string): void {
    if(objet ==='inventaire' ){
      this.filteredInventaire = this.produits.slice((this.currentPageInventaire - 1) * 10, this.currentPageInventaire * 10);
    }
    else if(objet ==='qteDisponible' ){
      this.filteredQtesDisponibles = this.produits.slice((this.currentPageQtesDisponibles - 1) * 10, this.currentPageQtesDisponibles * 10);
    }
    else if(objet ==='niveauStock'){
      this.filteredNiveauStock = this.produits.slice((this.currentPageNiveauStock - 1) * 10, this.currentPageNiveauStock * 10);
    }
    else if (objet ==='alerte' ){
      this.filteredAlertes = this.alertes.slice((this.currentPageAlertes - 1) * 10, this.currentPageAlertes * 10);
    }
    else if (objet ==='mouvement' ){
      this.filteredMouvements = this.mouvementsStock.slice((this.currentPageMouvements - 1) * 10, this.currentPageMouvements * 10);
    }
    else if (objet ==='perissable' ){
      this.filteredPerissables = this.getProduitsPerissables().slice((this.currentPagePerissables - 1) * 10, this.currentPagePerissables * 10);
    }
  }

  // Gestion de la recherche
  onSearchChange(objet: string): void {
    if (objet === 'inventaire' || objet === 'qteDisponible' || objet ==='niveauStock') {
      if (objet === 'inventaire'){
        this.filteredInventaire = this.produits.filter(produit =>
          produit.designation.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          this.getNomMagasinByProduitId(produit.id!,this.stocks,this.magasins).toLowerCase().includes(this.searchTerm.toLowerCase())||
          this.getQteById(produit.id!, this.stocks).toString().toLowerCase().includes(this.searchTerm.toLowerCase())
          // produit.magasinId?.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          // produit.quantite?.toString().includes(this.searchTerm)
          //new Date(depense.date).toLocaleDateString().includes(this.searchTerm) // Filtrer par date
        );
        this.currentPageInventaire = 1; // Réinitialiser à la première page après recherche
      }
      if (objet === 'niveauStock'){
        this.filteredNiveauStock = this.produits.filter(produit =>
          produit.designation.toLowerCase().includes(this.searchTerm.toLowerCase())||
          this.getNomMagasinByProduitId(produit.id!,this.stocks,this.magasins).toLowerCase().includes(this.searchTerm.toLowerCase())||
          this.getQteById(produit.id!, this.stocks).toString().toLowerCase().includes(this.searchTerm.toLowerCase())
          /* produit.magasinId?.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          produit.quantite?.toString().includes(this.searchTerm) ||
          produit.seuilAlerte?.toString().includes(this.searchTerm) */
          //new Date(depense.date).toLocaleDateString().includes(this.searchTerm) // Filtrer par date
        );
        this.currentPageNiveauStock = 1;
      }

      if (objet === 'qteDisponible'){
        this.filteredQtesDisponibles = this.produits.filter(produit =>
          produit.designation.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          this.getQteDisponibleById(produit.id!, this.stocks).toString().toLowerCase().includes(this.searchTerm.toLowerCase())
          // produit.quantiteDisponible?.toString().includes(this.searchTerm)
          //new Date(depense.date).toLocaleDateString().includes(this.searchTerm) // Filtrer par date
        );
        this.currentPageQtesDisponibles = 1;
      }

    }
    else if (objet === 'alerte') {
      this.filteredAlertes = this.alertes.filter(alerte =>
        this.getNomProduitById(alerte.produitId)?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        alerte.quantiteDisponible.toString().includes(this.searchTerm) ||
        alerte.seuilAlerte.toString().includes(this.searchTerm)
        //new Date(recette.date).toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPageAlertes = 1;
    }
    else if (objet === 'mouvement') {
      this.filteredMouvements = this.mouvementsStock.filter(mvt =>
        this.getNomProduitById(mvt.produitId)?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        mvt.typeMouvement.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        mvt.quantite.toString().includes(this.searchTerm) ||
        new Date(mvt.dateMouvement).toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPageMouvements = 1;
    }
    else if (objet === 'perissable') {
      this.filteredPerissables = this.getProduitsPerissables().filter(perissable =>
        this.getNomProduitById(perissable.produitId)?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        perissable.quantiteTotale.toString().toLowerCase().includes(this.searchTerm.toLowerCase())
        //new Date(perissable.datePeremption).toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPagePerissables = 1;
    }
  }

  setItemsPerPage(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPageAlertes = 1;
    this.currentPageInventaire = 1;
    this.currentPageQtesDisponibles = 1;
    this.currentPageNiveauStock = 1;
    this.currentPageMouvements = 1;
    this.currentPagePerissables = 1;

    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  // Méthodes de pagination
get getPaginatedInventaire() {
  return this.paginate(this.filteredInventaire, this.currentPageInventaire, this.itemsPerPage);
}

get getPaginatedQtesDisponibles() {
  return this.paginate(this.filteredQtesDisponibles, this.currentPageQtesDisponibles, this.itemsPerPage);
}

get getPaginatedAlertes() {
  return this.paginate(this.filteredAlertes, this.currentPageAlertes, this.itemsPerPage);
}

get getPaginatedMouvements() {
  return this.paginate(this.filteredMouvements, this.currentPageMouvements, this.itemsPerPage);
}
get getPaginatedNiveauStock() {
  return this.paginate(this.filteredNiveauStock, this.currentPageNiveauStock, this.itemsPerPage);
}

get getPaginatedPerissables() {
  return this.paginate(this.filteredPerissables, this.currentPagePerissables, this.itemsPerPage);
}


paginate(data: any[], currentPage: number, itemsPerPage: number) {
  const start = (currentPage - 1) * itemsPerPage;
  return data.slice(start, start + itemsPerPage);
}

onPageChange(page: number, instanceObj: string): void {
  if(instanceObj === 'inventaire'){
    this.currentPageInventaire = page;
  }
  else if (instanceObj === 'qteDisponible') {
    this.currentPageQtesDisponibles = page;
  }

  else if (instanceObj === 'niveauStock') {
    this.currentPageNiveauStock = page;
  }
  else if (instanceObj === 'alerte') {
    this.currentPageAlertes = page;
  }
  else if (instanceObj === 'mouvement') {
    this.currentPageMouvements = page;
  }
  else if (instanceObj === 'perissable') {
    this.currentPagePerissables = page;
  }
  console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);

}
getTotalPages(list: any[]): number {
  return Math.ceil(list.length / this.itemsPerPage);
}

getQteById(produitId: number, stocks: Stock[]): number {
  const produit = stocks.find(p => p.produitId === produitId);
  return produit ? produit.quantiteTotale : 0;
}

getQteDisponibleById(produitId: number, stocks: Stock[]): number {
  const produit = stocks.find(p => p.produitId === produitId);
  return produit ? produit.quantiteDisponible : 0;
}

getMagasinById(magasinId: number, stocks: Stock[]): number {
  const stock = stocks.find(p => p.magasinId === magasinId);
  return stock ? stock.magasinId : 0; // Renvoie l'id du magasin ou 0 si aucun stock trouvé
}
getNomMagasinByProduitId(produitId: number, stocks: Stock[], magasins: Magasin[]): string {
  // Trouver le stock correspondant au produitId
  const stock = stocks.find(s => s.produitId === produitId);

  // Si un stock est trouvé, utiliser magasinId pour chercher le nom du magasin
  if (stock) {
    const magasin = magasins.find(m => m.id === stock.magasinId);
    return magasin ? magasin.nom : "Magasin introuvable"; // Retourner le nom du magasin ou un message d'erreur
  }

  return "Produit non trouvé"; // Si aucun stock pour le produit
}


}


