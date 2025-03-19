import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';  // Import jsPDF
import autoTable from 'jspdf-autotable';

import * as ExcelJS from 'exceljs';
import { Magasin } from '../../../modeles/magasin.model';
import { Produits } from '../../../modeles/produit.modele';
import { MouvementsStock, Stock } from '../../../modeles/entrees-sorties.model';
import { Panier } from '../../../modeles/panier.model';
import { Transfert } from '../../../modeles/transfert.model';
import { Depense, Recette } from '../../../modeles/finance.model';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-rapports-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-ventes.component.html',
  styleUrl: './rapports-ventes.component.css'
})
export class RapportsVentesComponent implements OnInit {
  // Déclarez la variable produits globalement

  @ViewChild('pdfContent')
  pdfContent!: ElementRef;

  dateGeneration = new Date();

  produits: Produits[] = [];
  prods: Produits[] = [];
  stocks: Stock[] = [];
   // Variables pour les filtres
   magasins: Magasin[] = [ ];
   magasinSelectionne: Magasin | null = null;
   selectedMagasin: string = 'Toutes les succursales';
   categorie: string = 'all';
   statut: string = 'all';
   succursale: string = 'all';  // Pour les administrateurs
   isAdmin: boolean = true;  // Simuler un utilisateur admin, à remplacer par un réel contrôle d'accès

   searchTerm = ''; // Recherche
   pageSize:number = 5;
   currentPage:number=1;
   filteredProduits:Produits[] =[];
   allStocks: Stock[] = []; // Tous les stocks de tous les magasins
   allProduits: Produits[] = []; // Tous les produits de tous les magasins

   // Variables de vue d'ensemble
   valeurTotaleStock: number = 0; // Calculée dynamiquement
   totalProduits: number = 0; // Calculé dynamiquement
   produitsEnAlerte: number = 0;  // Calculé dynamiquement
   produitsRupture: number = 0;  // Calculé dynamiquement
   valeurTotaleVenteStock: number = 0;  // Calculé dynamiquement
   produitsPerissable: number = 0;  // Calculé dynamiquement
   produitsUniques: number = 0;  // Calculé dynamiquement
   produitsEnSurStock: number = 0;  // Calculé dynamiquement
   produitsAReapprovisionne: number = 0;  // Calculé dynamiquement

   constructor(private cdr:ChangeDetectorRef) {}

   ngOnInit(): void {

    this.loadMagasins();
    this.filteredProduits = [...this.allProduits]; // Initialiser avec tous les produits
    this.stocks = [...this.allStocks]; // Initialiser avec tous les stocks
    this.updateGlobalStats()
   }


