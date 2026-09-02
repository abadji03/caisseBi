import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Bon } from '../../modeles/bon.model';
import { Client } from '../../modeles/clients.model';
import { Fournisseur } from '../../modeles/fournisseur.model';
import { Operation } from '../../modeles/operation.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BonHelper } from '../../helpers/bon.helper';

@Component({
  selector: 'app-liste-operations',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './liste-operations.component.html',
  styleUrl: './liste-operations.component.css'
})
export class ListeOperationsComponent implements OnInit, OnChanges {

  @Input() operations: Operation[] = [];
  @Input() entiteNom = '';
  @Input() entite: Client | Fournisseur | null = null;
  @Input() startDate?: string;
  @Input() endDate?: string;
  @Input() showBonForm = false;
  @Input() showPaiementForm = false;
  @Input() isAdmin = false;
  
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onDateChange = new EventEmitter<{startDate?: string, endDate?: string}>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onImprimerReleve = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onToggleBonForm = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onTogglePaiementForm = new EventEmitter<void>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onViewOperationDetails = new EventEmitter<{index: number, operation: Operation}>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onLivrerBon = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onAnnulerBon = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onRetournerBon = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onFacturerBon = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onImprimerBon = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onGenererTicketPaiementBon = new EventEmitter<Bon>();
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onGenererTicketVersement = new EventEmitter<Operation>();


  filteredOperations: Operation[] = [];
  selectedOperationIndex: number | null = null;

  ngOnInit(): void {
    this.filteredOperations = [...this.operations];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['operations']) {
      this.filteredOperations = [...this.operations];
    }
  }

  onStartDateChange(date: string): void {
    this.onDateChange.emit({startDate: date, endDate: this.endDate});
  }

  onEndDateChange(date: string): void {
    this.onDateChange.emit({startDate: this.startDate, endDate: date});
  }

  toggleDetails(index: number, operation: Operation): void {
    if (this.selectedOperationIndex === index) {
      this.selectedOperationIndex = null;
    } else {
      this.selectedOperationIndex = index;
    }
    this.onViewOperationDetails.emit({index, operation});
  }

  canFacturer(bon: Bon): boolean {
    return BonHelper.peutFacturer(bon);
  }

  canReturn(bon: Bon): boolean {
    return BonHelper.peutRetourner(bon);
  }

  safeNumber(value: unknown): number {
    return BonHelper.safeNumber(value);
  }
}
