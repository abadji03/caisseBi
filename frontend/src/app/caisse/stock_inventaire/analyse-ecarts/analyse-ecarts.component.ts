import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { AnalyseEcart, Reconciliation } from '../../../modeles/entrees-sorties.model';
import { Produits } from '../../../modeles/produit.modele';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import { ProduitsService } from '../../../services/produits.service';
import { ReconciliationService } from '../../../services/reconciliation.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-analyse-ecarts',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './analyse-ecarts.component.html',
  styleUrl: './analyse-ecarts.component.css'
})
export class AnalyseEcartsComponent implements OnInit, OnDestroy {

  @Input() codeStructure: string | null = null;

  pageSize = 5;
  analysesEcarts: AnalyseEcart[] = [];
  filteredEcarts: AnalyseEcart[] = [];
  searchTextEcart = '';
  currentPageEcarts = 1;
  isLoading = false;
  detailsSelectionnes: { date: Date; ecart: number; corrige?: boolean }[] = [];

  produits: Produits[] = [];
  reconciliations: Reconciliation[] = [];

  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private produitsService = inject(ProduitsService);
  private reconciliationService = inject(ReconciliationService);
  private toastr = inject(ToastrService);

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData() {
    this.isLoading = true;
    forkJoin([
      this.produitsService.getAllProduits(this.codeStructure!),
      this.reconciliationService.getByStructure(this.codeStructure!)
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: ([produits, reconciliations]) => {
          this.produits = produits;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.reconciliations = reconciliations.map((raw: any) => Reconciliation.fromRaw(raw));
          this.chargerAnalysesEcarts();
        },
        error: (err) => {
          console.error('Erreur chargement données', err);
          this.toastr.error('Erreur lors du chargement des données');
        }
      });
  }

  private chargerAnalysesEcarts() {
    const analysesMap = new Map<number, AnalyseEcart>();

    this.reconciliations.forEach(reconciliation => {
      let existing = analysesMap.get(reconciliation.produitId);

      if (existing) {
        existing.ecartTotal += reconciliation.ecart;
        existing.nombreReconciliations = (existing.nombreReconciliations ?? 0) + 1;
        existing.ecartsDetail?.push({
          date: reconciliation.dateReconciliation,
          ecart: reconciliation.ecart,
          corrige: false
        });
        existing.dernierEcart = reconciliation.dateReconciliation;
      } else {
        existing = new AnalyseEcart({
          produitId: reconciliation.produitId,
          ecartTotal: reconciliation.ecart,
          dernierEcart: reconciliation.dateReconciliation,
          nombreReconciliations: 1,
          ecartsDetail: [{
            date: reconciliation.dateReconciliation,
            ecart: reconciliation.ecart,
            corrige: false
          }]
        });
        analysesMap.set(reconciliation.produitId, existing);
      }
    });

    this.analysesEcarts = Array.from(analysesMap.values());
    this.filteredEcarts = [...this.analysesEcarts];
  }

  getNomProduitById(produitId: number): string {
    const produit = this.produits.find(p => p.id === produitId);
    return produit ? produit.designation : 'Produit introuvable';
  }

  get moyenneEcart(): number {
    return this.analysesEcarts.reduce((acc, curr) => acc + (curr.moyenneEcart || 0), 0) / this.analysesEcarts.length;
  }

  onSearchChange(): void {
    this.filteredEcarts = this.analysesEcarts.filter(ecart =>
      this.getNomProduitById(ecart.produitId).toLowerCase().includes(this.searchTextEcart.toLowerCase()) ||
      new Date(ecart.dernierEcart).toLocaleDateString().toLowerCase().includes(this.searchTextEcart.toLowerCase()) ||
      ecart.nombreReconciliations?.toString().includes(this.searchTextEcart.toLowerCase())
    );
    this.currentPageEcarts = 1;
  }

  getPaginatedEcarts() {
    const start = (this.currentPageEcarts - 1) * this.pageSize;
    return this.filteredEcarts.slice(start, start + this.pageSize);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredEcarts.length / this.pageSize);
  }

  onPageChange(page: number) {
    this.currentPageEcarts = page;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowsPerPageChange(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPageEcarts = 1;
    this.cdr.detectChanges();
  }

  voirDetails(analyse: AnalyseEcart) {
    this.detailsSelectionnes = analyse.ecartsDetail || [];
    this.openDetailsModal();
  }

  openDetailsModal() {
    const modalElement = document.getElementById('detailsModal');
    if (modalElement) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    }
  }
}
