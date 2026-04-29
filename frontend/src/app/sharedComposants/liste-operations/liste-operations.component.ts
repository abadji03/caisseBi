import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Bon } from '../../modeles/bon.model';
import { Client } from '../../modeles/clients.model';
import { Fournisseur } from '../../modeles/fournisseur.model';
import { Operation } from '../../modeles/operation.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    if (!bon) return false;
    if (bon.statutBon === 'facturé') return false;
    if (bon.type === 'avoir') return false;

    const typeEntite = bon.typeEntite || (bon.clientId ? 'client' : bon.fournisseurId ? 'fournisseur' : null);
    
    // Règles de facturation par type d'entité et type de bon
    const reglesFacturation: Record<string, Record<string, string[]>> = {
      client: {
        commande: ['livré', 'valide'],      // Commande client peut être facturée quand livrée ou validée
        vente: ['validé', 'livré'],          // Vente client peut être facturée quand validée ou livrée
        livraison: ['validé']                // Livraison client facturable quand validée
      },
      fournisseur: {
        livraison: ['validé'],               // Livraison fournisseur facturable quand validée
        commande: ['livré', 'valide']        // Commande fournisseur facturable quand livrée ou validée
      }
    };

    // Vérifier si le type d'entité et le type de bon existent dans les règles
    if (reglesFacturation[typeEntite] && reglesFacturation[typeEntite][bon.type]) {
      return reglesFacturation[typeEntite][bon.type].includes(bon.statutBon);
    }

    return false;
  }

  canReturn(bon: Bon): boolean {
  if (!bon) return false;

  const statut = String(bon.statutBon ?? '').trim().toLowerCase();
  const type = String(bon.type ?? '').trim().toLowerCase();

  const avanceRaw = bon?.avance ?? 0;
  const avanceStr = String(avanceRaw).trim().replace(',', '.');
  const avanceNum = isNaN(Number(avanceStr)) ? 0 : Number(avanceStr);

  if (avanceNum > 0) return false;

  const conditions = [
    { type: 'vente', statut: 'validé' },
    { type: 'commande', statut: 'livré' },
    { type: 'livraison', statut: 'validé' }
  ];

  return conditions.some(c => c.type === type && c.statut === statut);
}

// canFacturer(bon: Bon): boolean {
//   if (!bon) return false;

//   const statut = bon.statutBon;
//   const type = bon.type;

//   if (statut === 'facturé') return false;
//   if (type === 'avoir') return false;

//   return statut === 'validé';
// }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  safeNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }
}
