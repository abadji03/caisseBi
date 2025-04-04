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
  selector: 'app-rapports-stocks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-stocks.component.html',
  styleUrl: './rapports-stocks.component.css'
})
export class RapportsStocksComponent implements OnInit {
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
   isPrinting : boolean = false;
   isGeneratingPDF: boolean = false;
   progress:number = 0;

   searchTerm = ''; // Recherche
   pageSize:number = 5;
   currentPage:number=1;
   currentPageMvt:number=1;
   filteredProduits:Produits[] =[];
   filteredMouvements:MouvementsStock[] =[];
   allStocks: Stock[] = []; // Tous les stocks de tous les magasins
   allProduits: Produits[] = []; // Tous les produits de tous les magasins
   allMouvements: MouvementsStock[] = []; // Tous les produits de tous les magasins
   allTransferts: Transfert[] = []; // Tous les produits de tous les magasins

   maxItems: number = 0;

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

  updateMaxItems() {
    const produitsLength = this.filteredProduits ? this.filteredProduits.length : 0;
    const mouvementsLength = this.filteredMouvements ? this.filteredMouvements.length : 0;
    this.maxItems = Math.max(produitsLength, mouvementsLength);
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
    //console.log('Stocks:', this.stocks);
    //console.log('Produits:', this.filteredProduits);

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
    //console.log('Catégories regroupées:', Array.from(categories.entries()));

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

/* exportToPDF() {
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
} */

   /* impression() {
    this.isPrinting = true; // Afficher les éléments avant la capture
    const printContent = document.getElementById('rapport');
    if (!printContent) return;

    const originalNoPrinterElements = document.querySelectorAll('.no-printer');
    //const originalPrinterOnlyElements = document.querySelectorAll('.printer-only');

    // Masquer les éléments interdits à l'impression et afficher ceux réservés au PDF
    originalNoPrinterElements.forEach(el => (el as HTMLElement).style.display = 'none');
    //originalPrinterOnlyElements.forEach(el => (el as HTMLElement).style.display = 'block');

    window.print();

    // Réafficher les éléments après l'impression
    originalNoPrinterElements.forEach(el => (el as HTMLElement).style.display = '');
    //originalPrinterOnlyElements.forEach(el => (el as HTMLElement).style.display = 'none');
    this.isPrinting = false; // Afficher les éléments avant la capture

  } */

    async impression() {
      this.isPrinting = true;

      // 1. Préparer les graphiques AVANT le clonage
      await this.prepareChartsForExport();

      // 2. Obtenir l'élément original
      const printContent = document.getElementById('rapport');
      if (!printContent) return;

      // 3. Convertir les canvas en images dans l'ORIGINAL avant clonage
      await this.convertChartsToImages(printContent);

      // 4. Maintenant cloner l'élément avec les images déjà converties
      const clone = printContent.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.width = '100%';
      clone.id = 'print-clone';

      // 5. Styles d'impression
      const style = document.createElement('style');
      style.innerHTML = `
        body > * {
          display: none !important;
        }
        #print-clone {
          display: block !important;
          visibility: visible !important;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white;
        }
        .no-printer {
          display: none !important;
        }
        .printer-only {
          display: block !important;
        }
      `;

      document.body.appendChild(style);
      document.body.appendChild(clone);

      // 6. Délai plus long pour assurer le rendu
      setTimeout(() => {
        window.print();

        // 7. Nettoyage
        document.body.removeChild(clone);
        document.head.removeChild(style);
        this.isPrinting = false;

        // 8. Re-créer les graphiques dans l'original si nécessaire
        this.recreateCharts();
      }, 800); // Délai augmenté
    }

    /* private async prepareChartsForExport() {
      // Forcer le rendu de tous les graphiques
      const charts = [this.evolutionChart, this.repartitionChart, this.topProduitsChart];
      charts.forEach(chart => {
        if (chart) {
          chart.resize(); // Ajuster aux nouvelles dimensions
          chart.render(); // Forcer le rendu
        }
      });
      // Pause pour le rendu
      await new Promise(resolve => setTimeout(resolve, 300));
    } */

    private async convertChartsToImages(element: HTMLElement) {
      const canvases = element.querySelectorAll('canvas');

      for (const canvas of Array.from(canvases)) {
        const canvasEl = canvas as HTMLCanvasElement;

        // Créer une image de haute qualité
        const img = new Image();
        img.src = canvasEl.toDataURL('image/png', 1.0);
        img.style.width = canvasEl.offsetWidth + 'px';
        img.style.height = canvasEl.offsetHeight + 'px';

        // Créer un conteneur pour préserver l'espacement
        const container = document.createElement('div');
        container.style.width = canvasEl.offsetWidth + 'px';
        container.style.height = canvasEl.offsetHeight + 'px';
        container.appendChild(img);

        // Remplacer le canvas
        canvasEl.parentNode?.replaceChild(container, canvasEl);

        // Petite pause entre chaque conversion
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    private recreateCharts() {
      // Implémentez la recréation des graphiques si nécessaire
      // Par exemple: this.initCharts();
      this.prepareChartsForExport(); // Redessine les graphiques dans la nouvelle fenêtre
    }

  async exportToPDF() {
    this.isGeneratingPDF = true; // Afficher le loader
    this.progress = 0; // Initialisation de la barre de progression

    this.isPrinting = true; // Afficher les éléments avant la capture
    await this.prepareChartsForExport();

    const noPrintElements = document.querySelectorAll('.no-printer');
    noPrintElements.forEach(el => el.classList.add('d-none'));

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const element = document.getElementById('rapport');
      if (!element) {
        console.error("Élément 'rapport' non trouvé.");
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a3');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
      });

      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPosition = margin;
      let currentHeight = imgHeight;

      let stepCount = Math.ceil(canvas.height / (pageHeight - 2 * margin)); // Nombre total d'étapes
      let step = 0; // Étape actuelle

      if (currentHeight > pageHeight - 2 * margin) {
        let pageCanvas = document.createElement('canvas');
        let pageCtx = pageCanvas.getContext('2d');

        let sX = 0, sY = 0, dX = canvas.width, dY = (pageHeight - 2 * margin) * (canvas.width / imgWidth);

        while (sY < canvas.height) {
          pageCanvas.width = dX;
          pageCanvas.height = dY;
          pageCtx?.drawImage(canvas, sX, sY, dX, dY, 0, 0, dX, dY);

          let pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, dY * (imgWidth / dX));

          sY += dY;
          step++; // Incrémentation de la progression
          this.progress = Math.round((step / stepCount) * 100); // Mise à jour de la barre

          if (sY < canvas.height) {
            pdf.addPage();
          }

          await new Promise(resolve => setTimeout(resolve, 100)); // Délai pour voir la progression
        }
      } else {
        let imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        this.progress = 100; // Fin de la progression
      }

      pdf.save('rapport_stock.pdf');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
    } finally {
      noPrintElements.forEach(el => el.classList.remove('d-none'));
      this.isPrinting = false;
      this.isGeneratingPDF = false; // Cacher le loader après la génération
      this.progress = 0;
    }
  }


