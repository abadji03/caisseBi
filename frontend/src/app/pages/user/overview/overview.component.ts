import { Component } from '@angular/core';
import { ChartOptions, ChartData, ChartType} from 'chart.js';
import { Chart as ChartJS,registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';

// Enregistrer les éléments nécessaires dans Chart.js
ChartJS.register(...registerables);

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule,BaseChartDirective],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent {

  // Données pour le graphique
    public lineChartData: ChartData<'line'> = {
      labels: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin','Juillet','Aout','Séptembre','Octobre','Novembre','Décembre'],
      datasets: [
        {
          data: [65, 59, 80, 81, 56,60,65, 49, 55, 71, 56,95],
          label: 'Ventes Mensuelles',
          borderColor: '#42A5F5',
          fill: false
        },
        {
          data: [28, 48, 40, 19, 86,80,38, 46, 50, 30, 76,70],
          label: 'Stock Mensuel',
          borderColor: '#66BB6A',
          fill: false
        }
      ]
    };

    // Options du graphique
    public lineChartOptions: ChartOptions = {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Mois'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Montant/Stock'
          }
        }
      }
    };

    // Type du graphique
    public lineChartType: ChartType = 'line';

    // Indicateurs de performance
    kpis = [
      { label: 'Ventes Totales', value: '2500 F CFA', icon: 'bi-cash' },
      { label: 'Stock Disponible', value: '1500 produits', icon: 'bi-box' },
      { label: 'Clients Actifs', value: '350', icon: 'bi-person-check' },
      { label: 'Livraisons en Attente', value: '25', icon: 'bi-truck' }
    ];

    // Notifications importantes
    notifications = [
      { text: 'Nouvelle commande de client X', date: '2024-12-26' },
      { text: 'Inventaire prévu pour le 30 décembre', date: '2024-12-30' },
      { text: 'Réapprovisionnement de stock nécessaire', date: '2024-12-28' }
    ];

    // Résumé des ventes
    resumesVentes = {
      daily: 500,
      weekly: 3500,
      monthly: 15000
    };
}
