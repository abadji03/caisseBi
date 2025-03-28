import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';  // Import jsPDF
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import * as ExcelJS from 'exceljs';
import { Magasin } from '../../../modeles/magasin.model';
import { Produits } from '../../../modeles/produit.modele';
import { MouvementsStock, Stock } from '../../../modeles/entrees-sorties.model';
import { Transfert } from '../../../modeles/transfert.model';
import html2canvas from 'html2canvas';
import { magasins, produits, stocks,mouvements } from '../../../modeles/donnees_fictives';


@Component({
  selector: 'app-rapports-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-ventes.component.html',
  styleUrl: './rapports-ventes.component.css'
})
export class RapportsVentesComponent implements OnInit {

   // Variables pour les graphiques
   @ViewChild('evolutionChart') evolutionChartRef!: ElementRef;
   @ViewChild('repartitionChart') repartitionChartRef!: ElementRef;
   @ViewChild('topProduitsChart') topProduitsChartRef!: ElementRef;
   evolutionChart: any;
   repartitionChart: any;
   topProduitsChart: any;


  dateGeneration = new Date();
  dateDebut: string="";
  dateFin: string= "";
  stocks: Stock[] = [];
   // Variables pour les filtres
   magasins: Magasin[] = [ ];
   magasinSelectionne: Magasin | null = null;
   selectedMagasin: string = 'Toutes les succursales';
   categorie: string = 'all';
   statut: string = 'all';
   selectedMagasinId: number = -1;  // Pour les administrateurs
   isAdmin: boolean = true;  // Simuler un utilisateur admin, à remplacer par un réel contrôle d'accès

   searchTerm = ''; // Recherche
   pageSize:number = 5;
   currentPage:number=1;
   filteredProduits:Produits[] =[];
   filteredMouvements:MouvementsStock[] =[];
   allStocks: Stock[] = []; // Tous les stocks de tous les magasins
   allProduits: Produits[] = []; // Tous les produits de tous les magasins
   allMouvements: MouvementsStock[] = []; // Tous les produits de tous les magasins
   allTransferts: Transfert[] = []; // Tous les produits de tous les magasins

   // Variables de vue d'ensemble
   valeurTotaleStockAchatInitial: number = 0; // Calculée dynamiquement
   totalProduits: number = 0; // Calculé dynamiquement
   produitsEnAlerte: number = 0;  // Calculé dynamiquement
   produitsRupture: number = 0;  // Calculé dynamiquement
   valeurTotaleVenteStockAchatFinal: number = 0;  // Calculé dynamiquement
   produitsPerissable: number = 0;  // Calculé dynamiquement
   produitsUniques: number = 0;  // Calculé dynamiquement
   produitsEnSurStock: number = 0;  // Calculé dynamiquement
   produitsAReapprovisionne: number = 0;  // Calculé dynamiquement

   constructor(private cdr:ChangeDetectorRef) {
    Chart.register(...registerables);
   }

   ngOnInit(): void {
    this.loadMagasins();

    // Initialiser les dates pour filtrage
    this.initDateFilters();

    this.filtrerStock();
    this.updateGlobalStats();
  }

  // Initialisation des dates de début et de fin (du lundi au jour actuel)
  private initDateFilters(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    this.dateDebut = this.formatDate(monday);
    this.dateFin = this.formatDate(today);
  }
  // Méthode pour créer/mettre à jour les graphiques
  updateCharts(): void {
    this.createEvolutionChart();
    this.createRepartitionChart();
    this.createTopProduitsChart();
  }

