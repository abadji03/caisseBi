import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../../modeles/entrees-sorties.model';
import { Produits } from '../../../modeles/produit.modele';
import { FormsModule } from '@angular/forms';
import { Magasin } from '../../../modeles/magasin.model';
import { ProduitsService } from '../../../services/produits.service';
import { StockInventaireService } from '../../../services/stock-inventaire.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { finalize, forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-stock-inventaires',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-inventaires.component.html',
  styleUrl: './stock-inventaires.component.css',
})
export class StockInventairesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  searchTerm = ''; // Recherche
  filteredInventaire: Produits[] = [];
  filteredQtesDisponibles: Stock[] = [];
  filteredNiveauStock: Stock[] = [];
  filteredAlertes: Stock[] = [];
  //filteredMouvements: MouvementsStock[] = [];
  filteredPerissables: Stock[] = [];
  produitsPerissables: Produits[] = [];
  code_structure :string|null = null;
  alertes: Stock[] = [];
  niveauStock: Stock[] = [];
  qtsDisponibles: Stock[] = [];


  itemsPerPage = 5; // Nombre d'éléments par page
  currentPageAlertes = 1;
  currentPageInventaire = 1;
  currentPageQtesDisponibles = 1;
  currentPageNiveauStock = 1;
  currentPageMouvements = 1;
  currentPagePerissables = 1;

  magasins: Magasin[] = [];
  stocks: Stock[] = [];
  //mouvementsStock: MouvementsStock[] = [];
  produits: Produits[] = [];
  isLoading = false;

  private userSubscription!: Subscription;

  private produitsService = inject(ProduitsService);
  private stockServcice = inject(StockInventaireService);
  private magasinService = inject(MaagasinsService);
  private authService = inject(AuthService);
  

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser.subscribe(user => {
      //this.currentUser = user;
      // Initialiser la variable code_structure
      this.code_structure = user?.code_structure || null;
      //this.magasinId = user?.magasinId || null;
      //this.agentId = user?.id || null;
      console.log('Code structure initialisé :', this.code_structure);
      // Déterminer si on doit montrer le champ structure
      //this.isStructureAdmin = this.authService.hasRole('Administrateur'); // Ou vérifiez par ID

      // Récupérer l'ID de la structure de l'utilisateur connecté
      
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if(this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
  loadData(): void {
      this.isLoading = true;
      forkJoin([
        this.magasinService.getMagasinsByStructure(this.code_structure!),
        this.produitsService.getAllProduits(this.code_structure!),
        //this.isGeneralAdmin ? this.structureService.getAll() : of([])
        this.stockServcice.getStocksByStructure(this.code_structure!),
      ])
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: ([magasin,produit, stock]) => {
            //this.fournisseurs = four
            this.produits = produit;
            this.stocks = stock;
            this.magasins = magasin;
            this.filteredInventaire = [...this.produits];
            //this.alertes = this.stocks.filter((p) => p.quantiteTotale <= p.seuilAlerte);
            this.alertes = this.stocks.filter(p => {
            //console.log('Test:', this.getNomProduitById(p.produitId), p.quantiteTotale, p.seuilAlerte, p.quantiteTotale <= p.seuilAlerte);
              return Number(p.quantiteTotale) <= Number(p.seuilAlerte) || Number(p.quantiteTotale) <= Number(p.seuilReapprovisionnement) ;
            });

            //console.log(this.alertes);
            this.produitsPerissables= this.produits.filter((p) => p.perissable === true);
            this.qtsDisponibles = this.stocks.filter(stock => 
                (stock.quantiteTotale - (stock.quantiteReservee || 0)) > 0
            );
            this.niveauStock = this.stocks.filter(stock => stock.quantiteTotale > 0);
            this.filteredQtesDisponibles = [...this.qtsDisponibles];
            this.filteredNiveauStock = [...this.niveauStock];
            //this.filteredMouvements = [...this.mouvementsStock];
            this.filteredAlertes = [...this.alertes];
            this.filteredPerissables = [...this.getProduitsPerissables()];
            this.updatefilteredTable('inventaire');
            this.updatefilteredTable('qteDisponible');
            this.updatefilteredTable('niveauStock');
            this.updatefilteredTable('alerte');
            this.updatefilteredTable('mouvement');
            this.updatefilteredTable('perissable');
          },
          error: (err) => console.error('Erreur chargement données', err),
        });
    }
  // Méthodes pour afficher les informations
  getProduitsParMagasin(magasin: number) {
    return this.stocks.filter((p) => p.magasinId === magasin);
  }

  /* getProduitsPerissables() {
    return this.produits.filter(p => p.perissable);
  } */

  getProduitsNonPerissables() {
    return this.produits.filter((p) => !p.perissable);
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
  /* ajouterMouvement(mouvement: MouvementsStock) {
    this.mouvementsStock.push(mouvement);
    console.log('Mouvement ajouté:', mouvement);
  } */

  getProduitsPerissables(): Stock[] {
    return this.stocks.filter(
      (produit) =>
        produit.datePeremption &&
        new Date(produit.datePeremption).getTime() < new Date().getTime() + 7 * 24 * 60 * 60 * 1000, // Moins de 7 jours
    );
  }

  // Méthode pour obtenir le nom du produit à partir de l'id
  getNomProduitById(id: number): string | null {
    const produit = this.produits.find((p) => p.id === id);
    return produit ? produit.designation : null; // On retourne `null` si le produit n'est pas trouvé
  }

  // Méthode pour mettre à jour les recettes, les dépenses, les paiement et les catégories
  updatefilteredTable(objet: string): void {
    if (objet === 'inventaire') {
      this.filteredInventaire = this.produits.slice(
        (this.currentPageInventaire - 1) * 10,
        this.currentPageInventaire * 10,
      );
    } else if (objet === 'qteDisponible') {
      this.filteredQtesDisponibles = this.qtsDisponibles.slice(
        (this.currentPageQtesDisponibles - 1) * 10,
        this.currentPageQtesDisponibles * 10,
      );
    } else if (objet === 'niveauStock') {
      this.filteredNiveauStock = this.niveauStock.slice(
        (this.currentPageNiveauStock - 1) * 10,
        this.currentPageNiveauStock * 10,
      );
    } else if (objet === 'alerte') {
      this.filteredAlertes = this.alertes.slice(
        (this.currentPageAlertes - 1) * 10,
        this.currentPageAlertes * 10,
      );
    } /* else if (objet === 'mouvement') {
      this.filteredMouvements = this.mouvementsStock.slice(
        (this.currentPageMouvements - 1) * 10,
        this.currentPageMouvements * 10,
      );
    } */ else if (objet === 'perissable') {
      this.filteredPerissables = this.getProduitsPerissables().slice(
        (this.currentPagePerissables - 1) * 10,
        this.currentPagePerissables * 10,
      );
    }
  }

  // Gestion de la recherche
  onSearchChange(objet: string): void {
    if (objet === 'inventaire' || objet === 'qteDisponible' || objet === 'niveauStock') {
      if (objet === 'inventaire') {
        this.filteredInventaire = this.produits.filter(
          (produit) =>
            produit.designation.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            this.getNomMagasinByProduitId(produit.id!, this.stocks, this.magasins)
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()) ||
            this.getQteById(produit.id!, this.stocks)
              .toString()
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()),
          // produit.magasinId?.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          // produit.quantite?.toString().includes(this.searchTerm)
          //new Date(depense.date).toLocaleDateString().includes(this.searchTerm) // Filtrer par date
        );
        this.currentPageInventaire = 1; // Réinitialiser à la première page après recherche
      }
      if (objet === 'niveauStock') {
        this.filteredNiveauStock = this.niveauStock.filter(
          (produit) =>
            this.getNomProduitById(produit.id)?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            this.getNomMagasinByProduitId(produit.id!, this.stocks, this.magasins)
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()) ||
            this.getQteById(produit.id!, this.stocks)
              .toString()
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()),
          /* produit.magasinId?.toString().toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          produit.quantite?.toString().includes(this.searchTerm) ||
          produit.seuilAlerte?.toString().includes(this.searchTerm) */
          //new Date(depense.date).toLocaleDateString().includes(this.searchTerm) // Filtrer par date
        );
        this.currentPageNiveauStock = 1;
      }

      if (objet === 'qteDisponible') {
        this.filteredQtesDisponibles = this.qtsDisponibles.filter(
          (produit) =>
            this.getNomProduitById(produit.id)?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            this.getQteDisponibleById(produit.id!, this.stocks)
              .toString()
              .toLowerCase()
              .includes(this.searchTerm.toLowerCase()),
          // produit.quantiteDisponible?.toString().includes(this.searchTerm)
          //new Date(depense.date).toLocaleDateString().includes(this.searchTerm) // Filtrer par date
        );
        this.currentPageQtesDisponibles = 1;
      }
    } else if (objet === 'alerte') {
      this.filteredAlertes = this.alertes.filter(
        (alerte) =>
          this.getNomProduitById(alerte.produitId)
            ?.toLowerCase()
            .includes(this.searchTerm.toLowerCase()) ||
          alerte.quantiteDisponible.toString().includes(this.searchTerm) ||
          alerte.seuilAlerte.toString().includes(this.searchTerm),
        //new Date(recette.date).toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPageAlertes = 1;
    } /* else if (objet === 'mouvement') {
      this.filteredMouvements = this.mouvementsStock.filter(
        (mvt) =>
          this.getNomProduitById(mvt.produitId)
            ?.toLowerCase()
            .includes(this.searchTerm.toLowerCase()) ||
          mvt.typeMouvement.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          mvt.quantite.toString().includes(this.searchTerm) ||
          new Date(mvt.dateMouvement).toLocaleDateString().includes(this.searchTerm),
      );
      this.currentPageMouvements = 1;
    } */ else if (objet === 'perissable') {
      this.filteredPerissables = this.getProduitsPerissables().filter(
        (perissable) =>
          this.getNomProduitById(perissable.produitId)
            ?.toLowerCase()
            .includes(this.searchTerm.toLowerCase()) ||
          perissable.quantiteTotale
            .toString()
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase()),
        //new Date(perissable.datePeremption).toLocaleDateString().includes(this.searchTerm)
      );
      this.currentPagePerissables = 1;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItemsPerPage(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPageAlertes = 1;
    this.currentPageInventaire = 1;
    this.currentPageQtesDisponibles = 1;
    this.currentPageNiveauStock = 1;
    this.currentPageMouvements = 1;
    this.currentPagePerissables = 1;

    //this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  // Méthodes de pagination
  get getPaginatedInventaire() {
    return this.paginate(this.filteredInventaire, this.currentPageInventaire, this.itemsPerPage);
  }

  get getPaginatedQtesDisponibles() {
    return this.paginate(
      this.filteredQtesDisponibles,
      this.currentPageQtesDisponibles,
      this.itemsPerPage,
    );
  }

  get getPaginatedAlertes() {
    return this.paginate(this.filteredAlertes, this.currentPageAlertes, this.itemsPerPage);
  }

  /* get getPaginatedMouvements() {
    return this.paginate(this.filteredMouvements, this.currentPageMouvements, this.itemsPerPage);
  } */
  get getPaginatedNiveauStock() {
    return this.paginate(this.filteredNiveauStock, this.currentPageNiveauStock, this.itemsPerPage);
  }

  get getPaginatedPerissables() {
    return this.paginate(this.filteredPerissables, this.currentPagePerissables, this.itemsPerPage);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paginate(data: any[], currentPage: number, itemsPerPage: number) {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }

  onPageChange(page: number, instanceObj: string): void {
    if (instanceObj === 'inventaire') {
      this.currentPageInventaire = page;
    } else if (instanceObj === 'qteDisponible') {
      this.currentPageQtesDisponibles = page;
    } else if (instanceObj === 'niveauStock') {
      this.currentPageNiveauStock = page;
    } else if (instanceObj === 'alerte') {
      this.currentPageAlertes = page;
    } else if (instanceObj === 'mouvement') {
      this.currentPageMouvements = page;
    } else if (instanceObj === 'perissable') {
      this.currentPagePerissables = page;
    }
    console.log(`Changement de page ${instanceObj} -> Page actuelle :`, page);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTotalPages(list: any[]): number {
    return Math.ceil(list.length / this.itemsPerPage);
  }

  getQteById(produitId: number, stocks: Stock[]): number {
    const produit = stocks.find((p) => p.produitId === produitId);
    return produit ? produit.quantiteTotale : 0;
  }

  getQteDisponibleById(produitId: number, stocks: Stock[]): number {
    const produit = stocks.find((p) => p.produitId === produitId);
    // return produit ? produit.quantiteDisponible : 0;
    return produit ? produit.quantiteTotale-produit.quantiteReservee : 0;
  }

  getMagasinById(magasinId: number, stocks: Stock[]): number {
    const stock = stocks.find((p) => p.magasinId === magasinId);
    return stock ? stock.magasinId : 0; // Renvoie l'id du magasin ou 0 si aucun stock trouvé
  }
  getNomMagasinByProduitId(produitId: number, stocks: Stock[], magasins: Magasin[]): string {
    // Trouver le stock correspondant au produitId
    const stock = stocks.find((s) => s.produitId === produitId);

    // Si un stock est trouvé, utiliser magasinId pour chercher le nom du magasin
    if (stock) {
      const magasin = magasins.find((m) => m.id === stock.magasinId);
      return magasin ? magasin.nom : 'Magasin introuvable'; // Retourner le nom du magasin ou un message d'erreur
    }

    return 'Produit non trouvé'; // Si aucun stock pour le produit
  }
}
