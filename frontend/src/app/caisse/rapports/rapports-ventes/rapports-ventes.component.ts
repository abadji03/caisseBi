/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf'; // Import jsPDF
import { Chart, registerables } from 'chart.js';
import * as ExcelJS from 'exceljs';
import { Magasin } from '../../../modeles/magasin.model';
import { Produits } from '../../../modeles/produit.modele';
import html2canvas from 'html2canvas';
import {
  magasins,
  produits,
  paniers,
  clients,
  vendeurs,
  modesPaiement,
} from '../../../modeles/donnees_fictives';
import { Panier } from '../../../modeles/panier.model';
import { Client } from '../../../modeles/clients.model';
import { ModePaiement } from '../../../modeles/paiement.model';
import { User } from '../../../modeles/user.model';
import saveAs from 'file-saver';

@Component({
  selector: 'app-rapports-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports-ventes.component.html',
  styleUrl: './rapports-ventes.component.css',
})
export class RapportsVentesComponent implements OnInit {
  @ViewChild('evolutionVentesChart') evolutionVentesChartRef!: ElementRef;
  @ViewChild('paiementsChart') paiementsChartRef!: ElementRef;
  @ViewChild('topProduitsChart') topProduitsChartRef!: ElementRef;
  @ViewChild('vendeurEvolutionChart') vendeurEvolutionChartRef!: ElementRef;
  @ViewChild('comparaisonChart') comparaisonChartRef!: ElementRef;
  vendeurEvolutionChart: any;
  evolutionVentesChart: any;
  paiementsChart: any;
  topProduitsChart: any;
  comparaisonChart: any;

  // Données et filtres
  dateGeneration = new Date();
  dateDebut = '';
  dateFin = '';
  magasins: Magasin[] = [];
  vendeurs: User[] = [];
  selectedMagasinId = -1;
  selectedVendeurId = -1;
  isPrinting = false;
  isGeneratingPDF = false;
  progress = 0;

  // Données de vente
  allVentes: Panier[] = [];
  filteredVentes: Panier[] = [];
  allClients: Client[] = [];
  allProduits: Produits[] = [];
  modesPaiement: ModePaiement[] = [];
  statmodesPaiement: undefined | any;

  // Indicateurs clés
  totalVentes = 0;
  chiffreAffairesHT = 0;
  chiffreAffairesTTC = 0;
  margeBeneficiaire = 0;
  ticketMoyen = 0;
  panierMoyen = 0;
  evolutionCA: { valeur: number; tendance: '↑' | '↓' | '→' } = { valeur: 0, tendance: '→' };
  evolutionVolume: { valeur: number; tendance: '↑' | '↓' | '→' } = { valeur: 0, tendance: '→' };

  // Top listes
  topProduits: any[] = [];
  topClients: any[] = [];
  vendeursPerformance: any[] = [];

  // pour les détails d'un vendeur
  selectedVendeurDetails: User | null = null;
  showVendeurModal = false;
  vendeurStats: any = null;

  //pour les comparaisons
  comparaisonType: 'periode' | 'vendeur' | 'magasin' = 'periode';
  comparaisonElement1: any = '';
  comparaisonElement2: any = '';
  comparaisonData: any = null;
  comparaisonLabels: string[] = [];
  comparisonOptions: { value: any; label: string }[] = [];
  isLoading = false;

  // Pagination et recherche
  currentPage = 1;
  pageSize = 10;
  searchTerm = '';
  triVendeursPar: 'ca' | 'transactions' | 'moyenne' = 'ca';

  private cdr = inject(ChangeDetectorRef);

  constructor() {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.initDateFilters();
    this.loadDonneesVentes();
    this.filtrerDonnees();
    this.initializeComparison();
  }

  initDateFilters(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    this.dateDebut = this.formatDate(monday);
    this.dateFin = this.formatDate(today);
  }

  loadDonneesVentes(): void {
    // Simuler des données (à remplacer par des appels API)
    this.magasins = magasins;

    this.vendeurs = vendeurs;

    this.modesPaiement = modesPaiement;

    // Générer des données de vente fictives
    this.allVentes = paniers;
    this.allClients = clients;
    this.allProduits = produits;

    this.filteredVentes = [...this.allVentes];
  }

  getStatistiquesModesPaiementArray(): {
    mode: string;
    montantTotal: number;
    occurrences: number;
  }[] {
    const statsMap = new Map<string, { montantTotal: number; occurrences: number }>();

    // Parcourir toutes les ventes filtrées
    this.filteredVentes.forEach((vente) => {
      // Parcourir tous les paiements de chaque vente
      vente.paiements?.forEach((paiement) => {
        // Trouver le libellé du mode de paiement à partir de l'ID
        const modePaiement = this.modesPaiement.find((mp) => mp.libelle === paiement.methodePaiement);
        const modeLabel = modePaiement?.libelle || 'Inconnu';

        // Récupérer ou initialiser les statistiques pour ce mode de paiement
        const current = statsMap.get(modeLabel) || { montantTotal: 0, occurrences: 0 };

        // Mettre à jour les statistiques
        statsMap.set(modeLabel, {
          montantTotal: current.montantTotal + paiement.montant,
          occurrences: current.occurrences + 1,
        });
      });
    });

    // Convertir la Map en tableau d'objets
    return Array.from(statsMap.entries()).map(([mode, stats]) => ({
      mode,
      ...stats,
    }));
  }
  generateMockVentes(): Panier[] {
    const ventes: Panier[] = [];
    /* const today = new Date();

        for (let i = 0; i < 50; i++) {
          const date = new Date();
          date.setDate(today.getDate() - Math.floor(Math.random() * 30));

          const produits: Produits[] = [];
          const nbProduits = Math.floor(Math.random() * 5) + 1;
          let totalHT = 0;

          for (let j = 0; j < nbProduits; j++) {
            const produit = new Produits({
              id: j + 1,
              designation: `Produit ${j + 1}`,
              prixVenteUnitaire: Math.floor(Math.random() * 10000) + 1000,
              prixAchatUnitaire: Math.floor(Math.random() * 8000) + 800
            });
            produits.push(produit);
            totalHT += produit.prixVenteUnitaire;
          }

          const tva = totalHT * 0.18;
          const totalTTC = totalHT + tva;

          ventes.push(new Panier({
            id: i + 1,
            clientId: Math.floor(Math.random() * 5) + 1,
            articles: produits,
            totalHT,
            tva,
            totalTTC,
            dateCreation: date,
            magasinId: Math.floor(Math.random() * 2) + 1,
            statut: 'VALIDE'
          }));
        } */

    return ventes;
  }

