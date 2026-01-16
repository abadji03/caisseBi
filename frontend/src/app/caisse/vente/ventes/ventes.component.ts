/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { EncaissementsResponse, StatsRemises, StatsAvoirs, CaisseTheorique, ComparatifCA, CAParJourResponse, KPICaissePeriode, KPIParamsJournalier, KPIParams, PaiementMode } from '../../../modeles/kpiCaisse.model';
import { Structure } from '../../../modeles/structure.model';
import { KpiCaisseService } from '../../../services/kpi-caisse.service';
import { Magasin } from '../../../modeles/magasin.model';
import { User } from '@sentry/angular';
import { StructureService } from '../../../services/structure.service';
import { UserService } from '../../../services/user.service';
import { MaagasinsService } from '../../../services/maagasins.service';
import { AuthService } from '../../../services/auth.service';

Chart.register(...registerables);

interface PeriodeOption {
  label: string;
  value: 'jour' | 'semaine' | 'mois' | 'annee';
}

@Component({
  selector: 'app-ventes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventes.component.html',
  styleUrl: './ventes.component.css',
})
export class VentesComponent implements OnInit, OnDestroy {
   
  kpiData: KPICaissePeriode | null = null;
  paiementsData: EncaissementsResponse | null = null;
  remisesData: StatsRemises | null = null;
  avoirsData: StatsAvoirs | null = null;
  caisseTheoriqueData: CaisseTheorique | null = null;
  comparatifData: ComparatifCA | null = null;
  caParJourData: CAParJourResponse | null = null;
  
  // Structure courante (fixe)
  currentStructure: Structure | null = null;
  structureCode= ''; 

  // Informations utilisateur connecté
  currentUser: any = null;
  userMagasinId = 1; // number | null = null;
  isAdmin = false;
  
  code_structure = 'MASTRUCTURET-NZNC';

  // États
  loading = false;
  periodeSelectionnee: 'jour' | 'semaine' | 'mois' | 'annee' = 'jour';
  dateReference: string = new Date().toISOString().split('T')[0];
  errorMessage: string | null = null;
  
  // Filtres 
  magasins: Magasin [] = [];
  agents:User [] = [];
  
  // Filtres sélectionnés
  structureSelectionnee: Structure|null = null;
  magasinSelectionne: Magasin | null = null;
  agentSelectionne: User | null = null;
  
  // Options de période
  periodes: PeriodeOption[] = [
    { label: 'Aujourd\'hui', value: 'jour' },
    { label: 'Cette semaine', value: 'semaine' },
    { label: 'Ce mois', value: 'mois' },
    { label: 'Cette année', value: 'annee' }
  ];
  
  // Références aux charts
  @ViewChild('chartPaiements') chartPaiementsRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartCADaily') chartCADailyRef!: ElementRef<HTMLCanvasElement>;
  private chartPaiements: Chart | null = null;
  private chartCADaily: Chart | null = null;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  private kpiService = inject(KpiCaisseService)
  private structureService = inject(StructureService);
  private userService = inject(UserService);
  private magasinService = inject(MaagasinsService);
  private authService = inject(AuthService);


  
  
  ngOnInit(): void {
    //this.loadData();
    //this.chargerDonnees();
    this.loadUserAndStructure();
  }
  
 ngOnDestroy(): void {
    // Nettoyer les subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Détruire les charts
    if (this.chartPaiements) {
      this.chartPaiements.destroy();
    }
    if (this.chartCADaily) {
      this.chartCADaily.destroy();
    }
  }

  /**
   * Charger l'utilisateur connecté et la structure
   */
  private loadUserAndStructure(): void {
    this.loading = true;
    
    // Récupérer l'utilisateur connecté
    // this.currentUser = this.authService.getCurrentUser();
    
    // if (!this.currentUser) {
    //   this.errorMessage = 'Utilisateur non connecté';
    //   this.loading = false;
    //   return;
    // }
    
    // Déterminer si l'utilisateur est admin
    /* this.isAdmin = this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin';
    
    // Récupérer la structure de l'utilisateur
    this.structureCode = this.currentUser.code_structure || this.currentUser.structure;
    
    if (!this.structureCode) {
      this.errorMessage = 'Aucune structure associée à cet utilisateur';
      this.loading = false;
      return;
    } */
    
    // Charger les données de la structure
    this.structureService.getByCodeStructure(this.code_structure).subscribe({
    //this.structureService.getByCodeStructure(this.structureCode).subscribe({
      next: (structure) => {
        this.currentStructure = structure;
        this.loadMagasinsEtAgents();
      },
      error: (error) => {
        console.error('Erreur chargement structure:', error);
        this.errorMessage = 'Erreur lors du chargement de la structure';
        this.loading = false;
      }
    });
  }