  // Ajoutez cette méthode à votre composant
async prepareChartsForExport() {
  const charts = [
    this.evolutionChart,
    this.repartitionChart,
    this.topProduitsChart
  ];

  // Forcer le rendu des graphiques
  charts.forEach(chart => {
    if (chart) {
      chart.resize();
      chart.render();
    }
  });

  // Attendre que les graphiques soient rendus
  await new Promise(resolve => setTimeout(resolve, 400));
}


onMagasinSelect(event: Event): void {
  const target = event.target as HTMLSelectElement;
  this.selectedMagasinId = Number(target.value) || -1;
  this.filtrerStock();
}

/* impression(): void {
  window.print();
} */


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
  this.updateMaxItems();
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

  get getListeProduitsProchesPeremption() {
    const today = new Date();
    return this.stocks?.filter(stock => {
      const datePeremption = new Date(stock.datePeremption);
      return datePeremption.getTime() - today.getTime() <= 15 * 24 * 60 * 60 * 1000; // Moins de 15 jours
    }) || [];
  }

  get getListeProduitsRecemmentAjoutes() {
    const today = new Date();
    return this.stocks?.filter(stock => {
      const dateAjout = new Date(stock.dateDerniereMiseAJour);
      return today.getTime() - dateAjout.getTime() <= 30 * 24 * 60 * 60 * 1000; // Ajoutés il y a moins de 30 jours
    }) || [];
  }

  // Méthode pour compter les ventes d'un produit
  get getListeProduitsPlusVendus() {
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

    // Trier et prendre les 10 premiers noms de produits
    return Array.from(produitsVentes.entries())
      .sort((a, b) => b[1] - a[1]) // Trier par quantité vendue décroissante
      .slice(0, 10) // Garder les 10 premiers
      .map(([nomProduit]) => nomProduit); // Extraire uniquement les noms des produits
  }

  get getListeProduitsRotationLente() {
    return this.stocks?.filter(stock => {
      const ventes = this.getVentesProduit(stock.produitId);
      return ventes < 5; // On considère <5 ventes/mois comme rotation lente
    }) || [];
  }

