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
export class RapportsVentesComponent {

  }
