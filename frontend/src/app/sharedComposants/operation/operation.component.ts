import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Operation } from '../../modeles/operation.model';
import { FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-operation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './operation.component.html',
  styleUrl: './operation.component.css'
})
export class OperationComponent implements OnChanges, OnInit {

  @Input() operations: Operation[] = [];
  @Input() startDate?: string;
  @Input() endDate?: string;
  @Input() clientId?: number;
  @Input() fournisseurId?: number;
  @Output() operationSelected = new EventEmitter<Operation>();

  filteredOperations: Operation[] = [];
  operationForm!: FormGroup;
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.filterOperations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['operations'] || changes['startDate'] || changes['endDate']) {
      this.filterOperations();
    }
  }

  filterOperations(): void {
    if (!this.startDate || !this.endDate) {
      this.filteredOperations = [...this.operations];
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);

    this.filteredOperations = this.operations.filter(operation => {
      const operationDate = new Date(operation.dateOperation);
      return operationDate >= start && operationDate <= end;
    });
  }

  selectOperation(operation: Operation): void {
    this.operationSelected.emit(operation);
  }

  getOperationTypeLabel(type?: string): string {
    switch (type) {
      case 'COMMANDE': return 'Commande';
      case 'VERSEMENT': return 'Versement';
      case 'FACTURE': return 'Facture';
      case 'TICKET_CAISSE': return 'Ticket de caisse';
      case 'RETOUR': return 'Retour';
      case 'AVOIR': return 'Avoir';
      case 'LIVRAISON': return 'Livraison';
      default: return 'Inconnu';
    }
  }

  getStatutBadgeClass(statut: string): string {
  switch (statut) {
    case 'PAYE': 
      return 'badge bg-success';
    case 'PARTIELLEMENT_PAYE': 
      return 'badge bg-warning text-dark';
    case 'IMPAYE': 
      return 'badge bg-danger';
    case 'ANNULE': 
      return 'badge bg-secondary';
    default: 
      return 'badge bg-light text-dark';
  }
}


  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'PAYE': return 'Payé';
      case 'PARTIELLEMENT_PAYE': return 'Partiellement payé';
      case 'IMPAYE': return 'Impayé';
      case 'ANNULE': return 'Annulé';
      default: return 'Inconnu';
    }
  }
}