   /* exportToPDF() {
    const doc = new jsPDF();

    // Définition des marges
    const marginLeft = 15;
    let currentY = 20;

    // Ajout d'un logo (si vous avez un fichier logo.png)
    const logo = new Image();
    logo.src = './assets/avatar.jpg'; // Assurez-vous que le chemin est correct
    doc.addImage(logo, 'PNG', marginLeft, currentY, 30, 15);

    // Informations de l'entreprise
    const entreprise = "Stock Management SARL";
    const adresse = "123 Rue du Commerce, Dakar, Sénégal";
    const contact = "+221 77 123 45 67 | contact@stockmng.com";
    const dateGeneration = new Date().toLocaleDateString();

    // En-tête
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(entreprise, marginLeft + 35, currentY + 5);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(adresse, marginLeft + 35, currentY + 12);
    doc.text(contact, marginLeft + 35, currentY + 18);
    doc.text(`Date du rapport : ${dateGeneration}`, marginLeft, currentY + 30);
    doc.text(`Succursale(s) : ${this.selectedMagasin}`, marginLeft, currentY + 36);

    // Titre du rapport
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("Rapport des Stocks", marginLeft, currentY + 50);

    // Section récapitulative avec un cadre
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.rect(marginLeft - 5, currentY + 55, 180, 40); // Cadre
    doc.text("Résumé du Stock", marginLeft, currentY + 62);

    doc.setFont("helvetica", "normal");
    doc.text(`Valeur Achat : ${this.valeurTotaleStock.toLocaleString()} F CFA`, marginLeft, currentY + 70);
    doc.text(`Valeur Vente : ${this.valeurTotaleVenteStock.toLocaleString()} F CFA`, marginLeft, currentY + 78);
    doc.text(`Produits Totaux : ${this.totalProduits}`, marginLeft, currentY + 86);
    doc.text(`Produits Uniques : ${this.produitsUniques}`, marginLeft + 90, currentY + 70);
    doc.text(`Produits en Alerte : ${this.produitsEnAlerte}`, marginLeft + 90, currentY + 78);
    doc.text(`Produits en Rupture : ${this.produitsRupture}`, marginLeft + 90, currentY + 86);

    // Espace avant le tableau
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text("Détail des Stocks :", marginLeft, currentY + 100);
    doc.setTextColor(0, 0, 0);

    // Tableau des stocks
    autoTable(doc, {
        startY: currentY + 105,
        head: [['Nom du Produit', 'Catégorie', 'Prix Achat (F CFA)', 'Quantité', 'Valeur Stock (F CFA)', 'Statut']],
        body: this.getPaginatedProduits.map(produit => [
            produit.designation,
            produit.famille,
            (produit.prixAchatUnitaire ?? 0).toLocaleString(),
            this.getQteById(produit.id, this.stocks).toLocaleString(),
            this.getValeurStocktById(produit.id, this.stocks).toLocaleString(),
            this.getStatutProduitById(produit.id, this.stocks)
        ]),
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: marginLeft, right: marginLeft }
    });

    // Ajout d’un pied de page avec le numéro de page
     const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} / ${pageCount}`, 190, doc.internal.pageSize.height - 10, { align: "right" });
    }

    // Sauvegarde du fichier PDF
    doc.save(`Rapport_Stock_${dateGeneration}.pdf`);
}
 */
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


onMagasinSelect(event: any) {
    const selectedMagasinId = event.target.value;

    if (selectedMagasinId === 'all') {
      this.selectedMagasin = 'Toutes les succursales';
      // Afficher tous les produits et tous les stocks
      this.filteredProduits = [...this.allProduits]; // Remettre tous les produits
      this.stocks = [...this.allStocks]; // Tous les stocks
    } else {
      // Récupérer le magasin sélectionné depuis une liste existante
      const selectedMagasin = this.magasins.find(m => m.id == selectedMagasinId);

      if (selectedMagasin) {
        this.selectedMagasin = selectedMagasin.nom;
      } else {
        this.selectedMagasin = 'Magasin inconnu'; // Sécurité en cas d'erreur
      }

      // Filtrer les stocks en fonction du magasin sélectionné
      this.stocks = this.allStocks.filter(s => s.magasinId == selectedMagasinId);

      // Récupérer les IDs des produits associés aux stocks filtrés
      const produitIds = this.stocks.map(stock => stock.produitId);

      // Filtrer les produits en fonction des IDs récupérés
      this.filteredProduits = this.allProduits.filter(p => produitIds.includes(p.id));
    }

    // Mettre à jour les statistiques globales
    this.updateGlobalStats();
  }



  updateGlobalStats(): void {
    this.valeurTotaleStock = Stock.calculerValeurTotaleStocks(this.stocks);
    this.produitsEnAlerte = Stock.compterProduitsEnAlerte(this.stocks);
    this.produitsRupture = Stock.compterProduitsEnRupture(this.stocks);
    this.totalProduits = Stock.compterProduitsTotal(this.stocks);
    this.produitsPerissable = Stock.compterProduitsPerissables(this.stocks, this.filteredProduits);
    this.produitsUniques = Stock.compterProduitsUniques(this.stocks);
    this.produitsAReapprovisionne = Stock.compterProduitsAReapprovisionner(this.stocks);
    this.produitsEnSurStock = Stock.compterProduitsEnSurstock(this.stocks);
    this.valeurTotaleVenteStock = Stock.calculerValeurTotaleVente(this.stocks);
  }

  /* getProduitsParMagasin(magasin: Magasin): Produist[] {
    return this.allProduits.filter(produit => produit.magasinId === magasin.id);
  } */

getStockParMagasin(magasin: Magasin): Stock[] {
    return this.stocks.filter(stock => stock.magasinId === magasin.id);
}

getAllProduits(): Produits[] {
  return this.allProduits; // Retourne tous les produits
}

getAllStocks(): Stock[] {
  return this.allStocks; // Retourne tous les stocks
}

