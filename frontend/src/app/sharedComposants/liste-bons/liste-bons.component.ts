import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Bon } from '../../modeles/bon.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TablePaginationComponent } from '../../shared/table/table-pagination.component';

@Component({
  selector: 'app-liste-bons',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent],
  templateUrl: './liste-bons.component.html',
  styleUrl: './liste-bons.component.css'
})
export class ListeBonsComponent implements OnChanges {

  @Input() bons: Bon[] = [];
  @Input() entiteNom = '';
  @Input() isAdmin = false;

  // Nouvelles entrées pour la pagination
  @Input() currentPage = 1;
  @Input() totalPages = 0;
  @Input() totalItems = 0;
  @Input() itemsPerPage = 10; 
  @Input() hasPrev = false;
  @Input() hasNext = false;
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onViewDetails = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onLivrer = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnuler = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onRetourner = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onFacturer = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onImprimer = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onGenererTicket = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onPageChange = new EventEmitter<number>();
 
  selectedBonIndex: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bons']) {
      this.selectedBonIndex = null;
    }
  }

 toggleDetails(index: number, bon: Bon): void {
    if (this.selectedBonIndex === index) {
      this.selectedBonIndex = null;
    } else {
      this.selectedBonIndex = index;
    }
    this.onViewDetails.emit(bon);
  }

  canReturn(bon: Bon): boolean {
    if (!bon) return false;
    const statut = String(bon.statutBon ?? '').trim().toLowerCase();
    const type = String(bon.type ?? '').trim().toLowerCase();
    const avanceNum = Number(bon.avance ?? 0);
    return statut === 'validé' && type === 'livraison' && avanceNum === 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  safeNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}