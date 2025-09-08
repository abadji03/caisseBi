import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RapportsFinanciersComponent } from '../rapports-financiers/rapports-financiers.component';
import { RapportsStocksComponent } from '../rapports-stocks/rapports-stocks.component';
import { RapportsVentesComponent } from '../rapports-ventes/rapports-ventes.component';

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RapportsFinanciersComponent,
    RapportsStocksComponent,
    RapportsVentesComponent,
  ],
  templateUrl: './rapports.component.html',
  styleUrl: './rapports.component.css',
})
export class RapportsComponent {
  activeTab = 'ventes';
}
