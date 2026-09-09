import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListState } from './list-state';

/**
 * Affiche l'état d'une liste : spinner (chargement), message d'erreur,
 * ou état vide — sans jamais confondre "vide" et "erreur".
 * Accessible : aria-live, aria-busy, textes explicités.
 */
@Component({
  selector: 'app-table-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state() === 'loading') {
      <div class="text-center my-5" role="status" aria-live="polite" aria-busy="true">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
        <p class="mt-2">{{ loadingMessage() }}</p>
      </div>
    } @else if (state() === 'error') {
      <div class="text-center my-5" role="alert" aria-live="assertive">
        <i class="bi bi-exclamation-triangle display-4 text-danger" aria-hidden="true"></i>
        <p class="mt-2 text-danger">{{ errorMessage() }}</p>
        @if (canRetry()) {
          <button type="button" class="btn btn-outline-primary btn-sm" (click)="retry.emit()">
            <i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i> Réessayer
          </button>
        }
      </div>
    } @else if (state() === 'empty') {
      <div class="text-center my-5" aria-live="polite">
        <i class="bi bi-inbox display-4 text-muted" aria-hidden="true"></i>
        <p class="mt-2">{{ emptyMessage() }}</p>
      </div>
    }
  `,
})
export class TableStateComponent {
  readonly state = input.required<ListState>();
  readonly loadingMessage = input<string>('Chargement...');
  readonly emptyMessage = input<string>('Aucun résultat');
  readonly errorMessage = input<string>('Une erreur est survenue lors du chargement.');
  readonly canRetry = input<boolean>(true);

  readonly retry = output<void>();
}
