import { Component } from '@angular/core';
import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { VentesService } from '../../../services/ventes.service';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
@Component({
  selector: 'app-ventes',
  standalone:true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './ventes.component.html',
  styleUrl: './ventes.component.css'
})
export class VentesComponent {

  donneesVentes: any;

  // Données du graphique
  public donneesVentesChartOptions: ChartOptions = {
    responsive: true,
  };
  public donneesVentesChartLabels: string[] = ['Semaine 1', 'Semaine 2', 'Semaine 3'];
  public donneesVentesChartData: ChartData = {
    labels: this.donneesVentesChartLabels,
    datasets: [
      {
        data: [10000, 15000, 20000],  // Exemples de données
        label: 'Ventes Totales',
        backgroundColor: 'rgba(0, 123, 255, 0.2)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1
      }
    ]
  };
  public donneesVentesChartType: ChartType = 'bar';

  constructor(private donneesVentesService: VentesService) {}

  ngOnInit(): void {
    this.donneesVentesService.getSalesHistory().subscribe(data => {
      this.donneesVentes = data;
    });
  }
}