  // Méthode pour calculer les ventes d'un produit
  getVentesProduit(produitId: number): number {
    if (!this.allMouvements) return 0;

    const dernierMois = new Date();
    dernierMois.setMonth(dernierMois.getMonth() - 1); // Période = 1 mois

    return this.filteredMouvements
      .filter(mvt =>
        mvt.produitId === produitId &&
        mvt.typeMouvement === 'Sortie' && // Si tu as une distinction entrée/sortie
        new Date(mvt.dateMouvement) >= dernierMois
      )
      .reduce((total, mvt) => total + mvt.quantite, 0);
  }


  get getListeProduitsEnAlerte() {
    //console.log("Produits en alerte:", this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilAlerte));
    return this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilAlerte) || [];
  }

  get getListeProduitsEnRupture() {
    //console.log("Produits en rupture:", this.stocks?.filter(stock => stock.quantiteDisponible === 0));
    return this.stocks?.filter(stock => stock.quantiteDisponible === 0) || [];
  }

  get getListeProduitsAReapprovisionner() {
    //console.log("Produits à réapprovisionner:", this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilReapprovisionnement));
    return this.stocks?.filter(stock => stock.quantiteDisponible <= stock.seuilReapprovisionnement) || [];
  }

  get getListeProduitsEnSurstockr() {
    //console.log("Produits en surstock:", this.stocks?.filter(stock => stock.quantiteDisponible > stock.seuilReapprovisionnement));
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

   /* exportToExcel() {
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
   } */

     async exportToExcel() {
      // Vérifier si ExcelJS est disponible
      if (!ExcelJS) {
        console.error("ExcelJS n'est pas chargé.");
        return;
      }

      // Créer un nouveau classeur Excel
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Votre Application';
      workbook.lastModifiedBy = 'Utilisateur';
      workbook.created = new Date();
      workbook.modified = new Date();

      // ✅ Feuille "Résumé"
      const summarySheet = workbook.addWorksheet('Résumé');

      // 🎨 Styles
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' } },
        alignment: { vertical: 'middle', horizontal: 'center' }
      };

      const dataStyle = {
        font: { size: 12 },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' } }
      };

      // ✅ Ajouter l'en-tête du rapport
      summarySheet.mergeCells('A1:D2');
      summarySheet.getCell('A1').value = 'Rapport des Stocks';
      summarySheet.getCell('A1').font = { bold: true, size: 18 };
      summarySheet.getCell('A1').alignment = { horizontal: 'center' };

      // ✅ Ajouter les informations de base
      summarySheet.addRow(['Entreprise', 'Nom de l\'Entreprise', 'Date du rapport', this.dateGeneration?.toLocaleDateString()]);
      summarySheet.addRow(['Adresse', 'Dakar, Sénégal', 'Période', `${new Date(this.dateDebut).toLocaleDateString()} au ${new Date(this.dateFin).toLocaleDateString()}`]);
      summarySheet.addRow(['Succursale', this.selectedMagasinId !== -1 ? this.getNomMagasinsById(this.selectedMagasinId) : 'Toutes les succursales']);
      summarySheet.addRow([]);

      // ✅ Ajouter les indicateurs clés
      summarySheet.addRow(['Indicateurs clés', 'Valeur']).eachCell(cell => {
        Object.assign(cell, { font: headerStyle.font, fill: headerStyle.fill, alignment: headerStyle.alignment });
      });

      const indicators = [
        ['Total Produits', this.totalProduits],
        ['Valeur achat du Stock initial', `${this.valeurTotaleStockAchatInitial?.toLocaleString()} F CFA`],
        ['Valeur achat du Stock final', `${this.valeurTotaleVenteStockAchatFinal?.toLocaleString()} F CFA`],
        ['Produits en Rupture', this.produitsRupture],
        ['Produits sous Alerte', this.produitsEnAlerte],
        ['Produits à Réapprovisionner', this.produitsAReapprovisionne],
        ['Produits en Surstock', this.produitsEnSurStock],
        ['Produits Périssables', this.produitsPerissable]
      ];

      indicators.forEach(indicator => {
        summarySheet.addRow(indicator).eachCell(cell => {
          Object.assign(cell, { font: dataStyle.font, border: dataStyle.border });
        });
      });

      // ✅ Feuille "Produits"
      const productsSheet = workbook.addWorksheet('Produits');
      productsSheet.columns = [
        { header: 'Produit', key: 'designation', width: 30 },
        { header: 'Catégorie', key: 'famille', width: 20 },
        { header: 'Unité', key: 'unite', width: 10 },
        { header: 'Prix Achat (F CFA)', key: 'prixAchat', width: 15 },
        { header: 'Stock Initial', key: 'stockInitial', width: 15 },
        { header: 'Entrées', key: 'entrees', width: 10 },
        { header: 'Sorties', key: 'sorties', width: 10 },
        { header: 'Stock Final', key: 'stockFinal', width: 15 },
        { header: 'Statut', key: 'statut', width: 15 }
      ];

      this.filteredProduits.forEach(produit => {
        const stat = this.getStatProduit(produit);
        productsSheet.addRow({
          designation: produit.designation,
          famille: produit.famille,
          unite: produit.unite,
          prixAchat: this.getDernierPrixAchatById(produit.id),
          stockInitial: `${stat.stockInitial} (${stat.valeurStockInitial?.toFixed(2)})`,
          entrees: stat.entrees,
          sorties: stat.sorties,
          stockFinal: `${stat.stockFinal} (${stat.valeurStockFinal?.toFixed(2)})`,
          statut: this.getStatutProduitById(produit.id)
        });
      });

      productsSheet.getRow(1).eachCell(cell => {
        Object.assign(cell, { font: headerStyle.font, fill: headerStyle.fill, alignment: headerStyle.alignment });
      });

      // ✅ Feuille "Mouvements"
      const movementsSheet = workbook.addWorksheet('Mouvements');
      movementsSheet.columns = [
        { header: 'Référence', key: 'ref', width: 15 },
        { header: 'Produit', key: 'produit', width: 25 },
        { header: 'Magasin', key: 'magasin', width: 20 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Quantité', key: 'quantite', width: 12 },
        { header: 'Prix Unitaire', key: 'prixUnitaire', width: 15 },
        { header: 'Prix Total', key: 'prixTotal', width: 15 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Responsable', key: 'responsable', width: 20 }
      ];

      this.filteredMouvements.forEach(mvt => {
        movementsSheet.addRow({
          ref: mvt.ref,
          produit: this.getNomProduitById(mvt.produitId),
          magasin: this.getNomMagasinsById(mvt.magasinId),
          type: mvt.typeMouvement,
          quantite: mvt.quantite,
          prixUnitaire: mvt.prixUnitaire,
          prixTotal: mvt.prixTotal?.toFixed(2),
          date: new Date(mvt.dateMouvement).toLocaleDateString(),
          description: mvt.description,
          responsable: mvt.acteurId
        });
      });

      movementsSheet.getRow(1).eachCell(cell => {
        Object.assign(cell, { font: headerStyle.font, fill: headerStyle.fill, alignment: headerStyle.alignment });
      });

      // ✅ Générer le fichier Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rapport_stock_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
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
  onSearchChange(typeSearch: string): void {
    const search = this.removeAccents(this.searchTerm.toLowerCase());

    if (typeSearch === 'stock') {
      this.filteredProduits = this.allProduits.filter(prod =>
        this.removeAccents(prod.famille?.toLowerCase()).includes(search) ||
        this.removeAccents(this.getStatutProduitById(prod.id).toLowerCase()).includes(search)
      );
      this.currentPage = 1;
    }
    else if (typeSearch === 'mouvement') {
      this.filteredMouvements = this.allMouvements.filter(prod =>
        this.removeAccents(prod.typeMouvement?.toLowerCase()).includes(search) ||
        this.removeAccents(this.getNomProduitById(prod.produitId)?.toLowerCase()).includes(search)
      );
      this.currentPageMvt = 1;
    }
    else {
      console.log('Aucun choix correspondant');
    }
  }

  /**
   * Supprime les accents des chaînes de caractères
   */
  removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }



// Méthode pour mettre à jour les recettes, les dépenses, les paiement et les catégories
updatefilteredTable(): void {

  this.filteredProduits = this.allProduits.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize);

}

setItemsPerPage(event: any) {
  this.pageSize = Number(event.target.value);
  this.currentPage =1;
  this.currentPageMvt =1;
  this.cdr.detectChanges(); // Forcer la mise à jour de la vue
}

// Méthode pour obtenir le nom du produit à partir de l'id
getNomProduitById(id: number): string{
  const produit = this.allProduits.find(p => p.id === id);
  return produit ? produit.designation : '';  // On retourne `null` si le produit n'est pas trouvé
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

get getPaginatedMvt() {
  return this.paginate(this.filteredMouvements, this.currentPageMvt, this.pageSize);
}
paginate(data: any[], currentPage: number, itemsPerPage: number): any[] {
  const start = (currentPage - 1) * itemsPerPage;
  return data.slice(start, start + itemsPerPage);
}


onPageChange(page: number, typeTable:string): void {
  if(typeTable ==='stock'){
    this.currentPage = page;
  }
  else if(typeTable ==='mouvement') {
    this.currentPageMvt = page;
  }
  else {
    console.log('Aucun choix correspondant')
  }
}
getTotalPages(list: any[]): number {
  return Math.ceil(list.length / this.pageSize);
}


}
