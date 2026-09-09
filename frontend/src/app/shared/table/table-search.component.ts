import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Champ de recherche réutilisable pour les tableaux.
 * Émet chaque frappe ; le parent gère le debounce (Subject + debounceTime).
 * Accessible : label via aria-label, nettoyage au clavier.
 */
@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="input-group" [style.width.px]="width()">
      <span class="input-group-text" aria-hidden="true"><i class="bi bi-search"></i></span>
      <input
        type="text"
        class="form-control"
        role="searchbox"
        [attr.aria-label]="placeholder()"
        [placeholder]="placeholder()"
        [ngModel]="value()"
        (ngModelChange)="onInput($event)"
      />
      @if (value()) {
        <button
          type="button"
          class="btn btn-outline-secondary"
          aria-label="Effacer la recherche"
          (click)="clear()"
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      }
    </div>
  `,
})
export class TableSearchComponent {
  readonly value = input<string | undefined>('');
  readonly placeholder = input<string>('Rechercher...');
  readonly width = input<number>(300);

  readonly searchChange = output<string>();

  onInput(value: string): void {
    this.searchChange.emit(value);
  }

  clear(): void {
    this.searchChange.emit('');
  }
}
