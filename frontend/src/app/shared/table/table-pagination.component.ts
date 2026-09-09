import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Barre de pagination réutilisable : "Affichage X à Y sur Z", boutons
 * Précédent/Suivant, page courante et choix d'éléments par page.
 * Accessible : aria-live sur le compteur, aria-labels sur les boutons.
 */
@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex justify-content-between align-items-center">
      <div class="text-muted small" aria-live="polite">
        Affichage {{ firstItem() }} à {{ lastItem() }} sur {{ total() }} {{ labelPlural() }}
      </div>
      <div class="d-flex align-items-center gap-2">
        @if (showItemsPerPage()) {
          <select
            class="form-select form-select-sm"
            style="width: auto"
            aria-label="Éléments par page"
            [ngModel]="itemsPerPage()"
            (ngModelChange)="itemsPerPageChange.emit($event)"
          >
            @for (opt of rowsPerPageOptions(); track opt) {
              <option [value]="opt">{{ opt }} éléments/page</option>
            }
          </select>
        }
        <button
          type="button"
          class="btn btn-outline-dark btn-sm"
          aria-label="Page précédente"
          (click)="pageChange.emit(page() - 1)"
          [disabled]="!hasPrev()"
        >
          <i class="bi bi-chevron-left" aria-hidden="true"></i> Précédent
        </button>

        @if (showPageNumbers()) {
          <nav [attr.aria-label]="'Pagination des ' + labelPlural()">
            <ul class="pagination pagination-sm mb-0 flex-wrap">
              @for (p of pagesToShow(); track $index) {
                <li class="page-item" [class.active]="page() === p">
                  <button type="button" class="page-link" (click)="pageChange.emit(p)">{{ p }}</button>
                </li>
              }
            </ul>
          </nav>
        } @else {
          <span class="fw-bold mx-2">Page {{ page() }} / {{ totalPages() }}</span>
        }
        <button
          type="button"
          class="btn btn-outline-dark btn-sm"
          aria-label="Page suivante"
          (click)="pageChange.emit(page() + 1)"
          [disabled]="!hasNext()"
        >
          Suivant <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `,
})
export class TablePaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input.required<number>();
  readonly itemsPerPage = input.required<number>();
  readonly hasNext = input.required<boolean>();
  readonly hasPrev = input.required<boolean>();
  readonly labelPlural = input<string>('éléments');
  readonly rowsPerPageOptions = input<readonly number[]>([5, 10, 20, 50]);
  /** Masque le sélecteur d'éléments/page quand il est géré ailleurs (ex. barre de filtres parente). */
  readonly showItemsPerPage = input<boolean>(true);
  /** Affiche des boutons numérotés (fenêtre de 5 pages) au lieu de "Page X / Y". */
  readonly showPageNumbers = input<boolean>(false);

  readonly pagesToShow = computed<number[]>(() => {
    const total = this.totalPages();
    if (total <= 1) return [1];
    const current = this.page();
    const maxVisible = 5;
    if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    if (current <= 3) end = Math.min(total, maxVisible);
    if (current >= total - 2) start = Math.max(1, total - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly pageChange = output<number>();
  readonly itemsPerPageChange = output<number>();

  readonly firstItem = computed(() => (this.page() - 1) * this.itemsPerPage() + 1);
  readonly lastItem = computed(() => Math.min(this.page() * this.itemsPerPage(), this.total()));
}