  // Graphique d'évolution du stock dans le temps
  createEvolutionChart(): void {
    if (this.evolutionChart) {
      this.evolutionChart.destroy();
    }

    // Préparer les données
    const dates = this.getDatesBetween(new Date(this.dateDebut), new Date(this.dateFin));
    const stockValues = dates.map(date => {
      const stocksAtDate = this.stocks.filter(stock => {
        const stockDate = this.resetTime(new Date(stock.dateDerniereMiseAJour));
        return stockDate <= date &&
               (this.selectedMagasinId === -1 || stock.magasinId === this.selectedMagasinId);
      });
      return stocksAtDate.reduce((sum, stock) => sum + stock.quantiteDisponible, 0);
    });


    const ctx = this.evolutionChartRef?.nativeElement.getContext('2d');
    if (ctx) {
      this.evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates.map(date => this.formatDateForChart(date)),
          datasets: [{
            label: 'Évolution du stock total',
            data: stockValues,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Évolution du stock dans le temps'
            }
          },
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });
    }
  }

  // Graphique de répartition par catégorie
  createRepartitionChart(): void {
    if (this.repartitionChart) {
      this.repartitionChart.destroy();
    }

    // Debug: Vérifier les données sources
    console.log('Stocks:', this.stocks);
    console.log('Produits:', this.filteredProduits);

    // Grouper par catégorie
    const categories = new Map<string, number>();

    this.stocks.forEach(stock => {
      const produit = this.filteredProduits.find(p => p.id === stock.produitId);
      if (produit) {
        const cat = produit.famille?.trim() || 'Non catégorisé'; // trim() pour enlever les espaces
        const currentValue = categories.get(cat) || 0;
        categories.set(cat, currentValue + (stock.quantiteDisponible || 0));
      } else {
        console.warn('Produit non trouvé pour le stock:', stock);
      }
    });

    // Debug: Afficher les catégories regroupées
    console.log('Catégories regroupées:', Array.from(categories.entries()));

    // Filtrer les catégories avec quantité > 0
    const filteredCategories = Array.from(categories.entries())
      .filter(([_, value]) => value > 0);

    if (filteredCategories.length === 0) {
      console.error('Aucune donnée valide pour le graphique');
      return;
    }

    const ctx = this.repartitionChartRef?.nativeElement.getContext('2d');
    if (ctx) {
      this.repartitionChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: filteredCategories.map(([label, _]) => label),
          datasets: [{
            data: filteredCategories.map(([_, value]) => value),
            backgroundColor: [
              'rgb(255, 99, 132)',
              'rgb(54, 162, 235)',
              'rgb(255, 205, 86)',
              'rgb(75, 192, 192)',
              'rgb(153, 102, 255)',
              'rgb(255, 159, 64)',
              'rgb(199, 199, 199)',
              'rgb(83, 102, 255)'
            ],
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Répartition du stock par catégorie'
            },
            tooltip: {
              callbacks: {
                label: function(context: { label?: string; raw?: unknown; dataset: { data: unknown[] } }) {
                  const label = context.label || '';
                  const value = Number(context.raw) || 0;
                  const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  // Graphique des produits les plus vendus
  createTopProduitsChart(): void {
    if (this.topProduitsChart) {
      this.topProduitsChart.destroy();
    }

    // Calculer les ventes par produit
    const produitsVentes = new Map<string, number>();
    this.filteredMouvements.forEach(mvt => {
      if (mvt.typeMouvement === 'Sortie' && mvt.quantite > 0) {
        const produit = this.allProduits.find(p => p.id === mvt.produitId);
        if (produit) {
          const currentValue = produitsVentes.get(produit.designation) || 0;
          produitsVentes.set(produit.designation, currentValue + mvt.quantite);
        }
      }
    });

    // Trier et prendre les 10 premiers
    const sortedProduits = Array.from(produitsVentes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const ctx = this.topProduitsChartRef?.nativeElement.getContext('2d');
    if (ctx) {
      this.topProduitsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedProduits.map(item => item[0]),
          datasets: [{
            label: 'Quantité vendue',
            data: sortedProduits.map(item => item[1]),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Top 10 des produits les plus vendus'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  // Helper method to get dates between two dates
  private getDatesBetween(startDate: Date, endDate: Date): Date[] {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  // Helper method to format date for chart labels
  private formatDateForChart(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

// Méthode appeler quand on change les dates de début et de fin
  filtrerDates(): void {
  this.filtrerStock();
}

exportToPDF() {
  const reportElement = document.getElementById('rapport');
  const reportHeader = document.getElementById('rapport-pdf');

  if (!reportElement || !reportHeader) {
    console.error("Élément(s) du rapport non trouvé(s).");
    return;
  }

  // Afficher temporairement l'entête pour la capture
  reportHeader.style.display = "block";

  setTimeout(() => {
    html2canvas(reportElement, { scale: 2, useCORS: true }).then(canvas => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.height - 20; // Hauteur de la page sans marges
      const imgWidth = 180; // Largeur de l'image
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // Hauteur de l'image proportionnelle

      let yPosition = 10; // Position Y initiale
      let remainingHeight = canvas.height; // Hauteur totale du rapport
      let currentPage = 0;

      while (remainingHeight > 0) {
        let canvasSlice = document.createElement("canvas");
        let context = canvasSlice.getContext("2d");

        // Définir la hauteur de la partie capturée (max pageHeight)
        let sliceHeight = Math.min(remainingHeight, pageHeight * (canvas.height / imgHeight));
        canvasSlice.width = canvas.width;
        canvasSlice.height = sliceHeight;

        // Copier uniquement la partie visible dans le canvas temporaire
        context?.drawImage(canvas, 0, currentPage * pageHeight * (canvas.height / imgHeight), canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        // Convertir en image
        let imgData = canvasSlice.toDataURL("image/png");
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, (sliceHeight * imgWidth) / canvas.width);

        remainingHeight -= sliceHeight;
        currentPage++;

        if (remainingHeight > 0) {
          pdf.addPage(); // Ajouter une nouvelle page si du contenu reste
        }
      }

      pdf.save("Rapport_Stock.pdf");

      // Masquer à nouveau l'entête après la capture
      reportHeader.style.display = "none";

    }).catch(error => console.error("Erreur lors de la capture HTML2Canvas :", error));
  }, 1000); // Délai pour assurer le rendu
}


onMagasinSelect(event: Event): void {
  const target = event.target as HTMLSelectElement;
  this.selectedMagasinId = Number(target.value) || -1;
  this.filtrerStock();
}


// Méthode pour appliquer les filtres
filtrerStock(): void {
  if (!this.dateDebut || !this.dateFin) return;

  const startDate = this.resetTime(new Date(this.dateDebut));
  const endDate = this.resetTime(new Date(this.dateFin));

  this.stocks = this.allStocks.filter(stock => {
    const stockDate = this.resetTime(new Date(stock.dateDerniereMiseAJour));
    const isInDateRange = stockDate >= startDate && stockDate <= endDate;
    return this.selectedMagasinId === -1 ? isInDateRange : (stock.magasinId === this.selectedMagasinId && isInDateRange);
  });

  this.filteredProduits = this.allProduits.filter(produit =>
  this.stocks.some(stock => stock.produitId === produit.id)
  );
  this.filteredMouvements = this.allMouvements.filter(mvt =>
    this.stocks.some(stock => stock.id === mvt.stockId)
    );

  this.updateGlobalStats();
  this.cdr.detectChanges();  // Mise à jour de la vue
  //this.updateChart1s();
  this.updateCharts();
}

 // Formater la date en YYYY-MM-DD pour l'affichage dans <input type="date">
formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Réinitialiser l'heure pour comparer uniquement les dates (évite les erreurs de fuseau horaire)
private resetTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}


  updateGlobalStats(): void {
    this.valeurTotaleStockAchatInitial = this.getStatGlobauxProduits().totalValeurStockInitial;
    this.valeurTotaleVenteStockAchatFinal = this.getStatGlobauxProduits().totalValeurStockFinal;
    this.produitsEnAlerte = Stock.compterProduitsEnAlerte(this.stocks);
    this.produitsRupture = Stock.compterProduitsEnRupture(this.stocks);
    this.totalProduits = Stock.compterProduitsTotal(this.stocks);
    this.produitsPerissable = Stock.compterProduitsPerissables(this.stocks, this.filteredProduits);
    this.produitsUniques = Stock.compterProduitsUniques(this.stocks);
    this.produitsAReapprovisionne = Stock.compterProduitsAReapprovisionner(this.stocks);
    this.produitsEnSurStock = Stock.compterProduitsEnSurstock(this.stocks);

  }


getStockParMagasin(magasin: Magasin): Stock[] {
    return this.stocks.filter(stock => stock.magasinId === magasin.id);
}

/* getStockInitalProduit(prod: number): number {
  return MouvementsStock.getStockInitial(prod,this.selectedMagasinId,new Date(this.dateDebut),this.stocks, this.allMouvements);
} */

  getStatProduit(prod: Produits) {
    const prixUnitaire = this.getDernierPrixAchatById(prod.id)
    return MouvementsStock.calculerStatistiques(
      this.filteredMouvements,
      this.stocks,
      prixUnitaire,
      new Date(this.dateDebut),
      new Date(this.dateFin),
      this.selectedMagasinId,
      prod.id
    );
  }

  getStatGlobauxProduits() {
    return MouvementsStock.calculerStatistiquesGlobaux(
      this.filteredMouvements,
      this.stocks,
      new Date(this.dateDebut),
      new Date(this.dateFin),
      this.selectedMagasinId,
    );
  }

  get getListeProduitsEnAlerte() {
    console.log("Produits en alerte:", this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilAlerte));
    return this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilAlerte) || [];
  }

  get getListeProduitsEnRupture() {
    console.log("Produits en rupture:", this.stocks?.filter(stock => stock.quantiteDisponible === 0));
    return this.stocks?.filter(stock => stock.quantiteDisponible === 0) || [];
  }

  get getListeProduitsAReapprovisionner() {
    console.log("Produits à réapprovisionner:", this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilReapprovisionnement));
    return this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilReapprovisionnement) || [];
  }

  get getListeProduitsEnSurstockr() {
    console.log("Produits en surstock:", this.stocks?.filter(stock => stock.quantiteDisponible > stock.seuilReapprovisionnement));
    return this.stocks?.filter(stock => stock.quantiteDisponible > stock.seuilReapprovisionnement) || [];
  }




getAllProduits(): Produits[] {
  return this.allProduits; // Retourne tous les produits
}

getAllStocks(): Stock[] {
  return this.allStocks; // Retourne tous les stocks
}
getAllSMouvements(): MouvementsStock[] {
  return this.allMouvements; // Retourne tous les stocks
}

   exportToExcel() {
     let workbook = new ExcelJS.Workbook();
     let worksheet = workbook.addWorksheet('Rapport Stocks');

     worksheet.addRow(['Valeur Totale du Stock', this.valeurTotaleStockAchatInitial]);
     worksheet.addRow(['Nombre Total de Produits', this.totalProduits]);
     worksheet.addRow(['Produits en Alerte', this.produitsEnAlerte]);
     worksheet.addRow(['Produits en Rupture', this.produitsRupture]);

     workbook.xlsx.writeBuffer().then((data) => {
       let blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
       let url = window.URL.createObjectURL(blob);
       let a = document.createElement('a');
       a.href = url;
       a.download = 'rapport_stock.xlsx';
       a.click();
     });
   }

   loadMagasins(): void {

    this.magasins = magasins;
    this.allProduits = produits;
    this.allMouvements = mouvements;
    this.allStocks = stocks;
    this.stocks = [...this.allStocks]; // Initialiser avec tous les stocks
    this.filteredProduits = [...this.allProduits]; // Initialiser avec tous les produits
    this.filteredMouvements = [...this.allMouvements]; // Initialiser avec tous les mouvements filtrés

  }


  getQteById(produitId: number): number {
    return this.stocks.find(p => p.produitId === produitId)?.quantiteTotale ?? 0;
  }

  getDateUpdateById(produitId: number): Date {
    return this.stocks.find(p => p.produitId === produitId)?.dateDerniereMiseAJour ?? new Date(1900, 9, 19);
  }

  getStatutProduitById(produitId: number): string {
    return this.stocks.find(p => p.produitId === produitId)?.statutStock ?? "Statut introuvable";
  }

  getValeurStockById(produitId: number): number {
    return this.stocks.find(p => p.produitId === produitId)?.valeurTotaleStock ?? 0;
  }

  // Gestion de la recherche
  onSearchChange(): void {
    const search = this.searchTerm.toLowerCase();
    this.filteredProduits = this.allProduits.filter(prod =>
      prod.famille?.toLowerCase().includes(search) ||
      this.getStatutProduitById(prod.id).toLowerCase().includes(search)
    );
    this.currentPage = 1;
  }


// Méthode pour mettre à jour les recettes, les dépenses, les paiement et les catégories
updatefilteredTable(): void {

  this.filteredProduits = this.allProduits.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);

}

setItemsPerPage(event: any) {
  this.pageSize = Number(event.target.value);
  this.currentPage =1;
  this.cdr.detectChanges(); // Forcer la mise à jour de la vue
}

// Méthode pour obtenir le nom du produit à partir de l'id
getNomProduitById(id: number): string | null {
  const produit = this.allProduits.find(p => p.id === id);
  return produit ? produit.designation : null;  // On retourne `null` si le produit n'est pas trouvé
}
// Méthode pour obtenir le nom du produit à partir de l'id
getDernierPrixAchatById(id: number): number {
  const stk = this.stocks.find(p => p.produitId === id);
  return stk ? stk.dernierPrixAchat??0 : 0;  // On retourne `null` si le produit n'est pas trouvé
}
getDernierPrixVenteById(id: number): number {
  const stk = this.stocks.find(p => p.produitId === id);
  return stk ? stk.prixVenteUnitaire??0 : 0;  // On retourne `null` si le produit n'est pas trouvé
}
// Méthode pour obtenir le nom du produit à partir de l'id
getNomMagasinsById(id: number): string | null {
  const produit = this.magasins.find(m => m.id === id);
  return produit ? produit.nom : null;  // On retourne `null` si le produit n'est pas trouvé
}

get getPaginatedProduits() {
  return this.paginate(this.filteredProduits, this.currentPage, this.pageSize);
}

paginate(data: any[], currentPage: number, itemsPerPage: number): any[] {
  const start = (currentPage - 1) * itemsPerPage;
  return data.slice(start, start + itemsPerPage);
}


onPageChange(page: number): void {
    this.currentPage = page;
}
getTotalPages(list: any[]): number {
  return Math.ceil(list.length / this.pageSize);
}
}