   /**
   * Charger les magasins et agents pour la structure
   */
  private loadMagasinsEtAgents(): void {
    forkJoin([
      // this.magasinService.getMagasinsByStructure(this.structureCode),
      // this.userService.getByStructure(this.structureCode),
      this.magasinService.getMagasinsByStructure(this.code_structure),
      this.userService.getByStructure(this.code_structure),
    ])
      .pipe(
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: ([mgs, users]) => {
          this.magasins = mgs;
          this.agents = users;
          
          // Déterminer le magasin de l'utilisateur (si non admin)
          /* if (!this.isAdmin && this.currentUser.magasinId) {
            this.userMagasinId = Number(this.currentUser.magasinId);
            // Sélectionner automatiquement le magasin de l'utilisateur
            this.magasinSelectionne = this.magasins.find(m => m.id === this.userMagasinId) || null;
          } */

          this.magasinSelectionne = this.magasins.find(m => m.id === this.userMagasinId) || null;
          
          // Charger les données KPI
          this.chargerDonnees();
        },
        error: (err) => {
          console.error('Erreur chargement magasins/agents', err);
          this.errorMessage = 'Erreur lors du chargement des magasins et agents';
        },
      });
  }
  
  /**
   * Charger toutes les données KPI
   */

  chargerDonnees(): void {
    this.loading = true;
    this.errorMessage = null;
    
    // Si c'est la période "jour", utiliser les méthodes journalières
    if (this.periodeSelectionnee === 'jour') {
      this.chargerDonneesJournalieres();
    } else {
      this.chargerDonneesPeriode();
    }
  }
  
  /**
   * Charger les données journalières
   */
  private chargerDonneesJournalieres(): void {
    // Préparer les paramètres journaliers
    const params: KPIParamsJournalier = {
      //code_structure: this.structureCode,
      code_structure: this.code_structure,
      magasinId: this.getMagasinIdForApi(),
      agentId: this.agentSelectionne?.id ? Number(this.agentSelectionne.id) : undefined
    };
    
    const observables = [
      this.kpiService.getKpiCaisseJour(params),
      this.kpiService.getPaiementsJour(params),
      this.kpiService.getRemises(params),
      this.kpiService.getAvoirs(params),
      this.kpiService.getCaisseTheorique(params)
    ];
    
    const subscription = forkJoin(observables).subscribe({
      next: ([kpi, paiements, remises, avoirs, caisseTheorique]) => {
        this.kpiData = kpi as KPICaissePeriode;
        this.paiementsData = paiements as EncaissementsResponse;
        this.remisesData = remises as StatsRemises;
        this.avoirsData = avoirs as StatsAvoirs;
        this.caisseTheoriqueData = caisseTheorique as CaisseTheorique;
        this.loading = false;
        
        // Initialiser les graphiques
        setTimeout(() => {
          this.initialiserChartPaiements();
          this.chargerComparatifCA();
          this.chargerCAParJour();
        }, 100);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données journalières:', error);
        this.errorMessage = 'Erreur lors du chargement des données: ' + (error.error?.message || error.message);
        this.resetDonnees();
        this.loading = false;
      }
    });
    
    this.subscriptions.push(subscription);
  }

  get magasinsFiltres() {
    return this.magasins.filter(m => m.code_structure === this.structureSelectionnee?.code_structure);
  }

  /**
 * Calculer le pourcentage d'un paiement
 */
calculerPart(paiement: PaiementMode): string {
  if (!this.paiementsData?.paiements?.length) return '0';
  const total = this.paiementsData.paiements.reduce((sum, p) => sum +Number( p.total), 0);
  return total > 0 ? ((paiement.total / total) * 100).toFixed(1) : '0';
}

/**
 * Calculer le total des paiements
 */
