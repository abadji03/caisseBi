import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Paiement } from '../../modeles/paiement.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-liste-versements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './liste-versements.component.html',
  styleUrl: './liste-versements.component.css'
})
export class ListeVersementsComponent implements OnChanges{

  @Input() paiements: Paiement[] = [];
  @Input() entiteNom = '';
  @Input() isAdmin = false;
   // Entrées pour la pagination
  @Input() currentPage = 1;
  @Input() totalPages = 0;
  @Input() totalItems = 0;
  @Input() hasPrev = false;
  @Input() hasNext = false;
  @Input() itemsPerPage = 10;
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onViewDetails = new EventEmitter<Paiement>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onImprimerTicket = new EventEmitter<Paiement>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onPageChange = new EventEmitter<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paiements']) {
      console.log('Paiements reçus:', this.paiements);
    }
  }

  get affichageDebut(): number {
    return ((this.currentPage - 1) * this.itemsPerPage) + 1;
  }

  get affichageFin(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }
 
changePage(page: number): void {
    this.onPageChange.emit(page);
  }

  getEntiteNomValue(paiement: Paiement): string {
    if (paiement.typePaiement === 'client') {
      return paiement.Client?.nomComplet || 'N/A';
    } else if (paiement.typePaiement === 'fournisseur') {
      return paiement.Fournisseur?.nomComplet || 'N/A';
    }
    return 'N/A';
  }

  viewDetails(paiement: Paiement): void {
    this.onViewDetails.emit(paiement);
  }

  imprimerTicket(paiement: Paiement): void {
    this.onImprimerTicket.emit(paiement);
  }


}
