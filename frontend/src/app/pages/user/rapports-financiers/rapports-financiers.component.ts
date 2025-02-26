import { Component } from '@angular/core';
import { EtatFinancier, CompteResultat, FluxTresorerie, AnalyseCoutsBenefices, PrevisionsFinancieres } from '../../../modeles/rapports-financiers.model';
import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-rapports-financiers',
  standalone:true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './rapports-financiers.component.html',
  styleUrl: './rapports-financiers.component.css'
})
export class RapportsFinanciersComponent {

  // Données des rapports financiers
  etatFinancier: EtatFinancier = { actif: 500000, passif: 300000, capitauxPropres: 200000 };
  compteResultat: CompteResultat = { revenus: 700000, charges: 500000, beneficeNet: 200000 };
  fluxTresorerie: FluxTresorerie = { entree: 800000, sortie: 400000 };
  analyseCoutsBenefices: AnalyseCoutsBenefices = { coutsFixes: 100000, coutsVariables: 200000, benefices: 400000 };
  previsionsFinancieres: PrevisionsFinancieres = { revenusPrevus: 750000, chargesPrevisibles: 450000, beneficePrevu: 300000 };

  // Données pour les graphiques
  fluxTresorerieChartData: ChartData<'pie'> = {
    labels: ['Entrée', 'Sortie'],
    datasets: [
      {
        data: [0, 0], // Valeurs initiales, mises à jour plus tard
        backgroundColor: ['#4CAF50', '#FF5733']
      }
    ]
  };
  analyseCoutsBeneficesChartData: ChartData<'bar'> = {
    labels: ['Coûts Fixes', 'Coûts Variables', 'Bénéfices'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#FFEB3B', '#F44336', '#4CAF50']
      }
    ]
  };

  // Options des graphiques
  fluxTresorerieChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  analyseCoutsBeneficesChartOptions: ChartOptions = {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    },
  };

  fluxTresorerieChartType: ChartType = 'pie';
  analyseCoutsBeneficesChartType: ChartType = 'bar';

  constructor() { }

  ngOnInit(): void {
    this.updateFluxTresorerieChart();
    this.updateAnalyseCoutsBeneficesChart();
  }

  updateFluxTresorerieChart(): void {
    // Mettre à jour les données du graphique de flux de trésorerie
    this.fluxTresorerieChartData.datasets[0].data = [this.fluxTresorerie.entree, this.fluxTresorerie.sortie];
  }

  updateAnalyseCoutsBeneficesChart(): void {
    // Mettre à jour les données de l'analyse des coûts et bénéfices
    this.analyseCoutsBeneficesChartData.datasets[0].data = [
      this.analyseCoutsBenefices.coutsFixes,
      this.analyseCoutsBenefices.coutsVariables,
      this.analyseCoutsBenefices.benefices
    ];
  }
}