calculerTotalPaiements(): number {
  if (!this.paiementsData?.paiements?.length) return 0;
  return this.paiementsData.paiements.reduce((sum, p) => sum + Number(p.total), 0);
}

  /**
   * Charger les données pour une période
   */
   private chargerDonneesPeriode(): void {
    // Préparer les paramètres de période
    const params: KPIParams = {
      periode: this.periodeSelectionnee,
      dateReference: this.dateReference,
      //code_structure: this.structureCode,
      code_structure: this.code_structure,
      magasinId: this.getMagasinIdForApi(),
      agentId: this.agentSelectionne?.id ? Number(this.agentSelectionne.id) : undefined
    };
    
    const observables = [
      this.kpiService.getKpiCaissePeriode(params),
      this.kpiService.getPaiementsPeriode(params),
      this.kpiService.getRemises(params),
      this.kpiService.getAvoirs(params),
      this.kpiService.getCaisseTheorique(params),
      this.kpiService.getComparatifCA(params)
    ];
    
    const subscription = forkJoin(observables).subscribe({
      next: ([kpi, paiements, remises, avoirs, caisseTheorique, comparatif]) => {
        this.kpiData = kpi as KPICaissePeriode;
        this.paiementsData = paiements as EncaissementsResponse;
        this.remisesData = remises as StatsRemises;
        this.avoirsData = avoirs as StatsAvoirs;
        this.caisseTheoriqueData = caisseTheorique as CaisseTheorique;
        this.comparatifData = comparatif as ComparatifCA;
        this.loading = false;
        
        // Initialiser les graphiques
        setTimeout(() => {
          this.initialiserChartPaiements();
          this.chargerCAParJour();
        }, 100);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.errorMessage = 'Erreur lors du chargement des données: ' + (error.error?.message || error.message);
        this.resetDonnees();
        this.loading = false;
      }
    });
    
    this.subscriptions.push(subscription);
  }

  /**
   * Obtenir le magasin ID pour l'API selon le profil utilisateur
   */
  private getMagasinIdForApi(): number | undefined {
    // Si c'est un admin et qu'il a sélectionné un magasin
    /* if (this.isAdmin && this.magasinSelectionne) {
      return this.magasinSelectionne.id;
    }
    // Si c'est un non-admin, utiliser son magasin
    else if (!this.isAdmin && this.userMagasinId) {
      return this.userMagasinId;
    }
    // Sinon, pas de filtre magasin (tous les magasins de la structure)
    return undefined; */
    return this.userMagasinId
  }
  /**
   * Obtenir le niveau actuel pour l'affichage
   */
  get currentNiveau(): string {
    if (this.isAdmin && this.magasinSelectionne) {
      return 'magasin';
    } else if (!this.isAdmin && this.userMagasinId) {
      return 'magasin';
    } else {
      return 'structure';
    }
  }

  /**
   * Obtenir le nom du magasin actuel pour l'affichage
   */
  get currentMagasinNom(): string {
    if (this.isAdmin && this.magasinSelectionne) {
      return this.magasinSelectionne.nom;
    } else if (!this.isAdmin && this.magasinSelectionne) {
      return this.magasinSelectionne.nom;
    }
    return '';
  }
  /**
   * Vérifier si l'utilisateur peut sélectionner un magasin
   */
  get canSelectMagasin(): boolean {
    return this.isAdmin;
  }
  /**
   * Charger le comparatif CA (seulement pour les périodes)
   */
  private chargerComparatifCA(): void {
  if (this.periodeSelectionnee === 'jour') {
    // Pour le journalier, on charge le comparatif séparément
    const params: KPIParams = {
      periode: this.periodeSelectionnee,
      dateReference: this.dateReference,
      //code_structure: this.structureCode,
      code_structure: this.code_structure,
      magasinId: this.getMagasinIdForApi(),
      agentId: this.agentSelectionne?.id ? Number(this.agentSelectionne.id) : undefined
    };
    
    const subscription = this.kpiService.getComparatifCA(params).subscribe({
      next: (data) => {
        this.comparatifData = data;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du comparatif:', error);
      }
    });
    
    this.subscriptions.push(subscription);
  }
}

  
  /**
   * Charger le CA par jour
   */
  private chargerCAParJour(): void {
  const params: KPIParams = {
    //code_structure: this.structureCode,
    code_structure: this.code_structure,
    magasinId: this.getMagasinIdForApi(),
    agentId: this.agentSelectionne?.id ? Number(this.agentSelectionne.id) : undefined
  };
  
  // Pour la période "jour", on prend le mois en cours par défaut
  if (this.periodeSelectionnee !== 'jour') {
    params.periode = this.periodeSelectionnee;
    params.dateReference = this.dateReference;
  }
  
  const subscription = this.kpiService.getCAParJour(params).subscribe({
    next: (data) => {
      this.caParJourData = data;
      setTimeout(() => {
        this.initialiserChartCADaily();
      }, 100);
    },
    error: (error) => {
      console.error('Erreur lors du chargement du CA par jour:', error);
    }
  });
  
  this.subscriptions.push(subscription);
}  
  /**
   * Initialiser le graphique des paiements par mode
   */
  private initialiserChartPaiements(): void {
  if (!this.paiementsData?.paiements || this.paiementsData.paiements.length === 0) {
    return;
  }
  
  const ctx = this.chartPaiementsRef?.nativeElement?.getContext('2d');
  if (!ctx) return;
  
  // Détruire le chart existant
  if (this.chartPaiements) {
    this.chartPaiements.destroy();
  }
  
  const paiements = this.paiementsData.paiements;
  const labels = paiements.map(p => p.methodePaiement);
  const data = paiements.map(p => p.total);
  const backgroundColors = this.generateColors(paiements.length);
  
  this.chartPaiements = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: `Répartition des paiements (${this.paiementsData.periode})`
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw as number;
              const total = data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${context.label}: ${this.formatMontant(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}
  
  /**
   * Initialiser le graphique du CA par jour
   */
  private initialiserChartCADaily(): void {
  if (!this.caParJourData?.data || this.caParJourData.data.length === 0) {
    return;
  }
  
  const ctx = this.chartCADailyRef?.nativeElement?.getContext('2d');
  if (!ctx) return;
  
  // Détruire le chart existant
  if (this.chartCADaily) {
    this.chartCADaily.destroy();
  }
  
  const data = this.caParJourData.data;
  const labels = data.map(d => new Date(d.date).toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short' 
  }));
  const caValues = data.map(d => d.total);
  const nombrePaniers = data.map(d => d.nombrePaniers);
  
  this.chartCADaily = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Chiffre d\'affaires (F CFA)',
          data: caValues,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Nombre de paniers',
          data: nombrePaniers,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'CA (F CFA)'
          },
          border: {
            display: false
          },
          grid: {
            drawOnChartArea: false,
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Nombre de paniers'
          },
          border: {
            display: false
          },
          grid: {
            drawOnChartArea: false,
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `Évolution du CA par jour (${this.caParJourData.periode})`
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (context.datasetIndex === 0) {
                return `CA: ${this.formatMontant(context.raw as number)}`;
              } else {
                return `Paniers: ${context.raw}`;
              }
            }
          }
        }
      }
    }
  });
}
  
  /**
   * Gérer le changement de période
   */
  onPeriodeChange(): void {
    this.chargerDonnees();
  }
  
  /**
   * Gérer le changement de date
   */
  onDateChange(): void {
    if (this.periodeSelectionnee !== 'jour') {
      this.chargerDonnees();
    }
  }
  
  /**
   * Gérer le changement de structure
   */
  onStructureChange(): void {
    // Réinitialiser le magasin sélectionné si la structure change
    this.magasinSelectionne = null;
    this.chargerDonnees();
  }
  
  /**
   * Gérer le changement de magasin
   */
  onMagasinChange(): void {
    this.chargerDonnees();
  }
  
  /**
   * Gérer le changement d'agent
   */
  onAgentChange(): void {
    this.chargerDonnees();
  }
  
  /**
   * Réinitialiser tous les filtres
   */
  resetFilters(): void {
    // Pour les admins: réinitialiser seulement le magasin sélectionné
    if (this.isAdmin) {
      this.magasinSelectionne = null;
    }
    this.agentSelectionne = null;
    this.periodeSelectionnee = 'jour';
    this.dateReference = new Date().toISOString().split('T')[0];
    this.chargerDonnees();
  }

   /**
   * Réinitialiser les données affichées
   */
  private resetDonnees(): void {
    this.kpiData = null;
    this.paiementsData = null;
    this.remisesData = null;
    this.avoirsData = null;
    this.caisseTheoriqueData = null;
    this.comparatifData = null;
    this.caParJourData = null;
    
    // Détruire les charts
    if (this.chartPaiements) {
      this.chartPaiements.destroy();
      this.chartPaiements = null;
    }
    if (this.chartCADaily) {
      this.chartCADaily.destroy();
      this.chartCADaily = null;
    }
  }
  
  /**
   * Formater un montant avec séparateur de milliers
   */
  formatMontant(montant: number): string {
    return this.kpiService.formatMontant(montant);
  }
  
  /**
   * Obtenir la classe CSS pour la variation
   */
  getVariationClass(variation: number): string {
    if (variation > 0) return 'text-green-600';
    if (variation < 0) return 'text-red-600';
    return 'text-gray-600';
  }
  
  /**
   * Obtenir l'icône pour la variation
   */
  getVariationIcon(variation: number): string {
    if (variation > 0) return '▲';
    if (variation < 0) return '▼';
    return '●';
  }
  
  /**
   * Générer des couleurs pour les graphiques
   */
  private generateColors(count: number): string[] {
    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Bleu
      'rgba(16, 185, 129, 0.8)',   // Vert
      'rgba(245, 158, 11, 0.8)',   // Jaune
      'rgba(239, 68, 68, 0.8)',    // Rouge
      'rgba(139, 92, 246, 0.8)',   // Violet
      'rgba(14, 165, 233, 0.8)',   // Cyan
      'rgba(20, 184, 166, 0.8)',   // Teal
      'rgba(244, 63, 94, 0.8)',    // Rose
    ];
    
    return colors.slice(0, count);
  }
  
  /**
   * Obtenir le libellé de la période
   */
   getPeriodeLabel(): string {
    const periode = this.periodes.find(p => p.value === this.periodeSelectionnee);
    return periode?.label || this.periodeSelectionnee;
  }
  
  /**
   * Vérifier si des filtres sont actifs
   */
  get hasActiveFilters(): boolean {
    return !!this.structureSelectionnee || !!this.magasinSelectionne || !!this.agentSelectionne;
  }

  
}