  generateMockClients(): Client[] {
    return [];
  }

  generateMockProduits(): Produits[] {
    return [];
  }

  filtrerDates(): void {
    this.filtrerDonnees();
  }

  onMagasinSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMagasinId = Number(target.value) || -1;
    this.filtrerDonnees();
  }

  onVendeurSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedVendeurId = Number(target.value) || -1;
    this.filtrerDonnees();
  }

  filtrerDonnees(): void {
    if (!this.dateDebut || !this.dateFin) return;

    const startDate = this.resetTime(new Date(this.dateDebut));
    const endDate = this.resetTime(new Date(this.dateFin));

    this.filteredVentes = this.allVentes.filter(
      (v) =>
        this.resetTime(new Date(v.dateCreation)) >= startDate &&
        this.resetTime(new Date(v.dateCreation)) <= endDate &&
        (this.selectedMagasinId === -1 || v.magasinId === this.selectedMagasinId),
      //(this.selectedVendeurId === -1 || /* logique pour filtrer par vendeur */ true)
    );

    this.calculerIndicateurs();
    this.calculerTopListes();
    this.statmodesPaiement = this.getStatistiquesModesPaiementArray();
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mettreAJourGraphiques();
    }, 100);
  }

  calculerIndicateurs(): void {
    // Chiffre d'affaires
    this.totalVentes = this.filteredVentes.length;
    this.chiffreAffairesHT = this.filteredVentes.reduce((sum, v) => sum + v.totalHT, 0);
    this.chiffreAffairesTTC = this.filteredVentes.reduce((sum, v) => sum + v.totalTTC, 0);

    // Marge bénéficiaire (si prix d'achat connu)
    this.margeBeneficiaire = this.filteredVentes.reduce((sum, v) => {
      const margeVente = v.articles.reduce(
        (s, a) => s + ((a.prixVenteUnitaire || 0) - (a.prixAchatUnitaire || 0)),
        0,
      );
      return sum + margeVente;
    }, 0);

    // Ticket moyen et panier moyen
    this.ticketMoyen = this.totalVentes > 0 ? this.chiffreAffairesTTC / this.totalVentes : 0;
    this.panierMoyen =
      this.totalVentes > 0
        ? this.filteredVentes.reduce((sum, v) => sum + v.articles.length, 0) / this.totalVentes
        : 0;

    // Évolution CA
    const periodePrecedente = this.getDonneesPeriodePrecedente();
    this.evolutionCA = this.calculerEvolution(
      this.chiffreAffairesTTC,
      periodePrecedente.chiffreAffairesTTC,
    );

    // Évolution volume
    this.evolutionVolume = this.calculerEvolution(this.totalVentes, periodePrecedente.totalVentes);
  }

  calculerTopListes(): void {
    const produitsMap = new Map<
      number,
      {
        produit: Produits;
        quantite: number;
        ca: number;
        marge: number;
        nombreVentes: number;
      }
    >();

    this.filteredVentes.forEach((v) => {
      const produitsDéjàComptés = new Set<number>(); // pour cette vente

      v.articles.forEach((a) => {
        const produitId = a.produit.id!;
        const quantite = a.quantite || 0;
        const prixVente = a.prixVenteUnitaire || 0;
        const prixAchat = a.prixAchatUnitaire || 0;

        const existant = produitsMap.get(produitId) || {
          produit: a.produit,
          quantite: 0,
          ca: 0,
          marge: 0,
          nombreVentes: 0,
        };

        const dejaCompte = produitsDéjàComptés.has(produitId);

        produitsMap.set(produitId, {
          produit: a.produit,
          quantite: existant.quantite + quantite,
          ca: existant.ca + quantite * prixVente,
          marge: existant.marge + quantite * (prixVente - prixAchat),
          nombreVentes: existant.nombreVentes + (dejaCompte ? 0 : 1),
        });

        produitsDéjàComptés.add(produitId);
      });
    });

    this.topProduits = Array.from(produitsMap.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 10);

    // Top clients
    const clientsMap = new Map<
      number,
      { client: Client; nbAchats: number; ca: number; dernierAchat: Date }
    >();

    this.filteredVentes.forEach((v) => {
      if (!v.clientId) return;

      const client = this.allClients.find((c) => c.id === v.clientId);
      if (!client) return;

      const existant = clientsMap.get(v.clientId) || {
        client,
        nbAchats: 0,
        ca: 0,
        dernierAchat: new Date(0),
      };

      clientsMap.set(v.clientId, {
        client,
        nbAchats: existant.nbAchats + 1,
        ca: existant.ca + v.totalTTC,
        dernierAchat:
          v.dateCreation > existant.dernierAchat ? v.dateCreation : existant.dernierAchat,
      });
    });

    this.topClients = Array.from(clientsMap.values())
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 10);

    // Performance vendeurs
    const vendeursMap = new Map<
      number,
      { vendeur: User; nbVentes: number; caHT: number; caTTC: number }
    >();

    this.filteredVentes.forEach((v) => {
      const vendeurId = v.agentId;
      const vendeur = this.vendeurs.find((vu) => vu.id === vendeurId);

      if (!vendeur) return; // vendeur introuvable, on ignore cette vente

      const existant = vendeursMap.get(vendeurId!) || {
        vendeur,
        nbVentes: 0,
        caHT: 0,
        caTTC: 0,
      };

      vendeursMap.set(vendeurId!, {
        vendeur,
        nbVentes: existant.nbVentes + 1,
        caHT: existant.caHT + v.totalHT,
        caTTC: existant.caTTC + v.totalTTC,
      });
    });

    this.vendeursPerformance = Array.from(vendeursMap.values()).map((v) => ({
      ...v,
      ticketMoyen: v.nbVentes > 0 ? v.caTTC / v.nbVentes : 0,
    }));

    this.trierVendeurs();
  }

  trierVendeurs(): void {
    switch (this.triVendeursPar) {
      case 'ca':
        this.vendeursPerformance.sort((a, b) => b.caTTC - a.caTTC);
        break;
      case 'transactions':
        this.vendeursPerformance.sort((a, b) => b.nbVentes - a.nbVentes);
        break;
      case 'moyenne':
        this.vendeursPerformance.sort((a, b) => b.ticketMoyen - a.ticketMoyen);
        break;
    }
  }

  getDonneesPeriodePrecedente(): { totalVentes: number; chiffreAffairesTTC: number } {
    const startDate = new Date(this.dateDebut);
    const endDate = new Date(this.dateFin);
    const dureePeriode =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const startDatePrecedent = new Date(startDate);
    startDatePrecedent.setDate(startDate.getDate() - dureePeriode);

    const endDatePrecedent = new Date(startDate);
    endDatePrecedent.setDate(startDate.getDate() - 1);

    const ventesPrecedentes = this.allVentes.filter(
      (v) =>
        this.resetTime(new Date(v.dateCreation)) >= this.resetTime(startDatePrecedent) &&
        this.resetTime(new Date(v.dateCreation)) <= this.resetTime(endDatePrecedent) &&
        (this.selectedMagasinId === -1 || v.magasinId === this.selectedMagasinId),
    );

    return {
      totalVentes: ventesPrecedentes.length,
      chiffreAffairesTTC: ventesPrecedentes.reduce((sum, v) => sum + v.totalTTC, 0),
    };
  }

  calculerEvolution(
    valeurActuelle: number,
    valeurPrecedente: number,
  ): { valeur: number; tendance: '↑' | '↓' | '→' } {
    if (valeurPrecedente === 0) return { valeur: 0, tendance: '→' };

    const evolution = ((valeurActuelle - valeurPrecedente) / valeurPrecedente) * 100;
    return {
      valeur: Math.round(evolution),
      tendance: evolution > 0 ? '↑' : evolution < 0 ? '↓' : '→',
    };
  }

  mettreAJourGraphiques(): void {
    this.creerGraphiqueEvolutionVentes();
    this.creerGraphiquePaiements();
    this.creerGraphiqueTopProduits();
  }

  creerGraphiqueEvolutionVentes(): void {
    if (this.evolutionVentesChart) {
      this.evolutionVentesChart.destroy();
    }

    const ctx = this.evolutionVentesChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    const dates = this.getDatesBetween(new Date(this.dateDebut), new Date(this.dateFin));
    const labels = dates.map((d) => this.formatDateForChart(d));
    const dataCA = dates.map((d) =>
      this.filteredVentes
        .filter(
          (v) => this.resetTime(new Date(v.dateCreation)).getTime() === this.resetTime(d).getTime(),
        )
        .reduce((sum, v) => sum + v.totalTTC, 0),
    );
    const dataVolume = dates.map(
      (d) =>
        this.filteredVentes.filter(
          (v) => this.resetTime(new Date(v.dateCreation)).getTime() === this.resetTime(d).getTime(),
        ).length,
    );

    this.evolutionVentesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: "Chiffre d'affaires (F CFA)",
            data: dataCA,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            yAxisID: 'y',
            tension: 0.3,
          },
          {
            label: 'Nombre de ventes',
            data: dataVolume,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Évolution des ventes',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: "Chiffre d'affaires (F CFA)",
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Nombre de ventes',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  creerGraphiquePaiements(): void {
    if (this.paiementsChart) {
      this.paiementsChart.destroy();
    }

    const ctx = this.paiementsChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    // Utilisation des vraies données de statModesPaiement
    const paiementsData = this.statmodesPaiement;

    // Couleurs pour les différents modes de paiement
    const backgroundColors = [
      '#FF6384', // Espèce
      '#36A2EB', // Carte
      '#FFCE56', // Mobile Money
      '#4BC0C0', // Virement
      '#9966FF', // Autre
    ];

    this.paiementsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: paiementsData.map((p: any) => p.mode),
        datasets: [
          {
            data: paiementsData.map((p: any) => p.montantTotal),
            backgroundColor: backgroundColors.slice(0, paiementsData.length),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Répartition des modes de paiement',
            font: {
              size: 16,
            },
          },
          legend: {
            position: 'right',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw as number;
                const total = context.dataset.data.reduce(
                  (a, b) => (a as number) + (b as number),
                  0,
                );
                const percentage = Math.round((value / (total as number)) * 100);
                return `${label}: ${value.toLocaleString('fr-FR')} F CFA (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }
  creerGraphiqueTopProduits(): void {
    if (this.topProduitsChart) {
      this.topProduitsChart.destroy();
    }

    const ctx = this.topProduitsChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    this.topProduitsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.topProduits.map((p) => p.produit.designation),
        datasets: [
          {
            label: 'Quantité vendue',
            data: this.topProduits.map((p) => p.quantite),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: "Chiffre d'affaires (F CFA)",
            data: this.topProduits.map((p) => p.ca),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Top 10 des produits',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Quantité vendue',
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: "Chiffre d'affaires (F CFA)",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  /* genererComparaison(): void {
        if (!this.comparaisonElement1 || !this.comparaisonElement2) return;

        let data1, data2, label1, label2;

        switch (this.comparaisonType) {
          case 'periode':
            // Logique pour comparer deux périodes
            break;
          case 'vendeur':
            // Logique pour comparer deux vendeurs
            break;
          case 'magasin':
            // Logique pour comparer deux magasins
            break;
        }

        this.comparaisonData = {
          ca1: data1.chiffreAffairesTTC,
          ca2: data2.chiffreAffairesTTC,
          ventes1: data1.totalVentes,
          ventes2: data2.totalVentes,
          ticketMoyen1: data1.totalVentes > 0 ? data1.chiffreAffairesTTC / data1.totalVentes : 0,
          ticketMoyen2: data2.totalVentes > 0 ? data2.chiffreAffairesTTC / data2.totalVentes : 0
        };

        this.comparaisonLabels = [label1, label2];
        this.creerGraphiqueComparaison();
      } */

  creerGraphiqueComparaison(): void {
    if (!this.comparaisonData) return;

    const ctx = this.comparaisonChartRef?.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.comparaisonChart) {
      this.comparaisonChart.destroy();
    }

    this.comparaisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ["Chiffre d'affaires", 'Nombre de ventes', 'Ticket moyen'],
        datasets: [
          {
            label: this.comparaisonLabels[0],
            data: [
              this.comparaisonData.ca1,
              this.comparaisonData.ventes1,
              this.comparaisonData.ticketMoyen1,
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
          },
          {
            label: this.comparaisonLabels[1],
            data: [
              this.comparaisonData.ca2,
              this.comparaisonData.ventes2,
              this.comparaisonData.ticketMoyen2,
            ],
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Analyse comparative',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  if (context.dataIndex === 0) {
                    // CA
                    label += `${context.parsed.y.toLocaleString('fr-FR')} F CFA`;
                  } else if (context.dataIndex === 1) {
                    // Nombre de ventes
                    label += `${context.parsed.y}`;
                  } else {
                    // Ticket moyen
                    label += `${context.parsed.y.toLocaleString('fr-FR')} F CFA`;
                  }
                }
                return label;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                if (typeof value === 'number') {
                  return value.toLocaleString('fr-FR');
                }
                return value;
              },
            },
          },
        },
      },
    });
  }

  private creerGraphiqueEvolutionVendeur(): void {
    if (this.vendeurEvolutionChart) {
      this.vendeurEvolutionChart.destroy();
    }

    const ctx = this.vendeurEvolutionChartRef?.nativeElement.getContext('2d');
    if (!ctx || !this.vendeurStats) return;

    const labels = this.vendeurStats.ventesParJour.map((v: any) => this.formatDateForChart(v.date));
    const dataCA = this.vendeurStats.ventesParJour.map((v: any) => v.chiffreAffaires);
    const dataVolume = this.vendeurStats.ventesParJour.map((v: any) => v.nombreVentes);

    this.vendeurEvolutionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: "Chiffre d'affaires (F CFA)",
            data: dataCA,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            yAxisID: 'y',
            tension: 0.3,
          },
          {
            label: 'Nombre de ventes',
            data: dataVolume,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Performance quotidienne',
          },
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: "Chiffre d'affaires (F CFA)",
            },
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Nombre de ventes',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  voirDetailsVendeur(vendeurId: number): void {
    this.selectedVendeurDetails = this.vendeurs.find((v) => v.id === vendeurId) || null;

    if (this.selectedVendeurDetails) {
      this.calculerStatsVendeur(vendeurId);
      this.showVendeurModal = true;

      // Attendre un cycle de détection de changement pour que la vue soit mise à jour
      setTimeout(() => {
        this.creerGraphiqueEvolutionVendeur();
      }, 100);
    } else {
      console.error('Vendeur non trouvé avec ID:', vendeurId);
    }
  }

  private calculerStatsVendeur(vendeurId: number): void {
    // Filtrer les ventes pour ce vendeur
    const ventesVendeur = this.filteredVentes.filter((v) => v.agentId === vendeurId);

    // Calculer les indicateurs clés
    const totalVentes = ventesVendeur.length;
    const chiffreAffairesTTC = ventesVendeur.reduce((sum, v) => sum + v.totalTTC, 0);
    const chiffreAffairesHT = ventesVendeur.reduce((sum, v) => sum + v.totalHT, 0);
    const margeBeneficiaire = ventesVendeur.reduce((sum, v) => {
      return (
        sum +
        v.articles.reduce(
          (s, a) => s + ((a.prixVenteUnitaire || 0) - (a.prixAchatUnitaire || 0)),
          0,
        )
      );
    }, 0);

    // Calculer le ticket moyen
    const ticketMoyen = totalVentes > 0 ? chiffreAffairesTTC / totalVentes : 0;

    // Calculer le panier moyen (nombre moyen d'articles par vente)
    const panierMoyen =
      totalVentes > 0
        ? ventesVendeur.reduce((sum, v) => sum + v.articles.length, 0) / totalVentes
        : 0;

    // Trouver les produits les plus vendus par ce vendeur
    const produitsMap = new Map<number, { produit: Produits; quantite: number; ca: number }>();

    ventesVendeur.forEach((v) => {
      v.articles.forEach((a) => {
        const produitId = a.produit.id!;
        const quantite = a.quantite || 0;
        const prixVente = a.prixVenteUnitaire || 0;

        const existant = produitsMap.get(produitId) || {
          produit: a.produit,
          quantite: 0,
          ca: 0,
        };

        produitsMap.set(produitId, {
          produit: a.produit,
          quantite: existant.quantite + quantite,
          ca: existant.ca + quantite * prixVente,
        });
      });
    });

    const topProduits = Array.from(produitsMap.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);

    // Enregistrer les statistiques
    this.vendeurStats = {
      totalVentes,
      chiffreAffairesHT,
      chiffreAffairesTTC,
      margeBeneficiaire,
      ticketMoyen,
      panierMoyen,
      topProduits,
      ventesParJour: this.calculerVentesParJour(ventesVendeur),
      modesPaiement: this.getStatistiquesModesPaiementVendeur(ventesVendeur),
    };
  }

  private calculerVentesParJour(ventes: Panier[]): any[] {
    const dates = this.getDatesBetween(new Date(this.dateDebut), new Date(this.dateFin));
    return dates.map((d) => {
      const ventesJour = ventes.filter(
        (v) => this.resetTime(new Date(v.dateCreation)).getTime() === this.resetTime(d).getTime(),
      );
      return {
        date: d,
        nombreVentes: ventesJour.length,
        chiffreAffaires: ventesJour.reduce((sum, v) => sum + v.totalTTC, 0),
      };
    });
  }

  private getStatistiquesModesPaiementVendeur(ventes: Panier[]): any[] {
    const statsMap = new Map<string, { montantTotal: number; occurrences: number }>();

    ventes.forEach((vente) => {
      vente.paiements?.forEach((paiement) => {
        const modePaiement = this.modesPaiement.find((mp) => mp.libelle === paiement.methodePaiement);
        const modeLabel = modePaiement?.libelle || 'Inconnu';

        const current = statsMap.get(modeLabel) || { montantTotal: 0, occurrences: 0 };

        statsMap.set(modeLabel, {
          montantTotal: current.montantTotal + paiement.montant,
          occurrences: current.occurrences + 1,
        });
      });
    });

    return Array.from(statsMap.entries()).map(([mode, stats]) => ({
      mode,
      ...stats,
    }));
  }

  fermerModalVendeur(): void {
    this.showVendeurModal = false;
    this.selectedVendeurDetails = null;
    this.vendeurStats = null;
  }

  // Méthodes utilitaires
  private getDatesBetween(start: Date, end: Date): Date[] {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private resetTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateForChart(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  // Pagination
  get getPaginatedVentes(): Panier[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredVentes.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredVentes.length / this.pageSize);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  onSearchChange(): void {
    const search = this.searchTerm.toLowerCase();
    this.filteredVentes = this.allVentes.filter(
      (v) =>
        v.id?.toString().includes(search) ||
        (v.clientId &&
          this.allClients.some(
            (c) => c.id === v.clientId && c.nomComplet.toLowerCase().includes(search),
          )),
    );
    this.currentPage = 1;
    this.calculerIndicateurs();
    this.calculerTopListes();
  }

  public getNomMagasin(id: number): string {
    const magasin = this.magasins.find((m) => m.id === id);
    return magasin ? magasin.nom : 'Inconnu';
  }
  public getNomClient(id: number): string {
    const client = this.allClients.find((m) => m.id === id);
    return client ? client.nomComplet : 'Inconnu';
  }

  public getNomVendeur(id: number): string {
    const vendeur = this.vendeurs.find((m) => m.id === id);
    return vendeur ? vendeur.nom : 'Inconnu';
  }

  getNomModePaiement(modePaiementId: number): string {
    const mode = this.modesPaiement.find((mp) => mp.id === modePaiementId);
    return mode ? mode.libelle : 'Inconnu';
  }

  // Méthode principale pour générer la comparaison
  genererComparaison(): void {
    if (!this.comparaisonElement1 || !this.comparaisonElement2) {
      console.error('Veuillez sélectionner deux éléments à comparer');
      return;
    }

    if (this.comparaisonElement1 === this.comparaisonElement2) {
      console.error('Veuillez sélectionner deux éléments différents');
      return;
    }

    let data1, data2, label1, label2;

    try {
      switch (this.comparaisonType) {
        case 'periode': {
          const periode1 = this.getDonneesPourPeriode(this.comparaisonElement1);
          const periode2 = this.getDonneesPourPeriode(this.comparaisonElement2);
          data1 = periode1.data;
          data2 = periode2.data;
          label1 = periode1.label;
          label2 = periode2.label;
          break;
        }
        case 'vendeur': {
          const vendeur1 = this.getDonneesPourVendeur(+this.comparaisonElement1);
          const vendeur2 = this.getDonneesPourVendeur(+this.comparaisonElement2);
          data1 = vendeur1.data;
          data2 = vendeur2.data;
          label1 = vendeur1.label;
          label2 = vendeur2.label;
          break;
        }
        case 'magasin': {
          const magasin1 = this.getDonneesPourMagasin(+this.comparaisonElement1);
          const magasin2 = this.getDonneesPourMagasin(+this.comparaisonElement2);
          data1 = magasin1.data;
          data2 = magasin2.data;
          label1 = magasin1.label;
          label2 = magasin2.label;
          break;
        }
        default:
          console.error('Type de comparaison non reconnu:', this.comparaisonType);
          return;
      }

      console.log('Données de comparaison:', { data1, data2, label1, label2 });

      this.comparaisonData = {
        ca1: data1.chiffreAffairesTTC || 0,
        ca2: data2.chiffreAffairesTTC || 0,
        ventes1: data1.totalVentes || 0,
        ventes2: data2.totalVentes || 0,
        ticketMoyen1:
          data1.totalVentes > 0 ? (data1.chiffreAffairesTTC || 0) / data1.totalVentes : 0,
        ticketMoyen2:
          data2.totalVentes > 0 ? (data2.chiffreAffairesTTC || 0) / data2.totalVentes : 0,
      };

      this.comparaisonLabels = [label1, label2];

      // Force la mise à jour de la vue
      this.cdr.detectChanges();

      // Crée le graphique après un léger délai
      setTimeout(() => {
        this.creerGraphiqueComparaison();
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la génération de la comparaison:', error);
    }
  }

  // Méthodes utilitaires pour chaque type de comparaison
  private getDonneesPourPeriode(periode: string): { data: any; label: string } {
    let startDate: Date;
    let endDate: Date;
    const today = new Date(this.dateFin); // Utilisez la date de fin du filtre actuel comme référence

    switch (periode) {
      case 'semaine_precedente':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = new Date(today);
        endDate.setDate(today.getDate() - 1);
        break;
      case 'mois_precedent':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'trimestre_precedent':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'annee_precedente':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(this.dateDebut);
        endDate = new Date(this.dateFin);
    }

    // Assurez-vous de filtrer aussi par magasin si un magasin est sélectionné
    const ventes = this.allVentes.filter((v) => {
      const dateVente = this.resetTime(new Date(v.dateCreation));
      return (
        dateVente >= this.resetTime(startDate) &&
        dateVente <= this.resetTime(endDate) &&
        (this.selectedMagasinId === -1 || v.magasinId === this.selectedMagasinId)
      );
    });

    return {
      data: {
        totalVentes: ventes.length,
        chiffreAffairesTTC: ventes.reduce((sum, v) => sum + v.totalTTC, 0),
      },
      label: this.getLabelForPeriode(periode),
    };
  }

  private getDonneesPourVendeur(vendeurId: number): { data: any; label: string } {
    const vendeur = this.vendeurs.find((v) => v.id === vendeurId);
    if (!vendeur) {
      console.error('Vendeur non trouvé avec ID:', vendeurId);
      return { data: { totalVentes: 0, chiffreAffairesTTC: 0 }, label: 'Vendeur inconnu' };
    }

    // Filtrer aussi par période et magasin
    const ventes = this.allVentes.filter(
      (v) =>
        v.agentId === vendeurId &&
        this.resetTime(new Date(v.dateCreation)) >= this.resetTime(new Date(this.dateDebut)) &&
        this.resetTime(new Date(v.dateCreation)) <= this.resetTime(new Date(this.dateFin)) &&
        (this.selectedMagasinId === -1 || v.magasinId === this.selectedMagasinId),
    );

    return {
      data: {
        totalVentes: ventes.length,
        chiffreAffairesTTC: ventes.reduce((sum, v) => sum + v.totalTTC, 0),
      },
      label: vendeur.nom || `Vendeur ${vendeurId}`,
    };
  }

  private getDonneesPourMagasin(magasinId: number): { data: any; label: string } {
    const magasin = this.magasins.find((m) => m.id === magasinId);
    if (!magasin) {
      console.error('Magasin non trouvé avec ID:', magasinId);
      return { data: { totalVentes: 0, chiffreAffairesTTC: 0 }, label: 'Magasin inconnu' };
    }

    // Filtrer par période
    const ventes = this.allVentes.filter(
      (v) =>
        v.magasinId === magasinId &&
        this.resetTime(new Date(v.dateCreation)) >= this.resetTime(new Date(this.dateDebut)) &&
        this.resetTime(new Date(v.dateCreation)) <= this.resetTime(new Date(this.dateFin)),
    );

    return {
      data: {
        totalVentes: ventes.length,
        chiffreAffairesTTC: ventes.reduce((sum, v) => sum + v.totalTTC, 0),
      },
      label: magasin.nom || `Magasin ${magasinId}`,
    };
  }

  private getLabelForPeriode(periode: string): string {
    switch (periode) {
      case 'semaine_precedente':
        return 'Semaine précédente';
      case 'mois_precedent':
        return 'Mois précédent';
      case 'trimestre_precedent':
        return 'Trimestre précédent';
      case 'annee_precedente':
        return 'Année précédente';
      default:
        return 'Période inconnue';
    }
  }

  // Méthode pour créer le graphique de comparaison
  // private creerGraphiqueComparaison(): void {
  //   if (this.comparaisonChart) {
  //     this.comparaisonChart.destroy();
  //   }

  //   const ctx = document.createElement('canvas').getContext('2d');
  //   if (!ctx || !this.comparaisonData) return;

  //   this.comparaisonChart = new Chart(ctx, {
  //     type: 'bar',
  //     data: {
  //       labels: ['Chiffre d\'affaires', 'Nombre de ventes', 'Ticket moyen'],
  //       datasets: [
  //         {
  //           label: this.comparaisonLabels[0],
  //           data: [
  //             this.comparaisonData.ca1,
  //             this.comparaisonData.ventes1,
  //             this.comparaisonData.ticketMoyen1
  //           ],
  //           backgroundColor: 'rgba(54, 162, 235, 0.7)'
  //         },
  //         {
  //           label: this.comparaisonLabels[1],
  //           data: [
  //             this.comparaisonData.ca2,
  //             this.comparaisonData.ventes2,
  //             this.comparaisonData.ticketMoyen2
  //           ],
  //           backgroundColor: 'rgba(255, 99, 132, 0.7)'
  //         }
  //       ]
  //     },
  //     options: {
  //       responsive: true,
  //       plugins: {
  //         title: {
  //           display: true,
  //           text: 'Analyse comparative'
  //         },
  //         tooltip: {
  //           callbacks: {
  //             label: (context) => {
  //               let label = context.dataset.label || '';
  //               if (label) {
  //                 label += ': ';
  //               }
  //               if (context.parsed.y !== null) {
  //                 if (context.dataIndex === 0) { // CA
  //                   label += `${context.parsed.y.toLocaleString('fr-FR')} F CFA`;
  //                 } else if (context.dataIndex === 1) { // Nombre de ventes
  //                   label += `${context.parsed.y}`;
  //                 } else { // Ticket moyen
  //                   label += `${context.parsed.y.toLocaleString('fr-FR')} F CFA`;
  //                 }
  //               }
  //               return label;
  //             }
  //           }
  //         }
  //       },
  //       scales: {
  //         y: {
  //           beginAtZero: true,
  //           ticks: {
  //             callback: (value) => {
  //               if (typeof value === 'number') {
  //                 return value.toLocaleString('fr-FR');
  //               }
  //               return value;
  //             }
  //           }
  //         }
  //       }
  //     }
  //   });
  // }
  // Méthode appelée quand le type de comparaison change
  onComparaisonTypeChange(): void {
    // Réinitialiser les sélections
    this.comparaisonElement1 = null;
    this.comparaisonElement2 = null;
    this.comparaisonData = null;

    // Mettre à jour les options disponibles
    this.updateComparisonOptions();
  }

  // Mettre à jour les options de comparaison
  updateComparisonOptions(): void {
    this.isLoading = true;

    // Simuler un léger délai pour le chargement (optionnel)
    setTimeout(() => {
      this.comparisonOptions = this.getComparisonOptions();
      this.isLoading = false;

      // Réinitialiser le graphique si existant
      if (this.comparaisonChart) {
        this.comparaisonChart.destroy();
        this.comparaisonChart = undefined;
      }
    }, 100);
  }

  // Méthode pour obtenir les options (optimisée)
  getComparisonOptions(): { value: any; label: string }[] {
    if (!this.magasins || !this.vendeurs) {
      return [];
    }

    switch (this.comparaisonType) {
      case 'periode':
        return [
          { value: 'semaine_precedente', label: 'Semaine précédente' },
          { value: 'mois_precedent', label: 'Mois précédent' },
          { value: 'trimestre_precedent', label: 'Trimestre précédent' },
          { value: 'annee_precedente', label: 'Année précédente' },
        ];

      case 'vendeur':
        return this.vendeurs
          .filter((v) => v.id) // Filtre les vendeurs valides
          .map((v) => ({ value: v.id, label: v.nom || `Vendeur ${v.id}` }));

      case 'magasin':
        return this.magasins
          .filter((m) => m.id) // Filtre les magasins valides
          .map((m) => ({ value: m.id, label: m.nom || `Magasin ${m.id}` }));

      default:
        return [];
    }
  }

  // Dans ngOnInit() ou après le chargement des données
  initializeComparison(): void {
    this.updateComparisonOptions();
  }

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

  private recreateCharts() {
    // Implémentez la recréation des graphiques si nécessaire
    // Par exemple: this.initCharts();
    this.prepareChartsForExport(); // Redessine les graphiques dans la nouvelle fenêtre
  }

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
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Méthodes d'export
  async exportToPDF() {
    this.isGeneratingPDF = true; // Afficher le loader
    this.progress = 0; // Initialisation de la barre de progression

    this.isPrinting = true; // Afficher les éléments avant la capture
    await this.prepareChartsForExport();

    const noPrintElements = document.querySelectorAll('.no-printer');
    noPrintElements.forEach((el) => el.classList.add('d-none'));

    await new Promise((resolve) => setTimeout(resolve, 200));

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
        useCORS: true,
      });

      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const yPosition = margin;
      const currentHeight = imgHeight;

      const stepCount = Math.ceil(canvas.height / (pageHeight - 2 * margin)); // Nombre total d'étapes
      let step = 0; // Étape actuelle

      if (currentHeight > pageHeight - 2 * margin) {
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');

        const sX = 0;
        let sY = 0;
        const dX = canvas.width;
        const dY = (pageHeight - 2 * margin) * (canvas.width / imgWidth);

        while (sY < canvas.height) {
          pageCanvas.width = dX;
          pageCanvas.height = dY;
          pageCtx?.drawImage(canvas, sX, sY, dX, dY, 0, 0, dX, dY);

          const pageImgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, dY * (imgWidth / dX));

          sY += dY;
          step++; // Incrémentation de la progression
          this.progress = Math.round((step / stepCount) * 100); // Mise à jour de la barre

          if (sY < canvas.height) {
            pdf.addPage();
          }

          await new Promise((resolve) => setTimeout(resolve, 100)); // Délai pour voir la progression
        }
      } else {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        this.progress = 100; // Fin de la progression
      }

      pdf.save('rapport_vente.pdf');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF :', error);
    } finally {
      noPrintElements.forEach((el) => el.classList.remove('d-none'));
      this.isPrinting = false;
      this.isGeneratingPDF = false; // Cacher le loader après la génération
      this.progress = 0;
    }
  }

  // Ajoutez cette méthode à votre composant
  async prepareChartsForExport() {
    const charts = [
      this.evolutionVentesChart,
      this.comparaisonChart,
      this.paiementsChart,
      this.topProduitsChart,
    ];

    // Forcer le rendu des graphiques
    charts.forEach((chart) => {
      if (chart) {
        chart.resize();
        chart.render();
      }
    });

    // Attendre que les graphiques soient rendus
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  async exportToExcel() {
    // Vérifier si ExcelJS est disponible
    if (!ExcelJS) {
      console.error("ExcelJS n'est pas chargé.");
      return;
    }

    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Rapport de Vente';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Styles réutilisables
    const getStyle = (options: Partial<ExcelJS.Style>): Partial<ExcelJS.Style> => ({
      font: { size: 11, ...options.font },
      alignment: { vertical: 'middle', horizontal: 'center', ...options.alignment },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        ...options.border,
      },
      fill: options.fill,
    });

    const headerStyle = getStyle({
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      },
      alignment: { vertical: 'middle', horizontal: 'center' },
    });

    const titleStyle = getStyle({
      font: { bold: true, size: 14 },
      alignment: { vertical: 'middle', horizontal: 'center' },
    });

    const dataStyle = getStyle({
      font: { size: 11 },
      border: {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      },
    });

    /** Feuille Résumé **/
    const summarySheet = workbook.addWorksheet('Résumé');

    // En-tête du rapport
    summarySheet.mergeCells('A1:F2');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Rapport de Vente';
    Object.assign(titleCell.style, titleStyle);

    // Informations de base
    summarySheet.addRow([
      'Entreprise',
      "Nom de l'Entreprise",
      '',
      'Date',
      new Date().toISOString().slice(0, 10),
    ]);
    summarySheet.addRow([
      'Période',
      `${this.dateDebut} au ${this.dateFin}`,
      '',
      'Magasin',
      this.selectedMagasinId !== -1 ? this.getNomMagasin(this.selectedMagasinId) : 'Tous',
    ]);
    summarySheet.addRow([]);

    // Vue d'ensemble des ventes
    summarySheet.mergeCells('A5:F5');
    const overviewTitle = summarySheet.getCell('A5');
    overviewTitle.value = "Vue d'ensemble des ventes";
    Object.assign(overviewTitle.style, titleStyle);

    // Indicateurs clés
    const indicators = [
      ['Total Ventes', this.totalVentes, `${this.filteredVentes.length} transactions`],
      [
        "Chiffre d'Affaires",
        `${this.chiffreAffairesTTC.toLocaleString()} F CFA`,
        `${this.chiffreAffairesHT.toLocaleString()} F CFA HT`,
      ],
      [
        'Marge bénéficiaire',
        `${this.margeBeneficiaire.toLocaleString()} F CFA`,
        `${((this.margeBeneficiaire / this.chiffreAffairesHT) * 100).toFixed(2)}%`,
      ],
      [
        'Ticket moyen',
        `${this.ticketMoyen.toLocaleString()} F CFA`,
        `${this.panierMoyen.toFixed(1)} produits/vente`,
      ],
      [
        'Évolution CA',
        `${this.evolutionCA.valeur}%`,
        this.evolutionCA.tendance === '↑'
          ? 'Hausse'
          : this.evolutionCA.tendance === '↓'
            ? 'Baisse'
            : 'Stable',
      ],
      [
        'Évolution volume',
        `${this.evolutionVolume.valeur}%`,
        this.evolutionVolume.tendance === '↑'
          ? 'Hausse'
          : this.evolutionVolume.tendance === '↓'
            ? 'Baisse'
            : 'Stable',
      ],
    ];

    summarySheet
      .addRow(['Indicateur', 'Valeur', 'Détail'])
      .eachCell((cell) => Object.assign(cell.style, headerStyle));

    indicators.forEach((row) => {
      const r = summarySheet.addRow(row);
      r.eachCell((cell) => Object.assign(cell.style, dataStyle));
    });

    /** Feuille Modes de Paiement **/
    const paymentSheet = workbook.addWorksheet('Modes Paiement');
    paymentSheet.mergeCells('A1:D1');
    const paymentTitle = paymentSheet.getCell('A1');
    paymentTitle.value = 'Répartition des modes de paiement';
    Object.assign(paymentTitle.style, titleStyle);

    paymentSheet
      .addRow(['Mode', 'Montant (F CFA)', 'Transactions', 'Pourcentage'])
      .eachCell((cell) => Object.assign(cell.style, headerStyle));

    /* this.statmodesPaiement.forEach(mode => {
    paymentSheet.addRow([
      mode.mode,
      mode.montantTotal,
      mode.occurrences,
      `${((mode.montantTotal / this.chiffreAffairesTTC) * 100).toFixed(1)}%`
    ]).eachCell(cell => Object.assign(cell.style, dataStyle));
  }); */

    this.statmodesPaiement.forEach(
      (mode: { mode: string; montantTotal: number; occurrences: number }) => {
        paymentSheet
          .addRow([
            mode.mode,
            mode.montantTotal,
            mode.occurrences,
            `${((mode.montantTotal / this.chiffreAffairesTTC) * 100).toFixed(1)}%`,
          ])
          .eachCell((cell) => Object.assign(cell.style, dataStyle));
      },
    );

    /** Feuille Top Produits **/
    const productsSheet = workbook.addWorksheet('Top Produits');
    productsSheet.mergeCells('A1:G1');
    const productsTitle = productsSheet.getCell('A1');
    productsTitle.value = 'Top 10 des produits';
    Object.assign(productsTitle.style, titleStyle);

    productsSheet
      .addRow([
        'Produit',
        'Quantité',
        'Prix de vente',
        'Transactions',
        'CA TTC',
        'Marge',
        '% Marge',
      ])
      .eachCell((cell) => Object.assign(cell.style, headerStyle));

    this.topProduits.forEach((produit) => {
      productsSheet
        .addRow([
          produit.produit.designation,
          produit.quantite,
          produit.produit.prixVenteUnitaire,
          produit.nombreVentes,
          produit.ca,
          produit.marge,
          `${((produit.marge / produit.ca) * 100).toFixed(2)}%`,
        ])
        .eachCell((cell) => Object.assign(cell.style, dataStyle));
    });

    /** Feuille Top Clients **/
    const clientsSheet = workbook.addWorksheet('Top Clients');
    clientsSheet.mergeCells('A1:E1');
    const clientsTitle = clientsSheet.getCell('A1');
    clientsTitle.value = 'Top 10 des clients';
    Object.assign(clientsTitle.style, titleStyle);

    clientsSheet
      .addRow(['Client', 'Transactions', 'CA TTC', 'Dernière visite', 'Ticket moyen'])
      .eachCell((cell) => Object.assign(cell.style, headerStyle));

    this.topClients.forEach((client) => {
      clientsSheet
        .addRow([
          client.client.nomComplet || 'Client anonyme',
          client.nbAchats,
          client.ca,
          client.dernierAchat ? new Date(client.dernierAchat).toISOString().slice(0, 10) : '-',
          (client.ca / client.nbAchats).toFixed(0),
        ])
        .eachCell((cell) => Object.assign(cell.style, dataStyle));
    });

    /** Feuille Performance Vendeurs **/
    const sellersSheet = workbook.addWorksheet('Performance Vendeurs');
    sellersSheet.mergeCells('A1:F1');
    const sellersTitle = sellersSheet.getCell('A1');
    sellersTitle.value = 'Performance des vendeurs';
    Object.assign(sellersTitle.style, titleStyle);

    sellersSheet
      .addRow(['Vendeur', 'Ventes', 'CA HT', 'CA TTC', 'Ticket moyen', 'Panier moyen'])
      .eachCell((cell) => Object.assign(cell.style, headerStyle));

    this.vendeursPerformance.forEach((vendeur) => {
      sellersSheet
        .addRow([
          vendeur.vendeur.nom,
          vendeur.nbVentes,
          vendeur.caHT,
          vendeur.caTTC,
          vendeur.ticketMoyen,
          vendeur.panierMoyen,
        ])
        .eachCell((cell) => Object.assign(cell.style, dataStyle));
    });

    /** Feuille Détails Ventes **/
    const salesSheet = workbook.addWorksheet('Détails Ventes');
    salesSheet.mergeCells('A1:H1');
    const salesTitle = salesSheet.getCell('A1');
    salesTitle.value = 'Détails des ventes';
    Object.assign(salesTitle.style, titleStyle);

    salesSheet
      .addRow([
        'Date',
        'N° Ticket',
        'Client',
        'Articles',
        'Total TTC',
        'Paiement',
        'Vendeur',
        'Statut',
      ])
      .eachCell((cell) => Object.assign(cell.style, headerStyle));

    this.filteredVentes.forEach((vente) => {
      const paiements =
        vente.paiements
          ?.map(
            (p) => `${this.getNomModePaiement(0)}: ${p.montant.toFixed(0)} F CFA`,
          )
          .join('\n') || 'Non spécifié';

      salesSheet
        .addRow([
          new Date(vente.dateCreation).toISOString().slice(0, 10),
          vente.id,
          this.getNomClient(vente.clientId!),
          vente.articles.length,
          vente.totalTTC,
          { text: paiements, style: { alignment: { wrapText: true } } },
          this.getNomVendeur(vente.agentId!),
          vente.statut,
        ])
        .eachCell((cell, colNumber) => {
          if (colNumber !== 6) {
            // Ne pas appliquer le style à la colonne des paiements (qui a un style spécial)
            Object.assign(cell.style, dataStyle);
          }
        });
    });

    // Ajuster la largeur des colonnes pour la feuille des ventes
    salesSheet.columns = [
      { width: 15 }, // Date
      { width: 10 }, // N° Ticket
      { width: 25 }, // Client
      { width: 10 }, // Articles
      { width: 15 }, // Total TTC
      { width: 30 }, // Paiement
      { width: 20 }, // Vendeur
      { width: 15 }, // Statut
    ];

    /** Génération du fichier Excel **/
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `rapport_vente_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