   getCategories(): string[] {
    // Vérifier si la liste de produits est définie
    if (!this.produits || this.produits.length === 0) {
      return [];
    }
    // Extraire les catégories uniques des produits
    const categories = new Set(this.produits.map(produit => produit.famille));
    // Convertir l'ensemble en tableau et le retourner
    return Array.from(categories);
  }

   exportToExcel() {
     let workbook = new ExcelJS.Workbook();
     let worksheet = workbook.addWorksheet('Rapport Stocks');

     worksheet.addRow(['Valeur Totale du Stock', this.valeurTotaleStock]);
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

   loadMagasins(){
    //const magasins: Magasin[] = [];
    const produitsDisponibles = ['Lait', 'Sucre', 'Riz', 'Farine', 'Huile', 'Pain', 'Fromage', 'Tomates', 'Jus', 'Café'];

    // Création des magasins
    for (let i = 1; i <= 5; i++) {
      //const produits: Produits[] = [];
      const stocks: Stock[] = [];
      const mouvementsStock: MouvementsStock[] = [];
      const paniers: Panier[] = [];
      const transferts: Transfert[] = [];
      const depenses: Depense[] = [];
      const recettes: Recette[] = [];

      // Génération des produits pour ce magasin
      for (let j = 1; j <= 10; j++) {
        const produit = new Produits({
          id: (i - 1) * 10 + j, // ID unique pour chaque produit dans chaque magasin
          famille: `Famille ${j}`,
          designation: produitsDisponibles[Math.floor(Math.random() * produitsDisponibles.length)],
          fournisseurId: j,
          unite: "Pièce",
          prixAchatUnitaire: Math.floor(Math.random() * 1000) + 500,
          prixTotalAchat: 0,
          prixVenteUnitaire: Math.floor(Math.random() * 1500) + 1000,
          prixTotalVente: 0,
          dateCreation: new Date(),
          perissable:Math.random() < 0.5, // Génère aléatoirement true ou false,
          agent: `Agent ${j}`,
          description: `Description du produit ${j}`,
          codeBarre: `CODE${j}`,
          image: ""
        });
        this.allProduits.push(produit);

        // Création des stocks pour ce produit dans ce magasin
        stocks.push(new Stock({
          id: (i - 1) * 10 + j,
          produitId: produit.id!,
          magasinId: i,
          quantiteTotale: Math.floor(Math.random() * 100) + 10,
          quantiteReservee: Math.floor(Math.random() * 10),
          seuilAlerte: 5,
          seuilReapprovisionnement: 10,
          stockSecurite: 5,
          statutStock: "En stock",
          dateDerniereMiseAJour: new Date(),
          dernierPrixAchat: Math.floor(Math.random() * 1000) + 500,
          prixVenteUnitaire: Math.floor(Math.random() * 1000) + 600,
          datePeremption: Math.random() < 0.5 ? new Date(Date.now() + Math.floor(Math.random() * 1000000000)) : undefined
        }));
      }

      // Création des mouvements de stock pour ce magasin
      for (let m = 1; m <= 10; m++) {
        const produit = this.allProduits[Math.floor(Math.random() * this.allProduits.length)];
        const typeMouvement = ["Entree", "Sortie", "Transfert"][Math.floor(Math.random() * 3)];

        mouvementsStock.push(new MouvementsStock({
          id: m,
          ref: `MV-${m}${i}`,
          produitId: produit.id!,
          magasinId: i,
          typeMouvement: typeMouvement as "Entree" | "Sortie" | "Transfert",
          quantite: Math.floor(Math.random() * 50) + 5,
          prixUnitaire: produit.prixAchatUnitaire,
          acteurId: Math.floor(Math.random() * 100), // Aléatoire : fournisseur ou client
          description: `Mouvement de type ${typeMouvement}`,
          motif: typeMouvement === "Sortie" ? "Vente" : typeMouvement === "Entree" ? "Achat" : "Transfert interne",
          dateMouvement: new Date(),
        }));
      }

      // Création des paniers pour ce magasin
      for (let k = 1; k <= 10; k++) {
        const articles = this.allProduits
          .sort(() => 0.5 - Math.random())
          .slice(0, 4); // Sélectionner 4 produits au hasard

        // Récupération des stocks correspondant aux produits choisis
        const stockList = stocks.filter(stock =>
          articles.some(article => article.id === stock.produitId)
        );

        paniers.push(new Panier({
          id: k,
          clientId: Math.floor(Math.random() * 1000),
          bonId: Math.floor(Math.random() * 500),
          articles: articles,
          statut: "VALIDE",
          dateCreation: new Date(),
          magasinId: i, // Associer le magasin
          stockList: stockList // Associer les stocks filtrés
        }));
      }

      // Création des transferts de produits pour ce magasin
      for (let t = 1; t <= 10; t++) {
        transferts.push(new Transfert({
          id: t,
          reference: `TRANSFERT-${t}${i}`,
          produitId: this.allProduits[Math.floor(Math.random() * this.allProduits.length)].id!,
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

      // Ajout des dépenses pour ce magasin
      for (let d = 1; d <= 5; d++) {
        depenses.push(new Depense({
          id: d,
          date: new Date(),
          amount: Math.floor(Math.random() * 10000) + 1000,
          type: d % 2 === 0 ? "STANDARD" : "STOCK",
          description: d % 2 === 0 ? "Achat de fournitures" : "Paiement des salaires",
          paymentMode: d % 2 === 0 ? "Virement bancaire" : "Espèces",
          magasinId: i
        }));
      }

      // Ajout des recettes pour ce magasin
      for (let r = 1; r <= 5; r++) {
        recettes.push(new Recette({
          id: r,
          date: new Date(),
          amount: Math.floor(Math.random() * 15000) + 5000,
          categoryId: i,
          description: `Recette de vente magasin ${i}`,
          paymentMode: r % 2 === 0 ? "Espèces" : "Carte bancaire",
          magasinId: i
        }));
      }

      // Création du magasin avec toutes les données
      this.magasins.push(new Magasin({
        id: i,
        nom: `Magasin ${i}`,
        adresse: `Adresse ${i}, Ville ${i}`,
        ville: `Ville ${i}`,
        telephone: `77${Math.floor(Math.random() * 10000000)}`,
        email: `magasin${i}@exemple.com`,
        responsableId: Math.floor(Math.random() * 100),
        capaciteStock: Math.floor(Math.random() * 5000) + 1000,
        stock: stocks,
        chiffreAffaires: Math.floor(Math.random() * 1000000) + 500000,
        ventes: paniers,
        depenses: depenses,
        recettes: recettes,
        statut: 'Actif',
        dateCreation: new Date(),
        derniereMiseAJour: new Date(),
        transferts: transferts,
        mouvements: mouvementsStock // Ajout des mouvements de stock
      }));
    }
    this.magasins.forEach(mag => {
      this.allStocks.push(...mag?.stock);
    });
  }

   getQteById(produitId: number, stocks: Stock[]): number {
    const produit = stocks.find(p => p.produitId === produitId);
    return produit ? produit.quantiteTotale : 0;
  }

  getStatutProduitById(produitId: number, stocks: Stock[]): string{
    const produit = stocks.find(p => p.produitId === produitId);
    return produit ? produit.statutStock : "Statut introuvable";
  }

  getValeurStocktById(produitId: number, stocks: Stock[]): number{
    const produit = stocks.find(p => p.produitId === produitId);
    return produit ? produit.valeurTotaleStock : 0;
  }

  // Gestion de la recherche
onSearchChange(): void {
  // if (!this.magasinSelectionne) return;
      this.filteredProduits = this.allProduits.filter(prod =>
        prod.famille?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
       /*  prod.designation?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prod.unite?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prod.prixAchatUnitaire?.toString().includes(this.searchTerm) ||
        prod.prixVenteUnitaire?.toString().includes(this.searchTerm)|| */
        this.getStatutProduitById(prod.id, this.stocks).toLowerCase().includes(this.searchTerm.toLowerCase())  // Recherche par statut

      );
      this.currentPage= 1;
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


getProduitsParMagasin(magasin: Magasin | null | undefined): Produits[] {
  if (!magasin?.stock || magasin.stock.length === 0) return [];

  // Récupération des IDs des produits présents dans le stock
  const produitIds = magasin.stock.map(stock => stock.produitId);

  // Vérification que `this.produits` est défini avant de l'utiliser
  return this.produits?.filter(produit => produitIds.includes(produit.id!)) ?? [];
}

get getPaginatedProduits() {
  return this.paginate(this.filteredProduits, this.currentPage, this.pageSize);
}


paginate(data: any[], currentPage: number, itemsPerPage: number) {
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
